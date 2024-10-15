import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import {
	ApplicationError,
	BINARY_ENCODING,
	sleep,
	jsonStringify,
	ErrorReporterProxy,
	ensureError,
} from 'n8n-workflow';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { strict } from 'node:assert';
import Container, { Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { HIGHEST_SHUTDOWN_PRIORITY, Time } from '@/constants';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { OnShutdown } from '@/decorators/on-shutdown';
import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import { EventService } from '@/events/event.service';
import { Logger } from '@/logging/logger.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { assertNever } from '@/utils';

import { JOB_TYPE_NAME, QUEUE_NAME } from './constants';
import { JobProcessor } from './job-processor';
import type {
	JobQueue,
	Job,
	JobData,
	JobOptions,
	JobStatus,
	JobId,
	QueueRecoveryContext,
	JobMessage,
	JobFailedMessage,
} from './scaling.types';

@Service()
export class ScalingService {
	private queue: JobQueue;

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobProcessor: JobProcessor,
		private readonly globalConfig: GlobalConfig,
		private readonly executionRepository: ExecutionRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly orchestrationService: OrchestrationService,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.withScope('scaling');
	}

	// #region Lifecycle

	async setupQueue() {
		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@/services/redis-client.service');
		const service = Container.get(RedisClientService);

		const bullPrefix = this.globalConfig.queue.bull.prefix;
		const prefix = service.toValidPrefix(bullPrefix);

		this.queue = new BullQueue(QUEUE_NAME, {
			prefix,
			settings: this.globalConfig.queue.bull.settings,
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});

		this.registerListeners();

		if (this.instanceSettings.isLeader) this.scheduleQueueRecovery();

		if (this.orchestrationService.isMultiMainSetupEnabled) {
			this.orchestrationService.multiMainSetup
				.on('leader-takeover', () => this.scheduleQueueRecovery())
				.on('leader-stepdown', () => this.stopQueueRecovery());
		}

		this.scheduleQueueMetrics();

		this.logger.debug('Queue setup completed');
	}

	setupWorker(concurrency: number) {
		this.assertWorker();
		this.assertQueue();

		void this.queue.process(JOB_TYPE_NAME, concurrency, async (job: Job) => {
			try {
				await this.jobProcessor.processJob(job);
			} catch (error) {
				await this.reportJobProcessingError(ensureError(error), job);
			}
		});

		this.logger.debug('Worker setup completed');
	}

	private async reportJobProcessingError(error: Error, job: Job) {
		const { executionId } = job.data;

		this.logger.error(`Worker errored while running execution ${executionId} (job ${job.id})`, {
			error,
			executionId,
			jobId: job.id,
		});

		const msg: JobFailedMessage = {
			kind: 'job-failed',
			executionId,
			workerId: this.instanceSettings.hostId,
			errorMsg: error.message,
			errorStack: error.stack ?? '',
		};

		await job.progress(msg);

		ErrorReporterProxy.error(error, { executionId });

		throw error;
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop() {
		await this.queue.pause(true, true); // no more jobs will be picked up

		this.logger.debug('Queue paused');

		this.stopQueueRecovery();
		this.stopQueueMetrics();

		let count = 0;

		while (this.getRunningJobsCount() !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(
					`Waiting for ${this.getRunningJobsCount()} active executions to finish...`,
				);
			}

			await sleep(500);
		}
	}

	async pingQueue() {
		await this.queue.client.ping();
	}

	// #endregion

	// #region Jobs

	async getPendingJobCounts() {
		const { active, waiting } = await this.queue.getJobCounts();

		return { active, waiting };
	}

	/**
	 * Add a job to the queue.
	 *
	 * @param jobData Data of the job to add to the queue.
	 * @param priority Priority of the job, from `1` (highest) to `MAX_SAFE_INTEGER` (lowest).
	 */
	async addJob(jobData: JobData, { priority }: { priority: number }) {
		strict(priority > 0 && priority <= Number.MAX_SAFE_INTEGER);

		const jobOptions: JobOptions = {
			priority,
			removeOnComplete: true,
			removeOnFail: true,
		};

		const job = await this.queue.add(JOB_TYPE_NAME, jobData, jobOptions);

		const { executionId } = jobData;
		const jobId = job.id;

		this.logger.info(`Enqueued execution ${executionId} (job ${jobId})`, { executionId, jobId });

		return job;
	}

	async getJob(jobId: JobId) {
		return await this.queue.getJob(jobId);
	}

	async findJobsByStatus(statuses: JobStatus[]) {
		const jobs = await this.queue.getJobs(statuses);

		return jobs.filter((job) => job !== null);
	}

	async stopJob(job: Job) {
		const props = { jobId: job.id, executionId: job.data.executionId };

		try {
			if (await job.isActive()) {
				await job.progress({ kind: 'abort-job' }); // being processed by worker
				this.logger.debug('Stopped active job', props);
				return true;
			}

			await job.remove(); // not yet picked up, or waiting for next pickup (stalled)
			this.logger.debug('Stopped inactive job', props);
			return true;
		} catch (error: unknown) {
			await job.progress({ kind: 'abort-job' });
			this.logger.error('Failed to stop job', { ...props, error });
			return false;
		}
	}

	getRunningJobsCount() {
		return this.jobProcessor.getRunningJobIds().length;
	}

	// #endregion

	// #region Listeners

	private registerListeners() {
		const { instanceType } = this.instanceSettings;
		if (instanceType === 'main' || instanceType === 'webhook') {
			this.registerMainOrWebhookListeners();
		} else if (instanceType === 'worker') {
			this.registerWorkerListeners();
		}
	}

	/**
	 * Register listeners on a `worker` process for Bull queue events.
	 */
	private registerWorkerListeners() {
		this.queue.on('global:progress', (jobId: JobId, msg: unknown) => {
			if (!this.isJobMessage(msg)) return;

			if (msg.kind === 'abort-job') this.jobProcessor.stopJob(jobId);
		});

		this.queue.on('error', (error: Error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by RedisClientService.retryStrategy

			if (error.message.includes('job stalled more than maxStalledCount')) {
				throw new MaxStalledCountError(error);
			}

			/**
			 * Non-recoverable error on worker start with Redis unavailable.
			 * Even if Redis recovers, worker will remain unable to process jobs.
			 */
			if (error.message.includes('Error initializing Lua scripts')) {
				this.logger.error('Fatal error initializing worker', { error });
				this.logger.error('Exiting process...');
				process.exit(1);
			}

			this.logger.error('Queue errored', { error });

			throw error;
		});
	}

	/**
	 * Register listeners on a `main` or `webhook` process for Bull queue events.
	 */
	private registerMainOrWebhookListeners() {
		this.queue.on('error', (error: Error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by RedisClientService.retryStrategy

			this.logger.error('Queue errored', { error });

			throw error;
		});

		this.queue.on('global:progress', (jobId: JobId, msg: unknown) => {
			if (!this.isJobMessage(msg)) return;

			// completion and failure are reported via `global:progress` to convey more details
			// than natively provided by Bull in `global:completed` and `global:failed` events

			switch (msg.kind) {
				case 'respond-to-webhook':
					const decodedResponse = this.decodeWebhookResponse(msg.response);
					this.activeExecutions.resolveResponsePromise(msg.executionId, decodedResponse);
					break;
				case 'job-finished':
					this.logger.info(`Execution ${msg.executionId} (job ${jobId}) finished successfully`, {
						workerId: msg.workerId,
						executionId: msg.executionId,
						jobId,
					});
					break;
				case 'job-failed':
					this.logger.error(
						[
							`Execution ${msg.executionId} (job ${jobId}) failed`,
							msg.errorStack ? `\n${msg.errorStack}\n` : '',
						].join(''),
						{
							workerId: msg.workerId,
							errorMsg: msg.errorMsg,
							executionId: msg.executionId,
							jobId,
						},
					);
					break;
				case 'abort-job':
					break; // only for worker
				default:
					assertNever(msg);
			}
		});

		if (this.isQueueMetricsEnabled) {
			this.queue.on('global:completed', () => this.jobCounters.completed++);
			this.queue.on('global:failed', () => this.jobCounters.failed++);
		}
	}

	/** Whether the argument is a message sent via Bull's internal pubsub setup. */
	private isJobMessage(candidate: unknown): candidate is JobMessage {
		return typeof candidate === 'object' && candidate !== null && 'kind' in candidate;
	}

	// #endregion

	private decodeWebhookResponse(
		response: IExecuteResponsePromiseData,
	): IExecuteResponsePromiseData {
		if (
			typeof response === 'object' &&
			typeof response.body === 'object' &&
			response.body !== null &&
			'__@N8nEncodedBuffer@__' in response.body &&
			typeof response.body['__@N8nEncodedBuffer@__'] === 'string'
		) {
			response.body = Buffer.from(response.body['__@N8nEncodedBuffer@__'], BINARY_ENCODING);
		}

		return response;
	}

	private assertQueue() {
		if (this.queue) return;

		throw new ApplicationError('This method must be called after `setupQueue`');
	}

	private assertWorker() {
		if (this.instanceSettings.instanceType === 'worker') return;

		throw new ApplicationError('This method must be called on a `worker` instance');
	}

	// #region Queue metrics

	/** Counters for completed and failed jobs, reset on each interval tick. */
	private readonly jobCounters = { completed: 0, failed: 0 };

	/** Interval for collecting queue metrics to expose via Prometheus. */
	private queueMetricsInterval: NodeJS.Timer | undefined;

	get isQueueMetricsEnabled() {
		return (
			this.globalConfig.endpoints.metrics.includeQueueMetrics &&
			this.instanceSettings.instanceType === 'main' &&
			!this.orchestrationService.isMultiMainSetupEnabled
		);
	}

	/** Set up an interval to collect queue metrics and emit them in an event. */
	private scheduleQueueMetrics() {
		if (!this.isQueueMetricsEnabled || this.queueMetricsInterval) return;

		this.queueMetricsInterval = setInterval(async () => {
			const pendingJobCounts = await this.getPendingJobCounts();

			this.eventService.emit('job-counts-updated', {
				...pendingJobCounts, // active, waiting
				...this.jobCounters, // completed, failed
			});

			this.jobCounters.completed = 0;
			this.jobCounters.failed = 0;
		}, this.globalConfig.endpoints.metrics.queueMetricsInterval * Time.seconds.toMilliseconds);
	}

	/** Stop collecting queue metrics. */
	private stopQueueMetrics() {
		if (this.queueMetricsInterval) {
			clearInterval(this.queueMetricsInterval);
			this.queueMetricsInterval = undefined;

			this.logger.debug('Queue metrics collection stopped');
		}
	}

	// #endregion

	// #region Queue recovery

	private readonly queueRecoveryContext: QueueRecoveryContext = {
		batchSize: config.getEnv('executions.queueRecovery.batchSize'),
		waitMs: config.getEnv('executions.queueRecovery.interval') * 60 * 1000,
	};

	private scheduleQueueRecovery(waitMs = this.queueRecoveryContext.waitMs) {
		this.queueRecoveryContext.timeout = setTimeout(async () => {
			try {
				const nextWaitMs = await this.recoverFromQueue();
				this.scheduleQueueRecovery(nextWaitMs);
			} catch (error) {
				this.logger.error('Failed to recover dangling executions from queue', {
					msg: this.toErrorMsg(error),
				});
				this.logger.error('Retrying...');

				this.scheduleQueueRecovery();
			}
		}, waitMs);

		const wait = [this.queueRecoveryContext.waitMs / Time.minutes.toMilliseconds, 'min'].join(' ');

		this.logger.debug(`Scheduled queue recovery check for next ${wait}`);
	}

	private stopQueueRecovery() {
		clearTimeout(this.queueRecoveryContext.timeout);

		this.logger.debug('Queue recovery stopped');
	}

	/**
	 * Mark in-progress executions as `crashed` if stored in DB as `new` or `running`
	 * but absent from the queue. Return time until next recovery cycle.
	 */
	private async recoverFromQueue() {
		const { waitMs, batchSize } = this.queueRecoveryContext;

		const storedIds = await this.executionRepository.getInProgressExecutionIds(batchSize);

		if (storedIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const runningJobs = await this.findJobsByStatus(['active', 'waiting']);

		const queuedIds = new Set(runningJobs.map((job) => job.data.executionId));

		if (queuedIds.size === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const danglingIds = storedIds.filter((id) => !queuedIds.has(id));

		if (danglingIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		await this.executionRepository.markAsCrashed(danglingIds);

		this.logger.info('Completed queue recovery check, recovered dangling executions', {
			danglingIds,
		});

		// if this cycle used up the whole batch size, it is possible for there to be
		// dangling executions outside this check, so speed up next cycle

		return storedIds.length >= this.queueRecoveryContext.batchSize ? waitMs / 2 : waitMs;
	}

	private toErrorMsg(error: unknown) {
		return error instanceof Error
			? error.message
			: jsonStringify(error, { replaceCircularRefs: true });
	}

	// #endregion
}
