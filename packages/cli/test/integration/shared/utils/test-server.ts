import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { Container } from 'typedi';
import { URL } from 'url';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { User } from '@/databases/entities/user';
import { ControllerRegistry } from '@/decorators';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import type { APIRequest } from '@/requests';
import { Telemetry } from '@/telemetry';

import { mockInstance } from '../../../shared/mocking';
import { PUBLIC_API_REST_PATH_SEGMENT, REST_PATH_SEGMENT } from '../constants';
import { LicenseMocker } from '../license';
import * as testDb from '../test-db';
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
		const token = Container.get(AuthService).issueJWT(options.user, browserId);
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
}: SetupProps): TestServer => {
	const app = express();
	app.use(rawBodyReader);
	app.use(cookieParser());
	app.use((req: APIRequest, _, next) => {
		req.browserId = browserId;
		next();
	});

	// Mock all telemetry and logging
	mockInstance(Logger);
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
		await testDb.init();

		config.set('userManagement.jwtSecret', 'My JWT secret');
		config.set('userManagement.isInstanceOwnerSetUp', true);

		testServer.license.mock(Container.get(License));
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
						await import('@/environments/variables/variables.controller.ee');
						break;

					case 'license':
						await import('@/license/license.controller');
						break;

					case 'metrics':
						const { PrometheusMetricsService } = await import(
							'@/metrics/prometheus-metrics.service'
						);
						await Container.get(PrometheusMetricsService).init(app);
						break;

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

					case 'ldap':
						const { LdapService } = await import('@/ldap/ldap.service.ee');
						await import('@/ldap/ldap.controller.ee');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						break;

					case 'saml':
						const { setSamlLoginEnabled } = await import('@/sso/saml/saml-helpers');
						await import('@/sso/saml/routes/saml.controller.ee');
						await setSamlLoginEnabled(true);
						break;

					case 'sourceControl':
						await import('@/environments/source-control/source-control.controller.ee');
						break;

					case 'community-packages':
						await import('@/controllers/community-packages.controller');
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

					case 'externalSecrets':
						await import('@/external-secrets/external-secrets.controller.ee');
						break;

					case 'workflowHistory':
						await import('@/workflows/workflow-history/workflow-history.controller.ee');
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
				}
			}

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
