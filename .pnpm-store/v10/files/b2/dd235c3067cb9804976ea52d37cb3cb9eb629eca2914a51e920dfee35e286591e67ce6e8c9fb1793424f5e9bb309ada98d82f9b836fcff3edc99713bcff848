import { Mapping } from './types';
/**
 * ExponentMapping implements exponential mapping functions for
 * scales <=0. For scales > 0 LogarithmMapping should be used.
 */
export declare class ExponentMapping implements Mapping {
    private readonly _shift;
    constructor(scale: number);
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value: number): number;
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index: number): number;
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale(): number;
    private _minNormalLowerBoundaryIndex;
    private _maxNormalLowerBoundaryIndex;
    private _rightShift;
}
//# sourceMappingURL=ExponentMapping.d.ts.map