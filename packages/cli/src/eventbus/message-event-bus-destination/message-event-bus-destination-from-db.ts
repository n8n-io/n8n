import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { Container } from 'typedi';

import type { EventDestinations } from '@/databases/entities/event-destinations';
import { Logger } from '@/logging/logger.service';

import { MessageEventBusDestinationSentry } from './message-event-bus-destination-sentry.ee';
import { MessageEventBusDestinationSyslog } from './message-event-bus-destination-syslog.ee';
import { MessageEventBusDestinationWebhook } from './message-event-bus-destination-webhook.ee';
import type { MessageEventBusDestination } from './message-event-bus-destination.ee';
import type { MessageEventBus } from '../message-event-bus/message-event-bus';

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
