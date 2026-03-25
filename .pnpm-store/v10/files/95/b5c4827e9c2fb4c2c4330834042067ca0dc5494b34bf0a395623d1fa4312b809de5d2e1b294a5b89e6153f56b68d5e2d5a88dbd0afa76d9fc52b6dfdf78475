import { AggregationTemporality, AggregationTemporalitySelector, InstrumentType, PushMetricExporter, ResourceMetrics, AggregationOption } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporterOptions } from './OTLPMetricExporterOptions';
import { IOtlpExportDelegate, OTLPExporterBase } from '@opentelemetry/otlp-exporter-base';
export declare const CumulativeTemporalitySelector: AggregationTemporalitySelector;
export declare const DeltaTemporalitySelector: AggregationTemporalitySelector;
export declare const LowMemoryTemporalitySelector: AggregationTemporalitySelector;
export declare class OTLPMetricExporterBase extends OTLPExporterBase<ResourceMetrics> implements PushMetricExporter {
    private readonly _aggregationTemporalitySelector;
    private readonly _aggregationSelector;
    constructor(delegate: IOtlpExportDelegate<ResourceMetrics>, config?: OTLPMetricExporterOptions);
    selectAggregation(instrumentType: InstrumentType): AggregationOption;
    selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality;
}
//# sourceMappingURL=OTLPMetricExporterBase.d.ts.map