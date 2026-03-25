import type { Point } from '../types/geometric.js';
/**
 * @alias Chart.helpers.math
 * @namespace
 */
export declare const PI: number;
export declare const TAU: number;
export declare const PITAU: number;
export declare const INFINITY: number;
export declare const RAD_PER_DEG: number;
export declare const HALF_PI: number;
export declare const QUARTER_PI: number;
export declare const TWO_THIRDS_PI: number;
export declare const log10: (x: number) => number;
export declare const sign: (x: number) => number;
export declare function almostEquals(x: number, y: number, epsilon: number): boolean;
/**
 * Implementation of the nice number algorithm used in determining where axis labels will go
 */
export declare function niceNum(range: number): number;
/**
 * Returns an array of factors sorted from 1 to sqrt(value)
 * @private
 */
export declare function _factorize(value: number): number[];
export declare function isNumber(n: unknown): n is number;
export declare function almostWhole(x: number, epsilon: number): boolean;
/**
 * @private
 */
export declare function _setMinAndMaxByKey(array: Record<string, number>[], target: {
    min: number;
    max: number;
}, property: string): void;
export declare function toRadians(degrees: number): number;
export declare function toDegrees(radians: number): number;
/**
 * Returns the number of decimal places
 * i.e. the number of digits after the decimal point, of the value of this Number.
 * @param x - A number.
 * @returns The number of decimal places.
 * @private
 */
export declare function _decimalPlaces(x: number): number;
export declare function getAngleFromPoint(centrePoint: Point, anglePoint: Point): {
    angle: number;
    distance: number;
};
export declare function distanceBetweenPoints(pt1: Point, pt2: Point): number;
/**
 * Shortest distance between angles, in either direction.
 * @private
 */
export declare function _angleDiff(a: number, b: number): number;
/**
 * Normalize angle to be between 0 and 2*PI
 * @private
 */
export declare function _normalizeAngle(a: number): number;
/**
 * @private
 */
export declare function _angleBetween(angle: number, start: number, end: number, sameAngleIsFullCircle?: boolean): boolean;
/**
 * Limit `value` between `min` and `max`
 * @param value
 * @param min
 * @param max
 * @private
 */
export declare function _limitValue(value: number, min: number, max: number): number;
/**
 * @param {number} value
 * @private
 */
export declare function _int16Range(value: number): number;
/**
 * @param value
 * @param start
 * @param end
 * @param [epsilon]
 * @private
 */
export declare function _isBetween(value: number, start: number, end: number, epsilon?: number): boolean;
