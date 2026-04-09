import { ExportResult } from '@opentelemetry/core';
import { InstrumentType } from '../InstrumentDescriptor';
import { AggregationTemporality } from './AggregationTemporality';
import { ResourceMetrics } from './MetricData';
import { PushMetricExporter } from './MetricExporter';
/**
 * In-memory Metrics Exporter is a Push Metric Exporter
 * which accumulates metrics data in the local memory and
 * allows to inspect it (useful for e.g. unit tests).
 */
export declare class InMemoryMetricExporter implements PushMetricExporter {
    protected _shutdown: boolean;
    protected _aggregationTemporality: AggregationTemporality;
    private _metrics;
    constructor(aggregationTemporality: AggregationTemporality);
    /**
     * @inheritedDoc
     */
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void;
    /**
     * Returns all the collected resource metrics
     * @returns ResourceMetrics[]
     */
    getMetrics(): ResourceMetrics[];
    forceFlush(): Promise<void>;
    reset(): void;
    selectAggregationTemporality(_instrumentType: InstrumentType): AggregationTemporality;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=InMemoryMetricExporter.d.ts.map