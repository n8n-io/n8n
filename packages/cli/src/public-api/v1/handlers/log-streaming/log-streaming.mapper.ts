import { type PublicCreateDestination, type PublicDestinationType } from '@n8n/api-types';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

// The public API uses a friendly `type` discriminator; the internal service uses `__type`.
const PUBLIC_TO_INTERNAL: Record<PublicDestinationType, MessageEventBusDestinationTypeNames> = {
	webhook: MessageEventBusDestinationTypeNames.webhook,
	syslog: MessageEventBusDestinationTypeNames.syslog,
	sentry: MessageEventBusDestinationTypeNames.sentry,
};

export function toInternalDestinationOptions(
	input: PublicCreateDestination,
): MessageEventBusDestinationOptions {
	const { type, ...rest } = input;
	return { ...rest, __type: PUBLIC_TO_INTERNAL[type] };
}
