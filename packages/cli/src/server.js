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
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.Server = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const cookie_parser_1 = __importDefault(require('cookie-parser'));
const express_1 = __importDefault(require('express'));
const promises_1 = require('fs/promises');
const helmet_1 = __importDefault(require('helmet'));
const isEmpty_1 = __importDefault(require('lodash/isEmpty'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = require('path');
const abstract_server_1 = require('@/abstract-server');
const config_2 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const controller_registry_1 = require('@/controller.registry');
const credentials_overwrites_1 = require('@/credentials-overwrites');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const event_service_1 = require('@/events/event.service');
const log_streaming_event_relay_1 = require('@/events/relays/log-streaming.event-relay');
const helpers_ee_1 = require('@/ldap.ee/helpers.ee');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const helpers_1 = require('@/mfa/helpers');
const posthog_1 = require('@/posthog');
const public_api_1 = require('@/public-api');
const push_1 = require('@/push');
const ResponseHelper = __importStar(require('@/response-helper'));
require('@/controllers/active-workflows.controller');
require('@/controllers/annotation-tags.controller.ee');
require('@/controllers/auth.controller');
require('@/controllers/binary-data.controller');
require('@/controllers/ai.controller');
require('@/controllers/dynamic-node-parameters.controller');
require('@/controllers/invitation.controller');
require('@/controllers/me.controller');
require('@/controllers/node-types.controller');
require('@/controllers/oauth/oauth1-credential.controller');
require('@/controllers/oauth/oauth2-credential.controller');
require('@/controllers/orchestration.controller');
require('@/controllers/owner.controller');
require('@/controllers/password-reset.controller');
require('@/controllers/project.controller');
require('@/controllers/role.controller');
require('@/controllers/tags.controller');
require('@/controllers/translation.controller');
require('@/controllers/folder.controller');
require('@/controllers/users.controller');
require('@/controllers/user-settings.controller');
require('@/controllers/workflow-statistics.controller');
require('@/controllers/api-keys.controller');
require('@/credentials/credentials.controller');
require('@/eventbus/event-bus.controller');
require('@/events/events.controller');
require('@/executions/executions.controller');
require('@/license/license.controller');
require('@/evaluation.ee/test-runs.controller.ee');
require('@/workflows/workflow-history.ee/workflow-history.controller.ee');
require('@/workflows/workflows.controller');
require('@/webhooks/webhooks.controller');
const chat_server_1 = require('./chat/chat-server');
const mfa_service_1 = require('./mfa/mfa.service');
const community_packages_config_1 = require('./community-packages/community-packages.config');
let Server = class Server extends abstract_server_1.AbstractServer {
	constructor(loadNodesAndCredentials, postHogClient, eventService, instanceSettings) {
		super();
		this.loadNodesAndCredentials = loadNodesAndCredentials;
		this.postHogClient = postHogClient;
		this.eventService = eventService;
		this.instanceSettings = instanceSettings;
		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !this.globalConfig.endpoints.disableProductionWebhooksOnMainProcess;
	}
	async start() {
		if (!this.globalConfig.endpoints.disableUi) {
			const { FrontendService } = await Promise.resolve().then(() =>
				__importStar(require('@/services/frontend.service')),
			);
			this.frontendService = di_1.Container.get(FrontendService);
		}
		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = this.globalConfig.credentials.overwrite.endpoint;
		await super.start();
		this.logger.debug(`Server ID: ${this.instanceSettings.hostId}`);
		if (backend_common_1.inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}
		this.eventService.emit('server-started');
	}
	async registerAdditionalControllers() {
		if (!backend_common_1.inProduction && this.instanceSettings.isMultiMain) {
			await Promise.resolve().then(() => __importStar(require('@/controllers/debug.controller')));
		}
		if ((0, helpers_ee_1.isLdapEnabled)()) {
			const { LdapService } = await Promise.resolve().then(() =>
				__importStar(require('@/ldap.ee/ldap.service.ee')),
			);
			await Promise.resolve().then(() => __importStar(require('@/ldap.ee/ldap.controller.ee')));
			await di_1.Container.get(LdapService).init();
		}
		if (di_1.Container.get(community_packages_config_1.CommunityPackagesConfig).enabled) {
			await Promise.resolve().then(() =>
				__importStar(require('@/community-packages/community-packages.controller')),
			);
			await Promise.resolve().then(() =>
				__importStar(require('@/community-packages/community-node-types.controller')),
			);
		}
		if (constants_2.inE2ETests) {
			await Promise.resolve().then(() => __importStar(require('@/controllers/e2e.controller')));
		}
		if ((0, helpers_1.isMfaFeatureEnabled)()) {
			await di_1.Container.get(mfa_service_1.MfaService).init();
			await Promise.resolve().then(() => __importStar(require('@/controllers/mfa.controller')));
		}
		if (!this.globalConfig.endpoints.disableUi) {
			await Promise.resolve().then(() => __importStar(require('@/controllers/cta.controller')));
		}
		if (!this.globalConfig.tags.disabled) {
			await Promise.resolve().then(() => __importStar(require('@/controllers/tags.controller')));
		}
		try {
			const { SamlService } = await Promise.resolve().then(() =>
				__importStar(require('@/sso.ee/saml/saml.service.ee')),
			);
			await di_1.Container.get(SamlService).init();
			await Promise.resolve().then(() =>
				__importStar(require('@/sso.ee/saml/routes/saml.controller.ee')),
			);
		} catch (error) {
			this.logger.warn(`SAML initialization failed: ${error.message}`);
		}
		if (this.globalConfig.diagnostics.enabled) {
			await Promise.resolve().then(() =>
				__importStar(require('@/controllers/telemetry.controller')),
			);
		}
		try {
			const { OidcService } = await Promise.resolve().then(() =>
				__importStar(require('@/sso.ee/oidc/oidc.service.ee')),
			);
			await di_1.Container.get(OidcService).init();
			await Promise.resolve().then(() =>
				__importStar(require('@/sso.ee/oidc/routes/oidc.controller.ee')),
			);
		} catch (error) {
			this.logger.warn(`OIDC initialization failed: ${error.message}`);
		}
		try {
			const { SourceControlService } = await Promise.resolve().then(() =>
				__importStar(require('@/environments.ee/source-control/source-control.service.ee')),
			);
			await di_1.Container.get(SourceControlService).init();
			await Promise.resolve().then(() =>
				__importStar(require('@/environments.ee/source-control/source-control.controller.ee')),
			);
		} catch (error) {
			this.logger.warn(`Source control initialization failed: ${error.message}`);
		}
		try {
			await Promise.resolve().then(() =>
				__importStar(require('@/environments.ee/variables/variables.controller.ee')),
			);
		} catch (error) {
			this.logger.warn(`Variables initialization failed: ${error.message}`);
		}
	}
	async configure() {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await Promise.resolve().then(() =>
				__importStar(require('@/metrics/prometheus-metrics.service')),
			);
			await di_1.Container.get(PrometheusMetricsService).init(this.app);
		}
		const { frontendService } = this;
		if (frontendService) {
			await this.externalHooks.run('frontend.settings', [frontendService.getSettings()]);
		}
		await this.postHogClient.init();
		const publicApiEndpoint = this.globalConfig.publicApi.path;
		if ((0, public_api_1.isApiEnabled)()) {
			const { apiRouters, apiLatestVersion } = await (0, public_api_1.loadPublicApiVersions)(
				publicApiEndpoint,
			);
			this.app.use(...apiRouters);
			if (frontendService) {
				frontendService.settings.publicApi.latestVersion = apiLatestVersion;
			}
		}
		this.app.use((req, _, next) => {
			req.browserId = req.headers['browser-id'];
			next();
		});
		this.app.use((0, cookie_parser_1.default)());
		const { restEndpoint, app } = this;
		const push = di_1.Container.get(push_1.Push);
		push.setupPushHandler(restEndpoint, app);
		if (push.isBidirectional) {
			const { CollaborationService } = await Promise.resolve().then(() =>
				__importStar(require('@/collaboration/collaboration.service')),
			);
			const collaborationService = di_1.Container.get(CollaborationService);
			collaborationService.init();
		} else {
			this.logger.warn(
				'Collaboration features are disabled because push is configured unidirectional. Use N8N_PUSH_BACKEND=websocket environment variable to enable them.',
			);
		}
		if (config_2.default.getEnv('executions.mode') === 'queue') {
			const { ScalingService } = await Promise.resolve().then(() =>
				__importStar(require('@/scaling/scaling.service')),
			);
			await di_1.Container.get(ScalingService).setupQueue();
		}
		await (0, helpers_1.handleMfaDisable)();
		await this.registerAdditionalControllers();
		di_1.Container.get(controller_registry_1.ControllerRegistry).activate(app);
		const tzDataFile = (0, path_1.resolve)(constants_2.CLI_DIR, 'dist/timezones.json');
		this.app.get(`/${this.restEndpoint}/options/timezones`, (_, res) =>
			res.sendFile(tzDataFile, { dotfiles: 'allow' }),
		);
		if (frontendService) {
			this.app.get(
				`/${this.restEndpoint}/settings`,
				ResponseHelper.send(async () => frontendService.getSettings()),
			);
			this.app.get(
				`/${this.restEndpoint}/module-settings`,
				ResponseHelper.send(async () => frontendService.getModuleSettings()),
			);
			this.app.get(`/${this.restEndpoint}/config.js`, (_req, res) => {
				const frontendSentryConfig = JSON.stringify({
					dsn: this.globalConfig.sentry.frontendDsn,
					environment: process.env.ENVIRONMENT || 'development',
					serverName: process.env.DEPLOYMENT_NAME,
					release: `n8n@${constants_2.N8N_VERSION}`,
				});
				const frontendConfig = [
					`window.REST_ENDPOINT = '${this.globalConfig.endpoints.rest}';`,
					`window.sentry = ${frontendSentryConfig};`,
				].join('\n');
				res.type('application/javascript');
				res.send(frontendConfig);
			});
		}
		const eventBus = di_1.Container.get(message_event_bus_1.MessageEventBus);
		await eventBus.initialize();
		di_1.Container.get(log_streaming_event_relay_1.LogStreamingEventRelay).init();
		if (this.endpointPresetCredentials !== '') {
			this.app.post(`/${this.endpointPresetCredentials}`, async (req, res) => {
				if (!this.presetCredentialsLoaded) {
					const body = req.body;
					if (req.contentType !== 'application/json') {
						ResponseHelper.sendErrorResponse(
							res,
							new Error(
								'Body must be a valid JSON, make sure the content-type is application/json',
							),
						);
						return;
					}
					di_1.Container.get(credentials_overwrites_1.CredentialsOverwrites).setData(body);
					await frontendService?.generateTypes();
					this.presetCredentialsLoaded = true;
					ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
				} else {
					ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
				}
			});
		}
		const maxAge = constants_1.Time.days.toMilliseconds;
		const cacheOptions = constants_2.inE2ETests || backend_common_1.inDevelopment ? {} : { maxAge };
		const { staticCacheDir } = di_1.Container.get(n8n_core_1.InstanceSettings);
		if (frontendService) {
			this.app.use(
				[
					'/icons/{@:scope/}:packageName/*path/*file.svg',
					'/icons/{@:scope/}:packageName/*path/*file.png',
				],
				async (req, res) => {
					let { scope, packageName } = req.params;
					if (scope) packageName = `@${scope}/${packageName}`;
					const filePath = this.loadNodesAndCredentials.resolveIcon(packageName, req.originalUrl);
					if (filePath) {
						try {
							await (0, promises_1.access)(filePath);
							return res.sendFile(filePath, { maxAge, dotfiles: 'allow' });
						} catch {}
					}
					res.sendStatus(404);
				},
			);
			const serveSchemas = async (req, res) => {
				const { node, version, resource, operation } = req.params;
				const filePath = this.loadNodesAndCredentials.resolveSchema({
					node,
					resource,
					operation,
					version,
				});
				if (filePath) {
					try {
						await (0, promises_1.access)(filePath);
						return res.sendFile(filePath, { ...cacheOptions, dotfiles: 'allow' });
					} catch {}
				}
				res.sendStatus(404);
			};
			this.app.use('/schemas/:node/:version{/:resource}{/:operation}.json', serveSchemas);
			const isTLSEnabled =
				this.globalConfig.protocol === 'https' && !!(this.sslKey && this.sslCert);
			const isPreviewMode = process.env.N8N_PREVIEW_MODE === 'true';
			const cspDirectives = (0, n8n_workflow_1.jsonParse)(
				di_1.Container.get(config_1.SecurityConfig).contentSecurityPolicy,
				{
					errorMessage: 'The contentSecurityPolicy is not valid JSON.',
				},
			);
			const cspReportOnly = di_1.Container.get(
				config_1.SecurityConfig,
			).contentSecurityPolicyReportOnly;
			const securityHeadersMiddleware = (0, helmet_1.default)({
				contentSecurityPolicy: (0, isEmpty_1.default)(cspDirectives)
					? false
					: {
							useDefaults: false,
							reportOnly: cspReportOnly,
							directives: {
								...cspDirectives,
							},
						},
				xFrameOptions:
					isPreviewMode || constants_2.inE2ETests || backend_common_1.inDevelopment
						? false
						: { action: 'sameorigin' },
				dnsPrefetchControl: false,
				ieNoOpen: false,
				xPoweredBy: false,
				strictTransportSecurity: isTLSEnabled
					? {
							maxAge: 180 * constants_1.Time.days.toSeconds,
							includeSubDomains: false,
							preload: false,
						}
					: false,
			});
			const nonUIRoutes = [
				'favicon.ico',
				'assets',
				'static',
				'types',
				'healthz',
				'metrics',
				'e2e',
				this.restEndpoint,
				this.endpointPresetCredentials,
				(0, public_api_1.isApiEnabled)() ? '' : publicApiEndpoint,
				...this.globalConfig.endpoints.additionalNonUIRoutes.split(':'),
			].filter((u) => !!u);
			const nonUIRoutesRegex = new RegExp(`^/(${nonUIRoutes.join('|')})/?.*$`);
			const historyApiHandler = (req, res, next) => {
				const {
					method,
					headers: { accept },
				} = req;
				if (
					method === 'GET' &&
					accept &&
					(accept.includes('text/html') || accept.includes('*/*')) &&
					!req.path.endsWith('.wasm') &&
					!nonUIRoutesRegex.test(req.path)
				) {
					res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
					securityHeadersMiddleware(req, res, () => {
						res.sendFile('index.html', { root: staticCacheDir, maxAge: 0, lastModified: false });
					});
				} else {
					next();
				}
			};
			const setCustomCacheHeader = (res) => {
				if (/^\/types\/(nodes|credentials).json$/.test(res.req.url)) {
					res.setHeader('Cache-Control', 'no-cache, must-revalidate');
				}
			};
			this.app.use(
				'/',
				historyApiHandler,
				express_1.default.static(staticCacheDir, {
					...cacheOptions,
					setHeaders: setCustomCacheHeader,
				}),
				express_1.default.static(constants_2.EDITOR_UI_DIST_DIR, cacheOptions),
			);
		} else {
			this.app.use('/', express_1.default.static(staticCacheDir, cacheOptions));
		}
	}
	setupPushServer() {
		const { restEndpoint, server, app } = this;
		di_1.Container.get(push_1.Push).setupPushServer(restEndpoint, server, app);
		di_1.Container.get(chat_server_1.ChatServer).setup(server, app);
	}
};
exports.Server = Server;
exports.Server = Server = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			load_nodes_and_credentials_1.LoadNodesAndCredentials,
			posthog_1.PostHogClient,
			event_service_1.EventService,
			n8n_core_1.InstanceSettings,
		]),
	],
	Server,
);
//# sourceMappingURL=server.js.map
