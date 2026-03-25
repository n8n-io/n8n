import { ExportResult } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import type { ObservabilityConfiguration } from '../../configuration';
import { Agent365ExporterOptions } from './Agent365ExporterOptions';
/**
 * Observability span exporter for Agent365:
 * - Partitions spans by (tenantId, agentId)
 * - Builds OTLP-like JSON: resourceSpans -> scopeSpans -> spans
 * - POSTs per group to https://{endpoint}/maven/agent365/agents/{agentId}/traces?api-version=1
 *   or, when useS2SEndpoint is true, https://{endpoint}/maven/agent365/service/agents/{agentId}/traces?api-version=1
 * - Adds Bearer token via token_resolver(agentId, tenantId)
 */
export declare class Agent365Exporter implements SpanExporter {
    private closed;
    private readonly options;
    private readonly configProvider?;
    /**
     * Initialize exporter with a fully constructed options instance.
     * @param options Exporter options controlling batching, timeouts, token acquisition and endpoint shape.
     * @param configProvider Optional configuration provider. When supplied, the exporter uses it for
     *        configuration lookups (custom domain, domain override) instead of the default env-based provider.
     */
    constructor(options: Agent365ExporterOptions, configProvider?: IConfigurationProvider<ObservabilityConfiguration>);
    /**
     * Export spans to Agent365 service
     */
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): Promise<void>;
    /**
     * Export a group of spans for a specific identity
     */
    private exportGroup;
    /**
     * HTTP POST with retry logic
     */
    private postWithRetries;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Build OTLP export request payload
     */
    private buildExportRequest;
    /**
     * Map a ReadableSpan to OTLP span format
     */
    private mapSpan;
    /**
     * Shutdown the exporter
     */
    shutdown(): Promise<void>;
    /**
     * Force flush any pending spans
     */
    forceFlush(): Promise<void>;
}
//# sourceMappingURL=Agent365Exporter.d.ts.map