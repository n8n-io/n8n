import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus.js';

import { MessageEventBusDestinationSentry } from './message-event-bus-destination-sentry.ee.js';
import { MessageEventBusDestinationSyslog } from './message-event-bus-destination-syslog.ee.js';
import { MessageEventBusDestinationWebhook } from './message-event-bus-destination-webhook.ee.js';
import type { MessageEventBusDestination } from './message-event-bus-destination.ee.js';
import type { EventDestinations } from '../database/entities/index.js';

export function messageEventBusDestinationFromDb(
	eventBusInstance: MessageEventBus,
	dbData: EventDestinations,
): MessageEventBusDestination | null {
	const destinationData = dbData.destination;
	if ('__type' in destinationData) {
		switch (destinationData.__type) {
			case MessageEventBusDestinationTypeNames.sentry:
				return MessageEventBusDestinationSentry.deserialize(eventBusInstance, destinationData);
			case MessageEventBusDestinationTypeNames.syslog:
				return MessageEventBusDestinationSyslog.deserialize(eventBusInstance, destinationData);
			case MessageEventBusDestinationTypeNames.webhook:
				return MessageEventBusDestinationWebhook.deserialize(eventBusInstance, destinationData);
			default:
				Container.get(Logger).debug('MessageEventBusDestination __type unknown');
		}
	}
	return null;
}
