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
exports.WorkerServer = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const express_1 = __importDefault(require('express'));
const n8n_core_1 = require('n8n-core');
const node_assert_1 = require('node:assert');
const node_http_1 = __importDefault(require('node:http'));
const credentials_overwrites_1 = require('@/credentials-overwrites');
const credentials_overwrites_already_set_error_1 = require('@/errors/credentials-overwrites-already-set.error');
const non_json_body_error_1 = require('@/errors/non-json-body.error');
const external_hooks_1 = require('@/external-hooks');
const prometheus_metrics_service_1 = require('@/metrics/prometheus-metrics.service');
const middlewares_1 = require('@/middlewares');
const ResponseHelper = __importStar(require('@/response-helper'));
const redis_client_service_1 = require('@/services/redis-client.service');
let WorkerServer = class WorkerServer {
	constructor(
		globalConfig,
		logger,
		dbConnection,
		credentialsOverwrites,
		externalHooks,
		instanceSettings,
		prometheusMetricsService,
		redisClientService,
	) {
		this.globalConfig = globalConfig;
		this.logger = logger;
		this.dbConnection = dbConnection;
		this.credentialsOverwrites = credentialsOverwrites;
		this.externalHooks = externalHooks;
		this.instanceSettings = instanceSettings;
		this.prometheusMetricsService = prometheusMetricsService;
		this.redisClientService = redisClientService;
		this.overwritesLoaded = false;
		(0, node_assert_1.strict)(this.instanceSettings.instanceType === 'worker');
		this.logger = this.logger.scoped('scaling');
		this.app = (0, express_1.default)();
		this.app.disable('x-powered-by');
		this.server = node_http_1.default.createServer(this.app);
		this.port = this.globalConfig.queue.health.port;
		this.address = this.globalConfig.queue.health.address;
		this.server.on('error', (error) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.error(
					`Port ${this.port} is already in use, possibly by the n8n main process server. Please set a different port for the worker server.`,
				);
				process.exit(1);
			}
		});
	}
	async init(endpointsConfig) {
		(0, node_assert_1.strict)(Object.values(endpointsConfig).some((e) => e));
		this.endpointsConfig = endpointsConfig;
		await this.mountEndpoints();
		this.logger.debug('Worker server initialized', {
			endpoints: Object.keys(this.endpointsConfig),
		});
		await new Promise((resolve) => this.server.listen(this.port, this.address, resolve));
		await this.externalHooks.run('worker.ready');
		this.logger.info(`\nn8n worker server listening on port ${this.port}`);
	}
	async mountEndpoints() {
		const { health, overwrites, metrics } = this.endpointsConfig;
		if (health) {
			this.app.get('/healthz', async (_, res) => {
				res.send({ status: 'ok' });
			});
			this.app.get('/healthz/readiness', async (_, res) => {
				await this.readiness(_, res);
			});
		}
		if (overwrites) {
			const { endpoint } = this.globalConfig.credentials.overwrite;
			this.app.post(
				`/${endpoint}`,
				middlewares_1.rawBodyReader,
				middlewares_1.bodyParser,
				(req, res) => this.handleOverwrites(req, res),
			);
		}
		if (metrics) {
			await this.prometheusMetricsService.init(this.app);
		}
	}
	async readiness(_req, res) {
		const { connectionState } = this.dbConnection;
		const isReady =
			connectionState.connected &&
			connectionState.migrated &&
			this.redisClientService.isConnected();
		return isReady
			? res.status(200).send({ status: 'ok' })
			: res.status(503).send({ status: 'error' });
	}
	handleOverwrites(req, res) {
		if (this.overwritesLoaded) {
			ResponseHelper.sendErrorResponse(
				res,
				new credentials_overwrites_already_set_error_1.CredentialsOverwritesAlreadySetError(),
			);
			return;
		}
		if (req.contentType !== 'application/json') {
			ResponseHelper.sendErrorResponse(res, new non_json_body_error_1.NonJsonBodyError());
			return;
		}
		this.credentialsOverwrites.setData(req.body);
		this.overwritesLoaded = true;
		this.logger.debug('Worker loaded credentials overwrites');
		ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
	}
};
exports.WorkerServer = WorkerServer;
exports.WorkerServer = WorkerServer = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			config_1.GlobalConfig,
			backend_common_1.Logger,
			db_1.DbConnection,
			credentials_overwrites_1.CredentialsOverwrites,
			external_hooks_1.ExternalHooks,
			n8n_core_1.InstanceSettings,
			prometheus_metrics_service_1.PrometheusMetricsService,
			redis_client_service_1.RedisClientService,
		]),
	],
	WorkerServer,
);
//# sourceMappingURL=worker-server.js.map
