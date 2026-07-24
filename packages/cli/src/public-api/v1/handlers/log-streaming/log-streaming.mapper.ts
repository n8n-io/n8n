import {
	PublicDestinationResponseDto,
	type PublicCreateDestination,
	type PublicDestinationType,
} from '@n8n/api-types';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

// The public API uses a friendly `type` discriminator; the internal service uses `__type`.
const PUBLIC_TO_INTERNAL: Record<PublicDestinationType, MessageEventBusDestinationTypeNames> = {
	webhook: MessageEventBusDestinationTypeNames.webhook,
	syslog: MessageEventBusDestinationTypeNames.syslog,
	sentry: MessageEventBusDestinationTypeNames.sentry,
};

const INTERNAL_TO_PUBLIC: Partial<
	Record<MessageEventBusDestinationTypeNames, PublicDestinationType>
> = {
	[MessageEventBusDestinationTypeNames.webhook]: 'webhook',
	[MessageEventBusDestinationTypeNames.syslog]: 'syslog',
	[MessageEventBusDestinationTypeNames.sentry]: 'sentry',
};

export function toInternalDestinationOptions(
	input: PublicCreateDestination,
): MessageEventBusDestinationOptions {
	const { type, ...rest } = input;
	return { ...rest, __type: PUBLIC_TO_INTERNAL[type] };
}

export function toPublicDestination(options: MessageEventBusDestinationOptions) {
	const type = options.__type ? INTERNAL_TO_PUBLIC[options.__type] : undefined;
	return PublicDestinationResponseDto.parse({ ...options, type });
}
