import '../../openapi-extend';

import { z } from 'zod';

import { otelSettingsPublicDocs as docs } from './otel-settings-public.openapi';
import { OTLP_PROTOCOLS, UpdateOtelSettingsDto } from './update-otel-settings.dto';
import { Z } from '../../zod-class';

const fields = UpdateOtelSettingsDto.schema.shape;

export class UpdateOtelSettingsPublicDto extends Z.class(
	{
		enabled: fields.enabled.openapi(docs.enabled),
		exporterProtocol: fields.exporterProtocol.openapi(docs.exporterProtocol),
		exporterEndpoint: fields.exporterEndpoint.openapi(docs.exporterEndpoint),
		exporterTracingPath: fields.exporterTracingPath.openapi(docs.exporterTracingPath),
		exporterServiceName: fields.exporterServiceName.openapi(docs.exporterServiceName),
		exporterHeaders: fields.exporterHeaders.openapi(docs.exporterHeaders),
		tracesSampleRate: fields.tracesSampleRate.openapi(docs.tracesSampleRate),
		startupConnectivityTimeoutMs: fields.startupConnectivityTimeoutMs.openapi(
			docs.startupConnectivityTimeoutMs,
		),
		includeNodeSpans: fields.includeNodeSpans.openapi(docs.includeNodeSpans),
		injectOutbound: fields.injectOutbound.openapi(docs.injectOutbound),
		productionExecutionsOnly: fields.productionExecutionsOnly.openapi(
			docs.productionExecutionsOnly,
		),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi(docs.configuration);
}

export class OtelSettingsPublicDto extends Z.class(
	{
		enabled: z.boolean().openapi(docs.enabled),
		exporterProtocol: z.string().openapi({
			...docs.exporterProtocol,
			enum: [...OTLP_PROTOCOLS],
			default: 'http/protobuf',
		}),
		exporterEndpoint: z.string().openapi({ ...docs.exporterEndpoint, format: 'uri' }),
		exporterTracingPath: z.string().openapi(docs.exporterTracingPath),
		exporterServiceName: z.string().openapi({ ...docs.exporterServiceName, minLength: 1 }),
		exporterHeaders: z.string().openapi(docs.exporterHeaders),
		tracesSampleRate: z.number().openapi({ ...docs.tracesSampleRate, minimum: 0, maximum: 1 }),
		startupConnectivityTimeoutMs: z.number().openapi({
			...docs.startupConnectivityTimeoutMs,
			type: 'integer',
			minimum: 0,
		}),
		includeNodeSpans: z.boolean().openapi(docs.includeNodeSpans),
		injectOutbound: z.boolean().openapi(docs.injectOutbound),
		productionExecutionsOnly: z.boolean().openapi(docs.productionExecutionsOnly),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi(docs.configuration);
}

export class UpdateOtelSettingsQueryPublicDto extends Z.class({}, { strict: true }) {}
