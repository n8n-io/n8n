import '../../openapi-extend';

import { z } from 'zod';

import {
	otelTestTraceRequestFieldDocs,
	otelTestTraceRequestDocs,
	otelTestTraceResultFieldDocs,
	otelTestTraceResultDocs,
} from './otel-test-trace-public.openapi';
import { TestOtelTraceDto } from './test-otel-trace.dto';
import { Z } from '../../zod-class';

const connectionFields = TestOtelTraceDto.schema.shape;

export class OtelTestTraceRequestPublicDto extends Z.class(
	{
		exporterProtocol: connectionFields.exporterProtocol.openapi(
			otelTestTraceRequestFieldDocs.exporterProtocol,
		),
		exporterEndpoint: connectionFields.exporterEndpoint.openapi(
			otelTestTraceRequestFieldDocs.exporterEndpoint,
		),
		exporterTracingPath: connectionFields.exporterTracingPath.openapi(
			otelTestTraceRequestFieldDocs.exporterTracingPath,
		),
		exporterServiceName: connectionFields.exporterServiceName.openapi(
			otelTestTraceRequestFieldDocs.exporterServiceName,
		),
		exporterHeaders: connectionFields.exporterHeaders.openapi(
			otelTestTraceRequestFieldDocs.exporterHeaders,
		),
		startupConnectivityTimeoutMs: connectionFields.startupConnectivityTimeoutMs.openapi(
			otelTestTraceRequestFieldDocs.startupConnectivityTimeoutMs,
		),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi(otelTestTraceRequestDocs);
}

export class OtelTestTraceResultPublicDto extends Z.class(
	{
		success: z.boolean().openapi(otelTestTraceResultFieldDocs.success),
		error: z.string().optional().openapi(otelTestTraceResultFieldDocs.error),
	},
	{ strict: true },
) {
	static schema = super.schema.openapi(otelTestTraceResultDocs);
}
