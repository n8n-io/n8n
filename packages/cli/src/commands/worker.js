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
exports.Worker = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const event_message_generic_1 = require('@/eventbus/event-message-classes/event-message-generic');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const log_streaming_event_relay_1 = require('@/events/relays/log-streaming.event-relay');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const pubsub_registry_1 = require('@/scaling/pubsub/pubsub.registry');
const subscriber_service_1 = require('@/scaling/pubsub/subscriber.service');
const worker_status_service_ee_1 = require('@/scaling/worker-status.service.ee');
const base_command_1 = require('./base-command');
const flagsSchema = zod_1.z.object({
	concurrency: zod_1.z.number().int().default(10).describe('How many jobs can run in parallel.'),
});
let Worker = class Worker extends base_command_1.BaseCommand {
	async stopProcess() {
		this.logger.info('Stopping worker...');
		try {
			await this.externalHooks?.run('n8n.stop');
		} catch (error) {
			await this.exitWithCrash('Error shutting down worker', error);
		}
		await this.exitSuccessFully();
	}
	constructor() {
		if (config_1.default.getEnv('executions.mode') !== 'queue') {
			config_1.default.set('executions.mode', 'queue');
		}
		super();
		this.needsCommunityPackages = true;
		this.needsTaskRunner = true;
		this.logger = this.logger.scoped('scaling');
	}
	async init() {
		const { QUEUE_WORKER_TIMEOUT } = process.env;
		if (QUEUE_WORKER_TIMEOUT) {
			this.gracefulShutdownTimeoutInS =
				parseInt(QUEUE_WORKER_TIMEOUT, 10) || this.globalConfig.queue.bull.gracefulShutdownTimeout;
			this.logger.warn(
				'QUEUE_WORKER_TIMEOUT has been deprecated. Rename it to N8N_GRACEFUL_SHUTDOWN_TIMEOUT.',
			);
		}
		await this.initCrashJournal();
		this.logger.debug('Starting n8n worker...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);
		await this.setConcurrency();
		await super.init();
		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initDataDeduplicationService();
		this.logger.debug('Data deduplication service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initEventBus();
		this.logger.debug('Event bus init complete');
		await this.initScalingService();
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');
		await di_1.Container.get(message_event_bus_1.MessageEventBus).send(
			new event_message_generic_1.EventMessageGeneric({
				eventName: 'n8n.worker.started',
				payload: {
					workerId: this.instanceSettings.hostId,
				},
			}),
		);
		await this.moduleRegistry.initModules();
	}
	async initEventBus() {
		await di_1.Container.get(message_event_bus_1.MessageEventBus).initialize({
			workerId: this.instanceSettings.hostId,
		});
		di_1.Container.get(log_streaming_event_relay_1.LogStreamingEventRelay).init();
	}
	async initOrchestration() {
		di_1.Container.get(publisher_service_1.Publisher);
		di_1.Container.get(pubsub_registry_1.PubSubRegistry).init();
		await di_1.Container.get(subscriber_service_1.Subscriber).subscribe('n8n.commands');
		di_1.Container.get(worker_status_service_ee_1.WorkerStatusService);
	}
	async setConcurrency() {
		const { flags } = this;
		const envConcurrency = config_1.default.getEnv('executions.concurrency.productionLimit');
		this.concurrency = envConcurrency !== -1 ? envConcurrency : flags.concurrency;
		if (this.concurrency < 5) {
			this.logger.warn(
				'Concurrency is set to less than 5. THIS CAN LEAD TO AN UNSTABLE ENVIRONMENT. Please consider increasing it to at least 5 to make best use of the worker.',
			);
		}
	}
	async initScalingService() {
		const { ScalingService } = await Promise.resolve().then(() =>
			__importStar(require('@/scaling/scaling.service')),
		);
		this.scalingService = di_1.Container.get(ScalingService);
		await this.scalingService.setupQueue();
		this.scalingService.setupWorker(this.concurrency);
	}
	async run() {
		this.logger.info('\nn8n worker is now ready');
		this.logger.info(` * Version: ${constants_1.N8N_VERSION}`);
		this.logger.info(` * Concurrency: ${this.concurrency}`);
		this.logger.info('');
		const endpointsConfig = {
			health: this.globalConfig.queue.health.active,
			overwrites: this.globalConfig.credentials.overwrite.endpoint !== '',
			metrics: this.globalConfig.endpoints.metrics.enable,
		};
		if (Object.values(endpointsConfig).some((e) => e)) {
			const { WorkerServer } = await Promise.resolve().then(() =>
				__importStar(require('@/scaling/worker-server')),
			);
			await di_1.Container.get(WorkerServer).init(endpointsConfig);
		}
		if (!backend_common_1.inTest && process.stdout.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			process.stdin.on('data', (key) => {
				if (key.charCodeAt(0) === 3) process.kill(process.pid, 'SIGINT');
			});
		}
		if (!backend_common_1.inTest) await new Promise(() => {});
	}
	async catch(error) {
		await this.exitWithCrash('Worker exiting due to an error.', error);
	}
};
exports.Worker = Worker;
exports.Worker = Worker = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'worker',
			description: 'Starts a n8n worker',
			examples: ['--concurrency=5'],
			flagsSchema,
		}),
		__metadata('design:paramtypes', []),
	],
	Worker,
);
//# sourceMappingURL=worker.js.map
