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
exports.AbstractServer = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const compression_1 = __importDefault(require('compression'));
const express_1 = __importDefault(require('express'));
const express_handlebars_1 = require('express-handlebars');
const promises_1 = require('fs/promises');
const isbot_1 = __importDefault(require('isbot'));
const config_2 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const service_unavailable_error_1 = require('@/errors/response-errors/service-unavailable.error');
const external_hooks_1 = require('@/external-hooks');
const middlewares_1 = require('@/middlewares');
const response_helper_1 = require('@/response-helper');
const live_webhooks_1 = require('@/webhooks/live-webhooks');
const test_webhooks_1 = require('@/webhooks/test-webhooks');
const waiting_forms_1 = require('@/webhooks/waiting-forms');
const waiting_webhooks_1 = require('@/webhooks/waiting-webhooks');
const webhook_request_handler_1 = require('@/webhooks/webhook-request-handler');
let AbstractServer = class AbstractServer {
	constructor() {
		this.globalConfig = di_1.Container.get(config_1.GlobalConfig);
		this.dbConnection = di_1.Container.get(db_1.DbConnection);
		this.webhooksEnabled = true;
		this.testWebhooksEnabled = false;
		this.app = (0, express_1.default)();
		this.app.disable('x-powered-by');
		this.app.set('query parser', 'extended');
		this.app.engine('handlebars', (0, express_handlebars_1.engine)({ defaultLayout: false }));
		this.app.set('view engine', 'handlebars');
		this.app.set('views', constants_1.TEMPLATES_DIR);
		const proxyHops = this.globalConfig.proxy_hops;
		if (proxyHops > 0) this.app.set('trust proxy', proxyHops);
		this.sslKey = this.globalConfig.ssl_key;
		this.sslCert = this.globalConfig.ssl_cert;
		const { endpoints } = this.globalConfig;
		this.restEndpoint = endpoints.rest;
		this.endpointForm = endpoints.form;
		this.endpointFormTest = endpoints.formTest;
		this.endpointFormWaiting = endpoints.formWaiting;
		this.endpointWebhook = endpoints.webhook;
		this.endpointWebhookTest = endpoints.webhookTest;
		this.endpointWebhookWaiting = endpoints.webhookWaiting;
		this.endpointMcp = endpoints.mcp;
		this.endpointMcpTest = endpoints.mcpTest;
		this.logger = di_1.Container.get(backend_common_1.Logger);
	}
	async configure() {}
	async setupErrorHandlers() {
		const { app } = this;
		const { setupExpressErrorHandler } = await Promise.resolve().then(() =>
			__importStar(require('@sentry/node')),
		);
		setupExpressErrorHandler(app);
	}
	setupCommonMiddlewares() {
		this.app.use((0, compression_1.default)());
		this.app.use(middlewares_1.rawBodyReader);
	}
	setupDevMiddlewares() {
		this.app.use(middlewares_1.corsMiddleware);
	}
	setupPushServer() {}
	async setupHealthCheck() {
		this.app.get('/healthz', (_req, res) => {
			res.send({ status: 'ok' });
		});
		const { connectionState } = this.dbConnection;
		this.app.get('/healthz/readiness', (_req, res) => {
			const { connected, migrated } = connectionState;
			if (connected && migrated) {
				res.status(200).send({ status: 'ok' });
			} else {
				res.status(503).send({ status: 'error' });
			}
		});
		this.app.use((_req, res, next) => {
			if (connectionState.connected) {
				if (connectionState.migrated) next();
				else res.send('n8n is starting up. Please wait');
			} else
				(0, response_helper_1.sendErrorResponse)(
					res,
					new service_unavailable_error_1.ServiceUnavailableError('Database is not ready!'),
				);
		});
	}
	async init() {
		const { app, sslKey, sslCert } = this;
		const { protocol } = this.globalConfig;
		if (protocol === 'https' && sslKey && sslCert) {
			const https = await Promise.resolve().then(() => __importStar(require('https')));
			this.server = https.createServer(
				{
					key: await (0, promises_1.readFile)(this.sslKey, 'utf8'),
					cert: await (0, promises_1.readFile)(this.sslCert, 'utf8'),
				},
				app,
			);
		} else {
			const http = await Promise.resolve().then(() => __importStar(require('http')));
			this.server = http.createServer(app);
		}
		const { port, listen_address: address } = di_1.Container.get(config_1.GlobalConfig);
		this.server.on('error', (error) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.info(
					`n8n's port ${port} is already in use. Do you have another instance of n8n running already?`,
				);
			} else if (error.code === 'EACCES') {
				this.logger.info(
					`n8n does not have permission to use port ${port}. Please run n8n with a different port.`,
				);
			} else {
				this.logger.error('n8n webserver failed, exiting', { error });
			}
			process.exit(1);
		});
		await new Promise((resolve) => this.server.listen(port, address, () => resolve()));
		this.externalHooks = di_1.Container.get(external_hooks_1.ExternalHooks);
		await this.setupHealthCheck();
		this.logger.info(`n8n ready on ${address}, port ${port}`);
	}
	async start() {
		if (!backend_common_1.inTest) {
			await this.setupErrorHandlers();
			this.setupPushServer();
		}
		this.setupCommonMiddlewares();
		if (this.webhooksEnabled) {
			const liveWebhooksRequestHandler = (0, webhook_request_handler_1.createWebhookHandlerFor)(
				di_1.Container.get(live_webhooks_1.LiveWebhooks),
			);
			this.app.all(`/${this.endpointForm}/*path`, liveWebhooksRequestHandler);
			this.app.all(`/${this.endpointWebhook}/*path`, liveWebhooksRequestHandler);
			this.app.all(
				`/${this.endpointFormWaiting}/:path{/:suffix}`,
				(0, webhook_request_handler_1.createWebhookHandlerFor)(
					di_1.Container.get(waiting_forms_1.WaitingForms),
				),
			);
			this.app.all(
				`/${this.endpointWebhookWaiting}/:path{/:suffix}`,
				(0, webhook_request_handler_1.createWebhookHandlerFor)(
					di_1.Container.get(waiting_webhooks_1.WaitingWebhooks),
				),
			);
			this.app.all(`/${this.endpointMcp}/*path`, liveWebhooksRequestHandler);
		}
		if (this.testWebhooksEnabled) {
			const testWebhooksRequestHandler = (0, webhook_request_handler_1.createWebhookHandlerFor)(
				di_1.Container.get(test_webhooks_1.TestWebhooks),
			);
			this.app.all(`/${this.endpointFormTest}/*path`, testWebhooksRequestHandler);
			this.app.all(`/${this.endpointWebhookTest}/*path`, testWebhooksRequestHandler);
			this.app.all(`/${this.endpointMcpTest}/*path`, testWebhooksRequestHandler);
		}
		const checkIfBot = isbot_1.default.spawn(['bot']);
		this.app.use((req, res, next) => {
			const userAgent = req.headers['user-agent'];
			if (userAgent && checkIfBot(userAgent)) {
				this.logger.info(`Blocked ${req.method} ${req.url} for "${userAgent}"`);
				res.status(204).end();
			} else next();
		});
		if (backend_common_1.inDevelopment) {
			this.setupDevMiddlewares();
		}
		if (this.testWebhooksEnabled) {
			const testWebhooks = di_1.Container.get(test_webhooks_1.TestWebhooks);
			this.app.delete(
				`/${this.restEndpoint}/test-webhook/:id`,
				(0, response_helper_1.send)(async (req) => await testWebhooks.cancelWebhook(req.params.id)),
			);
		}
		this.app.use(middlewares_1.bodyParser);
		await this.configure();
		if (!backend_common_1.inTest) {
			this.logger.info(`Version: ${constants_1.N8N_VERSION}`);
			const { defaultLocale } = this.globalConfig;
			if (defaultLocale !== 'en') {
				this.logger.info(`Locale: ${defaultLocale}`);
			}
			await this.externalHooks.run('n8n.ready', [this, config_2.default]);
		}
	}
	async onShutdown() {
		if (!this.server) {
			return;
		}
		const { protocol } = this.globalConfig;
		this.logger.debug(`Shutting down ${protocol} server`);
		this.server.close((error) => {
			if (error) {
				this.logger.error(`Error while shutting down ${protocol} server`, { error });
			}
			this.logger.debug(`${protocol} server shut down`);
		});
	}
};
exports.AbstractServer = AbstractServer;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	AbstractServer.prototype,
	'onShutdown',
	null,
);
exports.AbstractServer = AbstractServer = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [])],
	AbstractServer,
);
//# sourceMappingURL=abstract-server.js.map
