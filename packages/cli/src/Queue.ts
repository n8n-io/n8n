import type Bull from 'bull';
import { type RedisOptions } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy, type IExecuteResponsePromiseData } from 'n8n-workflow';
import config from '@/config';
import { ActiveExecutions } from '@/ActiveExecutions';
import * as WebhookHelpers from '@/WebhookHelpers';
import { getRedisClusterNodes, getRedisPrefix } from './GenericHelpers';

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

@Service()
export class Queue {
	private jobQueue: JobQueue;

	constructor(private activeExecutions: ActiveExecutions) {}

	async init() {
		const prefix = getRedisPrefix();
		const clusterNodes = getRedisClusterNodes();
		const usesRedisCluster = clusterNodes.length > 0;
		const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { default: Bull } = await import('bull');
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { default: Redis } = await import('ioredis');
		// Disabling ready check is necessary as it allows worker to
		// quickly reconnect to Redis if Redis crashes or is unreachable
		// for some time. With it enabled, worker might take minutes to realize
		// redis is back up and resume working.
		// More here: https://github.com/OptimalBits/bull/issues/890

		LoggerProxy.debug(
			usesRedisCluster
				? `Initialising Redis cluster connection with nodes: ${clusterNodes
						.map((e) => `${e.host}:${e.port}`)
						.join(',')}`
				: `Initialising Redis client connection with host: ${host ?? 'localhost'} and port: ${
						port ?? '6379'
				  }`,
		);
		const sharedRedisOptions: RedisOptions = {
			username,
			password,
			db,
			enableReadyCheck: false,
			maxRetriesPerRequest: null,
		};
		this.jobQueue = new Bull('jobs', {
			prefix,
			createClient: (type, clientConfig) =>
				usesRedisCluster
					? new Redis.Cluster(
							clusterNodes.map((node) => ({ host: node.host, port: node.port })),
							{
								...clientConfig,
								redisOptions: sharedRedisOptions,
							},
					  )
					: new Redis({
							...clientConfig,
							host,
							port,
							...sharedRedisOptions,
					  }),
		});

		this.jobQueue.on('global:progress', (jobId, progress: WebhookResponse) => {
			this.activeExecutions.resolveResponsePromise(
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
