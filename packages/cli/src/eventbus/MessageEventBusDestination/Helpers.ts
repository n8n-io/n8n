import { jsonParse, JsonObject } from 'n8n-workflow';
import { EventDestinations } from '../../databases/entities/MessageEventBusDestinationEntity';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import { MessageEventBusDestinationRedis } from './MessageEventBusDestinationRedis';
import { MessageEventBusDestinationSentry } from './MessageEventBusDestinationSentry';
import { MessageEventBusDestinationSyslog } from './MessageEventBusDestinationSyslog';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestinationWebhook';

export function messageEventBusDestinationFromDb(
	dbData: EventDestinations,
): MessageEventBusDestination | null {
	const destinationData = jsonParse<JsonObject>(dbData.destination);
	if ('serializedName' in destinationData) {
		switch (destinationData.serializedName) {
			case MessageEventBusDestinationSentry.serializedName:
				return MessageEventBusDestinationSentry.deserialize(destinationData);
			case MessageEventBusDestinationSyslog.serializedName:
				return MessageEventBusDestinationSyslog.deserialize(destinationData);
			case MessageEventBusDestinationRedis.serializedName:
				return MessageEventBusDestinationRedis.deserialize(destinationData);
			case MessageEventBusDestinationWebhook.serializedName:
				return MessageEventBusDestinationWebhook.deserialize(destinationData);
			default:
				console.log('MessageEventBusDestination serializedName unknown');
		}
	}
	return null;
}
