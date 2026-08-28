import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ManualExecutionCancelledError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { Publisher } from './pubsub/publisher.service';

/**
 * Cross-process stop protocol for in-memory executions in queue mode.
 *
 * Top-level executions are Bull jobs and are stopped via the `abort-job` job event. A
 * subworkflow execution, however, runs inline in the parent's worker process and has no Bull
 * job, so the main process cannot reach it. The main broadcasts a `stop-execution` command and
 * whichever worker is running that execution cancels it from its own `ActiveExecutions`.
 */
@Service()
export class ExecutionStopService {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly activeExecutions: ActiveExecutions,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	/**
	 * Broadcast a request to stop an execution to all workers. Workers that are not running the
	 * execution ignore it. Called from the main process when an execution cannot be reached
	 * locally (e.g. a subworkflow running on a worker).
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
