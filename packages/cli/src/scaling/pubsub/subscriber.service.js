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
exports.Subscriber = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const debounce_1 = __importDefault(require('lodash/debounce'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const config_1 = __importDefault(require('@/config'));
const redis_client_service_1 = require('@/services/redis-client.service');
const pubsub_eventbus_1 = require('./pubsub.eventbus');
let Subscriber = class Subscriber {
	constructor(logger, instanceSettings, pubsubEventBus, redisClientService) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.pubsubEventBus = pubsubEventBus;
		this.redisClientService = redisClientService;
		if (config_1.default.getEnv('executions.mode') !== 'queue') return;
		this.logger = this.logger.scoped(['scaling', 'pubsub']);
		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });
		const handlerFn = (msg) => {
			const eventName = 'command' in msg ? msg.command : msg.response;
			this.pubsubEventBus.emit(eventName, msg.payload);
		};
		const debouncedHandlerFn = (0, debounce_1.default)(handlerFn, 300);
		this.client.on('message', (channel, str) => {
			const msg = this.parseMessage(str, channel);
			if (!msg) return;
			if (msg.debounce) debouncedHandlerFn(msg);
			else handlerFn(msg);
		});
	}
	getClient() {
		return this.client;
	}
	shutdown() {
		this.client.disconnect();
	}
	async subscribe(channel) {
		await this.client.subscribe(channel, (error) => {
			if (error) {
				this.logger.error(`Failed to subscribe to channel ${channel}`, { error });
				return;
			}
			this.logger.debug(`Subscribed to channel ${channel}`);
		});
	}
	parseMessage(str, channel) {
		const msg = (0, n8n_workflow_1.jsonParse)(str, {
			fallbackValue: null,
		});
		if (!msg) {
			this.logger.error('Received malformed pubsub message', {
				msg: str,
				channel,
			});
			return null;
		}
		const { hostId } = this.instanceSettings;
		if (
			'command' in msg &&
			!msg.selfSend &&
			(msg.senderId === hostId || (msg.targets && !msg.targets.includes(hostId)))
		) {
			return null;
		}
		let msgName = 'command' in msg ? msg.command : msg.response;
		const metadata = { msg: msgName, channel };
		if ('command' in msg && msg.command === 'relay-execution-lifecycle-event') {
			const { data, type } = msg.payload;
			msgName += ` (${type})`;
			metadata.type = type;
			if ('executionId' in data) metadata.executionId = data.executionId;
		}
		this.logger.debug(`Received pubsub msg: ${msgName}`, metadata);
		return msg;
	}
};
exports.Subscriber = Subscriber;
exports.Subscriber = Subscriber = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			pubsub_eventbus_1.PubSubEventBus,
			redis_client_service_1.RedisClientService,
		]),
	],
	Subscriber,
);
//# sourceMappingURL=subscriber.service.js.map
