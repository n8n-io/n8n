import Container, { Service } from 'typedi';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { Logger } from '@/Logger';
import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import { HIGHEST_SHUTDOWN_PRIORITY } from '@/constants';
import { OnShutdown } from '@/decorators/OnShutdown';
import { SCALING_MODE_JOB_TYPE, SCALING_MODE_QUEUE_NAME } from './constants';
import { decodeWebhookResponse } from './webhook-response';
import { JobProcessor } from './job-processor';
import type { Queue, Job, JobData, JobOptions, JobProgressReport, JobStatus, JobId } from './types';

@Service()
export class ScalingMode {
	private queue: Queue;

	private readonly jobType = SCALING_MODE_JOB_TYPE;

	private readonly queueName = SCALING_MODE_QUEUE_NAME;

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobProcessor: JobProcessor,
	) {}

	/**
	 * Lifecycle
	 */

	async setupQueue() {
		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@/services/redis/redis-client.service');
		const service = Container.get(RedisClientService);

		const bullPrefix = config.getEnv('queue.bull.prefix');
		const prefix = service.toValidPrefix(bullPrefix);

		this.queue = new BullQueue(this.queueName, {
			prefix,
			settings: config.get('queue.bull.settings'),
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});

		this.registerResponseListener();

		this.logger.debug('[ScalingMode] Queue setup completed');
	}

	setupWorker(concurrency: number) {
		void this.queue.process(
			this.jobType,
			concurrency,
			async (job: Job) => await this.jobProcessor.processJob(job),
		);

		this.registerWorkerListeners();

		this.logger.debug('[ScalingMode] Worker setup completed');
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async shutdown() {
		await this.queue.pause(true, true);

		this.logger.debug('[ScalingMode] Queue paused');
	}

	async pingStore() {
		await this.queue.client.ping();
	}

	/**
	 * Jobs
	 */

	async enqueueJob(jobData: JobData, jobOptions: JobOptions) {
		const { executionId } = jobData;

		const job = await this.queue.add(this.jobType, jobData, jobOptions);

		this.logger.info(`[ScalingMode] Added job ${job.id} (execution ${executionId})`);

		return job;
	}

	async getJob(jobId: JobId) {
		return await this.queue.getJob(jobId);
	}

	async findJobsByState(statuses: JobStatus[]) {
		return await this.queue.getJobs(statuses);
	}

	async findRunningJobBy({ executionId }: { executionId: string }) {
		const activeOrWaitingJobs = await this.findJobsByState(['active', 'waiting']);

		return activeOrWaitingJobs.find(({ data }) => data.executionId === executionId) ?? null;
	}

	async stopJob(job: Job) {
		const {
			id: jobId,
			data: { executionId },
		} = job;

		try {
			if (await job.isActive()) {
				await job.progress(-1);
				this.logger.debug('[ScalingMode] Stopped active job', { jobId, executionId });
				return true;
			}

			await job.remove();
			this.logger.debug('[ScalingMode] Stopped inactive job', { jobId, executionId });
			return true;
		} catch (error: unknown) {
			await job.progress(-1);
			this.logger.error('[ScalingMode] Failed to stop job', { jobId, executionId, error });
			return false;
		}
	}

	/**
	 * Listeners
	 */

	private registerResponseListener() {
		if (config.getEnv('generic.instanceType') !== 'main') return;

		this.queue.on('global:progress', (_job: Job, report: JobProgressReport) => {
			if (report.kind === 'webhook-response') {
				const { executionId, response } = report;
				this.activeExecutions.resolveResponsePromise(executionId, decodeWebhookResponse(response));
			}
		});
	}

	private registerWorkerListeners() {
		if (config.getEnv('generic.instanceType') !== 'worker') return;

		this.queue.on('global:progress', (jobId: JobId, progress) => {
			if (progress === -1) this.jobProcessor.stopJob(jobId);
		});

		let latestAttemptTs = 0;
		let cumulativeTimeoutMs = 0;

		const MAX_TIMEOUT_MS = config.getEnv('queue.bull.redis.timeoutThreshold');
		const RESET_LENGTH_MS = 30_000;

		this.queue.on('error', (error: Error) => {
			this.logger.error('[ScalingMode] Queue errored', { error });

			/**
			 * On Redis connection failure, try to reconnect. On every failed attempt,
			 * increment a cumulative timeout - if this exceeds a limit, exit the
			 * process. Reset the cumulative timeout if >30s between retries.
			 */
			if (error.message.includes('ECONNREFUSED')) {
				const nowTs = Date.now();
				if (nowTs - latestAttemptTs > RESET_LENGTH_MS) {
					latestAttemptTs = nowTs;
					cumulativeTimeoutMs = 0;
				} else {
					cumulativeTimeoutMs += nowTs - latestAttemptTs;
					latestAttemptTs = nowTs;
					if (cumulativeTimeoutMs > MAX_TIMEOUT_MS) {
						this.logger.error('[ScalingMode] Redis unavailable after max timeout');
						this.logger.error('[ScalingMode] Exiting process...');
						process.exit(1);
					}
				}

				this.logger.warn('[ScalingMode] Redis unavailable - retrying to connect...');
				return;
			}

			if (error.message.includes('job stalled more than maxStalledCount')) {
				throw new MaxStalledCountError(error);
			}

			/**
			 * Non-recoverable error on worker start with Redis unavailable.
			 * Even if Redis recovers, worker will remain unable to process jobs.
			 */
			if (error.message.includes('Error initializing Lua scripts')) {
				this.logger.error('[ScalingMode] Fatal error initializing worker', { error });
				this.logger.error('[ScalingMode] Exiting process...');
				process.exit(1);
			}

			throw error;
		});
	}
}
