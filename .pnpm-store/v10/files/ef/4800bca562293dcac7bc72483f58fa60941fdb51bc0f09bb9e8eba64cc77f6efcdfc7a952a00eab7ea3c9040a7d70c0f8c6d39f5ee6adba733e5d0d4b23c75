import type { DataPoint, ExponentialHistogram, Histogram, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import type { TelemetryItem as Envelope } from "../generated/index.js";
import { AttachTypeName } from "../export/statsbeat/types.js";
/**
 * Metric to Azure envelope parsing.
 * @internal
 */
export declare function resourceMetricsToEnvelope(metrics: ResourceMetrics, ikey: string, isStatsbeat?: boolean): Envelope[];
export declare function isAksAttach(): boolean;
export declare function shouldSendToOtlp(): boolean;
export declare function isStandardMetric(dataPoint: DataPoint<number> | DataPoint<Histogram> | DataPoint<ExponentialHistogram>): boolean;
export declare function getAttachType(): AttachTypeName;
//# sourceMappingURL=metricUtils.d.ts.map