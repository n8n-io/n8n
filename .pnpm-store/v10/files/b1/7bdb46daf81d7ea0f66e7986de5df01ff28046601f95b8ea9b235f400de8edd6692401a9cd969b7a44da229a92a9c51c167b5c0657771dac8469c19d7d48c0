import type { DsnComponents } from '../types-hoist/dsn';
import type { MetricContainerItem, MetricEnvelope } from '../types-hoist/envelope';
import type { SerializedMetric } from '../types-hoist/metric';
import type { SdkMetadata } from '../types-hoist/sdkmetadata';
/**
 * Creates a metric container envelope item for a list of metrics.
 *
 * @param items - The metrics to include in the envelope.
 * @returns The created metric container envelope item.
 */
export declare function createMetricContainerEnvelopeItem(items: Array<SerializedMetric>): MetricContainerItem;
/**
 * Creates an envelope for a list of metrics.
 *
 * Metrics from multiple traces can be included in the same envelope.
 *
 * @param metrics - The metrics to include in the envelope.
 * @param metadata - The metadata to include in the envelope.
 * @param tunnel - The tunnel to include in the envelope.
 * @param dsn - The DSN to include in the envelope.
 * @returns The created envelope.
 */
export declare function createMetricEnvelope(metrics: Array<SerializedMetric>, metadata?: SdkMetadata, tunnel?: string, dsn?: DsnComponents): MetricEnvelope;
//# sourceMappingURL=envelope.d.ts.map