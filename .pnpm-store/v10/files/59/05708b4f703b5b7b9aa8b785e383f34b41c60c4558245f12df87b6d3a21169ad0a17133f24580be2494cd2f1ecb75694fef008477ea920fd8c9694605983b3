import { Context, HrTime, Attributes } from '@opentelemetry/api';
import { WritableMetricStorage } from './WritableMetricStorage';
import { Accumulation, Aggregator } from '../aggregator/types';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { IAttributesProcessor } from '../view/AttributesProcessor';
import { MetricStorage } from './MetricStorage';
import { MetricData } from '../export/MetricData';
import { Maybe } from '../utils';
import { MetricCollectorHandle } from './MetricCollector';
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for synchronous instruments.
 */
export declare class SyncMetricStorage<T extends Maybe<Accumulation>> extends MetricStorage implements WritableMetricStorage {
    private _attributesProcessor;
    private _aggregationCardinalityLimit?;
    private _deltaMetricStorage;
    private _temporalMetricStorage;
    constructor(instrumentDescriptor: InstrumentDescriptor, aggregator: Aggregator<T>, _attributesProcessor: IAttributesProcessor, collectorHandles: MetricCollectorHandle[], _aggregationCardinalityLimit?: number | undefined);
    record(value: number, attributes: Attributes, context: Context, recordTime: HrTime): void;
    /**
     * Collects the metrics from this storage.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector: MetricCollectorHandle, collectionTime: HrTime): Maybe<MetricData>;
}
//# sourceMappingURL=SyncMetricStorage.d.ts.map