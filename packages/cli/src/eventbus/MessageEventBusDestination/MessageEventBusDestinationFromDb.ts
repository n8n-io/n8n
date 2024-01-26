import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { EventDestinations } from '@db/entities/EventDestinations';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import type { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import { MessageEventBusDestinationSentry } from './MessageEventBusDestinationSentry.ee';
import { MessageEventBusDestinationSyslog } from './MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestinationWebhook.ee';
import { Container } from 'typedi';
import { Logger } from '@/Logger';

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
