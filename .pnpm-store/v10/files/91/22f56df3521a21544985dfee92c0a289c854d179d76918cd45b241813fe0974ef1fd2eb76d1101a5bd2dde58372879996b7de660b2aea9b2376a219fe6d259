interface OTELTraceInterface {
    getTracer: (name: string, version?: string) => any;
    getActiveSpan: () => any;
    setSpan: (context: any, span: any) => any;
    getSpan: (context: any) => any;
    setSpanContext: (context: any, spanContext: any) => any;
    getTracerProvider: () => any;
    setGlobalTracerProvider: (tracerProvider: any) => boolean;
}
interface OTELContextInterface {
    active: () => any;
    with: <T>(context: any, fn: () => T) => T;
}
interface OTELInterface {
    trace: OTELTraceInterface;
    context: OTELContextInterface;
}
declare class OTELProvider {
    getTraceInstance(): OTELTraceInterface;
    getContextInstance(): OTELContextInterface;
    initializeGlobalInstances(otel: OTELInterface): void;
    setDefaultOTLPTracerComponents(components: {
        DEFAULT_LANGSMITH_SPAN_PROCESSOR: any;
        DEFAULT_LANGSMITH_TRACER_PROVIDER: any;
        DEFAULT_LANGSMITH_SPAN_EXPORTER: any;
    }): void;
    getDefaultOTLPTracerComponents(): any;
}
export declare const OTELProviderSingleton: OTELProvider;
/**
 * Get the current OTEL trace instance.
 * Returns a mock implementation if OTEL is not available.
 */
export declare function getOTELTrace(): OTELTraceInterface;
/**
 * Get the current OTEL context instance.
 * Returns a mock implementation if OTEL is not available.
 */
export declare function getOTELContext(): OTELContextInterface;
/**
 * Initialize the global OTEL instances.
 * Should be called once when OTEL packages are available.
 */
export declare function setOTELInstances(otel: OTELInterface): void;
/**
 * Set a getter function for the default OTLP tracer provider.
 * This allows lazy initialization of the tracer provider.
 */
export declare function setDefaultOTLPTracerComponents(components: {
    DEFAULT_LANGSMITH_SPAN_PROCESSOR: any;
    DEFAULT_LANGSMITH_TRACER_PROVIDER: any;
    DEFAULT_LANGSMITH_SPAN_EXPORTER: any;
}): void;
/**
 * Get the default OTLP tracer provider instance.
 * Returns undefined if not set.
 */
export declare function getDefaultOTLPTracerComponents(): {
    DEFAULT_LANGSMITH_SPAN_PROCESSOR: any;
    DEFAULT_LANGSMITH_TRACER_PROVIDER: any;
    DEFAULT_LANGSMITH_SPAN_EXPORTER: any;
} | undefined;
export {};
