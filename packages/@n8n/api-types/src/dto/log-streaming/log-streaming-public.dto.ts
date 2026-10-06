import '../../openapi-extend';

import {
	circuitBreakerSchema,
	MessageEventBusDestinationOptionsSchema,
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
	MessageEventBusDestinationWebhookOptionsSchema,
	webhookParameterOptionsSchema,
} from 'n8n-workflow';
import { z } from 'zod';

import {
	logStreamingCircuitBreakerFieldDocs,
	logStreamingDestinationCommonFieldDocs,
	logStreamingDestinationDocs,
	logStreamingDestinationListFieldDocs,
	logStreamingEventTypesFieldDocs,
	logStreamingParameterFieldDocs,
	logStreamingParameterListDocs,
	logStreamingSentryFieldDocs,
	logStreamingSyslogFieldDocs,
	logStreamingWebhookFieldDocs,
	logStreamingWebhookOptionsFieldDocs,
} from './log-streaming-public.openapi';
import { readOnlyPublicSchema } from '../../schemas/read-only-public.schema';
import { Z } from '../../zod-class';

const logStreamingEventTypesPublicSchema = z
	.object({
		data: z.array(z.string()).openapi(logStreamingEventTypesFieldDocs.data),
	})
	.openapi({ additionalProperties: false });

export class LogStreamingEventTypesPublicDto extends Z.class(
	logStreamingEventTypesPublicSchema.shape,
) {
	static schema = logStreamingEventTypesPublicSchema;
}

// Only the fields the log streaming UI exposes. Credentials and auth settings stay out, so a
// read never returns them.

const commonDocs = logStreamingDestinationCommonFieldDocs;
const baseShape = MessageEventBusDestinationOptionsSchema.shape;
const circuitBreakerShape = circuitBreakerSchema.unwrap().shape;

const publicCircuitBreakerSchema = z
	.object({
		maxFailures: circuitBreakerShape.maxFailures.openapi(
			logStreamingCircuitBreakerFieldDocs.maxFailures,
		),
		failureWindow: circuitBreakerShape.failureWindow.openapi(
			logStreamingCircuitBreakerFieldDocs.failureWindow,
		),
	})
	.optional()
	.openapi(commonDocs.circuitBreaker);

const publicCommonShape = {
	label: baseShape.label.openapi(commonDocs.label),
	enabled: baseShape.enabled.openapi(commonDocs.enabled),
	subscribedEvents: baseShape.subscribedEvents.openapi(commonDocs.subscribedEvents),
	anonymizeAuditMessages: baseShape.anonymizeAuditMessages.openapi(
		commonDocs.anonymizeAuditMessages,
	),
	circuitBreaker: publicCircuitBreakerSchema,
};

const webhookShape = MessageEventBusDestinationWebhookOptionsSchema.shape;
const webhookDocs = logStreamingWebhookFieldDocs;
const optionsDocs = logStreamingWebhookOptionsFieldDocs;
const webhookOptionsShape = webhookParameterOptionsSchema.unwrap().shape;
const redirectShape = webhookOptionsShape.redirect.unwrap().shape.redirect.shape;
const proxyShape = webhookOptionsShape.proxy.unwrap().shape.proxy.shape;
const socketShape = webhookOptionsShape.socket.unwrap().shape;

const publicWebhookOptionsSchema = z
	.object({
		timeout: webhookOptionsShape.timeout.openapi(optionsDocs.timeout),
		allowUnauthorizedCerts: webhookOptionsShape.allowUnauthorizedCerts.openapi(
			optionsDocs.allowUnauthorizedCerts,
		),
		queryParameterArrays: webhookOptionsShape.queryParameterArrays.openapi(
			optionsDocs.queryParameterArrays,
		),
		redirect: z
			.object({
				redirect: z.object({
					followRedirects: redirectShape.followRedirects.openapi(optionsDocs.followRedirects),
					maxRedirects: redirectShape.maxRedirects.openapi(optionsDocs.maxRedirects),
				}),
			})
			.optional()
			.openapi(optionsDocs.redirect),
		proxy: z
			.object({
				proxy: z.object({
					protocol: proxyShape.protocol.openapi(optionsDocs.protocol),
					host: proxyShape.host.openapi(optionsDocs.host),
					port: proxyShape.port.openapi(optionsDocs.port),
				}),
			})
			.optional()
			.openapi(optionsDocs.proxy),
		socket: z
			.object({
				keepAlive: socketShape.keepAlive.openapi(optionsDocs.keepAlive),
				maxSockets: socketShape.maxSockets.openapi(optionsDocs.maxSockets),
				maxFreeSockets: socketShape.maxFreeSockets.openapi(optionsDocs.maxFreeSockets),
			})
			.optional()
			.openapi(optionsDocs.socket),
	})
	.optional()
	.openapi(webhookDocs.options);

const parameterShape = webhookShape.headerParameters.unwrap().shape.parameters.element.shape;
const publicParameterListSchema = z
	.object({
		parameters: z.array(
			z.object({
				name: parameterShape.name.openapi(logStreamingParameterFieldDocs.name),
				value: parameterShape.value.openapi(logStreamingParameterFieldDocs.value),
			}),
		),
	})
	.optional()
	.openapi(logStreamingParameterListDocs);

