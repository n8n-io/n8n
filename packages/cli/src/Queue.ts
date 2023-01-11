import type Bull from 'bull';
import type { RedisOptions } from 'ioredis';
import { IExecuteResponsePromiseData } from 'n8n-workflow';
import config from '@/config';
import * as ActiveExecutions from '@/ActiveExecutions';
import * as WebhookHelpers from '@/WebhookHelpers';

export type Job = Bull.Job<JobData>;
export type JobQueue = Bull.Queue<JobData>;

export interface JobData {
	executionId: string;
	loadStaticData: boolean;
}

export interface JobResponse {
	success: boolean;
}

export interface WebhookResponse {
	executionId: string;
	response: IExecuteResponsePromiseData;
}

export class Queue {
	private jobQueue: JobQueue;

	constructor(private activeExecutions: ActiveExecutions.ActiveExecutions) {}

	async init() {
		const prefix = config.getEnv('queue.bull.prefix');
		const redisOptions: RedisOptions = config.getEnv('queue.bull.redis');

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { default: Bull } = await import('bull');

		// Disabling ready check is necessary as it allows worker to
		// quickly reconnect to Redis if Redis crashes or is unreachable
		// for some time. With it enabled, worker might take minutes to realize
		// redis is back up and resume working.
		// More here: https://github.com/OptimalBits/bull/issues/890
		// @ts-ignore
		this.jobQueue = new Bull('jobs', { prefix, redis: redisOptions, enableReadyCheck: false });

		this.jobQueue.on('global:progress', (jobId, progress: WebhookResponse) => {
			this.activeExecutions.resolveResponsePromise(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				progress.executionId,
				WebhookHelpers.decodeWebhookResponse(progress.response),
			);
		});
	}

	async add(jobData: JobData, jobOptions: object): Promise<Job> {
		return this.jobQueue.add(jobData, jobOptions);
	}

	async getJob(jobId: Bull.JobId): Promise<Job | null> {
		return this.jobQueue.getJob(jobId);
	}

	async getJobs(jobTypes: Bull.JobStatus[]): Promise<Job[]> {
		return this.jobQueue.getJobs(jobTypes);
	}

	getBullObjectInstance(): JobQueue {
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

let activeQueueInstance: Queue | undefined;

export async function getInstance(): Promise<Queue> {
	if (activeQueueInstance === undefined) {
		activeQueueInstance = new Queue(ActiveExecutions.getInstance());
		await activeQueueInstance.init();
	}

	return activeQueueInstance;
}
