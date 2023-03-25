import type Bull from 'bull';
import type { RedisOptions } from 'ioredis';
import { Service } from 'typedi';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import fs from 'fs';
import config from '@/config';
import { ActiveExecutions } from '@/ActiveExecutions';
import * as WebhookHelpers from '@/WebhookHelpers';

export type JobId = Bull.JobId;
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

interface SecureRedisConfig {
	secure: boolean;
	tls?: {
		cert?: string | Buffer;
		cert_file?: string;
		key?: string | Buffer;
		key_file?: string;
		ca?: string | Buffer;
		ca_file?: string;
	};
}

@Service()
export class Queue {
	private jobQueue: JobQueue;

	constructor(private activeExecutions: ActiveExecutions) {}

	async init() {
		const prefix = config.getEnv('queue.bull.prefix');
		const redisOptions = config.getEnv('queue.bull.redis') as SecureRedisConfig;
		if (!redisOptions.secure) {
			delete redisOptions.tls;
		} else {
			if (!redisOptions.tls) redisOptions.tls = {};
			if (!redisOptions.tls.ca) {
				if (redisOptions.tls.ca_file) {
					redisOptions.tls.ca = fs.readFileSync(redisOptions.tls.ca_file);
				}
			}
			if (!redisOptions.tls?.key) {
				if (redisOptions.tls?.key_file) {
					redisOptions.tls.key = fs.readFileSync(redisOptions.tls.key_file);
				}
			}
			if (!redisOptions.tls?.cert) {
				if (redisOptions.tls?.cert_file) {
					redisOptions.tls.cert = fs.readFileSync(redisOptions.tls.cert_file);
				}
			}
		}

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

	async getJob(jobId: JobId): Promise<Job | null> {
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
