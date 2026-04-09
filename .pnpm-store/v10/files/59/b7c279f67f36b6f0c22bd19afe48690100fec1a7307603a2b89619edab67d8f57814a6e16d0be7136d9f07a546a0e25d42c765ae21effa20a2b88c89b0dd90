import { ExportResult } from '@opentelemetry/core';
import { InstrumentType } from '../InstrumentDescriptor';
import { AggregationTemporality } from './AggregationTemporality';
import { ResourceMetrics } from './MetricData';
import { PushMetricExporter } from './MetricExporter';
import { AggregationTemporalitySelector } from './AggregationSelector';
interface ConsoleMetricExporterOptions {
    temporalitySelector?: AggregationTemporalitySelector;
}
/**
 * This is an implementation of {@link PushMetricExporter} that prints metrics to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link PushMetricExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
export declare class ConsoleMetricExporter implements PushMetricExporter {
    protected _shutdown: boolean;
    protected _temporalitySelector: AggregationTemporalitySelector;
    constructor(options?: ConsoleMetricExporterOptions);
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void;
    forceFlush(): Promise<void>;
    selectAggregationTemporality(_instrumentType: InstrumentType): AggregationTemporality;
    shutdown(): Promise<void>;
    private static _sendMetrics;
}
export {};
//# sourceMappingURL=ConsoleMetricExporter.d.ts.map