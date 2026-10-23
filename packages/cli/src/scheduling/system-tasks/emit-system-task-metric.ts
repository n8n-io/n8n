import type { EventMap, EventService } from '@n8n/backend-services';

import type { SystemTaskMetricsEventMap } from '@/events/maps/system-task-metrics.event-map';

/**
 * Emit a system task metrics event, swallowing a throwing listener: a metrics
 * sink must never fail a run or break the scheduling around it.
 */
export function emitSystemTaskMetric<EventName extends keyof SystemTaskMetricsEventMap>(
	eventService: EventService,
	event: EventName,
	payload: EventMap[EventName],
): void {
	try {
		eventService.emit(event, payload);
	} catch {
		// Deliberately swallowed, see the contract above.
	}
}
