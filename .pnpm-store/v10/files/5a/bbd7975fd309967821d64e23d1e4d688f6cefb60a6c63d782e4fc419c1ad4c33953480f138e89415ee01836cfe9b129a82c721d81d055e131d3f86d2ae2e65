import type { OtlpEncodingOptions } from '../common/internal-types';
import { MetricData, ResourceMetrics, ScopeMetrics } from '@opentelemetry/sdk-metrics';
import { IExportMetricsServiceRequest, IMetric, IResourceMetrics, IScopeMetrics } from './internal-types';
import { Encoder } from '../common/utils';
export declare function toResourceMetrics(resourceMetrics: ResourceMetrics, options?: OtlpEncodingOptions): IResourceMetrics;
export declare function toScopeMetrics(scopeMetrics: ScopeMetrics[], encoder: Encoder): IScopeMetrics[];
export declare function toMetric(metricData: MetricData, encoder: Encoder): IMetric;
export declare function createExportMetricsServiceRequest(resourceMetrics: ResourceMetrics[], options?: OtlpEncodingOptions): IExportMetricsServiceRequest;
//# sourceMappingURL=internal.d.ts.map