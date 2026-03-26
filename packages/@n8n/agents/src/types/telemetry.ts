import type { TelemetryIntegration } from 'ai';

/** OTel-compatible attribute values (no undefined). */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Opaque handle for an OTel tracer. Consumers who only use
 * .integration() never need OTel packages installed.
 * Internally this is @opentelemetry/api's Tracer, but the public
 * type is opaque so OTel remains a true optional peer dependency.
 */
export type OpaqueTracer = unknown;

/**
 * Opaque handle for an OTel tracer provider (for flush/shutdown).
 * Only populated when .otlpEndpoint() is used.
 */
export interface OpaqueTracerProvider {
	forceFlush(): Promise<void>;
	shutdown(): Promise<void>;
}

export interface BuiltTelemetry {
	readonly enabled: boolean;
	readonly functionId?: string;
	readonly metadata?: Record<string, AttributeValue>;
	readonly recordInputs: boolean;
	readonly recordOutputs: boolean;
	/** Integrations are pre-wrapped with redaction if .redact() was set at build time. */
	readonly integrations: TelemetryIntegration[];
	readonly tracer?: OpaqueTracer;
	/** @internal Provider reference for flush/shutdown. Only set when .otlpEndpoint() is used. */
	readonly provider?: OpaqueTracerProvider;
	/** Declared credential name for the telemetry provider (e.g. 'langsmith'). */
	readonly credentialName?: string;
}
