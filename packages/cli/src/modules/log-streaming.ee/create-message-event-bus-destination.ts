import type { OutboundHttp } from '@n8n/backend-network';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames, UnexpectedError } from 'n8n-workflow';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestinationSentry } from './destinations/message-event-bus-destination-sentry.ee';
import { MessageEventBusDestinationSyslog } from './destinations/message-event-bus-destination-syslog.ee';
import { MessageEventBusDestinationWebhook } from './destinations/message-event-bus-destination-webhook.ee';
import type { MessageEventBusDestination } from './destinations/message-event-bus-destination.ee';

export function createMessageEventBusDestination(
	eventBus: MessageEventBus,
	outboundHttp: OutboundHttp,
	options: MessageEventBusDestinationOptions,
): MessageEventBusDestination {
	switch (options.__type) {
		case MessageEventBusDestinationTypeNames.webhook:
			return new MessageEventBusDestinationWebhook(
				eventBus,
				options as MessageEventBusDestinationWebhookOptions,
				outboundHttp,
			);
		case MessageEventBusDestinationTypeNames.sentry:
			return new MessageEventBusDestinationSentry(
				eventBus,
				options as MessageEventBusDestinationSentryOptions,
			);
		case MessageEventBusDestinationTypeNames.syslog:
			return new MessageEventBusDestinationSyslog(
				eventBus,
				options as MessageEventBusDestinationSyslogOptions,
			);
		default:
			throw new UnexpectedError(`Unknown destination type: ${options.__type ?? 'undefined'}`);
	}
}
