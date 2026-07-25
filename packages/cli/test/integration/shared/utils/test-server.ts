import { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, mockLogger, testModules, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { APIRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import cookieParser from 'cookie-parser';
import express from 'express';
import type superagent from 'superagent';
import request from 'supertest';
import { URL } from 'url';

import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { ControllerRegistry } from '@/controller.registry';
import { License } from '@/license';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import { ApiKeyAuthStrategy } from '@/services/api-key-auth.strategy';
import { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import { Telemetry } from '@/telemetry';
import { resolveBackendHealthEndpointPath } from '@/utils/health-endpoint.util';
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
	setupTimeout,
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
	Container.set(Logger, mockLogger());
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

		testServer.license.mock(Container.get(License));
		testServer.license.mockLicenseState(Container.get(LicenseState));

		if (enabledFeatures) {
			testServer.license.setDefaults({
				features: enabledFeatures,
				quotas,
			});
			// Apply defaults before ModuleRegistry.initModules so licensed modules register routes.
			testServer.license.reset();
		}

		if (!endpointGroups) return;

		app.use(bodyParser);

		// Register auth strategies in priority order. The registry evaluates them
		// sequentially — the first strategy that returns a non-null result wins.
		// API key auth is registered first so existing behavior is preserved.
		// Additional strategies (e.g. scoped JWT from the token-exchange module)
		// can be appended later during their own module initialization.
		const registry = Container.get(AuthStrategyRegistry);
		registry.register(Container.get(ApiKeyAuthStrategy));

		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (enablePublicAPI) {
			const { loadPublicApiVersions } = await import('@/public-api/index.js');
			const { apiRouters } = await loadPublicApiVersions(PUBLIC_API_REST_PATH_SEGMENT);
			app.use(...apiRouters);
		}

		if (endpointGroups?.includes('health')) {
			const globalConfig = Container.get(GlobalConfig);
			const healthPath = resolveBackendHealthEndpointPath(globalConfig);
			const readinessPath = `${healthPath}/readiness`;

			app.get(readinessPath, async (_req, res) => {
				testDb.isReady()
					? res.status(200).send({ status: 'ok' })
					: res.status(503).send({ status: 'error' });
			});
		}
		if (endpointGroups.length) {
			for (const group of endpointGroups) {
				switch (group) {
					case 'annotationTags':
						await import('@/controllers/annotation-tags.controller.ee.js');
						break;

					case 'credentials':
						await import('@/credentials/credentials.controller.js');
						break;

					case 'workflows':
						await import('@/workflows/workflows.controller.js');
						break;

					case 'workflowDependencies':
						await import('@/modules/workflow-index/workflow-dependency.controller.js');
						break;

					case 'executions':
						await import('@/executions/executions.controller.js');
						break;

					case 'variables':
						await import('@/environments.ee/variables/variables.controller.ee.js');
						break;

					case 'license':
						await import('@/license/license.controller.js');
						break;

					case 'metrics': {
						// CacheService must be initialized before PrometheusMetricsService
						// because cache-metrics.service calls isRedis() during init, which
						// reads this.cache.kind — only set after CacheService.init() resolves.
						const { CacheService } = await import('@/services/cache/cache.service.js');
						await Container.get(CacheService).init();
						const { PrometheusMetricsService } = await import('@/metrics/prometheus/index.js');
						Container.get(PrometheusMetricsService).init(app);
						break;
					}

					case 'eventBus':
						await import('@/modules/log-streaming.ee/log-streaming.controller.js');
						break;

					case 'auth':
						await import('@/controllers/auth.controller.js');
						break;

					case 'oauth1':
						await import('@/controllers/oauth/oauth1-credential.controller.js');
						break;

					case 'oauth2':
						await import('@/controllers/oauth/oauth2-credential.controller.js');
						break;

					case 'mfa':
						await import('@/controllers/mfa.controller.js');
						break;

					case 'ldap': {
						const { LdapService } = await import('@/modules/ldap.ee/ldap.service.ee.js');
						await import('@/modules/ldap.ee/ldap.controller.ee.js');
						testServer.license.enable('feat:ldap');
						await Container.get(LdapService).init();
						break;
					}

					case 'saml': {
						const { SamlService } = await import('@/modules/sso-saml/saml.service.ee.js');
						await Container.get(SamlService).init();
						await import('@/modules/sso-saml/saml.controller.ee.js');
						const { setSamlLoginEnabled } = await import('@/modules/sso-saml/saml-helpers.js');
						await setSamlLoginEnabled(true);
						break;
					}

					case 'otel': {
						const { OtelService } = await import('@/modules/otel/otel.service.js');
						await Container.get(OtelService).init();
						await import('@/modules/otel/otel-settings.controller.js');
						break;
					}

					case 'sourceControl':
						await import('@/modules/source-control.ee/source-control.controller.ee.js');
						break;

					case 'community-packages':
						await import('@/modules/community-packages/community-packages.controller.js');
						break;

					case 'me':
						await import('@/controllers/me.controller.js');
						break;

					case 'passwordReset':
						await import('@/controllers/password-reset.controller.js');
						break;

					case 'owner':
						await import('@/controllers/owner.controller.js');
						break;

					case 'users':
						await import('@/controllers/users.controller.js');
						break;

					case 'invitations':
						await import('@/controllers/invitation.controller.js');
						break;

					case 'tags':
						await import('@/controllers/tags.controller.js');
						break;

					case 'workflowHistory':
						await import('@/workflows/workflow-history/workflow-history.controller.js');
						break;

					case 'binaryData':
						await import('@/controllers/binary-data.controller.js');
						break;

					case 'debug':
						await import('@/controllers/debug.controller.js');
						break;

					case 'project':
						await import('@/controllers/project.controller.js');
						break;

					case 'role':
						await import('@/controllers/role.controller.js');
						break;

					case 'roleMappingRule':
						await import('@/modules/provisioning.ee/role-mapping-rule.controller.ee.js');
						break;

					case 'dynamic-node-parameters':
						await import('@/controllers/dynamic-node-parameters.controller.js');
						break;

					case 'apiKeys':
						await import('@/controllers/api-keys.controller.js');
						break;

					case 'evaluation':
						await import('@/evaluation.ee/test-runs.controller.ee.js');
						break;

					case 'ai':
						await import('@/controllers/ai.controller.js');
						break;
					case 'folder':
						await import('@/controllers/folder.controller.js');
						break;

					case 'externalSecrets':
						await import('@/modules/external-secrets.ee/external-secrets.module.js');
						break;

					case 'insights':
						await import('@/modules/insights/insights.module.js');
						break;

					case 'data-table':
						await import('@/modules/data-table/data-table.module.js');
						break;

					case 'workflow-reviews':
						await import('@/modules/workflow-reviews.ee/workflow-reviews.module.js');
						break;

					case 'mcp':
						await import('@/modules/mcp/mcp.module.js');
						break;

					case 'module-settings':
						await import('@/controllers/module-settings.controller.js');
						break;

					case 'security-settings':
						await import('@/controllers/security-settings.controller.js');
						break;

					case 'third-party-licenses':
						await import('@/controllers/third-party-licenses.controller.js');
						break;

					case 'encryption-keys':
						await import('@/modules/encryption-key-manager/encryption-key.controller.js');
						break;

					case 'test-webhooks':
						await import('@/webhooks/test-webhooks.controller.js');
						break;
				}
			}

			await Container.get(ModuleRegistry).initModules('main');
			Container.get(ControllerRegistry).activate(app);

			await Container.get(AuthHandlerRegistry).init();
		}
	}, setupTimeout);

	afterAll(async () => {
		// Close the HTTP server first so any in-flight requests can't reach the
		// DI container after testDb.terminate() resets it. Await the close so
		// pending handlers drain before the next file's beforeAll runs in
		// persistent Vitest workers — otherwise stale handlers call
		// Container.get(Logger), construct a fresh Logger, and trip Vitest's
		// "environment torn down" guard when winston is imported.
		// Skip when the server never started listening (some suites bail in
		// beforeAll); calling close() on a non-listening server throws
		// "Server is not running" and would mask the real beforeAll failure.
		if (testServer.httpServer.listening) {
			await new Promise<void>((resolve, reject) => {
				testServer.httpServer.close((err) => (err ? reject(err) : resolve()));
			});
		}
		await testDb.terminate();
	});

	beforeEach(() => {
		testServer.license.reset();
	});

	return testServer;
};
