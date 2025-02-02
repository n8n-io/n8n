import { Service } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import { strict } from 'node:assert';
import { BINARY_ENCODING, IExecuteResponsePromiseData } from 'n8n-workflow';
import { InstanceSettings, Logger } from 'n8n-core';

import { ActiveExecutions } from '@/active-executions';
import { EventService } from '@/events/event.service';

import type { Job, JobData, JobId, JobMessage, JobOptions, JobStatus } from './scaling.types';
import { JOB_TYPE_NAME } from './constants';
import { JobQueues } from './job-queues';
import { assertNever } from '@/utils';
import { HIGHEST_SHUTDOWN_PRIORITY, Time } from '@/constants';
import { OnShutdown } from '@/decorators/on-shutdown';

/** Responsible for enqueuing jobs on the queues. */
@Service()
export class JobProducer {
	private readonly isQueueMetricsEnabled: boolean;

	/** Counters for completed and failed jobs, reset on each interval tick. */
	private readonly jobCounters = { completed: 0, failed: 0 };

	/** Interval for collecting queue metrics to expose via Prometheus. */
	private queueMetricsInterval: NodeJS.Timer | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly jobQueues: JobQueues,
		private readonly activeExecutions: ActiveExecutions,
		private readonly eventService: EventService,
	) {
		this.isQueueMetricsEnabled =
			globalConfig.endpoints.metrics.includeQueueMetrics &&
			instanceSettings.instanceType === 'main' &&
			instanceSettings.isSingleMain;
		this.logger = this.logger.scoped('scaling');
	}

	setup() {
		const queues = this.jobQueues.getAllQueues();
		for (const queue of queues) {
			queue.on('error', (error: Error) => this.onError(error));

			queue.on('global:progress', (jobId: JobId, msg: unknown) => this.onProgress(jobId, msg));

			if (this.isQueueMetricsEnabled) {
				queue.on('global:completed', () => this.jobCounters.completed++);
				queue.on('global:failed', () => this.jobCounters.failed++);
			}
		}

		this.scheduleQueueMetrics();
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop() {
		if (this.instanceSettings.isSingleMain) {
			const queues = this.jobQueues.getAllQueues();
			for (const queue of queues) {
				await queue.pause(true, true); // no more jobs will be picked up
			}
			this.logger.debug('Queues paused');
		}

		if (this.isQueueMetricsEnabled) this.stopQueueMetrics();
	}

	private onError(error: Error) {
		if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by RedisClientService.retryStrategy

		this.logger.error('Queue errored', { error });

		throw error;
	}

	private onProgress(jobId: JobId, msg: unknown) {
		if (!this.isJobMessage(msg)) return;

		// completion and failure are reported via `global:progress` to convey more details
		// than natively provided by Bull in `global:completed` and `global:failed` events

		switch (msg.kind) {
			case 'respond-to-webhook':
				const decodedResponse = this.decodeWebhookResponse(msg.response);
				this.activeExecutions.resolveResponsePromise(msg.executionId, decodedResponse);
				break;
			case 'job-finished':
				this.logger.info(`Execution ${msg.executionId} (job ${jobId}) finished successfully`, {
					workerId: msg.workerId,
					executionId: msg.executionId,
					jobId,
				});
				break;
			case 'job-failed':
				this.logger.error(
					[
						`Execution ${msg.executionId} (job ${jobId}) failed`,
						msg.errorStack ? `\n${msg.errorStack}\n` : '',
					].join(''),
					{
						workerId: msg.workerId,
						errorMsg: msg.errorMsg,
						executionId: msg.executionId,
						jobId,
					},
				);
				break;
			case 'abort-job':
				break; // only for worker
			default:
				assertNever(msg);
		}
	}

	async addJob(jobData: JobData, { priority }: { priority: number }) {
		strict(priority > 0 && priority <= Number.MAX_SAFE_INTEGER);

		const jobOptions: JobOptions = {
			priority,
			removeOnComplete: true,
			removeOnFail: true,
		};

		const { executionId, projectId } = jobData;
		const queue = this.jobQueues.getQueue(projectId);
		const job = await queue.add(JOB_TYPE_NAME, jobData, jobOptions);

		const jobId = job.id;
		this.logger.info(`Enqueued execution ${executionId} (job ${jobId})`, {
			executionId,
			projectId,
			jobId,
		});

		return job;
	}

	/** Whether the argument is a message sent via Bull's internal pubsub setup. */
	private isJobMessage(candidate: unknown): candidate is JobMessage {
		return typeof candidate === 'object' && candidate !== null && 'kind' in candidate;
	}

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

	/** Set up an interval to collect queue metrics and emit them in an event. */
	private scheduleQueueMetrics() {
		if (!this.isQueueMetricsEnabled || this.queueMetricsInterval) return;

		this.queueMetricsInterval = setInterval(async () => {
			const pendingJobCounts = await this.getPendingJobCounts();

			this.eventService.emit('job-counts-updated', {
				...pendingJobCounts, // active, waiting
				...this.jobCounters, // completed, failed
			});

			this.jobCounters.completed = 0;
			this.jobCounters.failed = 0;
		}, this.globalConfig.endpoints.metrics.queueMetricsInterval * Time.seconds.toMilliseconds);
	}

	async getPendingJobCounts() {
		const jobCounts = { active: 0, waiting: 0 };
		const queues = this.jobQueues.getAllQueues();
		for (const queue of queues) {
			const counts = await queue.getJobCounts();
			jobCounts.active += counts.active;
			jobCounts.waiting += counts.waiting;
		}
		return jobCounts;
	}

	async findJobsByStatus(statuses: JobStatus[]): Promise<Job[]> {
		const jobs = [];
		const queues = this.jobQueues.getAllQueues();
		for (const queue of queues) {
			jobs.push(...(await queue.getJobs(statuses)));
		}
		return jobs.filter((job) => job !== null);
	}

	/** Stop collecting queue metrics. */
	private stopQueueMetrics() {
		if (this.queueMetricsInterval) {
			clearInterval(this.queueMetricsInterval);
			this.queueMetricsInterval = undefined;

			this.logger.debug('Queue metrics collection stopped');
		}
	}
}
