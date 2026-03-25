import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
export type LangSmithOTLPTraceExporterConfig = ConstructorParameters<typeof OTLPTraceExporter>[0] & {
    /**
     * A function that takes an exported span and returns a transformed version of it.
     * May be used to add or remove attributes from the span.
     *
     * For example, to add a custom attribute to the span, you can do:
     *
     * ```ts
     * import { LangSmithOTLPTraceExporter } from "langsmith/experimental/otel/exporter";
     *
     * const exporter = new LangSmithOTLPTraceExporter({
     *   transformExportedSpan: (span) => {
     *     if (span.name === "foo") {
     *       span.attributes["langsmith.metadata.bar"] = "baz";
     *     }
     *     return span;
     *   }
     * });
     * ```
     *
     * @param span - The span to transform.
     * @returns A transformed version of the span.
     */
    transformExportedSpan?: (span: ReadableSpan) => ReadableSpan | Promise<ReadableSpan>;
    /**
     * The API key to use for the exporter.
     */
    apiKey?: string;
    /**
     * The name of the project to export traces to.
     */
    projectName?: string;
    /**
     * Default headers to add to exporter requests.
     */
    headers?: Record<string, string>;
};
/**
 * LangSmith OpenTelemetry trace exporter that extends the standard OTLP trace exporter
 * with LangSmith-specific configuration and span attribute transformations.
 *
 * This exporter automatically configures itself with LangSmith endpoints and API keys,
 * based on your LANGSMITH_API_KEY and LANGSMITH_PROJECT environment variables.
 * Will also respect OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_HEADERS environment
 * variables if set.
 *
 * @param config - Optional configuration object that accepts all OTLPTraceExporter parameters.
 *                 If not provided, uses default LangSmith configuration:
 *                 - `url`: Defaults to LangSmith OTEL endpoint (`${LANGSMITH_ENDPOINT}/otel/v1/traces`)
 *                 - `headers`: Auto-configured with LangSmith API key and project headers
 *                 Any provided config will override these defaults.
 */
export declare class LangSmithOTLPTraceExporter extends OTLPTraceExporter {
    private transformExportedSpan?;
    private projectName?;
    constructor(config?: LangSmithOTLPTraceExporterConfig);
    export(spans: ReadableSpan[], resultCallback: Parameters<OTLPTraceExporter["export"]>[1]): void;
}
