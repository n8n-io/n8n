import Container, { Service } from 'typedi';
import type PCancelable from 'p-cancelable';
import type { IRun } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { Logger } from '@/Logger';
import { MaxStalledCountError } from '@/errors/max-stalled-count.error';

import { SCALING_MODE_JOB_NAME, SCALING_MODE_QUEUE_NAME } from './constants';
import { decodeWebhookResponse } from './webhook-response';
import { RunningJobs } from './running-jobs';
import type {
	Queue,
	Job,
	JobData,
	JobOptions,
	JobProgressReport,
	JobStatus,
	JobId,
	JobProcessorFn,
} from './types';

/**
 * @docs https://optimalbits.github.io/bull
 */
@Service()
export class ScalingMode {
	private queue: Queue;

	private readonly jobName = SCALING_MODE_JOB_NAME;

	private readonly queueName = SCALING_MODE_QUEUE_NAME;

	constructor(
		private readonly logger: Logger,
		private readonly runningJobs: RunningJobs,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	/**
	 * Lifecycle
	 */

	async init() {
		this.logger.debug('[ScalingMode] Setting up queue...');

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

		this.registerListeners();

		this.logger.debug('[ScalingMode] Queue setup completed');
	}

	defineProcessor(processorFn: JobProcessorFn, concurrency: number) {
		void this.queue.process(this.jobName, concurrency, processorFn);
	}

	async closeQueue() {
		this.logger.debug('[ScalingMode] Closing queue...');

		await this.queue.close();

		this.logger.debug('[ScalingMode] Closed queue');
	}

	async pingStore() {
		await this.queue.client.ping();
	}

	/**
	 * Jobs
	 */

	async enqueueJob(jobData: JobData, jobOptions: JobOptions) {
		const { executionId } = jobData;

		const job = await this.queue.add(this.jobName, jobData, jobOptions);

		this.logger.info('[ScalingMode] Enqueued job', { jobId: job.id, executionId });

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

		this.logger.debug('[ScalingMode] Stopping job...', { jobId, executionId });

		try {
			if (await job.isActive()) {
				this.runningJobs.cancel(jobId);
				this.runningJobs.remove(jobId);
				this.logger.debug('[ScalingMode] Stopped active job', { jobId, executionId });
				return true;
			}

			await job.remove();
			this.logger.debug('[ScalingMode] Stopped inactive job', { jobId, executionId });
			return true;
		} catch (error: unknown) {
			this.logger.error('[ScalingMode] Failed to stop job', { jobId, executionId, error });
			return false;
		}
	}

	/**
	 * Running jobs
	 */

	registerRunningJob(jobId: JobId, run: PCancelable<IRun>) {
		this.runningJobs.add(jobId, run);
	}

	deregisterRunningJob(jobId: JobId) {
		this.runningJobs.remove(jobId);
	}

	cancelRunningJob(jobId: JobId) {
		this.runningJobs.cancel(jobId);
	}

	getRunningJobIds() {
		return this.runningJobs.getAllIds();
	}

	/**
	 * Listeners
	 */

	private registerListeners() {
		this.queue.on('progress', (job: Job, report: JobProgressReport) => {
			this.logger.error('[ScalingMode] Received job progress report', { jobId: job.id });

			if (report.kind === 'webhook-response') {
				const { executionId, response } = report;
				this.activeExecutions.resolveResponsePromise(executionId, decodeWebhookResponse(response));
			}
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
