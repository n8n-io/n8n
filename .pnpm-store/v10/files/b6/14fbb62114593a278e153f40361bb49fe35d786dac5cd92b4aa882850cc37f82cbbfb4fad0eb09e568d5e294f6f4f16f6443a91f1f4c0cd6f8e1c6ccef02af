// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------------------------
import { ClusterCategory } from '@microsoft/agents-a365-runtime';
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
export class Agent365ExporterOptions {
    constructor() {
        /** Environment / cluster category (e.g. ClusterCategory.preprod, ClusterCategory.prod). */
        this.clusterCategory = ClusterCategory.prod;
        /** When true, use S2S endpoint path for export. */
        this.useS2SEndpoint = false;
        /** Maximum span queue size before new spans are dropped. */
        this.maxQueueSize = 2048;
        /** Delay (ms) between automatic batch flush attempts. */
        this.scheduledDelayMilliseconds = 5000;
        /** Per-export timeout in milliseconds. */
        this.exporterTimeoutMilliseconds = 30000;
        /** Maximum number of spans per export batch. */
        this.maxExportBatchSize = 512;
    }
}
//# sourceMappingURL=Agent365ExporterOptions.js.map