import type { ChartArea, FontSpec, Point } from '../types/index.js';
import type { TRBL, TRBLCorners } from '../types/geometric.js';
/**
 * @alias Chart.helpers.options
 * @namespace
 */
/**
 * Converts the given line height `value` in pixels for a specific font `size`.
 * @param value - The lineHeight to parse (eg. 1.6, '14px', '75%', '1.6em').
 * @param size - The font size (in pixels) used to resolve relative `value`.
 * @returns The effective line height in pixels (size * 1.2 if value is invalid).
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/line-height
 * @since 2.7.0
 */
export declare function toLineHeight(value: number | string, size: number): number;
/**
 * @param value
 * @param props
 */
export declare function _readValueToProps<K extends string>(value: number | Record<K, number>, props: K[]): Record<K, number>;
export declare function _readValueToProps<K extends string, T extends string>(value: number | Record<K & T, number>, props: Record<T, K>): Record<T, number>;
/**
 * Converts the given value into a TRBL object.
 * @param value - If a number, set the value to all TRBL component,
 *  else, if an object, use defined properties and sets undefined ones to 0.
 *  x / y are shorthands for same value for left/right and top/bottom.
 * @returns The padding values (top, right, bottom, left)
 * @since 3.0.0
 */
export declare function toTRBL(value: number | TRBL | Point): Record<"left" | "top" | "bottom" | "right", number>;
/**
 * Converts the given value into a TRBL corners object (similar with css border-radius).
 * @param value - If a number, set the value to all TRBL corner components,
 *  else, if an object, use defined properties and sets undefined ones to 0.
 * @returns The TRBL corner values (topLeft, topRight, bottomLeft, bottomRight)
 * @since 3.0.0
 */
export declare function toTRBLCorners(value: number | TRBLCorners): Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
/**
 * Converts the given value into a padding object with pre-computed width/height.
 * @param value - If a number, set the value to all TRBL component,
 *  else, if an object, use defined properties and sets undefined ones to 0.
 *  x / y are shorthands for same value for left/right and top/bottom.
 * @returns The padding values (top, right, bottom, left, width, height)
 * @since 2.7.0
 */
export declare function toPadding(value?: number | TRBL): ChartArea;
/**
 * Parses font options and returns the font object.
 * @param options - A object that contains font options to be parsed.
 * @param fallback - A object that contains fallback font options.
 * @return The font object.
 * @private
 */
export declare function toFont(options: Partial<FontSpec>, fallback?: Partial<FontSpec>): {
    family: string;
    lineHeight: number;
    size: number;
    style: "normal" | "inherit" | "italic" | "oblique" | "initial";
    weight: number | "bold" | "normal" | "lighter" | "bolder";
    string: string;
};
/**
 * Evaluates the given `inputs` sequentially and returns the first defined value.
 * @param inputs - An array of values, falling back to the last value.
 * @param context - If defined and the current value is a function, the value
 * is called with `context` as first argument and the result becomes the new input.
 * @param index - If defined and the current value is an array, the value
 * at `index` become the new input.
 * @param info - object to return information about resolution in
 * @param info.cacheable - Will be set to `false` if option is not cacheable.
 * @since 2.7.0
 */
export declare function resolve(inputs: Array<unknown>, context?: object, index?: number, info?: {
    cacheable: boolean;
}): unknown;
/**
 * @param minmax
 * @param grace
 * @param beginAtZero
 * @private
 */
export declare function _addGrace(minmax: {
    min: number;
    max: number;
}, grace: number | string, beginAtZero: boolean): {
    min: number;
    max: number;
};
/**
 * Create a context inheriting parentContext
 * @param parentContext
 * @param context
 * @returns
 */
export declare function createContext<T extends object>(parentContext: null, context: T): T;
export declare function createContext<T extends object, P extends T>(parentContext: P, context: T): P & T;
