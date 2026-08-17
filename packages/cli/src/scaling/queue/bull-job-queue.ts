import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type Bull from 'bull';

import { MaxStalledCountError } from '@/errors/max-stalled-count.error';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import type { JobData, JobMessage } from '../scaling.types';
import { isJobMessage } from './job-queue.interface';
import type { EnqueueOptions, IJobQueue, JobStatus, QueueJob } from './job-queue.interface';

/**
 * Bull-backed `IJobQueue`. The only file outside tests that may import `bull`.
 * All Bull-specific behavior (settings shape, `global:*` events, the stall
 * error string, the raw client ping) is contained here.
 */
@Service()
export class BullJobQueue implements IJobQueue {
	private queue: Bull.Queue<JobData>;

	constructor(private readonly globalConfig: GlobalConfig) {}

	async start() {
		if (this.queue) return;

		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@/services/redis-client.service.js');

		const service = Container.get(RedisClientService);
		const prefix = service.toValidPrefix(this.globalConfig.queue.bull.prefix);

		this.queue = new BullQueue(QUEUE_NAME, {
			prefix,
			// Disable stall retries: a stalled job fails immediately and is
			// surfaced to main as MaxStalledCountError via `finished()`.
			settings: { ...this.globalConfig.queue.bull.settings, maxStalledCount: 0 },
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});
	}

	async enqueue(data: JobData, { priority }: EnqueueOptions): Promise<QueueJob> {
		const { keepLastCompleted, keepLastFailed } = this.globalConfig.executions.queueRetention;

		const job = await this.queue.add(JOB_TYPE_NAME, data, {
			priority,
			removeOnComplete: keepLastCompleted,
			removeOnFail: keepLastFailed,
		});

		return this.toQueueJob(job);
	}

	registerProcessor(concurrency: number, handler: (job: QueueJob) => Promise<void>) {
		void this.queue.process(JOB_TYPE_NAME, concurrency, async (job: Bull.Job<JobData>) => {
			await handler(this.toQueueJob(job));
		});
	}

	async pause() {
		await this.queue.pause(true, true); // local pause, do not wait for active jobs
	}

	async getJob(jobId: string): Promise<QueueJob | null> {
		const job = await this.queue.getJob(jobId);
		return job ? this.toQueueJob(job) : null;
	}

	async findJobsByStatus(statuses: JobStatus[]): Promise<QueueJob[]> {
		const jobs = await this.queue.getJobs(statuses);
		return jobs.filter((job) => job !== null).map((job) => this.toQueueJob(job));
	}

	async getPendingCounts() {
		const { active, waiting } = await this.queue.getJobCounts();
		return { active, waiting };
	}

	async ping() {
		await this.queue.client.ping();
	}

	onMessage(handler: (jobId: string, msg: JobMessage) => void) {
		this.queue.on('global:progress', (jobId: Bull.JobId, msg: unknown) => {
			if (isJobMessage(msg)) handler(jobId.toString(), msg);
		});
	}

	onError(handler: (error: Error) => void) {
		this.queue.on('error', handler);
	}

	onJobOutcome(handler: (outcome: 'completed' | 'failed') => void) {
		this.queue.on('global:completed', () => handler('completed'));
		this.queue.on('global:failed', () => handler('failed'));
	}

	private toQueueJob(job: Bull.Job<JobData>): QueueJob {
		return {
			id: job.id.toString(),
			data: job.data,
			sendMessage: async (msg) => {
				await job.progress(msg);
			},
			isActive: async () => await job.isActive(),
			remove: async () => await job.remove(),
			finished: async () => {
				try {
					await job.finished();
				} catch (error) {
					if (
						error instanceof Error &&
						error.message.includes('job stalled more than maxStalledCount')
					) {
						throw new MaxStalledCountError(error);
					}
					throw error;
				}
			},
		};
	}
}
