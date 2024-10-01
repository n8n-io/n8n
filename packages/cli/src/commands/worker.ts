import { Flags, type Config } from '@oclif/core';
import { ApplicationError } from 'n8n-workflow';
import { Container } from 'typedi';

import config from '@/config';
import { N8N_VERSION, inTest } from '@/constants';
import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { JobProcessor } from '@/scaling/job-processor';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { ScalingService } from '@/scaling/scaling.service';
import type { WorkerServerEndpointsConfig } from '@/scaling/worker-server';
import { OrchestrationHandlerWorkerService } from '@/services/orchestration/worker/orchestration.handler.worker.service';
import { OrchestrationWorkerService } from '@/services/orchestration/worker/orchestration.worker.service';

import { BaseCommand } from './base-command';

export class Worker extends BaseCommand {
	static description = '\nStarts a n8n worker';

	static examples = ['$ n8n worker --concurrency=5'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		concurrency: Flags.integer({
			default: 10,
			description: 'How many jobs can run in parallel.',
		}),
	};

	/**
	 * How many jobs this worker may run concurrently.
	 *
	 * Taken from env var `N8N_CONCURRENCY_PRODUCTION_LIMIT` if set to a value
	 * other than -1, else taken from `--concurrency` flag.
	 */
	concurrency: number;

	scalingService: ScalingService;

	jobProcessor: JobProcessor;

	override needsCommunityPackages = true;

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('Stopping n8n...');

		try {
			await this.externalHooks?.run('n8n.stop', []);
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	constructor(argv: string[], cmdConfig: Config) {
		super(argv, cmdConfig);

		if (!process.env.N8N_ENCRYPTION_KEY) {
			throw new ApplicationError(
				'Missing encryption key. Worker started without the required N8N_ENCRYPTION_KEY env var. More information: https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/',
			);
		}

		this.setInstanceQueueModeId();
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
		this.logger.debug(`Queue mode id: ${this.queueModeId}`);

		await this.setConcurrency();
		await super.init();

		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initExternalSecrets();
		this.logger.debug('External secrets init complete');
		await this.initEventBus();
		this.logger.debug('Event bus init complete');
		await this.initScalingService();
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');

		await Container.get(MessageEventBus).send(
			new EventMessageGeneric({
				eventName: 'n8n.worker.started',
				payload: {
					workerId: this.queueModeId,
				},
			}),
		);
	}

	async initEventBus() {
		await Container.get(MessageEventBus).initialize({
			workerId: this.queueModeId,
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
		await Container.get(OrchestrationWorkerService).init();
		await Container.get(OrchestrationHandlerWorkerService).initWithOptions({
			queueModeId: this.queueModeId,
			publisher: Container.get(Publisher),
			getRunningJobIds: () => this.jobProcessor.getRunningJobIds(),
			getRunningJobsSummary: () => this.jobProcessor.getRunningJobsSummary(),
		});
	}

	async setConcurrency() {
		const { flags } = await this.parse(Worker);

		const envConcurrency = config.getEnv('executions.concurrency.productionLimit');

		this.concurrency = envConcurrency !== -1 ? envConcurrency : flags.concurrency;
	}

	async initScalingService() {
		const { ScalingService } = await import('@/scaling/scaling.service');
		this.scalingService = Container.get(ScalingService);

		await this.scalingService.setupQueue();

		this.scalingService.setupWorker(this.concurrency);

		this.jobProcessor = Container.get(JobProcessor);
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
