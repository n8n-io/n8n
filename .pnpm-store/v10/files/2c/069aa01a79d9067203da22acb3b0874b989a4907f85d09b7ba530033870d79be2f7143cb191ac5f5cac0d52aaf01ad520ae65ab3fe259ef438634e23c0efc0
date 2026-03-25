import { type TracerProvider, type ContextManager } from "@opentelemetry/api";
import { LangSmithOTLPTraceExporter, LangSmithOTLPTraceExporterConfig } from "./exporter.js";
import { LangSmithOTLPSpanProcessor } from "./processor.js";
/**
 * Configuration options for initializing OpenTelemetry with LangSmith.
 */
export type InitializeOTELConfig = {
    /**
     * Optional custom OTEL TracerProvider to use instead of
     * creating and globally setting a new one.
     */
    globalTracerProvider?: TracerProvider;
    /**
     * Optional custom OTEL ContextManager to use instead of
     * creating and globally setting a new one with AsyncHooksContextManager.
     */
    globalContextManager?: ContextManager;
    /**
     * Skip automatic initialization of a global context manager.
     *
     * @default false
     */
    skipGlobalContextManagerSetup?: boolean;
    /**
     * Optional configuration passed to the default LangSmith OTLP trace exporter.
     */
    exporterConfig?: LangSmithOTLPTraceExporterConfig;
};
/**
 * @deprecated Use non-OTEL `wrapAISDK` from `langsmith/experimental/vercel` instead.
 *
 * Initializes OpenTelemetry with LangSmith-specific configuration for tracing.
 *
 * Call this once at the start of your application to enable tracing integration. Sets global
 * OpenTelemetry components including the tracer provider and context manager.
 *
 * Requires the following peer dependencies to be installed:
 * - @opentelemetry/api
 * - @opentelemetry/sdk-trace-base
 * - @opentelemetry/exporter-trace-otlp-proto
 * - @opentelemetry/context-async-hooks
 *
 * @param options - Configuration options
 * @param options.globalTracerProvider - Optional custom TracerProvider to use instead of creating and globally setting a new one
 * @returns Object containing the initialized OTEL components (tracer provider, span processor, exporter)
 *
 * @example
 * ```typescript
 * import { initializeOTEL } from "langsmith/experimental/otel/setup";
 * initializeOTEL();
 * ```
 *
 * @example With custom tracer provider
 * ```typescript
 * import { initializeOTEL } from "langsmith/experimental/otel/setup";
 * import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
 *
 * const customProvider = new BasicTracerProvider();
 * initializeOTEL({ globalTracerProvider: customProvider });
 * ```
 */
export declare const initializeOTEL: (config?: InitializeOTELConfig) => {
    DEFAULT_LANGSMITH_TRACER_PROVIDER: TracerProvider;
    DEFAULT_LANGSMITH_SPAN_PROCESSOR: LangSmithOTLPSpanProcessor;
    DEFAULT_LANGSMITH_SPAN_EXPORTER: LangSmithOTLPTraceExporter;
};
