'use strict';
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
exports.RedisClientService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const ioredis_1 = __importDefault(require('ioredis'));
const typed_emitter_1 = require('@/typed-emitter');
let RedisClientService = class RedisClientService extends typed_emitter_1.TypedEmitter {
	constructor(logger, globalConfig) {
		super();
		this.logger = logger;
		this.globalConfig = globalConfig;
		this.clients = new Set();
		this.config = {
			maxTimeout: this.globalConfig.queue.bull.redis.timeoutThreshold,
			retryInterval: 1000,
			resetLength: 30_000,
		};
		this.lostConnection = false;
		this.logger = this.logger.scoped(['redis', 'scaling']);
		this.registerListeners();
	}
	isConnected() {
		return !this.lostConnection;
	}
	createClient(arg) {
		const client =
			this.clusterNodes().length > 0
				? this.createClusterClient(arg)
				: this.createRegularClient(arg);
		client.on('error', (error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return;
			this.logger.error(`[Redis client] ${error.message}`, { error });
		});
		client.on('ready', () => {
			if (this.lostConnection) {
				this.emit('connection-recovered');
				this.lostConnection = false;
			}
		});
		this.clients.add(client);
		return client;
	}
	toValidPrefix(prefix) {
		if (this.clusterNodes().length > 0) {
			if (!prefix.startsWith('{')) prefix = '{' + prefix;
			if (!prefix.endsWith('}')) prefix += '}';
		}
		return prefix;
	}
	createRegularClient({ type, extraOptions }) {
		const options = this.getOptions({ extraOptions });
		const { host, port } = this.globalConfig.queue.bull.redis;
		options.host = host;
		options.port = port;
		const client = new ioredis_1.default(options);
		this.logger.debug(`Started Redis client ${type}`, { type, host, port });
		return client;
	}
	createClusterClient({ type, extraOptions }) {
		const options = this.getOptions({ extraOptions });
		const clusterNodes = this.clusterNodes();
		const clusterClient = new ioredis_1.default.Cluster(clusterNodes, {
			redisOptions: options,
			clusterRetryStrategy: this.retryStrategy(),
		});
		this.logger.debug(`Started Redis cluster client ${type}`, { type, clusterNodes });
		return clusterClient;
	}
	getOptions({ extraOptions }) {
		const { username, password, db, tls, dualStack } = this.globalConfig.queue.bull.redis;
		const options = {
			username,
			password,
			db,
			enableReadyCheck: false,
			maxRetriesPerRequest: null,
			retryStrategy: this.retryStrategy(),
			...extraOptions,
		};
		if (dualStack) options.family = 0;
		if (tls) options.tls = {};
		return options;
	}
	retryStrategy() {
		let lastAttemptTs = 0;
		let cumulativeTimeout = 0;
		return () => {
			const nowTs = Date.now();
			if (nowTs - lastAttemptTs > this.config.resetLength) {
				cumulativeTimeout = 0;
				lastAttemptTs = nowTs;
			} else {
				cumulativeTimeout += nowTs - lastAttemptTs;
				lastAttemptTs = nowTs;
				if (cumulativeTimeout > this.config.maxTimeout) {
					const maxTimeout = Math.round(this.config.maxTimeout / 1000) + 's';
					this.logger.error(`Unable to connect to Redis after trying to connect for ${maxTimeout}`);
					this.logger.error('Exiting process due to Redis connection error');
					process.exit(1);
				}
			}
			this.emit('connection-lost', cumulativeTimeout);
			return this.config.retryInterval;
		};
	}
	clusterNodes() {
		return this.globalConfig.queue.bull.redis.clusterNodes
			.split(',')
			.filter((pair) => pair.trim().length > 0)
			.map((pair) => {
				const [host, port] = pair.split(':');
				return { host, port: parseInt(port) };
			});
	}
	emit(event, ...args) {
		return super.emit(event, ...args);
	}
	registerListeners() {
		const { maxTimeout: maxTimeoutMs, retryInterval: retryIntervalMs } = this.config;
		const retryInterval = this.formatTimeout(retryIntervalMs);
		const maxTimeout = this.formatTimeout(maxTimeoutMs);
		this.on('connection-lost', (cumulativeTimeoutMs) => {
			const cumulativeTimeout = this.formatTimeout(cumulativeTimeoutMs);
			const reconnectionMsg = `Trying to reconnect in ${retryInterval}...`;
			const timeoutDetails = `${cumulativeTimeout}/${maxTimeout}`;
			this.logger.warn(`Lost Redis connection. ${reconnectionMsg} (${timeoutDetails})`);
			this.lostConnection = true;
		});
		this.on('connection-recovered', () => {
			this.logger.info('Recovered Redis connection');
		});
	}
	formatTimeout(timeoutMs) {
		const timeoutSeconds = timeoutMs / 1000;
		const roundedTimeout = Math.round(timeoutSeconds * 10) / 10;
		return roundedTimeout + 's';
	}
};
exports.RedisClientService = RedisClientService;
__decorate(
	[
		(0, decorators_1.Debounce)(1000),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Event, Object]),
		__metadata('design:returntype', Boolean),
	],
	RedisClientService.prototype,
	'emit',
	null,
);
exports.RedisClientService = RedisClientService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, config_1.GlobalConfig]),
	],
	RedisClientService,
);
//# sourceMappingURL=redis-client.service.js.map
