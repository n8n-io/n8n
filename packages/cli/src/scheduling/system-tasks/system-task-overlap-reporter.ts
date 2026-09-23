import type { RetiredTask } from '@n8n/scheduler';

import type { EventService } from '@/events/event.service';

import { emitSystemTaskMetric } from './emit-system-task-metric';
import { systemTaskName } from './system-task-type';

/** Emits an overlap skip for each held-back system task occurrence. Ignores other task types. */
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
