import { Service } from 'typedi';

import type { RelayEventMap } from '@/events/relay-event-map';

import { EventService } from './event.service';

@Service()
export class EventRelay {
	constructor(readonly eventService: EventService) {}

	protected setupListeners<EventNames extends keyof RelayEventMap>(
		map: {
			[EventName in EventNames]?: (event: RelayEventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handler] of Object.entries(map) as Array<
			[EventNames, (event: RelayEventMap[EventNames]) => void | Promise<void>]
		>) {
			this.eventService.on(eventName, async (event) => {
				await handler(event);
			});
		}
	}
}
