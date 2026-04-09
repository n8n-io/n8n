import type { HrTime } from '@opentelemetry/api';
import type { Accumulation, Aggregator } from '../aggregator/types';
import type { InstrumentDescriptor } from '../InstrumentDescriptor';
import { MetricStorage } from './MetricStorage';
import type { MetricData } from '../export/MetricData';
import type { Maybe } from '../utils';
import type { MetricCollectorHandle } from './MetricCollector';
import { AttributeHashMap } from './HashMap';
import type { AsyncWritableMetricStorage } from './WritableMetricStorage';
import type { IAttributesProcessor } from '../view/AttributesProcessor';
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