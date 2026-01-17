import {
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
	MessageEventBusDestinationWebhookOptionsSchema,
} from 'n8n-workflow';
import { z } from 'zod';

// Union of all destination types - discriminated union based on __type field
const destinationSchema = z.discriminatedUnion('__type', [
	MessageEventBusDestinationWebhookOptionsSchema,
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
]);

// The body is the destination object directly, not wrapped
export const CreateDestinationDto = destinationSchema;

export type CreateDestinationDto = z.infer<typeof CreateDestinationDto>;

// Type exports for use in other files - re-export from workflow package
export type {
	MessageEventBusDestinationWebhookOptions as WebhookDestination,
	MessageEventBusDestinationSentryOptions as SentryDestination,
	MessageEventBusDestinationSyslogOptions as SyslogDestination,
} from 'n8n-workflow';
