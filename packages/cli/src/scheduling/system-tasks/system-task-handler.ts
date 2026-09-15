import type { Logger } from '@n8n/backend-common';
import type { SystemTask } from '@n8n/decorators';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import type { Tracing } from 'n8n-core';

import type { EventService } from '@/events/event.service';

import { observeSystemTaskRun } from './system-task-run-observer';

/**
 * Runs one durable occurrence of a system task, handing it `shutdownSignal` so
 * it can stop early when the instance shuts down.
 *
 * Errors propagate: the executor is what retries the occurrence or gives up on
 * it, following the attempt limit carried by the occurrence's job row.
 */
export class SystemTaskHandler implements TaskHandler {
	constructor(
		private readonly systemTask: SystemTask,
		private readonly shutdownSignal: AbortSignal,
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly tracing: Tracing,
		private readonly onRunError: (error: unknown) => void,
	) {}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		const outcome = await observeSystemTaskRun(
			this.eventService,
			this.tracing,
			this.systemTask,
			'durable',
			this.shutdownSignal,
		);
		if (outcome.rejected) {
			// An aborted run is not reported, but its rejection still propagates so
			// the executor keeps deciding the occurrence's fate.
			if (outcome.result === 'failure') {
				this.onRunError(outcome.error);
			}
			throw outcome.error;
		}

		this.logger.debug('Ran a system task occurrence', {
			name: this.systemTask.name,
			taskId: task.id,
			jobId: task.jobId,
		});

		// Non-idempotent work is pinned to one attempt, so a dispatch marker can
		// never prevent a redelivery. Stamping it before the run would only record
		// a thrown run as succeeded and drop its error message.
		return report.notDispatched();
	}
}
