import { AggregationTemporality } from './AggregationTemporality';
import { ResourceMetrics } from './MetricData';
import { ExportResult } from '@opentelemetry/core';
import { InstrumentType } from '../InstrumentDescriptor';
import { Aggregation } from '../view/Aggregation';
/**
 * An interface that allows different metric services to export recorded data
 * in their own format.
 *
 * To export data this MUST be registered to the Metrics SDK with a MetricReader.
 */
export interface PushMetricExporter {
    /**
     * Called to export sampled {@link ResourceMetrics}.
     * @param metrics the metric data to be exported.
     * @param resultCallback callback for when the export has completed
     */
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void;
    /**
     * Ensure that the export of any metrics the exporter has received is
     * completed before the returned promise is settled.
     */
    forceFlush(): Promise<void>;
    /**
     * Select the {@link AggregationTemporality} for the given
     * {@link InstrumentType} for this exporter.
     */
    selectAggregationTemporality?(instrumentType: InstrumentType): AggregationTemporality;
    /**
     * Select the {@link Aggregation} for the given
     * {@link InstrumentType} for this exporter.
     */
    selectAggregation?(instrumentType: InstrumentType): Aggregation;
    /**
     * Returns a promise which resolves when the last exportation is completed.
     * Further calls to {@link PushMetricExporter.export} may not export the
     * data.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=MetricExporter.d.ts.map