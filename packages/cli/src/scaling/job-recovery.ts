import { Service } from '@n8n/di';

import config from '@/config';
import { QueueRecoveryContext } from './scaling.types';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { InstanceSettings, Logger } from 'n8n-core';
import { HIGHEST_SHUTDOWN_PRIORITY, Time } from '@/constants';
import { OnShutdown } from '@/decorators/on-shutdown';
import { jsonStringify } from 'n8n-workflow';
import { JobProducer } from './job-producer';

@Service()
export class JobRecovery {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionRepository: ExecutionRepository,
		private readonly jobProducer: JobProducer,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	private readonly queueRecoveryContext: QueueRecoveryContext = {
		batchSize: config.getEnv('executions.queueRecovery.batchSize'),
		waitMs: config.getEnv('executions.queueRecovery.interval') * 60 * 1000,
	};

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop() {
		const { instanceType } = this.instanceSettings;
		const { timeout } = this.queueRecoveryContext;

		if (instanceType === 'main' && timeout) {
			clearTimeout(timeout);
			this.logger.debug('Queue recovery stopped');
		}
	}

	schedule(waitMs = this.queueRecoveryContext.waitMs) {
		this.queueRecoveryContext.timeout = setTimeout(async () => {
			try {
				const nextWaitMs = await this.recoverFromQueue();
				this.schedule(nextWaitMs);
			} catch (error) {
				this.logger.error('Failed to recover dangling executions from queue', {
					msg: this.toErrorMsg(error),
				});
				this.logger.error('Retrying...');

				this.schedule();
			}
		}, waitMs);

		const wait = [this.queueRecoveryContext.waitMs / Time.minutes.toMilliseconds, 'min'].join(' ');

		this.logger.debug(`Scheduled queue recovery check for next ${wait}`);
	}

	/**
	 * Mark in-progress executions as `crashed` if stored in DB as `new` or `running`
	 * but absent from the queue. Return time until next recovery cycle.
	 */
	private async recoverFromQueue() {
		const { waitMs, batchSize } = this.queueRecoveryContext;

		const storedIds = await this.executionRepository.getInProgressExecutionIds(batchSize);

		if (storedIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const runningJobs = await this.jobProducer.findJobsByStatus(['active', 'waiting']);

		const queuedIds = new Set(runningJobs.map((job) => job.data.executionId));

		if (queuedIds.size === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		const danglingIds = storedIds.filter((id) => !queuedIds.has(id));

		if (danglingIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}

		await this.executionRepository.markAsCrashed(danglingIds);

		this.logger.info('Completed queue recovery check, recovered dangling executions', {
			danglingIds,
		});

		// if this cycle used up the whole batch size, it is possible for there to be
		// dangling executions outside this check, so speed up next cycle

		return storedIds.length >= this.queueRecoveryContext.batchSize ? waitMs / 2 : waitMs;
	}

	private toErrorMsg(error: unknown) {
		return error instanceof Error
			? error.message
			: jsonStringify(error, { replaceCircularRefs: true });
	}
}
