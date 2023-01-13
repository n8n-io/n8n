/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { EventDestinations } from '@/databases/entities/MessageEventBusDestinationEntity';
import type { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import { MessageEventBusDestinationSentry } from './MessageEventBusDestinationSentry.ee';
import { MessageEventBusDestinationSyslog } from './MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestinationWebhook.ee';

export function messageEventBusDestinationFromDb(
	dbData: EventDestinations,
): MessageEventBusDestination | null {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
	const destinationData = dbData.destination;
	if ('__type' in destinationData) {
		switch (destinationData.__type) {
			case MessageEventBusDestinationTypeNames.sentry:
				return MessageEventBusDestinationSentry.deserialize(destinationData);
			case MessageEventBusDestinationTypeNames.syslog:
				return MessageEventBusDestinationSyslog.deserialize(destinationData);
			case MessageEventBusDestinationTypeNames.webhook:
				return MessageEventBusDestinationWebhook.deserialize(destinationData);
			default:
				console.log('MessageEventBusDestination __type unknown');
		}
	}
	return null;
}
