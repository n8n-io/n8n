import {
	circuitBreakerSchema,
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
	MessageEventBusDestinationWebhookOptionsSchema,
	webhookParameterOptionsSchema,
} from 'n8n-workflow';
import { z } from 'zod';

// These schemas are scoped to the fields the log streaming UI currently supports; backend-only
// fields (credential auth, extra circuit-breaker knobs, batch/response options, etc.) and the
// server-generated id are excluded. Nested schemas are derived from the canonical ones so
// validation stays in sync.

const publicCircuitBreakerSchema = circuitBreakerSchema
	.unwrap()
	.pick({ maxFailures: true, failureWindow: true })
	.optional();

const publicWebhookOptionsSchema = webhookParameterOptionsSchema
	.unwrap()
	.omit({ batch: true, response: true })
	.optional();

const publicWebhookSchema = MessageEventBusDestinationWebhookOptionsSchema.omit({
	__type: true,
	id: true,
	credentials: true,
	authentication: true,
	genericAuthType: true,
	nodeCredentialType: true,
	responseCodeMustMatch: true,
	expectedStatusCode: true,
	sendPayload: true,
}).extend({
	type: z.literal('webhook'),
	options: publicWebhookOptionsSchema,
	circuitBreaker: publicCircuitBreakerSchema,
});

const publicSyslogSchema = MessageEventBusDestinationSyslogOptionsSchema.omit({
	__type: true,
	id: true,
	credentials: true,
	eol: true,
	expectedStatusCode: true,
}).extend({ type: z.literal('syslog'), circuitBreaker: publicCircuitBreakerSchema });

const publicSentrySchema = MessageEventBusDestinationSentryOptionsSchema.omit({
	__type: true,
	id: true,
	credentials: true,
	tracesSampleRate: true,
	sendPayload: true,
}).extend({ type: z.literal('sentry'), circuitBreaker: publicCircuitBreakerSchema });

export const PublicCreateDestinationDto = z.discriminatedUnion('type', [
	publicWebhookSchema,
	publicSyslogSchema,
	publicSentrySchema,
]);

// Response shape adds the server-generated `id`; parsing through it strips non-public fields.
export const PublicDestinationResponseDto = z.discriminatedUnion('type', [
	publicWebhookSchema.extend({ id: z.string() }),
	publicSyslogSchema.extend({ id: z.string() }),
	publicSentrySchema.extend({ id: z.string() }),
]);

export type PublicCreateDestination = z.infer<typeof PublicCreateDestinationDto>;

export type PublicDestinationType = PublicCreateDestination['type'];
