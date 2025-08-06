import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, mockLogger, testModules, testDb } from '@n8n/backend-test-utils';
import type { APIRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import { loadEndpointGroup, preloadCommonModules } from './module-cache';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { ControllerRegistry } from '@/controller.registry';
import { License } from '@/license';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { LicenseMocker } from '@test-integration/license';

import { PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import type { SetupProps, TestServer } from '../types';

/**
 * Plugin to prefix a path segment into a request URL pathname.
 *
 * Example: http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
function prefix(pathSegment: string) {
	return async function (request: superagent.SuperAgentRequest) {
		const url = new URL(request.url);

		// enforce consistency at call sites
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();
		return await request;
	};
}

const browserId = 'test-browser-id';
function createAgent(
	app: express.Application,
	options?: { auth: boolean; user?: User; noRest?: boolean },
) {
	const agent = request.agent(app);

	const withRestSegment = !options?.noRest;

	if (withRestSegment) void agent.use(prefix(REST_PATH_SEGMENT));

	if (options?.auth && options?.user) {
		const token = Container.get(AuthService).issueJWT(
			options.user,
			options.user.mfaEnabled,
			browserId,
		);
		agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
	}
	return agent;
}

const userDoesNotHaveApiKey = (user: User) => {
	return !user.apiKeys || !Array.from(user.apiKeys) || user.apiKeys.length === 0;
};

const publicApiAgent = (
	app: express.Application,
	{ user, apiKey, version = 1 }: { user?: User; apiKey?: string; version?: number },
) => {
	if (user && apiKey) {
		throw new Error('Cannot provide both user and API key');
	}

	if (user && userDoesNotHaveApiKey(user)) {
		throw new Error('User does not have an API key');
	}

	const agentApiKey = apiKey ?? user?.apiKeys[0].apiKey;

	const agent = request.agent(app);
	void agent.use(prefix(`${PUBLIC_API_REST_PATH_SEGMENT}/v${version}`));
	if (!user && !apiKey) return agent;
	void agent.set({ 'X-N8N-API-KEY': agentApiKey });
	return agent;
};

export const setupTestServer = ({
	endpointGroups,
	enabledFeatures,
	quotas,
	modules,
}: SetupProps): TestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());
	app.set('query parser', 'extended');
	app.use((req: APIRequest, _, next) => {
		req.browserId = browserId;
		next();
	});

	// Mock all telemetry and logging
	mockLogger();
	mockInstance(PostHogClient);
	mockInstance(Push);
	mockInstance(Telemetry);

	const testServer: TestServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user: User) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		restlessAgent: createAgent(app, { auth: false, noRest: true }),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
		publicApiAgentWithApiKey: (apiKey) => publicApiAgent(app, { apiKey }),
		publicApiAgentWithoutApiKey: () => publicApiAgent(app, {}),
		license: new LicenseMocker(),
	};

	// eslint-disable-next-line complexity
	beforeAll(async () => {
		// Preload common modules in parallel with other initialization
		const preloadPromise = preloadCommonModules();

		// Run module loading and database init in parallel
		const initPromises = [
			modules ? testModules.loadModules(modules) : Promise.resolve(),
			testDb.init(),
			preloadPromise,
		];

		await Promise.all(initPromises);

		config.set('userManagement.jwtSecret', 'My JWT secret');
		config.set('userManagement.isInstanceOwnerSetUp', true);

		testServer.license.mock(Container.get(License));
		testServer.license.mockLicenseState(Container.get(LicenseState));

		if (enabledFeatures) {
			testServer.license.setDefaults({
				features: enabledFeatures,
				quotas,
			});
		}

		if (!endpointGroups) return;

		app.use(bodyParser);

		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (enablePublicAPI) {
			const { loadPublicApiVersions } = await import('@/public-api');
			const { apiRouters } = await loadPublicApiVersions(PUBLIC_API_REST_PATH_SEGMENT);
			app.use(...apiRouters);
		}

		if (endpointGroups?.includes('health')) {
			app.get('/healthz/readiness', async (_req, res) => {
				testDb.isReady()
					? res.status(200).send({ status: 'ok' })
					: res.status(503).send({ status: 'error' });
			});
		}
		if (endpointGroups.length) {
			// Load all endpoint groups in parallel for better performance
			const modulePromises = endpointGroups.map(async (group) => {
				switch (group) {
					case 'metrics':
						const { PrometheusMetricsService } = await import(
							'@/metrics/prometheus-metrics.service'
						);
						await Container.get(PrometheusMetricsService).init(app);
						break;

					case 'ldap':
						const { LdapService } = await import('@/ldap.ee/ldap.service.ee');
						await import('@/ldap.ee/ldap.controller.ee');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						break;

					case 'saml':
						const { SamlService } = await import('@/sso.ee/saml/saml.service.ee');
						await Container.get(SamlService).init();
						await import('@/sso.ee/saml/routes/saml.controller.ee');
						const { setSamlLoginEnabled } = await import('@/sso.ee/saml/saml-helpers');
						await setSamlLoginEnabled(true);
						break;

					case 'debug':
						await import('@/controllers/debug.controller');
						break;

					case 'project':
						await import('@/controllers/project.controller');
						break;

					case 'apiKeys':
						await import('@/controllers/api-keys.controller');
						break;

					case 'evaluation':
						await import('@/evaluation.ee/test-runs.controller.ee');
						break;

					case 'ai':
						await import('@/controllers/ai.controller');
						break;

					case 'folder':
						await import('@/controllers/folder.controller');
						break;

					case 'externalSecrets':
						await import('@/modules/external-secrets.ee/external-secrets.module');
						break;

					case 'insights':
						await import('@/modules/insights/insights.module');
						break;

					default:
						// Use cached module loader for common controllers
						return loadEndpointGroup(group);
				}
			});

			// Wait for all modules to load in parallel
			await Promise.all(modulePromises);

			await Container.get(ModuleRegistry).initModules();
			Container.get(ControllerRegistry).activate(app);
		}
	});

	afterAll(async () => {
		await testDb.terminate();
		testServer.httpServer.close();
	});

	beforeEach(() => {
		testServer.license.reset();
	});

	return testServer;
};