const publicWebhookSchema = z.object({
	...publicCommonShape,
	type: z.literal('webhook').openapi(webhookDocs.type),
	url: webhookShape.url.openapi(webhookDocs.url),
	method: webhookShape.method.openapi(webhookDocs.method),
	sendHeaders: webhookShape.sendHeaders.openapi(webhookDocs.sendHeaders),
	specifyHeaders: webhookShape.specifyHeaders.openapi(webhookDocs.specifyHeaders),
	headerParameters: publicParameterListSchema,
	jsonHeaders: webhookShape.jsonHeaders.openapi(webhookDocs.jsonHeaders),
	sendQuery: webhookShape.sendQuery.openapi(webhookDocs.sendQuery),
	specifyQuery: webhookShape.specifyQuery.openapi(webhookDocs.specifyQuery),
	queryParameters: publicParameterListSchema,
	jsonQuery: webhookShape.jsonQuery.openapi(webhookDocs.jsonQuery),
	options: publicWebhookOptionsSchema,
});

const syslogShape = MessageEventBusDestinationSyslogOptionsSchema.shape;
const syslogDocs = logStreamingSyslogFieldDocs;

const publicSyslogSchema = z.object({
	...publicCommonShape,
	type: z.literal('syslog').openapi(syslogDocs.type),
	host: syslogShape.host.openapi(syslogDocs.host),
	port: syslogShape.port.openapi(syslogDocs.port),
	protocol: syslogShape.protocol.openapi(syslogDocs.protocol),
	facility: syslogShape.facility.openapi(syslogDocs.facility),
	app_name: syslogShape.app_name.openapi(syslogDocs.app_name),
	tlsCa: syslogShape.tlsCa.openapi(syslogDocs.tlsCa),
});

const sentryShape = MessageEventBusDestinationSentryOptionsSchema.shape;
const sentryDocs = logStreamingSentryFieldDocs;

const publicSentrySchema = z.object({
	...publicCommonShape,
	type: z.literal('sentry').openapi(sentryDocs.type),
	dsn: sentryShape.dsn.openapi(sentryDocs.dsn),
});

const readOnlyIdSchema = readOnlyPublicSchema({
	type: 'string',
	readOnly: true,
	...commonDocs.id,
});

const createLogStreamingDestinationPublicSchema = z
	.discriminatedUnion('type', [
		publicWebhookSchema.extend({ id: readOnlyIdSchema }),
		publicSyslogSchema.extend({ id: readOnlyIdSchema }),
		publicSentrySchema.extend({ id: readOnlyIdSchema }),
	])
	.openapi(logStreamingDestinationDocs);

export type CreateLogStreamingDestinationPublic = z.infer<
	typeof createLogStreamingDestinationPublicSchema
>;

export type LogStreamingDestinationPublicType = CreateLogStreamingDestinationPublic['type'];

/**
 * A discriminated union has no object shape, so this cannot extend `Z.class`. The type and the
 * class share one name: `@Body` reads the class from the decorator metadata, and the handler
 * receives the union.
 */
export type CreateLogStreamingDestinationPublicDto = CreateLogStreamingDestinationPublic;
export const CreateLogStreamingDestinationPublicDto = class {
	static schema = createLogStreamingDestinationPublicSchema;

	static safeParse(data: unknown) {
		return createLogStreamingDestinationPublicSchema.safeParse(data);
	}

	static parse(data: unknown): CreateLogStreamingDestinationPublic {
		return createLogStreamingDestinationPublicSchema.parse(data);
	}
};

const updateLogStreamingDestinationPublicSchema = z
	.discriminatedUnion('type', [publicWebhookSchema, publicSyslogSchema, publicSentrySchema])
	.openapi(logStreamingDestinationDocs);

export type UpdateLogStreamingDestinationPublic = z.infer<
	typeof updateLogStreamingDestinationPublicSchema
>;

export type UpdateLogStreamingDestinationPublicDto = UpdateLogStreamingDestinationPublic;
export const UpdateLogStreamingDestinationPublicDto = class {
	static schema = updateLogStreamingDestinationPublicSchema;

	static safeParse(data: unknown) {
		return updateLogStreamingDestinationPublicSchema.safeParse(data);
	}

	static parse(data: unknown): UpdateLogStreamingDestinationPublic {
		return updateLogStreamingDestinationPublicSchema.parse(data);
	}
};

const idSchema = z.string().openapi(commonDocs.id);

export const logStreamingDestinationPublicSchema = z
	.discriminatedUnion('type', [
		publicWebhookSchema.extend({ id: idSchema }),
		publicSyslogSchema.extend({ id: idSchema }),
		publicSentrySchema.extend({ id: idSchema }),
	])
	.openapi(logStreamingDestinationDocs);

export type LogStreamingDestinationPublic = z.infer<typeof logStreamingDestinationPublicSchema>;

/** A discriminated union has no object shape, so this cannot extend `Z.class`. */
export class LogStreamingDestinationPublicDto {
	static schema = logStreamingDestinationPublicSchema;

	static safeParse(data: unknown) {
		return logStreamingDestinationPublicSchema.safeParse(data);
	}

	static parse(data: unknown): LogStreamingDestinationPublic {
		return logStreamingDestinationPublicSchema.parse(data);
	}
}

const logStreamingDestinationListPublicSchema = z
	.object({
		data: z
			.array(logStreamingDestinationPublicSchema)
			.openapi(logStreamingDestinationListFieldDocs.data),
	})
	.openapi({ additionalProperties: false });

export class LogStreamingDestinationListPublicDto extends Z.class(
	logStreamingDestinationListPublicSchema.shape,
) {
	static schema = logStreamingDestinationListPublicSchema;
}
