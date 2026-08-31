import type { Logger } from '@n8n/backend-common';
import type { SystemTask } from '@n8n/decorators';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

/**
 * Runs one durable occurrence of a system task.
 *
 * Errors propagate: the executor is what retries the occurrence or gives up on
 * it, following the attempt limit carried by the occurrence's job row.
 */
export class SystemTaskHandler implements TaskHandler {
	constructor(
		private readonly systemTask: SystemTask,
		private readonly logger: Logger,
		private readonly onRunError: (error: unknown) => void,
	) {}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		const decision =
			this.systemTask.effects === 'non-idempotent' ? report.dispatched() : report.notDispatched();

		try {
			await this.systemTask.run();
		} catch (error) {
			this.onRunError(error);
			throw error;
		}

		this.logger.debug('Ran a system task occurrence', {
			name: this.systemTask.name,
			taskId: task.id,
			jobId: task.jobId,
		});

		return decision;
	}
}
