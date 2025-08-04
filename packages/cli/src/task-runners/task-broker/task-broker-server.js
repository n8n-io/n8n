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
exports.TaskBrokerServer = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const compression_1 = __importDefault(require('compression'));
const express_1 = __importDefault(require('express'));
const express_rate_limit_1 = require('express-rate-limit');
const a = __importStar(require('node:assert/strict'));
const node_crypto_1 = require('node:crypto');
const node_http_1 = require('node:http');
const node_url_1 = require('node:url');
const ws_1 = require('ws');
const middlewares_1 = require('@/middlewares');
const response_helper_1 = require('@/response-helper');
const task_broker_auth_controller_1 = require('@/task-runners/task-broker/auth/task-broker-auth.controller');
const task_broker_ws_server_1 = require('@/task-runners/task-broker/task-broker-ws-server');
let TaskBrokerServer = class TaskBrokerServer {
	get port() {
		return this.server?.address()?.port;
	}
	get upgradeEndpoint() {
		return `${this.getEndpointBasePath()}/_ws`;
	}
	constructor(logger, globalConfig, authController, taskBrokerWsServer) {
		this.logger = logger;
		this.globalConfig = globalConfig;
		this.authController = authController;
		this.taskBrokerWsServer = taskBrokerWsServer;
		this.handleUpgradeRequest = (request, socket, head) => {
			if ((0, node_url_1.parse)(request.url).pathname !== this.upgradeEndpoint) {
				socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
				socket.destroy();
				return;
			}
			if (!this.wsServer) {
				socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
				socket.destroy();
				return;
			}
			this.wsServer.handleUpgrade(request, socket, head, (ws) => {
				request.ws = ws;
				const response = new node_http_1.ServerResponse(request);
				response.writeHead = (statusCode) => {
					if (statusCode > 200) {
						this.logger.error(
							`Task runner connection attempt failed with status code ${statusCode}`,
						);
						ws.close();
					}
					return response;
				};
				this.app.handle(request, response);
			});
		};
		this.app = (0, express_1.default)();
		this.app.disable('x-powered-by');
		if (!this.globalConfig.taskRunners.authToken) {
			this.globalConfig.taskRunners.authToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
		}
	}
	async start() {
		await this.setupHttpServer();
		this.setupWsServer();
		if (!backend_common_1.inTest) {
			await this.setupErrorHandlers();
		}
		this.setupCommonMiddlewares();
		this.configureRoutes();
	}
	async stop() {
		if (this.wsServer) {
			this.wsServer.close();
			this.wsServer = undefined;
		}
		const stopHttpServerTask = (async () => {
			if (this.server) {
				await new Promise((resolve) => this.server?.close(() => resolve()));
				this.server = undefined;
			}
		})();
		const stopWsServerTask = this.taskBrokerWsServer.stop();
		await Promise.all([stopHttpServerTask, stopWsServerTask]);
	}
	async setupHttpServer() {
		const { app } = this;
		this.server = (0, node_http_1.createServer)(app);
		const {
			taskRunners: { port, listenAddress: address },
		} = this.globalConfig;
		this.server.on('error', (error) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.info(
					`n8n Task Broker's port ${port} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});
		await new Promise((resolve) => {
			a.ok(this.server);
			this.server.listen(port, address, () => resolve());
		});
		this.logger.info(`n8n Task Broker ready on ${address}, port ${port}`);
	}
	setupWsServer() {
		const { authToken } = this.globalConfig.taskRunners;
		a.ok(authToken);
		a.ok(this.server);
		this.wsServer = new ws_1.Server({
			noServer: true,
			maxPayload: this.globalConfig.taskRunners.maxPayload,
		});
		this.server.on('upgrade', this.handleUpgradeRequest);
		this.taskBrokerWsServer.start();
	}
	async setupErrorHandlers() {
		const { app } = this;
		if (this.globalConfig.sentry.backendDsn) {
			const { setupExpressErrorHandler } = await Promise.resolve().then(() =>
				__importStar(require('@sentry/node')),
			);
			setupExpressErrorHandler(app);
		}
	}
	setupCommonMiddlewares() {
		this.app.use((0, compression_1.default)());
		this.app.use(middlewares_1.rawBodyReader);
		this.app.use(middlewares_1.bodyParser);
	}
	configureRoutes() {
		const createRateLimiter = () =>
			(0, express_rate_limit_1.rateLimit)({
				windowMs: 1000,
				limit: 5,
				message: { message: 'Too many requests' },
			});
		this.app.use(
			this.upgradeEndpoint,
			createRateLimiter(),
			this.authController.authMiddleware,
			(req, res) => this.taskBrokerWsServer.handleRequest(req, res),
		);
		const authEndpoint = `${this.getEndpointBasePath()}/auth`;
		this.app.post(
			authEndpoint,
			createRateLimiter(),
			(0, response_helper_1.send)(async (req) => await this.authController.createGrantToken(req)),
		);
		this.app.get('/healthz', (_, res) => {
			res.send({ status: 'ok' });
		});
	}
	getEndpointBasePath() {
		let path = this.globalConfig.taskRunners.path;
		if (!path.startsWith('/')) {
			path = `/${path}`;
		}
		if (path.endsWith('/')) {
			path = path.slice(-1);
		}
		return path;
	}
};
exports.TaskBrokerServer = TaskBrokerServer;
exports.TaskBrokerServer = TaskBrokerServer = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			config_1.GlobalConfig,
			task_broker_auth_controller_1.TaskBrokerAuthController,
			task_broker_ws_server_1.TaskBrokerWsServer,
		]),
	],
	TaskBrokerServer,
);
//# sourceMappingURL=task-broker-server.js.map
