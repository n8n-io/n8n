import { Service } from '@n8n/di';
import type { RetiredOccurrence } from '@n8n/scheduler';

import { EventService } from '@/events/event.service';

import { emitSystemTaskMetric } from './emit-system-task-metric';
import { systemTaskName } from './system-task-type';

/**
 * Reports the durable occurrences a system task's concurrency limit held back
 * until their deadline passed, as the skip event the in-memory runner emits for
 * the same overlap.
 */
@Service()
export class SystemTaskOverlapReporter {
	constructor(private readonly eventService: EventService) {}

	/** Occurrences of another owner's task type are ignored. */
	report(occurrences: RetiredOccurrence[]): void {
		for (const { taskType } of occurrences) {
			const name = systemTaskName(taskType);
			if (name === undefined) continue;
			emitSystemTaskMetric(this.eventService, 'system-task-run-skipped', {
				name,
				reason: 'overlap',
			});
		}
	}
}
