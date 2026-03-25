import { HrTime } from '@opentelemetry/api';
import { Accumulation, Aggregator } from '../aggregator/types';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { MetricStorage } from './MetricStorage';
import { MetricData } from '../export/MetricData';
import { Maybe } from '../utils';
import { MetricCollectorHandle } from './MetricCollector';
import { AttributeHashMap } from './HashMap';
import { AsyncWritableMetricStorage } from './WritableMetricStorage';
import { IAttributesProcessor } from '../view/AttributesProcessor';
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for asynchronous instruments.
 */
export declare class AsyncMetricStorage<T extends Maybe<Accumulation>> extends MetricStorage implements AsyncWritableMetricStorage {
    private _aggregationCardinalityLimit?;
    private _deltaMetricStorage;
    private _temporalMetricStorage;
    private _attributesProcessor;
    constructor(_instrumentDescriptor: InstrumentDescriptor, aggregator: Aggregator<T>, attributesProcessor: IAttributesProcessor, collectorHandles: MetricCollectorHandle[], aggregationCardinalityLimit?: number);
    record(measurements: AttributeHashMap<number>, observationTime: HrTime): void;
    /**
     * Collects the metrics from this storage. The ObservableCallback is invoked
     * during the collection.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    collect(collector: MetricCollectorHandle, collectionTime: HrTime): Maybe<MetricData>;
}
//# sourceMappingURL=AsyncMetricStorage.d.ts.map