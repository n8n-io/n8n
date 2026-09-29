import '../../openapi-extend';

import { z } from 'zod';

import {
	otelSettingsPublicDescription,
	otelSettingsPublicFieldDocs as docs,
} from './otel-settings-public.openapi';
import { OTLP_PROTOCOLS } from './update-otel-settings.dto';
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
		injectOutbound: z.boolean().openapi(docs.injectOutbound),
		productionExecutionsOnly: z.boolean().openapi(docs.productionExecutionsOnly),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi({ description: otelSettingsPublicDescription });
}

export class GetOtelSettingsQueryPublicDto extends Z.class({}, { strict: true }) {}
