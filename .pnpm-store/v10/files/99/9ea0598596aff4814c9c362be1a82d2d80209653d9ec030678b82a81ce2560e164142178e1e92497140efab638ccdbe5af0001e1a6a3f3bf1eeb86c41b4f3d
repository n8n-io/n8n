import { Context, HrTime, Attributes } from '@opentelemetry/api';
import { Maybe } from '../utils';
import { Accumulation, Aggregator } from '../aggregator/types';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Allows synchronous collection of metrics. This processor should allow
 * allocation of new aggregation cells for metrics and convert cumulative
 * recording to delta data points.
 */
export declare class DeltaMetricProcessor<T extends Maybe<Accumulation>> {
    private _aggregator;
    private _activeCollectionStorage;
    private _cumulativeMemoStorage;
    private _cardinalityLimit;
    private _overflowAttributes;
    private _overflowHashCode;
    constructor(_aggregator: Aggregator<T>, aggregationCardinalityLimit?: number);
    record(value: number, attributes: Attributes, _context: Context, collectionTime: HrTime): void;
    batchCumulate(measurements: AttributeHashMap<number>, collectionTime: HrTime): void;
    /**
     * Returns a collection of delta metrics. Start time is the when first
     * time event collected.
     */
    collect(): AttributeHashMap<T>;
}
//# sourceMappingURL=DeltaMetricProcessor.d.ts.map