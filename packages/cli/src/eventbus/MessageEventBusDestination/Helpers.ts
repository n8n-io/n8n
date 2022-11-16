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
	if ('__type' in destinationData) {
		switch (destinationData.__type) {
			case MessageEventBusDestinationSentry.__type:
				return MessageEventBusDestinationSentry.deserialize(destinationData);
			case MessageEventBusDestinationSyslog.__type:
				return MessageEventBusDestinationSyslog.deserialize(destinationData);
			case MessageEventBusDestinationRedis.__type:
				return MessageEventBusDestinationRedis.deserialize(destinationData);
			case MessageEventBusDestinationWebhook.__type:
				return MessageEventBusDestinationWebhook.deserialize(destinationData);
			default:
				console.log('MessageEventBusDestination __type unknown');
		}
	}
	return null;
}
