import type { ChartMeta, PointElement } from '../types/index.js';
export declare function fontString(pixelSize: number, fontStyle: string, fontFamily: string): string;
/**
* Request animation polyfill
*/
export declare const requestAnimFrame: (((callback: FrameRequestCallback) => number) & typeof requestAnimationFrame) | ((callback: any) => any);
/**
 * Throttles calling `fn` once per animation frame
 * Latest arguments are used on the actual call
 */
export declare function throttled<TArgs extends Array<any>>(fn: (...args: TArgs) => void, thisArg: any): (...args: TArgs) => void;
/**
 * Debounces calling `fn` for `delay` ms
 */
export declare function debounce<TArgs extends Array<any>>(fn: (...args: TArgs) => void, delay: number): (...args: TArgs) => number;
/**
 * Converts 'start' to 'left', 'end' to 'right' and others to 'center'
 * @private
 */
export declare const _toLeftRightCenter: (align: 'start' | 'end' | 'center') => "center" | "left" | "right";
/**
 * Returns `start`, `end` or `(start + end) / 2` depending on `align`. Defaults to `center`
 * @private
 */
export declare const _alignStartEnd: (align: 'start' | 'end' | 'center', start: number, end: number) => number;
/**
 * Returns `left`, `right` or `(left + right) / 2` depending on `align`. Defaults to `left`
 * @private
 */
export declare const _textX: (align: 'left' | 'right' | 'center', left: number, right: number, rtl: boolean) => number;
/**
 * Return start and count of visible points.
 * @private
 */
export declare function _getStartAndCountOfVisiblePoints(meta: ChartMeta<'line' | 'scatter'>, points: PointElement[], animationsDisabled: boolean): {
    start: number;
    count: number;
};
/**
 * Checks if the scale ranges have changed.
 * @param {object} meta - dataset meta.
 * @returns {boolean}
 * @private
 */
export declare function _scaleRangesChanged(meta: any): boolean;
