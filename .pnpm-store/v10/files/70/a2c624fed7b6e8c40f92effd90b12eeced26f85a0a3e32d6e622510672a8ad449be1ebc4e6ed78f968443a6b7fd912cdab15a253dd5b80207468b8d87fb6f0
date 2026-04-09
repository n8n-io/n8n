import { Context, HrTime, MetricAttributes } from '@opentelemetry/api';
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
    constructor(_aggregator: Aggregator<T>);
    record(value: number, attributes: MetricAttributes, _context: Context, collectionTime: HrTime): void;
    batchCumulate(measurements: AttributeHashMap<number>, collectionTime: HrTime): void;
    /**
     * Returns a collection of delta metrics. Start time is the when first
     * time event collected.
     */
    collect(): AttributeHashMap<T>;
}
//# sourceMappingURL=DeltaMetricProcessor.d.ts.map