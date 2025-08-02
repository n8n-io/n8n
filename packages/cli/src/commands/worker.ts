import { inTest } from '@n8n/backend-common';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import type { ScalingService } from '@/scaling/scaling.service';
import type { WorkerServerEndpointsConfig } from '@/scaling/worker-server';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

import { BaseCommand } from './base-command';

const flagsSchema = z.object({
	concurrency: z.number().int().default(10).describe('How many jobs can run in parallel.'),
});

@Command({
	name: 'worker',
	description: 'Starts a n8n worker',
	examples: ['--concurrency=5'],
	flagsSchema,
})
export class Worker extends BaseCommand<z.infer<typeof flagsSchema>> {
	/**
	 * How many jobs this worker may run concurrently.
	 *
	 * Taken from env var `N8N_CONCURRENCY_PRODUCTION_LIMIT` if set to a value
	 * other than -1, else taken from `--concurrency` flag.
	 */
	private concurrency: number;

	private scalingService: ScalingService;

	override needsCommunityPackages = true;

	override needsTaskRunner = true;

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
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
		if (config.getEnv('executions.mode') !== 'queue') {
			config.set('executions.mode', 'queue');
		}

		super();

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

		await Container.get(MessageEventBus).send(
			new EventMessageGeneric({
				eventName: 'n8n.worker.started',
				payload: {
					workerId: this.instanceSettings.hostId,
				},
			}),
		);

		await this.moduleRegistry.initModules();
	}

	async initEventBus() {
		await Container.get(MessageEventBus).initialize({
			workerId: this.instanceSettings.hostId,
		});
		Container.get(LogStreamingEventRelay).init();
	}

	/**
	 * Initializes the redis connection
	 * A publishing connection to redis is created to publish events to the event log
	 * A subscription connection to redis is created to subscribe to commands from the main process
	 * The subscription connection adds a handler to handle the command messages
	 */
	async initOrchestration() {
		Container.get(Publisher);

		Container.get(PubSubRegistry).init();
		await Container.get(Subscriber).subscribe('n8n.commands');
		Container.get(WorkerStatusService);
	}

	async setConcurrency() {
		const { flags } = this;

		const envConcurrency = config.getEnv('executions.concurrency.productionLimit');

		this.concurrency = envConcurrency !== -1 ? envConcurrency : flags.concurrency;

		if (this.concurrency < 5) {
			this.logger.warn(
				'Concurrency is set to less than 5. THIS CAN LEAD TO AN UNSTABLE ENVIRONMENT. Please consider increasing it to at least 5 to make best use of the worker.',
			);
		}
	}

	async initScalingService() {
		const { ScalingService } = await import('@/scaling/scaling.service');
		this.scalingService = Container.get(ScalingService);

		await this.scalingService.setupQueue();

		this.scalingService.setupWorker(this.concurrency);
	}

	async run() {
		this.logger.info('\nn8n worker is now ready');
		this.logger.info(` * Version: ${N8N_VERSION}`);
		this.logger.info(` * Concurrency: ${this.concurrency}`);
		this.logger.info('');

		const endpointsConfig: WorkerServerEndpointsConfig = {
			health: this.globalConfig.queue.health.active,
			overwrites: this.globalConfig.credentials.overwrite.endpoint !== '',
			metrics: this.globalConfig.endpoints.metrics.enable,
		};

		if (Object.values(endpointsConfig).some((e) => e)) {
			const { WorkerServer } = await import('@/scaling/worker-server');
			await Container.get(WorkerServer).init(endpointsConfig);
		}

		if (!inTest && process.stdout.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', (key: string) => {
				if (key.charCodeAt(0) === 3) process.kill(process.pid, 'SIGINT'); // ctrl+c
			});
		}

		// Make sure that the process does not close
		if (!inTest) await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Worker exiting due to an error.', error);
	}
}
