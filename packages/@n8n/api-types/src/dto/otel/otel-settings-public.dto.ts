import '../../openapi-extend';

import { z } from 'zod';

import {
	otelSettingsPublicDescription,
	otelSettingsPublicFieldDocs as docs,
} from './otel-settings-public.openapi';
import { TRACE_LINK_BACKENDS } from './trace-link';
import { OTLP_PROTOCOLS, UpdateOtelSettingsDto } from './update-otel-settings.dto';
import { Z } from '../../zod-class';

export class OtelSettingsPublicDto extends Z.class(
	{
		enabled: z.boolean().openapi(docs.enabled),
		exporterProtocol: z.string().openapi({ ...docs.exporterProtocol, enum: [...OTLP_PROTOCOLS] }),
		exporterEndpoint: z.string().openapi(docs.exporterEndpoint),
		exporterTracingPath: z.string().openapi(docs.exporterTracingPath),
		exporterServiceName: z.string().openapi(docs.exporterServiceName),
		exporterHeaders: z.string().openapi(docs.exporterHeaders),
		tracesSampleRate: z.number().openapi(docs.tracesSampleRate),
		startupConnectivityTimeoutMs: z.number().openapi(docs.startupConnectivityTimeoutMs),
		includeNodeSpans: z.boolean().openapi(docs.includeNodeSpans),
		emitWorkflowStartSpan: z.boolean().openapi(docs.emitWorkflowStartSpan),
		emitNodeStartSpan: z.boolean().openapi(docs.emitNodeStartSpan),
		injectOutbound: z.boolean().openapi(docs.injectOutbound),
		productionExecutionsOnly: z.boolean().openapi(docs.productionExecutionsOnly),
		includeExecutionUrl: z.boolean().openapi(docs.includeExecutionUrl),
		traceLinkBackend: z
			.string()
			.openapi({ ...docs.traceLinkBackend, enum: [...TRACE_LINK_BACKENDS] }),
		traceLinkBaseUrl: z.string().openapi(docs.traceLinkBaseUrl),
		traceLinkDatasourceUid: z.string().openapi(docs.traceLinkDatasourceUid),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi({ description: otelSettingsPublicDescription });
}

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
		emitWorkflowStartSpan: fields.emitWorkflowStartSpan.openapi(docs.emitWorkflowStartSpan),
		emitNodeStartSpan: fields.emitNodeStartSpan.openapi(docs.emitNodeStartSpan),
		injectOutbound: fields.injectOutbound.openapi(docs.injectOutbound),
		productionExecutionsOnly: fields.productionExecutionsOnly.openapi(
			docs.productionExecutionsOnly,
		),
		includeExecutionUrl: fields.includeExecutionUrl.openapi(docs.includeExecutionUrl),
		traceLinkBackend: fields.traceLinkBackend.openapi(docs.traceLinkBackend),
		traceLinkBaseUrl: fields.traceLinkBaseUrl.openapi(docs.traceLinkBaseUrl),
		traceLinkDatasourceUid: fields.traceLinkDatasourceUid.openapi(docs.traceLinkDatasourceUid),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi({ description: otelSettingsPublicDescription });
}

export class OtelSettingsQueryPublicDto extends Z.class({}, { strict: true }) {}
