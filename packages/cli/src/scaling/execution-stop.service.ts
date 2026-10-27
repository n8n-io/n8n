import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ManualExecutionCancelledError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { JobProcessor } from './job-processor';
import { Publisher } from './pubsub/publisher.service';

/**
 * Cross-process stop protocol for in-memory executions in queue mode.
 *
 * The main broadcasts a `stop-execution` command and whichever worker runs that execution
 * cancels it. A top-level execution is a Bull job that the worker tracks in `JobProcessor`. A
 * subworkflow execution runs inline in the parent's worker process and has no Bull job, so the
 * worker finds it in its own `ActiveExecutions` instead.
 *
 * The `abort-job` job event also stops a top-level execution, but only the process that
 * enqueued the job holds the handle to send it. The broadcast is what reaches the worker when
 * the stop request arrives at another main, at a main restarted after the enqueue, or for a job
 * enqueued by a webhook process.
 */
@Service()
export class ExecutionStopService {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobProcessor: JobProcessor,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	/**
	 * Broadcast a request to stop an execution to all workers. Workers that are not running the
	 * execution ignore it. The main calls this for every stop in queue mode, because it may not
	 * hold the Bull job handle for the execution.
	 */
	async requestStop(executionId: string) {
		if (this.instanceSettings.instanceType !== 'main') return;

		await this.publisher.publishCommand({
			command: 'stop-execution',
			payload: { executionId },
		});
	}

	@OnPubSubEvent('stop-execution', { instanceType: 'worker' })
	handleStopExecution({ executionId }: { executionId: string }) {
		if (this.jobProcessor.stopJobByExecutionId(executionId)) {
			this.logger.debug('Stopped job on worker after stop-execution command', { executionId });
			return;
		}

		if (!this.activeExecutions.has(executionId)) return;

		this.logger.debug('Stopping execution on worker after stop-execution command', {
			executionId,
		});

		this.activeExecutions.stopExecution(
			executionId,
			new ManualExecutionCancelledError(executionId),
		);
	}
}
