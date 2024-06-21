import Container, { Service } from 'typedi';
import type { Cluster, Redis } from 'ioredis';
import {
	ApplicationError,
	BINARY_ENCODING,
	type IDataObject,
	type IExecuteResponsePromiseData,
} from 'n8n-workflow';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { Logger } from '@/Logger';

import type {
	Job as BullJob,
	JobState as BullJobState,
	JobsOptions as BullJobOptions,
	QueueOptions as BullQueueOptions,
} from 'bullmq';
import type {
	n8nJob,
	n8nJobData,
	n8nJobName,
	n8nJobResult,
	n8nQueue,
	WebhookResponse,
} from './queue.types';

// @TODO: Rename `Queue` to `QueueManager`?

@Service()
export class Queue {
	private jobQueue: n8nQueue;

	private connection: Redis | Cluster;

	private options: BullQueueOptions;

	constructor(
		private readonly activeExecutions: ActiveExecutions,
		private readonly logger: Logger,
	) {}

	async init() {
		const { Queue: BullQueue } = await import('bullmq');
		const { RedisClientService } = await import('@/services/redis/redis-client.service');

		const service = Container.get(RedisClientService);
		const prefix = service.toValidPrefix(config.getEnv('queue.bull.prefix'));
		this.connection = service.createClient({ type: 'client(bull)' });

		// @TODO: `client(bull)` is a placeholder - Where does `type` come from?

		this.options = { prefix, connection: this.connection };

		this.jobQueue = new BullQueue<n8nJobData, n8nJobResult, n8nJobName>('jobs', this.options);

		// @TODO: Check that this still works
		this.jobQueue.on('progress', (_job, progress: WebhookResponse) => {
			this.activeExecutions.resolveResponsePromise(
				progress.executionId,
				this.decodeWebhookResponse(progress.response),
			);
		});
	}

	/**
	 * Add a job to the queue.
	 */
	async add(jobData: n8nJobData, options: BullJobOptions) {
		return (await this.jobQueue.add('execution', jobData, options)) as n8nJob;
	}

	/**
	 * Check if Redis connection is still reachable.
	 */
	async ping() {
		return await this.connection.ping();
	}

	/**
	 * Stop accepting jobs, but finish active jobs.
	 *
	 * @param `isLocal` Pause applies only to this worker, not to other workers.
	 * @param `doNotWaitActive` Do not wait for active jobs to finish before resolving.
	 */
	async pause(_arg: { isLocal?: boolean; doNotWaitActive?: boolean } = {}): Promise<void> {
		// @TODO: New behavior for `isLocal`?
		// @TODO: New behavior for `doNotWaitActive`?
		return await this.jobQueue.pause();
	}

	async stopJob(job: BullJob<n8nJobData, n8nJobResult, 'execution'>): Promise<boolean> {
		try {
			if (await job.isActive()) {
				await job.updateProgress(-1);
				return true;
			}

			await job.remove(); // inactive
			return true;
		} catch (e) {
			this.logger.error('[Queue] Failed to stop job', {
				job,
				error: e instanceof Error ? e : new Error(`${e}`),
			});

			return false;
		}
	}

	// ----------------------------------
	//             getters
	// ----------------------------------

	async getJob(jobId: string) {
		return await this.jobQueue.getJob(jobId);
	}

	async getJobsByState(jobTypes: BullJobState[]) {
		return await this.jobQueue.getJobs(jobTypes);
	}

	getQueueOptions() {
		return this.options;
	}

	getBullQueue() {
		if (!this.jobQueue) throw new ApplicationError('Queue is not initialized yet');

		return this.jobQueue;
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	private decodeWebhookResponse(
		response: IExecuteResponsePromiseData,
	): IExecuteResponsePromiseData {
		if (
			typeof response === 'object' &&
			typeof response.body === 'object' &&
			(response.body as IDataObject)['__@N8nEncodedBuffer@__']
		) {
			response.body = Buffer.from(
				(response.body as IDataObject)['__@N8nEncodedBuffer@__'] as string,
				BINARY_ENCODING,
			);
		}

		return response;
	}
}
