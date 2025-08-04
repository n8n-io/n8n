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
Object.defineProperty(exports, '__esModule', { value: true });
exports.MultiMainSetup = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const redis_client_service_1 = require('@/services/redis-client.service');
const typed_emitter_1 = require('@/typed-emitter');
let MultiMainSetup = class MultiMainSetup extends typed_emitter_1.TypedEmitter {
	constructor(logger, instanceSettings, publisher, redisClientService, globalConfig, metadata) {
		super();
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.publisher = publisher;
		this.redisClientService = redisClientService;
		this.globalConfig = globalConfig;
		this.metadata = metadata;
		this.leaderKeyTtl = this.globalConfig.multiMainSetup.ttl;
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);
	}
	async init() {
		const prefix = this.globalConfig.redis.prefix;
		const validPrefix = this.redisClientService.toValidPrefix(prefix);
		this.leaderKey = validPrefix + ':main_instance_leader';
		await this.tryBecomeLeader();
		this.leaderCheckInterval = setInterval(async () => {
			await this.checkLeader();
		}, this.globalConfig.multiMainSetup.interval * constants_1.Time.seconds.toMilliseconds);
	}
	async shutdown() {
		clearInterval(this.leaderCheckInterval);
		const { isLeader } = this.instanceSettings;
		if (isLeader) await this.publisher.clear(this.leaderKey);
	}
	async checkLeader() {
		const leaderId = await this.publisher.get(this.leaderKey);
		const { hostId } = this.instanceSettings;
		if (leaderId === hostId) {
			this.logger.debug(`[Instance ID ${hostId}] Leader is this instance`);
			await this.publisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
			return;
		}
		if (leaderId && leaderId !== hostId) {
			this.logger.debug(`[Instance ID ${hostId}] Leader is other instance "${leaderId}"`);
			if (this.instanceSettings.isLeader) {
				this.instanceSettings.markAsFollower();
				this.emit('leader-stepdown');
				this.logger.warn('[Multi-main setup] Leader failed to renew leader key');
			}
			return;
		}
		if (!leaderId) {
			this.logger.debug(
				`[Instance ID ${hostId}] Leadership vacant, attempting to become leader...`,
			);
			this.instanceSettings.markAsFollower();
			this.emit('leader-stepdown');
			await this.tryBecomeLeader();
		}
	}
	async tryBecomeLeader() {
		const { hostId } = this.instanceSettings;
		const keySetSuccessfully = await this.publisher.setIfNotExists(
			this.leaderKey,
			hostId,
			this.leaderKeyTtl,
		);
		if (keySetSuccessfully) {
			this.logger.info(`[Instance ID ${hostId}] Leader is now this instance`);
			this.instanceSettings.markAsLeader();
			this.emit('leader-takeover');
		} else {
			this.instanceSettings.markAsFollower();
		}
	}
	async fetchLeaderKey() {
		return await this.publisher.get(this.leaderKey);
	}
	registerEventHandlers() {
		const handlers = this.metadata.getHandlers();
		for (const { eventHandlerClass, methodName, eventName } of handlers) {
			const instance = di_1.Container.get(eventHandlerClass);
			this.on(eventName, async () => {
				return instance[methodName].call(instance);
			});
		}
	}
};
exports.MultiMainSetup = MultiMainSetup;
exports.MultiMainSetup = MultiMainSetup = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			publisher_service_1.Publisher,
			redis_client_service_1.RedisClientService,
			config_1.GlobalConfig,
			decorators_1.MultiMainMetadata,
		]),
	],
	MultiMainSetup,
);
//# sourceMappingURL=multi-main-setup.ee.js.map
