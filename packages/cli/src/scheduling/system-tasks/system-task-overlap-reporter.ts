import type { RetiredTask } from '@n8n/scheduler';

import type { EventService } from '@/events/event.service';

import { emitSystemTaskMetric } from './emit-system-task-metric';
import { systemTaskName } from './system-task-type';

/** Emits one overlap skip per system task, counting its held-back occurrences. Ignores other task types. */
export function reportSystemTaskOverlaps(
	eventService: EventService,
	occurrences: RetiredTask[],
): void {
	occurrences
		.map(({ taskType }) => systemTaskName(taskType))
		.filter((name): name is string => name !== undefined)
		.reduce(
			(counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1),
			new Map<string, number>(),
		)
		.forEach((count, name) =>
			emitSystemTaskMetric(eventService, 'system-task-run-skipped', {
				name,
				reason: 'overlap',
				count,
			}),
		);
}
