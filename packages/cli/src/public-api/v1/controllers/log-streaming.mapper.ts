import { LogStreamingDestinationPublicDto, type PublicDestinationType } from '@n8n/api-types';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

// The public API uses a friendly `type` discriminator; the internal service uses `__type`.
const INTERNAL_TO_PUBLIC: Partial<
	Record<MessageEventBusDestinationTypeNames, PublicDestinationType>
> = {
	[MessageEventBusDestinationTypeNames.webhook]: 'webhook',
	[MessageEventBusDestinationTypeNames.syslog]: 'syslog',
	[MessageEventBusDestinationTypeNames.sentry]: 'sentry',
};

export function toLogStreamingDestinationPublic(options: MessageEventBusDestinationOptions) {
	const type = options.__type ? INTERNAL_TO_PUBLIC[options.__type] : undefined;
	return LogStreamingDestinationPublicDto.parse({ ...options, type });
}
