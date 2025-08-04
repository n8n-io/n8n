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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.Webhook = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const active_executions_1 = require('@/active-executions');
const config_1 = __importDefault(require('@/config'));
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const pubsub_registry_1 = require('@/scaling/pubsub/pubsub.registry');
const subscriber_service_1 = require('@/scaling/pubsub/subscriber.service');
const webhook_server_1 = require('@/webhooks/webhook-server');
const base_command_1 = require('./base-command');
let Webhook = class Webhook extends base_command_1.BaseCommand {
	constructor() {
		super(...arguments);
		this.server = di_1.Container.get(webhook_server_1.WebhookServer);
		this.needsCommunityPackages = true;
	}
	async stopProcess() {
		this.logger.info('\nStopping n8n...');
		try {
			await this.externalHooks?.run('n8n.stop');
			await di_1.Container.get(active_executions_1.ActiveExecutions).shutdown();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}
		await this.exitSuccessFully();
	}
	async init() {
		if (config_1.default.getEnv('executions.mode') !== 'queue') {
			this.error('Webhook processes can only run with execution mode as queue.');
		}
		await this.initCrashJournal();
		this.logger.debug('Crash journal initialized');
		this.logger.info('Starting n8n webhook process...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);
		await super.init();
		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initDataDeduplicationService();
		this.logger.debug('Data deduplication service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.moduleRegistry.initModules();
	}
	async run() {
		const { ScalingService } = await Promise.resolve().then(() =>
			__importStar(require('@/scaling/scaling.service')),
		);
		await di_1.Container.get(ScalingService).setupQueue();
		await this.server.start();
		this.logger.info('Webhook listener waiting for requests.');
		await new Promise(() => {});
	}
	async catch(error) {
		await this.exitWithCrash('Exiting due to an error.', error);
	}
	async initOrchestration() {
		di_1.Container.get(publisher_service_1.Publisher);
		di_1.Container.get(pubsub_registry_1.PubSubRegistry).init();
		await di_1.Container.get(subscriber_service_1.Subscriber).subscribe('n8n.commands');
	}
};
exports.Webhook = Webhook;
exports.Webhook = Webhook = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'webhook',
			description: 'Starts n8n webhook process. Intercepts only production URLs.',
		}),
	],
	Webhook,
);
//# sourceMappingURL=webhook.js.map
