'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupTestServer = void 0;
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const cookie_parser_1 = __importDefault(require('cookie-parser'));
const express_1 = __importDefault(require('express'));
const supertest_1 = __importDefault(require('supertest'));
const url_1 = require('url');
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const controller_registry_1 = require('@/controller.registry');
const license_1 = require('@/license');
const middlewares_1 = require('@/middlewares');
const posthog_1 = require('@/posthog');
const push_1 = require('@/push');
const telemetry_1 = require('@/telemetry');
const license_2 = require('@test-integration/license');
const constants_2 = require('../constants');
function prefix(pathSegment) {
	return async function (request) {
		const url = new url_1.URL(request.url);
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}
		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();
		return await request;
	};
}
const browserId = 'test-browser-id';
function createAgent(app, options) {
	const agent = supertest_1.default.agent(app);
	const withRestSegment = !options?.noRest;
	if (withRestSegment) void agent.use(prefix(constants_2.REST_PATH_SEGMENT));
	if (options?.auth && options?.user) {
		const token = di_1.Container.get(auth_service_1.AuthService).issueJWT(
			options.user,
			options.user.mfaEnabled,
			browserId,
		);
		agent.jar.setCookie(`${constants_1.AUTH_COOKIE_NAME}=${token}`);
	}
	return agent;
}
const userDoesNotHaveApiKey = (user) => {
	return !user.apiKeys || !Array.from(user.apiKeys) || user.apiKeys.length === 0;
};
const publicApiAgent = (app, { user, apiKey, version = 1 }) => {
	if (user && apiKey) {
		throw new Error('Cannot provide both user and API key');
	}
	if (user && userDoesNotHaveApiKey(user)) {
		throw new Error('User does not have an API key');
	}
	const agentApiKey = apiKey ?? user?.apiKeys[0].apiKey;
	const agent = supertest_1.default.agent(app);
	void agent.use(prefix(`${constants_2.PUBLIC_API_REST_PATH_SEGMENT}/v${version}`));
	if (!user && !apiKey) return agent;
	void agent.set({ 'X-N8N-API-KEY': agentApiKey });
	return agent;
};
const setupTestServer = ({ endpointGroups, enabledFeatures, quotas, modules }) => {
	const app = (0, express_1.default)();
	app.use(middlewares_1.rawBodyReader);
	app.use((0, cookie_parser_1.default)());
	app.set('query parser', 'extended');
	app.use((req, _, next) => {
		req.browserId = browserId;
		next();
	});
	(0, backend_test_utils_1.mockLogger)();
	(0, backend_test_utils_1.mockInstance)(posthog_1.PostHogClient);
	(0, backend_test_utils_1.mockInstance)(push_1.Push);
	(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
	const testServer = {
		app,
		httpServer: app.listen(0),
		authAgentFor: (user) => createAgent(app, { auth: true, user }),
		authlessAgent: createAgent(app),
		restlessAgent: createAgent(app, { auth: false, noRest: true }),
		publicApiAgentFor: (user) => publicApiAgent(app, { user }),
		publicApiAgentWithApiKey: (apiKey) => publicApiAgent(app, { apiKey }),
		publicApiAgentWithoutApiKey: () => publicApiAgent(app, {}),
		license: new license_2.LicenseMocker(),
	};
	beforeAll(async () => {
		if (modules) await backend_test_utils_1.testModules.loadModules(modules);
		await backend_test_utils_1.testDb.init();
		config_1.default.set('userManagement.jwtSecret', 'My JWT secret');
		config_1.default.set('userManagement.isInstanceOwnerSetUp', true);
		testServer.license.mock(di_1.Container.get(license_1.License));
		testServer.license.mockLicenseState(di_1.Container.get(backend_common_1.LicenseState));
		if (enabledFeatures) {
			testServer.license.setDefaults({
				features: enabledFeatures,
				quotas,
			});
		}
		if (!endpointGroups) return;
		app.use(middlewares_1.bodyParser);
		const enablePublicAPI = endpointGroups?.includes('publicApi');
		if (enablePublicAPI) {
			const { loadPublicApiVersions } = await Promise.resolve().then(() =>
				__importStar(require('@/public-api')),
			);
			const { apiRouters } = await loadPublicApiVersions(constants_2.PUBLIC_API_REST_PATH_SEGMENT);
			app.use(...apiRouters);
		}
		if (endpointGroups?.includes('health')) {
			app.get('/healthz/readiness', async (_req, res) => {
				backend_test_utils_1.testDb.isReady()
					? res.status(200).send({ status: 'ok' })
					: res.status(503).send({ status: 'error' });
			});
		}
		if (endpointGroups.length) {
			for (const group of endpointGroups) {
				switch (group) {
					case 'annotationTags':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/annotation-tags.controller.ee')),
						);
						break;
					case 'credentials':
						await Promise.resolve().then(() =>
							__importStar(require('@/credentials/credentials.controller')),
						);
						break;
					case 'workflows':
						await Promise.resolve().then(() =>
							__importStar(require('@/workflows/workflows.controller')),
						);
						break;
					case 'executions':
						await Promise.resolve().then(() =>
							__importStar(require('@/executions/executions.controller')),
						);
						break;
					case 'variables':
						await Promise.resolve().then(() =>
							__importStar(require('@/environments.ee/variables/variables.controller.ee')),
						);
						break;
					case 'license':
						await Promise.resolve().then(() =>
							__importStar(require('@/license/license.controller')),
						);
						break;
					case 'metrics':
						const { PrometheusMetricsService } = await Promise.resolve().then(() =>
							__importStar(require('@/metrics/prometheus-metrics.service')),
						);
						await di_1.Container.get(PrometheusMetricsService).init(app);
						break;
					case 'eventBus':
						await Promise.resolve().then(() =>
							__importStar(require('@/eventbus/event-bus.controller')),
						);
						break;
					case 'auth':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/auth.controller')),
						);
						break;
					case 'oauth2':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/oauth/oauth2-credential.controller')),
						);
						break;
					case 'mfa':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/mfa.controller')),
						);
						break;
					case 'ldap':
						const { LdapService } = await Promise.resolve().then(() =>
							__importStar(require('@/ldap.ee/ldap.service.ee')),
						);
						await Promise.resolve().then(() =>
							__importStar(require('@/ldap.ee/ldap.controller.ee')),
						);
						testServer.license.enable('feat:ldap');
						await di_1.Container.get(LdapService).init();
						break;
					case 'saml':
						const { SamlService } = await Promise.resolve().then(() =>
							__importStar(require('@/sso.ee/saml/saml.service.ee')),
						);
						await di_1.Container.get(SamlService).init();
						await Promise.resolve().then(() =>
							__importStar(require('@/sso.ee/saml/routes/saml.controller.ee')),
						);
						const { setSamlLoginEnabled } = await Promise.resolve().then(() =>
							__importStar(require('@/sso.ee/saml/saml-helpers')),
						);
						await setSamlLoginEnabled(true);
						break;
					case 'sourceControl':
						await Promise.resolve().then(() =>
							__importStar(
								require('@/environments.ee/source-control/source-control.controller.ee'),
							),
						);
						break;
					case 'community-packages':
						await Promise.resolve().then(() =>
							__importStar(require('@/community-packages/community-packages.controller')),
						);
						break;
					case 'me':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/me.controller')),
						);
						break;
					case 'passwordReset':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/password-reset.controller')),
						);
						break;
					case 'owner':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/owner.controller')),
						);
						break;
					case 'users':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/users.controller')),
						);
						break;
					case 'invitations':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/invitation.controller')),
						);
						break;
					case 'tags':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/tags.controller')),
						);
						break;
					case 'workflowHistory':
						await Promise.resolve().then(() =>
							__importStar(
								require('@/workflows/workflow-history.ee/workflow-history.controller.ee'),
							),
						);
						break;
					case 'binaryData':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/binary-data.controller')),
						);
						break;
					case 'debug':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/debug.controller')),
						);
						break;
					case 'project':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/project.controller')),
						);
						break;
					case 'role':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/role.controller')),
						);
						break;
					case 'dynamic-node-parameters':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/dynamic-node-parameters.controller')),
						);
						break;
					case 'apiKeys':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/api-keys.controller')),
						);
						break;
					case 'evaluation':
						await Promise.resolve().then(() =>
							__importStar(require('@/evaluation.ee/test-runs.controller.ee')),
						);
						break;
					case 'ai':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/ai.controller')),
						);
					case 'folder':
						await Promise.resolve().then(() =>
							__importStar(require('@/controllers/folder.controller')),
						);
					case 'externalSecrets':
						await Promise.resolve().then(() =>
							__importStar(require('@/modules/external-secrets.ee/external-secrets.module')),
						);
					case 'insights':
						await Promise.resolve().then(() =>
							__importStar(require('@/modules/insights/insights.module')),
						);
				}
			}
			await di_1.Container.get(backend_common_1.ModuleRegistry).initModules();
			di_1.Container.get(controller_registry_1.ControllerRegistry).activate(app);
		}
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
		testServer.httpServer.close();
	});
	beforeEach(() => {
		testServer.license.reset();
	});
	return testServer;
};
exports.setupTestServer = setupTestServer;
//# sourceMappingURL=test-server.js.map
