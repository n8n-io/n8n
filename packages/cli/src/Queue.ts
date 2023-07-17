// import type Bull from 'bull';
import type { RedisOptions } from 'ioredis';
import { Service } from 'typedi';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import config from '@/config';
import { ActiveExecutions } from '@/ActiveExecutions';
import * as WebhookHelpers from '@/WebhookHelpers';

import type Bull from 'bullmq';
import { QueueEvents, Queue as BullQueue } from 'bullmq';

// export type JobId = Bull.JobId;
export type JobId = string;
export type Job = Bull.Job<JobData>;
export type JobQueue = Bull.Queue<JobData>;
export type JobQueueEvents = Bull.QueueEvents;

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

@Service()
export class Queue {
	private jobQueue: JobQueue;

	private jobQueueEvents: JobQueueEvents;

	constructor(private activeExecutions: ActiveExecutions) {}

	async init() {
		const redisOptions: RedisOptions = config.getEnv('queue.bull.redis');

		// eslint-disable-next-line @typescript-eslint/naming-convention
		// const { default: Bull } = await import('bull');

		// Disabling ready check is necessary as it allows worker to
		// quickly reconnect to Redis if Redis crashes or is unreachable
		// for some time. With it enabled, worker might take minutes to realize
		// redis is back up and resume working.
		// More here: https://github.com/OptimalBits/bull/issues/890
		// ts-ignore
		// this.jobQueue = new Bull('jobs', {
		// 	prefix,
		// 	redis: redisOptions,
		// 	enableReadyCheck: false,
		// } as QueueOptions);
		this.jobQueue = new BullQueue('jobs', {
			prefix: this.getBullPrefix(),
			connection: {
				...redisOptions,
			},
		});
		this.jobQueueEvents = new QueueEvents('jobs', {
			prefix: this.getBullPrefix(),
			connection: {
				...redisOptions,
			},
		});
		this.jobQueueEvents.on('progress', ({ data }) => {
			console.log('progress', data);
			this.activeExecutions.resolveResponsePromise(
				(data as WebhookResponse).executionId,
				WebhookHelpers.decodeWebhookResponse((data as WebhookResponse).response),
			);
		});
	}

	async add(jobData: JobData, jobOptions: object): Promise<Job> {
		return this.jobQueue.add(jobData.executionId, jobData, jobOptions);
	}

	async getJob(jobId: JobId): Promise<Job | undefined> {
		return this.jobQueue.getJob(jobId);
	}

	async getJobs(jobTypes: Bull.JobType[]): Promise<Job[]> {
		return this.jobQueue.getJobs(jobTypes);
	}

	getBullPrefix(): string {
		let prefix = config.getEnv('queue.bull.prefix');
		if (prefix) {
			if (!prefix.startsWith('{')) {
				prefix = '{' + prefix;
			}
			if (!prefix.endsWith('}')) {
				prefix += '}';
			}
		}
		return prefix;
	}

	getBullObjectInstance(): JobQueue {
		return this.jobQueue;
	}

	getBullEventQueueInstance(): JobQueueEvents {
		return this.jobQueueEvents;
	}

	/**
	 *
	 * @param job A Job instance
	 * @returns boolean true if we were able to securely stop the job
	 */
	async stopJob(job: Job): Promise<boolean> {
		if (await job.isActive()) {
			// Job is already running so tell it to stop
			await job.updateProgress(-1);
			return true;
		}
		// Job did not get started yet so remove from queue
		try {
			await job.remove();
			return true;
		} catch (e) {
			await job.updateProgress(-1);
		}

		return false;
	}
}
