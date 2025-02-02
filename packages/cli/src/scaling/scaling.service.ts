import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings, Logger } from 'n8n-core';
import { ExecutionCancelledError } from 'n8n-workflow';
import assert from 'node:assert';

import { OrchestrationService } from '@/services/orchestration.service';

import { QUEUE_NAME } from './constants';
import { JobProcessor } from './job-processor';
import type { Job, JobData } from './scaling.types';
import { JobProducer } from './job-producer';
import { JobQueues } from './job-queues';
import { JobRecovery } from './job-recovery';

@Service()
export class ScalingService {
	constructor(
		private readonly logger: Logger,
		private readonly jobProducer: JobProducer,
		private readonly jobProcessor: JobProcessor,
		private readonly jobQueues: JobQueues,
		private readonly jobRecovery: JobRecovery,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly orchestrationService: OrchestrationService,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	// #region Lifecycle

	async setupQueues() {
		this.jobQueues.assertQueue('default', QUEUE_NAME);
		const { dedicatedIds } = this.globalConfig.queue;
		for (const projectId of dedicatedIds) {
			this.jobQueues.assertQueue(projectId, `project_${projectId}_jobs`);
		}

		const { isLeader, isMultiMain, isWorker } = this.instanceSettings;

		if (!isWorker) {
			if (isLeader) this.jobRecovery.schedule();

			if (isMultiMain) {
				this.orchestrationService.multiMainSetup
					.on('leader-takeover', () => this.jobRecovery.schedule())
					.on('leader-stepdown', () => this.jobRecovery.stop());
			}
		}

		this.logger.debug('Queue setup completed');
	}

	setupWorker(concurrency: number) {
		this.jobProcessor.setup(concurrency);

		this.logger.debug('Worker setup completed');
	}

	// #endregion

	// #region Jobs

	/**
	 * Add a job to the queue.
	 *
	 * @param jobData Data of the job to add to the queue.
	 * @param priority Priority of the job, from `1` (highest) to `MAX_SAFE_INTEGER` (lowest).
	 */
	async addJob(jobData: JobData, options: { priority: number }) {
		return await this.jobProducer.addJob(jobData, options);
	}

	async stopJob(job: Job) {
		const props = { jobId: job.id, executionId: job.data.executionId };

		try {
			if (await job.isActive()) {
				await job.progress({ kind: 'abort-job' }); // being processed by worker
				await job.discard(); // prevent retries
				await job.moveToFailed(new ExecutionCancelledError(job.data.executionId), true); // remove from queue
				return true;
			}

			await job.remove(); // not yet picked up, or waiting for next pickup (stalled)
			this.logger.debug('Stopped inactive job', props);
			return true;
		} catch (error: unknown) {
			assert(error instanceof Error);
			this.logger.error('Failed to stop job', {
				...props,
				error: {
					message: error.message,
					name: error.name,
					stack: error.stack,
				},
			});
			return false;
		}
	}

	// #endregion
}
