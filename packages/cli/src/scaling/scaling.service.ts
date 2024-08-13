import Container, { Service } from 'typedi';
import { ApplicationError, BINARY_ENCODING } from 'n8n-workflow';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { Logger } from '@/Logger';
import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import { HIGHEST_SHUTDOWN_PRIORITY } from '@/constants';
import { OnShutdown } from '@/decorators/OnShutdown';
import { JOB_TYPE_NAME, QUEUE_NAME } from './constants';
import { JobProcessor } from './job-processor';
import type { JobQueue, Job, JobData, JobOptions, JobMessage, JobStatus, JobId } from './types';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { GlobalConfig } from '@n8n/config';

@Service()
export class ScalingService {
	private queue: JobQueue;

	private readonly instanceType = config.getEnv('generic.instanceType');

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobProcessor: JobProcessor,
		private readonly globalConfig: GlobalConfig,
	) {}

	// #region Lifecycle

	async setupQueue() {
		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@/services/redis/redis-client.service');
		const service = Container.get(RedisClientService);

		const bullPrefix = this.globalConfig.queue.bull.prefix;
		const prefix = service.toValidPrefix(bullPrefix);

		this.queue = new BullQueue(QUEUE_NAME, {
			prefix,
			settings: this.globalConfig.queue.bull.settings,
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});

		this.registerListeners();

		this.logger.debug('[ScalingService] Queue setup completed');
	}

	setupWorker(concurrency: number) {
		this.assertWorker();

		void this.queue.process(
			JOB_TYPE_NAME,
			concurrency,
			async (job: Job) => await this.jobProcessor.processJob(job),
		);

		this.logger.debug('[ScalingService] Worker setup completed');
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async pauseQueue() {
		await this.queue.pause(true, true);

		this.logger.debug('[ScalingService] Queue paused');
	}

	async pingQueue() {
		await this.queue.client.ping();
	}

	// #endregion

	// #region Jobs

	async addJob(jobData: JobData, jobOptions: JobOptions) {
		const { executionId } = jobData;

		const job = await this.queue.add(JOB_TYPE_NAME, jobData, jobOptions);

		this.logger.info(`[ScalingService] Added job ${job.id} (execution ${executionId})`);

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
				this.logger.debug('[ScalingService] Stopped active job', props);
				return true;
			}

			await job.remove(); // not yet picked up, or waiting for next pickup (stalled)
			this.logger.debug('[ScalingService] Stopped inactive job', props);
			return true;
		} catch (error: unknown) {
			await job.progress({ kind: 'abort-job' });
			this.logger.error('[ScalingService] Failed to stop job', { ...props, error });
			return false;
		}
	}

	// #endregion

	// #region Listeners

	private registerListeners() {
		this.queue.on('global:progress', (_jobId: JobId, msg: JobMessage) => {
			if (msg.kind === 'respond-to-webhook') {
				const { executionId, response } = msg;
				this.activeExecutions.resolveResponsePromise(
					executionId,
					this.decodeWebhookResponse(response),
				);
			}
		});

		this.queue.on('global:progress', (jobId: JobId, msg: JobMessage) => {
			if (msg.kind === 'abort-job') {
				this.jobProcessor.stopJob(jobId);
			}
		});

		let latestAttemptTs = 0;
		let cumulativeTimeoutMs = 0;

		const MAX_TIMEOUT_MS = this.globalConfig.queue.bull.redis.timeoutThreshold;
		const RESET_LENGTH_MS = 30_000;

		this.queue.on('error', (error: Error) => {
			this.logger.error('[ScalingService] Queue errored', { error });

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
						this.logger.error('[ScalingService] Redis unavailable after max timeout');
						this.logger.error('[ScalingService] Exiting process...');
						process.exit(1);
					}
				}

				this.logger.warn('[ScalingService] Redis unavailable - retrying to connect...');
				return;
			}

			if (
				this.instanceType === 'worker' &&
				error.message.includes('job stalled more than maxStalledCount')
			) {
				throw new MaxStalledCountError(error);
			}

			/**
			 * Non-recoverable error on worker start with Redis unavailable.
			 * Even if Redis recovers, worker will remain unable to process jobs.
			 */
			if (
				this.instanceType === 'worker' &&
				error.message.includes('Error initializing Lua scripts')
			) {
				this.logger.error('[ScalingService] Fatal error initializing worker', { error });
				this.logger.error('[ScalingService] Exiting process...');
				process.exit(1);
			}

			throw error;
		});
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

	private assertWorker() {
		if (this.instanceType === 'worker') return;

		throw new ApplicationError('This method must be called on a `worker` instance');
	}
}
