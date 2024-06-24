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
	Job,
	JobData,
	JobName,
	JobOptions,
	WorkerProcessorFn,
	JobProgressReport,
	JobResult,
	JobState,
	Queue,
	StoreOptions,
	Store,
	WorkerOptions,
	Worker,
} from './types';

/**
 * Responsible for running executions in a distributed system using BullMQ.
 *
 * @docs https://docs.bullmq.io/
 */
@Service()
export class ScalingMode {
	private queue: Queue;

	private worker: Worker;

	private store: Store;

	private storeOptions: StoreOptions;

	constructor(
		private readonly logger: Logger,
		private readonly runningJobs: RunningJobs,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	/**
	 * Lifecycle
	 */

	async setupQueue() {
		this.logger.debug('[ScalingMode] Setting up queue...');

		await this.setStoreOptions();

		const { Queue } = await import('bullmq');

		this.queue = new Queue<JobData, JobResult, JobName>(SCALING_MODE_QUEUE_NAME, this.storeOptions);

		this.registerQueueListeners();

		this.logger.debug('[ScalingMode] Queue setup completed');
	}

	async setupWorker(fn: WorkerProcessorFn, extraOptions: Partial<WorkerOptions> = {}) {
		this.logger.debug('[ScalingMode] Setting up worker...');

		const { Worker } = await import('bullmq');

		const configOptions = config.get('queue.bull.settings');

		const options = { ...this.storeOptions, ...configOptions, ...extraOptions };

		this.worker = new Worker(SCALING_MODE_QUEUE_NAME, fn, options);

		this.registerWorkerListeners();

		this.logger.debug('[ScalingMode] Worker setup completed');
	}

	private async setStoreOptions() {
		const { RedisClientService } = await import('@/services/redis/redis-client.service');

		const redisClientService = Container.get(RedisClientService);
		const prefix = redisClientService.toValidPrefix(config.getEnv('queue.bull.prefix'));
		this.store = redisClientService.createClient({ type: 'bull' });

		this.storeOptions = { prefix, connection: this.store };
	}

	async pingStore() {
		return await this.store.ping();
	}

	async closeQueue() {
		this.logger.debug('[ScalingMode] Closing queue...');

		await this.queue.close();

		this.logger.debug('[ScalingMode] Closed queue');
	}

	async closeWorker({ immediately } = { immediately: true }) {
		this.logger.debug('[ScalingMode] Closing worker...');

		await this.worker.close(immediately);

		this.logger.debug('[ScalingMode] Closed worker');
	}

	/**
	 * Jobs
	 */

	async addJob(jobData: JobData, jobOptions: JobOptions) {
		const { executionId } = jobData;

		const job = (await this.queue.add(SCALING_MODE_JOB_NAME, jobData, jobOptions)) as Job;

		this.logger.info('[ScalingMode] Added job to queue', { jobId: job.id, executionId });

		return job;
	}

	async getJob(jobId: string) {
		return ((await this.queue.getJob(jobId)) ?? null) as Job | null;
	}

	async findJobsByState(states: JobState[]) {
		return (await this.queue.getJobs(states)) as Job[];
	}

	async stopJob(job: Job) {
		const {
			id: jobId,
			data: { executionId },
		} = job;

		this.logger.debug('[ScalingMode] Aborting job...', { jobId, executionId });

		try {
			if (await job.isActive()) {
				this.runningJobs.cancel(jobId);
				this.runningJobs.remove(jobId);
				this.logger.debug('[ScalingMode] Aborted active job', { jobId, executionId });
				return true;
			}

			await job.remove();
			this.logger.debug('[ScalingMode] Aborted inactive job', { jobId, executionId });
			return true;
		} catch (error: unknown) {
			this.logger.error('[ScalingMode] Failed to abort job', { jobId, executionId, error });
			return false;
		}
	}

	/**
	 * Running jobs
	 */

	registerRunningJob(jobId: string, run: PCancelable<IRun>) {
		this.runningJobs.add(jobId, run);
	}

	deregisterRunningJob(jobId: string) {
		this.runningJobs.remove(jobId);
	}

	cancelRunningJob(jobId: string) {
		this.runningJobs.cancel(jobId);
	}

	getRunningJobIds() {
		return this.runningJobs.getAllIds();
	}

	/**
	 * Listeners
	 */

	private registerQueueListeners() {
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

			/**
			 * @TODO Still relevant for `bullmq`?
			 */
			if (error.message.includes('job stalled more than maxStalledCount')) {
				throw new MaxStalledCountError(error);
			}

			/**
			 * Non-recoverable error on worker start with Redis unavailable.
			 * Even if Redis recovers, worker will remain unable to process jobs.
			 *
			 * @TODO Still relevant for `bullmq`?
			 */
			if (error.message.includes('Error initializing Lua scripts')) {
				this.logger.error('[ScalingMode] Fatal error initializing worker', { error });
				this.logger.error('[ScalingMode] Exiting process...');
				process.exit(1);
			}

			throw error;
		});
	}

	private registerWorkerListeners() {
		this.worker.on('completed', async (job: Job) => {
			this.logger.info('[ScalingMode] Job completed', {
				jobId: job.id,
				executionId: job.data.executionId,
			});
		});

		this.worker.on('stalled', async (jobId: string) => {
			const job = await this.queue.getJob(jobId);
			this.logger.warn('[ScalingMode] Job stalled', {
				jobId,
				executionId: job?.data.executionId ?? 'unknown',
			});
		});

		this.worker.on('failed', async (job: Job, error: Error) => {
			this.logger.error('[ScalingMode] Job failed', {
				jobId: job.id,
				executionId: job.data.executionId,
				error,
			});
		});

		this.worker.on('error', (error: Error) => {
			this.logger.error('[ScalingMode] Worker errored', { error });
		});
	}
}
