import '../../openapi-extend';

import { z } from 'zod';

import { otelFieldDocs, otelTestFieldDocs, otelTestResultFieldDocs } from './otel-public.openapi';
import { TestOtelTraceDto } from './test-otel-trace.dto';
import { OTLP_PROTOCOLS, UpdateOtelSettingsDto } from './update-otel-settings.dto';
import { Z } from '../../zod-class';

const otelSettingsShape = UpdateOtelSettingsDto.schema.shape;

const otelSettingsRequestSchema = z
	.object({
		enabled: otelSettingsShape.enabled.openapi(otelFieldDocs.enabled),
		exporterProtocol: otelSettingsShape.exporterProtocol.openapi(otelFieldDocs.exporterProtocol),
		exporterEndpoint: otelSettingsShape.exporterEndpoint.openapi(otelFieldDocs.exporterEndpoint),
		exporterTracingPath: otelSettingsShape.exporterTracingPath.openapi(
			otelFieldDocs.exporterTracingPath,
		),
		exporterServiceName: otelSettingsShape.exporterServiceName.openapi(
			otelFieldDocs.exporterServiceName,
		),
		exporterHeaders: otelSettingsShape.exporterHeaders.openapi(otelFieldDocs.exporterHeaders),
		tracesSampleRate: otelSettingsShape.tracesSampleRate.openapi(otelFieldDocs.tracesSampleRate),
		startupConnectivityTimeoutMs: otelSettingsShape.startupConnectivityTimeoutMs.openapi(
			otelFieldDocs.startupConnectivityTimeoutMs,
		),
		includeNodeSpans: otelSettingsShape.includeNodeSpans.openapi(otelFieldDocs.includeNodeSpans),
		injectOutbound: otelSettingsShape.injectOutbound.openapi(otelFieldDocs.injectOutbound),
		productionExecutionsOnly: otelSettingsShape.productionExecutionsOnly.openapi(
			otelFieldDocs.productionExecutionsOnly,
		),
	})
	.strict()
	.openapi({
		description:
			'The OpenTelemetry configuration, matching the fields exposed in the UI. On a write this is a full replacement: every field must be provided, except `exporterProtocol`, which defaults to `http/protobuf` when omitted. Fields managed declaratively via environment variables are returned with their effective value and ignored on write.',
	});

export class UpdateOtelSettingsPublicDto extends Z.class(otelSettingsRequestSchema.shape, {
	strict: true,
}) {
	static schema = otelSettingsRequestSchema;
}

const otelSettingsResponseSchema = z
	.object({
		enabled: z.boolean().openapi(otelFieldDocs.enabled),
		exporterProtocol: z
			.string()
			.optional()
			.openapi({
				...otelFieldDocs.exporterProtocol,
				enum: [...OTLP_PROTOCOLS],
				default: 'http/protobuf',
			}),
		exporterEndpoint: z.string().openapi({ ...otelFieldDocs.exporterEndpoint, format: 'uri' }),
		exporterTracingPath: z.string().openapi(otelFieldDocs.exporterTracingPath),
		exporterServiceName: z.string().openapi({ ...otelFieldDocs.exporterServiceName, minLength: 1 }),
		exporterHeaders: z.string().openapi(otelFieldDocs.exporterHeaders),
		tracesSampleRate: z
			.number()
			.openapi({ ...otelFieldDocs.tracesSampleRate, minimum: 0, maximum: 1 }),
		startupConnectivityTimeoutMs: z
			.number()
			.openapi({ ...otelFieldDocs.startupConnectivityTimeoutMs, type: 'integer', minimum: 0 }),
		includeNodeSpans: z.boolean().openapi(otelFieldDocs.includeNodeSpans),
		injectOutbound: z.boolean().openapi(otelFieldDocs.injectOutbound),
		productionExecutionsOnly: z.boolean().openapi(otelFieldDocs.productionExecutionsOnly),
	})
	.openapi({
		additionalProperties: false,
		description:
			'The OpenTelemetry configuration, matching the fields exposed in the UI. On a write this is a full replacement: every field must be provided, except `exporterProtocol`, which defaults to `http/protobuf` when omitted. Fields managed declaratively via environment variables are returned with their effective value and ignored on write.',
	});

export class OtelSettingsPublicDto extends Z.class(otelSettingsResponseSchema.shape) {
	static schema = otelSettingsResponseSchema;
}

const testTraceShape = TestOtelTraceDto.schema.shape;

const testTraceRequestSchema = z
	.object({
		exporterProtocol: testTraceShape.exporterProtocol.openapi(otelTestFieldDocs.exporterProtocol),
		exporterEndpoint: testTraceShape.exporterEndpoint.openapi(otelFieldDocs.exporterEndpoint),
		exporterTracingPath: testTraceShape.exporterTracingPath.openapi(
			otelFieldDocs.exporterTracingPath,
		),
		exporterServiceName: testTraceShape.exporterServiceName.openapi(
			otelTestFieldDocs.exporterServiceName,
		),
		exporterHeaders: testTraceShape.exporterHeaders.openapi(otelFieldDocs.exporterHeaders),
		startupConnectivityTimeoutMs: testTraceShape.startupConnectivityTimeoutMs.openapi(
			otelTestFieldDocs.startupConnectivityTimeoutMs,
		),
	})
	.strict()
	.openapi({
		description:
			'The connection details to test against an OTLP collector. Fields managed declaratively via environment variables are overridden with their effective value before the test is sent.',
	});

export class TestOtelTracePublicDto extends Z.class(testTraceRequestSchema.shape, {
	strict: true,
}) {
	static schema = testTraceRequestSchema;
}

const testTraceResultSchema = z
	.object({
		success: z.boolean().openapi(otelTestResultFieldDocs.success),
		error: z.string().optional().openapi(otelTestResultFieldDocs.error),
	})
	.openapi({
		additionalProperties: false,
		description: 'The outcome of the test connection to the OTLP collector.',
	});

export class OtelTestTraceResultPublicDto extends Z.class(testTraceResultSchema.shape) {
	static schema = testTraceResultSchema;
}

export class OtelSettingsQueryPublicDto extends Z.class({}, { strict: true }) {}
