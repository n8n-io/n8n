import type { ExportResult } from '@opentelemetry/core';
import type { AggregationTemporality } from './AggregationTemporality';
import type { ResourceMetrics, InstrumentType } from './MetricData';
import type { PushMetricExporter } from './MetricExporter';
import type { AggregationTemporalitySelector } from './AggregationSelector';
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