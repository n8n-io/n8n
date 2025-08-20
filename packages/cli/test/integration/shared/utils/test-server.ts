import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, mockLogger, testModules, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { APIRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

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
		if (modules) await testModules.loadModules(modules);
		await testDb.init();

		Container.get(GlobalConfig).userManagement.jwtSecret = 'My JWT secret';
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
			for (const group of endpointGroups) {
				switch (group) {
					case 'annotationTags':
						await import('@/controllers/annotation-tags.controller.ee');
						break;

					case 'credentials':
						await import('@/credentials/credentials.controller');
						break;

					case 'workflows':
						await import('@/workflows/workflows.controller');
						break;

					case 'executions':
						await import('@/executions/executions.controller');
						break;

					case 'variables':
						await import('@/environments.ee/variables/variables.controller.ee');
						break;

					case 'license':
						await import('@/license/license.controller');
						break;

					case 'metrics': {
						const { PrometheusMetricsService } = await import(
							'@/metrics/prometheus-metrics.service'
						);
						await Container.get(PrometheusMetricsService).init(app);
						break;
					}

					case 'eventBus':
						await import('@/eventbus/event-bus.controller');
						break;

					case 'auth':
						await import('@/controllers/auth.controller');
						break;

					case 'oauth2':
						await import('@/controllers/oauth/oauth2-credential.controller');
						break;

					case 'mfa':
						await import('@/controllers/mfa.controller');
						break;

					case 'ldap': {
						const { LdapService } = await import('@/ldap.ee/ldap.service.ee');
						await import('@/ldap.ee/ldap.controller.ee');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						break;
					}

					case 'saml': {
						const { SamlService } = await import('@/sso.ee/saml/saml.service.ee');
						await Container.get(SamlService).init();
						await import('@/sso.ee/saml/routes/saml.controller.ee');
						const { setSamlLoginEnabled } = await import('@/sso.ee/saml/saml-helpers');
						await setSamlLoginEnabled(true);
						break;
					}

					case 'sourceControl':
						await import('@/environments.ee/source-control/source-control.controller.ee');
						break;

					case 'community-packages':
						await import('@/community-packages/community-packages.controller');
						break;

					case 'me':
						await import('@/controllers/me.controller');
						break;

					case 'passwordReset':
						await import('@/controllers/password-reset.controller');
						break;

					case 'owner':
						await import('@/controllers/owner.controller');
						break;

					case 'users':
						await import('@/controllers/users.controller');
						break;

					case 'invitations':
						await import('@/controllers/invitation.controller');
						break;

					case 'tags':
						await import('@/controllers/tags.controller');
						break;

					case 'workflowHistory':
						await import('@/workflows/workflow-history.ee/workflow-history.controller.ee');
						break;

					case 'binaryData':
						await import('@/controllers/binary-data.controller');
						break;

					case 'debug':
						await import('@/controllers/debug.controller');
						break;

					case 'project':
						await import('@/controllers/project.controller');
						break;

					case 'role':
						await import('@/controllers/role.controller');
						break;

					case 'dynamic-node-parameters':
						await import('@/controllers/dynamic-node-parameters.controller');
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

					case 'data-store':
						await import('@/modules/data-store/data-store.module');
						break;

					case 'module-settings':
						await import('@/controllers/module-settings.controller');
						break;
				}
			}

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
