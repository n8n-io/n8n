import { Service } from '@n8n/di';
import type { EventMap } from '@n8n/services-common';
import { EventService } from '@n8n/services-common';

@Service()
export class EventRelay {
	constructor(readonly eventService: EventService) {}

	protected setupListeners<EventNames extends keyof EventMap>(
		map: {
			[EventName in EventNames]?: (event: EventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handler] of Object.entries(map) as Array<
			[EventNames, (event: EventMap[EventNames]) => void | Promise<void>]
		>) {
			this.eventService.on(eventName, async (event) => {
				await handler(event);
			});
		}
	}
}
