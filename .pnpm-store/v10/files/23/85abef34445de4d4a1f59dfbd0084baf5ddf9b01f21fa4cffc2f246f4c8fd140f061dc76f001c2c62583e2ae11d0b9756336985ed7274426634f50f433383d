import type { Context, HrTime, Attributes } from '@opentelemetry/api';
import type { WritableMetricStorage } from './WritableMetricStorage';
import type { Accumulation, Aggregator } from '../aggregator/types';
import type { InstrumentDescriptor } from '../InstrumentDescriptor';
import type { IAttributesProcessor } from '../view/AttributesProcessor';
import { MetricStorage } from './MetricStorage';
import type { MetricData } from '../export/MetricData';
import type { Maybe } from '../utils';
import type { MetricCollectorHandle } from './MetricCollector';
/**
 * Internal interface.
 *
 * Stores and aggregates {@link MetricData} for synchronous instruments.
 */
export declare class SyncMetricStorage<T extends Maybe<Accumulation>> extends MetricStorage implements WritableMetricStorage {
    private _aggregationCardinalityLimit?;
    private _deltaMetricStorage;
    private _temporalMetricStorage;
    private _attributesProcessor;
    constructor(instrumentDescriptor: InstrumentDescriptor, aggregator: Aggregator<T>, attributesProcessor: IAttributesProcessor, collectorHandles: MetricCollectorHandle[], aggregationCardinalityLimit?: number);
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