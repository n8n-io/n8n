import type Bull from 'bull';
import Container, { Service } from 'typedi';
import {
	ApplicationError,
	BINARY_ENCODING,
	type IDataObject,
	type ExecutionError,
	type IExecuteResponsePromiseData,
} from 'n8n-workflow';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { OnShutdown } from './decorators/OnShutdown';
import { HIGHEST_SHUTDOWN_PRIORITY } from './constants';

export type JobId = Bull.JobId;
export type Job = Bull.Job<JobData>;
export type JobQueue = Bull.Queue<JobData>;

export interface JobData {
	executionId: string;
	loadStaticData: boolean;
}

export interface JobResponse {
	success: boolean;
	error?: ExecutionError;
}

export interface WebhookResponse {
	executionId: string;
	response: IExecuteResponsePromiseData;
}

@Service()
export class Queue {
	private jobQueue: JobQueue;

	constructor(private activeExecutions: ActiveExecutions) {}

	async init() {
		const { default: Bull } = await import('bull');
		const { RedisClientService } = await import('@/services/redis/redis-client.service');

		const redisClientService = Container.get(RedisClientService);

		const bullPrefix = config.getEnv('queue.bull.prefix');
		const prefix = redisClientService.toValidPrefix(bullPrefix);

		this.jobQueue = new Bull('jobs', {
			prefix,
			settings: config.get('queue.bull.settings'),
			createClient: (type) => redisClientService.createClient({ type: `${type}(bull)` }),
		});

		this.jobQueue.on('global:progress', (_jobId, progress: WebhookResponse) => {
			this.activeExecutions.resolveResponsePromise(
				progress.executionId,
				this.decodeWebhookResponse(progress.response),
			);
		});
	}

	async findRunningJobBy({ executionId }: { executionId: string }) {
		const activeOrWaitingJobs = await this.getJobs(['active', 'waiting']);

		return activeOrWaitingJobs.find(({ data }) => data.executionId === executionId) ?? null;
	}

	decodeWebhookResponse(response: IExecuteResponsePromiseData): IExecuteResponsePromiseData {
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

	async add(jobData: JobData, jobOptions: object): Promise<Job> {
		return await this.jobQueue.add(jobData, jobOptions);
	}

	async getJob(jobId: JobId): Promise<Job | null> {
		return await this.jobQueue.getJob(jobId);
	}

	async getJobs(jobTypes: Bull.JobStatus[]): Promise<Job[]> {
		return await this.jobQueue.getJobs(jobTypes);
	}

	/**
	 * Get IDs of executions that are currently in progress in the queue.
	 */
	async getInProgressExecutionIds() {
		const inProgressJobs = await this.getJobs(['active', 'waiting']);

		return new Set(inProgressJobs.map((job) => job.data.executionId));
	}

	async process(concurrency: number, fn: Bull.ProcessCallbackFunction<JobData>): Promise<void> {
		return await this.jobQueue.process(concurrency, fn);
	}

	async ping(): Promise<string> {
		return await this.jobQueue.client.ping();
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	// Stop accepting new jobs, `doNotWaitActive` allows reporting progress
	async pause(): Promise<void> {
		return await this.jobQueue?.pause(true, true);
	}

	getBullObjectInstance(): JobQueue {
		if (this.jobQueue === undefined) {
			// if queue is not initialized yet throw an error, since we do not want to hand around an undefined queue
			throw new ApplicationError('Queue is not initialized yet!');
		}
		return this.jobQueue;
	}

	/**
	 *
	 * @param job A Job instance
	 * @returns boolean true if we were able to securely stop the job
	 */
	async stopJob(job: Job): Promise<boolean> {
		if (await job.isActive()) {
			// Job is already running so tell it to stop
			await job.progress(-1);
			return true;
		}
		// Job did not get started yet so remove from queue
		try {
			await job.remove();
			return true;
		} catch (e) {
			await job.progress(-1);
		}

		return false;
	}
}
