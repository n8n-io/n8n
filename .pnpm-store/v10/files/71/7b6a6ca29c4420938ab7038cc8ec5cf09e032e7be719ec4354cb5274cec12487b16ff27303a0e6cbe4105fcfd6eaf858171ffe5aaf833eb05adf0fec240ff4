import { Mapping } from './types';
/**
 * LogarithmMapping implements exponential mapping functions for scale > 0.
 * For scales <= 0 the exponent mapping should be used.
 */
export declare class LogarithmMapping implements Mapping {
    private readonly _scale;
    private readonly _scaleFactor;
    private readonly _inverseFactor;
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
}
//# sourceMappingURL=LogarithmMapping.d.ts.map