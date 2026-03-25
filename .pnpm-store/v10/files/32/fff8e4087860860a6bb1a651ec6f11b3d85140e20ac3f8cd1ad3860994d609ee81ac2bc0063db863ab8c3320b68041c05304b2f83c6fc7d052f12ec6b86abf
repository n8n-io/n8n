import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
export declare class PrometheusSerializer {
    private _prefix;
    private _appendTimestamp;
    private _additionalAttributes;
    private _withResourceConstantLabels;
    constructor(prefix?: string, appendTimestamp?: boolean, withResourceConstantLabels?: RegExp);
    serialize(resourceMetrics: ResourceMetrics): string;
    private _filterResourceConstantLabels;
    private _serializeScopeMetrics;
    private _serializeMetricData;
    private _serializeSingularDataPoint;
    private _serializeHistogramDataPoint;
    protected _serializeResource(resource: Resource): string;
}
//# sourceMappingURL=PrometheusSerializer.d.ts.map