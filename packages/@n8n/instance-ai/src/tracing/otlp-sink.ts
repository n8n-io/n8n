/**
 * Returns a new OTel span processor that sends build-trace spans to the
 * instance's OTLP endpoint, or `undefined` when OTLP tracing is off. The host
 * owns the export and the redaction, so this package needs no OTel SDK.
 */
export type OtlpSpanProcessorFactory = () => unknown;

// Kept apart from langsmith-tracing.ts so the host can register the sink at
// startup without loading the LangSmith client.
const otlpSink: { createSpanProcessor?: OtlpSpanProcessorFactory } = {};

export function setOtlpSpanProcessorFactory(factory: OtlpSpanProcessorFactory | undefined): void {
	otlpSink.createSpanProcessor = factory;
}

export function createOtlpSpanProcessor(): unknown {
	return otlpSink.createSpanProcessor?.();
}
