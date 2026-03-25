import { Context, HrTime, Attributes } from '@opentelemetry/api';
import { Exemplar } from './Exemplar';
/**
 * An interface for an exemplar reservoir of samples.
 */
export interface ExemplarReservoir {
    /** Offers a measurement to be sampled. */
    offer(value: number, timestamp: HrTime, attributes: Attributes, ctx: Context): void;
    /**
     * Returns accumulated Exemplars and also resets the reservoir
     * for the next sampling period
     *
     * @param pointAttributes The attributes associated with metric point.
     *
     * @returns a list of {@link Exemplar}s. Returned exemplars contain the attributes that were filtered out by the
     * aggregator, but recorded alongside the original measurement.
     */
    collect(pointAttributes: Attributes): Exemplar[];
}
declare class ExemplarBucket {
    private value;
    private attributes;
    private timestamp;
    private spanId?;
    private traceId?;
    private _offered;
    offer(value: number, timestamp: HrTime, attributes: Attributes, ctx: Context): void;
    collect(pointAttributes: Attributes): Exemplar | null;
}
export declare abstract class FixedSizeExemplarReservoirBase implements ExemplarReservoir {
    protected _reservoirStorage: ExemplarBucket[];
    protected _size: number;
    constructor(size: number);
    abstract offer(value: number, timestamp: HrTime, attributes: Attributes, ctx: Context): void;
    maxSize(): number;
    /**
     * Resets the reservoir
     */
    protected reset(): void;
    collect(pointAttributes: Attributes): Exemplar[];
}
export {};
//# sourceMappingURL=ExemplarReservoir.d.ts.map