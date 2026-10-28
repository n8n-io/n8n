import {
	LogStreamingDestinationPublicDto,
	type UpdateLogStreamingDestinationPublic,
	type LogStreamingDestinationPublicType,
} from '@n8n/api-types';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

const INTERNAL_TO_PUBLIC: Partial<
	Record<MessageEventBusDestinationTypeNames, LogStreamingDestinationPublicType>
> = {
	[MessageEventBusDestinationTypeNames.webhook]: 'webhook',
	[MessageEventBusDestinationTypeNames.syslog]: 'syslog',
	[MessageEventBusDestinationTypeNames.sentry]: 'sentry',
};

const PUBLIC_TO_INTERNAL: Record<
	LogStreamingDestinationPublicType,
	MessageEventBusDestinationTypeNames
> = {
	webhook: MessageEventBusDestinationTypeNames.webhook,
	syslog: MessageEventBusDestinationTypeNames.syslog,
	sentry: MessageEventBusDestinationTypeNames.sentry,
};

export function toLogStreamingDestinationPublic(options: MessageEventBusDestinationOptions) {
	const type = options.__type ? INTERNAL_TO_PUBLIC[options.__type] : undefined;
	return LogStreamingDestinationPublicDto.parse({ ...options, type });
}

export function toInternalDestinationOptions(
	input: UpdateLogStreamingDestinationPublic,
): MessageEventBusDestinationOptions {
	const { type, ...rest } = input;
	return { ...rest, __type: PUBLIC_TO_INTERNAL[type] };
}
