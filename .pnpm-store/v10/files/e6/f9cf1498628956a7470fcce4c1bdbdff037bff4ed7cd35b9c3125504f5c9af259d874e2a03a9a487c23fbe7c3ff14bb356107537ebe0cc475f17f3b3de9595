import Histogram, { BitBucketSize } from "./Histogram";
export interface BuildRequest {
    /**
     * The size in bit of each count bucket
     * Default value is 32
     */
    bitBucketSize?: BitBucketSize;
    /**
     * Control whether or not the histogram can auto-resize and auto-adjust it's
     * highestTrackableValue
     * Default value is true
     */
    autoResize?: boolean;
    /**
     * The lowest value that can be discerned (distinguished from 0) by the histogram.
     * Must be a positive integer that is {@literal >=} 1. May be internally rounded
     * down to nearest power of 2.
     * Default value is 1
     */
    lowestDiscernibleValue?: number;
    /**
     * The highest value to be tracked by the histogram. Must be a positive
     * integer that is {@literal >=} (2 * lowestDiscernibleValue).
     * Default value is Number.MAX_SAFE_INTEGER
     */
    highestTrackableValue?: number;
    /**
     * The number of significant decimal digits to which the histogram will
     * maintain value resolution and separation. Must be a non-negative
     * integer between 0 and 5.
     * Default value is 3
     */
    numberOfSignificantValueDigits?: 1 | 2 | 3 | 4 | 5;
    /**
     * Is WebAssembly used to speed up computations.
     * Default value is false
     */
    useWebAssembly?: boolean;
}
export declare const defaultRequest: BuildRequest;
export declare const build: (request?: BuildRequest) => Histogram;
