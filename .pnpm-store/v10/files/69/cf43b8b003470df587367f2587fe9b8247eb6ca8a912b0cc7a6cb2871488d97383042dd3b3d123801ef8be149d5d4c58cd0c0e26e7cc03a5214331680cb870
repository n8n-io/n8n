"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOTEL = void 0;
// Avoid async hooks as even a peer dep to avoid pulling into
// non-node build environments.
// eslint-disable-next-line import/no-extraneous-dependencies
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const api_1 = require("@opentelemetry/api");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_js_1 = require("./exporter.cjs");
const processor_js_1 = require("./processor.cjs");
const otel_js_1 = require("../../singletons/otel.cjs");
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
const initializeOTEL = (config = {}) => {
    const { globalTracerProvider, globalContextManager, skipGlobalContextManagerSetup, exporterConfig, } = config;
    const otel = {
        trace: api_1.trace,
        context: api_1.context,
    };
    (0, otel_js_1.setOTELInstances)(otel);
    if (!globalContextManager && !skipGlobalContextManagerSetup) {
        try {
            const contextManager = new context_async_hooks_1.AsyncHooksContextManager();
            contextManager.enable();
            api_1.context.setGlobalContextManager(contextManager);
        }
        catch (e) {
            console.log([
                `Could not automatically set up an OTEL context manager.`,
                `This may be expected if you have (or another imported library has) already set a global context manager.`,
                `If expected, you can skip this warning by passing "skipGlobalContextManagerSetup: true" into your initializeOTEL call.`,
            ].join("\n"));
        }
    }
    const DEFAULT_LANGSMITH_SPAN_EXPORTER = new exporter_js_1.LangSmithOTLPTraceExporter(exporterConfig);
    const DEFAULT_LANGSMITH_SPAN_PROCESSOR = new processor_js_1.LangSmithOTLPSpanProcessor(DEFAULT_LANGSMITH_SPAN_EXPORTER);
    if (!globalTracerProvider) {
        const DEFAULT_LANGSMITH_TRACER_PROVIDER = new sdk_trace_base_1.BasicTracerProvider({
            spanProcessors: [DEFAULT_LANGSMITH_SPAN_PROCESSOR],
        });
        const defaultComponents = {
            DEFAULT_LANGSMITH_SPAN_PROCESSOR,
            DEFAULT_LANGSMITH_TRACER_PROVIDER,
            DEFAULT_LANGSMITH_SPAN_EXPORTER,
        };
        // If user has set global tracer before, this fails and returns false
        const globalSuccessfullyOverridden = api_1.trace.setGlobalTracerProvider(defaultComponents.DEFAULT_LANGSMITH_TRACER_PROVIDER);
        if (globalSuccessfullyOverridden) {
            (0, otel_js_1.setDefaultOTLPTracerComponents)(defaultComponents);
        }
        return defaultComponents;
    }
    else {
        const defaultComponents = {
            DEFAULT_LANGSMITH_TRACER_PROVIDER: globalTracerProvider,
            DEFAULT_LANGSMITH_SPAN_PROCESSOR,
            DEFAULT_LANGSMITH_SPAN_EXPORTER,
        };
        (0, otel_js_1.setDefaultOTLPTracerComponents)(defaultComponents);
        return defaultComponents;
    }
};
exports.initializeOTEL = initializeOTEL;
