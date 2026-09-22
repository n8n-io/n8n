import type { RetiredTask } from '@n8n/scheduler';

import type { EventService } from '@/events/event.service';

import { emitSystemTaskMetric } from './emit-system-task-metric';
import { systemTaskName } from './system-task-type';

/**
 * Reports the durable occurrences a system task's concurrency limit held back
 * until their deadline passed, as the skip event the in-memory runner emits for
 * the same overlap. Occurrences of another owner's task type are ignored.
 */
export function reportSystemTaskOverlaps(
	eventService: EventService,
	occurrences: RetiredTask[],
): void {
	for (const { taskType } of occurrences) {
		const name = systemTaskName(taskType);
		if (name !== undefined) {
			emitSystemTaskMetric(eventService, 'system-task-run-skipped', {
				name,
				reason: 'overlap',
			});
		}
	}
}
