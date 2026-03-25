import { Context, HrTime, Attributes } from '@opentelemetry/api';
import { FixedSizeExemplarReservoirBase } from './ExemplarReservoir';
/**
 * Fixed size reservoir that uses equivalent of naive reservoir sampling
 * algorithm to accept measurements.
 *
 */
export declare class SimpleFixedSizeExemplarReservoir extends FixedSizeExemplarReservoirBase {
    private _numMeasurementsSeen;
    constructor(size: number);
    private getRandomInt;
    private _findBucketIndex;
    offer(value: number, timestamp: HrTime, attributes: Attributes, ctx: Context): void;
    reset(): void;
}
//# sourceMappingURL=SimpleFixedSizeExemplarReservoir.d.ts.map