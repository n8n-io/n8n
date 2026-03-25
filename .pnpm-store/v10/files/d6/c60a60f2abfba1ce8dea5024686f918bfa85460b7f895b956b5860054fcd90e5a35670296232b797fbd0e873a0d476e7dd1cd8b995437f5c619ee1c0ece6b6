import { ClusterCategory } from '@microsoft/agents-a365-runtime';
/**
 * A function that resolves and returns an authentication token for the given agent and tenant.
 * Implementations may perform synchronous lookup (e.g., in-memory cache) or asynchronous network calls.
 * Return null if a token cannot be provided; exporter will log and proceed without an authorization header.
 */
export type TokenResolver = (agentId: string, tenantId: string) => string | null | Promise<string | null>;
/**
 * Options controlling the behavior of the Agent365 OpenTelemetry span exporter.
 *
 * These values tune batching, timeouts, token acquisition and endpoint shape. All properties have sensible
 * defaults so callers can usually construct without arguments and override selectively.
 *
 * @property {ClusterCategory | string} clusterCategory Environment / cluster category (e.g. ClusterCategory.preprod, ClusterCategory.prod, default to ClusterCategory.prod).
 * @property {TokenResolver} [tokenResolver] Optional delegate to obtain an auth token. If omitted the exporter will
 *           fall back to reading the cached token (AgenticTokenCacheInstance.getObservabilityToken).
 * @property {boolean} [useS2SEndpoint] When true, exporter will POST to the S2S path (/maven/agent365/service/agents/{agentId}/traces).
 * @property {number} maxQueueSize Maximum span queue size before drops occur (passed to BatchSpanProcessor).
 * @property {number} scheduledDelayMilliseconds Delay between automatic batch flush attempts.
 * @property {number} exporterTimeoutMilliseconds Per-export timeout (abort if exceeded).
 * @property {number} maxExportBatchSize Maximum number of spans per export batch.
 */
export declare class Agent365ExporterOptions {
    /** Environment / cluster category (e.g. ClusterCategory.preprod, ClusterCategory.prod). */
    clusterCategory: ClusterCategory | string;
    /** Optional delegate to resolve auth token used by exporter */
    tokenResolver?: TokenResolver;
    /** When true, use S2S endpoint path for export. */
    useS2SEndpoint: boolean;
    /** Maximum span queue size before new spans are dropped. */
    maxQueueSize: number;
    /** Delay (ms) between automatic batch flush attempts. */
    scheduledDelayMilliseconds: number;
    /** Per-export timeout in milliseconds. */
    exporterTimeoutMilliseconds: number;
    /** Maximum number of spans per export batch. */
    maxExportBatchSize: number;
}
//# sourceMappingURL=Agent365ExporterOptions.d.ts.map