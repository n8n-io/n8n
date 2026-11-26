import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { EventService, type EventMap } from '../event.service';

@Service()
export class EventRelay {
	readonly #logger: Logger;

	constructor(
		readonly eventService: EventService,
		logger?: Logger,
	) {
		this.#logger = logger ?? Container.get(Logger);
	}

	protected setupListeners<EventNames extends keyof EventMap>(
		map: {
			[EventName in EventNames]?: (event: EventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handler] of Object.entries(map) as Array<
			[EventNames, ((event: EventMap[EventNames]) => void | Promise<void>) | undefined]
		>) {
			if (!handler) continue;
			this.eventService.on(eventName, async (event) => {
				try {
					await handler(event);
				} catch (error) {
					this.#logger.error('Event relay listener failed', {
						eventName,
						relay: this.constructor.name,
						error: ensureError(error),
					});
				}
			});
		}
	}
}
