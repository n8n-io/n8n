/**
 * @packageDocumentation
 * @module @kurkle/color
 */
export type RGBA = {
    /**
     * - red [0..255]
     */
    r: number;
    /**
     * - green [0..255]
     */
    g: number;
    /**
     * - blue [0..255]
     */
    b: number;
    /**
     * - alpha [0..1]
     */
    a: number;
};
 /**
 * Parse HEX to color
 * @param {string} str - the string
 */
export function hexParse(str: string): {
    r: number;
    g: number;
    b: number;
    a: number;
};
/**
 * Return HEX string from color
 * @param {RGBA} v - the color
 */
export function hexString(v: RGBA): string | RGBA;
/**
 * Rounds decimal to nearest integer
 * @param {number} v - the number to round
 */
export function round(v: number): number;
/**
 * convert percent to byte 0..255
 * @param {number} v - 0..100
 */
export function p2b(v: number): number;
/**
 * convert byte to percet 0..100
 * @param {number} v - 0..255
 */
export function b2p(v: number): number;
/**
 * convert normalized to byte 0..255
 * @param {number} v - 0..1
 */
export function n2b(v: number): number;
/**
 * convert byte to normalized 0..1
 * @param {number} v - 0..255
 */
export function b2n(v: number): number;
/**
 * convert normalized to percent 0..100
 * @param {number} v - 0..1
 */
export function n2p(v: number): number;
/**
 * Convert rgb to hsl
 * @param {RGBA} v - the color
 * @returns {number[]} - [h, s, l]
 */
export function rgb2hsl(v: RGBA): number[];
/**
 * Convert hsl to rgb
 * @param {number|number[]} h - hue | [h, s, l]
 * @param {number} [s] - saturation
 * @param {number} [l] - lightness
 * @returns {number[]}
 */
export function hsl2rgb(h: number | number[], s?: number, l?: number): number[];
/**
 * Convert hwb to rgb
 * @param {number|number[]} h - hue | [h, s, l]
 * @param {number} [w] - whiteness
 * @param {number} [b] - blackness
 * @returns {number[]}
 */
export function hwb2rgb(h: number | number[], w?: number, b?: number): number[];
/**
 * Convert hsv to rgb
 * @param {number|number[]} h - hue | [h, s, l]
 * @param {number} [s] - saturation
 * @param {number} [v] - value
 * @returns {number[]}
 */
export function hsv2rgb(h: number | number[], s?: number, v?: number): number[];
/**
 * Parse hsl/hsv/hwb color string
 * @param {string} str - hsl/hsv/hwb color string
 * @returns {RGBA} - the parsed color components
 */
export function hueParse(str: string): RGBA;
/**
 * Rotate the `v` color by `deg` degrees
 * @param {RGBA} v - the color
 * @param {number} deg - degrees to rotate
 */
export function rotate(v: RGBA, deg: number): void;
/**
 * Return hsl(a) string from color components
 * @param {RGBA} v - the color
 * @return {string|undefined}
 */
export function hslString(v: RGBA): string;
/**
 * Parse color name
 * @param {string} str - the color name
 * @return {RGBA} - the color
 */
export function nameParse(str: string): RGBA;
/**
 * Parse rgb(a) string to RGBA
 * @param {string} str - the rgb string
 * @returns {RGBA} - the parsed color
 */
export function rgbParse(str: string): RGBA;
/**
 * Return rgb(a) string from color
 * @param {RGBA} v - the color
 */
export function rgbString(v: RGBA): string;

export class Color {
    /**
     * constructor
     * @param {Color|RGBA|string|number[]} input
     */
    constructor(input: string | number[] | Color | RGBA);
    /**
     * @type {RGBA}
     * @hidden
     **/
    _rgb: RGBA;
    /**
     * @type {boolean}
     * @hidden
     **/
    _valid: boolean;
    /**
     * `true` if this is a valid color
     * @returns {boolean}
     */
    get valid(): boolean;
    /**
     * @param {RGBA} obj - the color
     */
    set rgb(arg: RGBA);
    /**
     * @returns {RGBA} - the color
     */
    get rgb(): RGBA;
    /**
     * rgb(a) string
     */
    rgbString(): string;
    /**
     * hex string
     */
    hexString(): string | RGBA;
    /**
     * hsl(a) string
     */
    hslString(): string;
    /**
     * Mix another color to this color.
     * @param {Color} color - Color to mix in
     * @param {number} weight - 0..1
     */
    mix(color: Color, weight: number): Color;
    /**
     * Clone
     */
    clone(): Color;
    /**
     * Set aplha
     * @param {number} a - the alpha [0..1]
     */
    alpha(a: number): Color;
    /**
     * Make clearer
     * @param {number} ratio - ratio [0..1]
     */
    clearer(ratio: number): Color;
    /**
     * Convert to grayscale
     */
    greyscale(): Color;
    /**
     * Opaquer
     * @param {number} ratio - ratio [0..1]
     */
    opaquer(ratio: number): Color;
    negate(): Color;
    /**
     * Lighten
     * @param {number} ratio - ratio [0..1]
     */
    lighten(ratio: number): Color;
    /**
     * Darken
     * @param {number} ratio - ratio [0..1]
     */
    darken(ratio: number): Color;
    /**
     * Saturate
     * @param {number} ratio - ratio [0..1]
     */
    saturate(ratio: number): Color;
    /**
     * Desaturate
     * @param {number} ratio - ratio [0..1]
     */
    desaturate(ratio: number): Color;
    /**
     * Rotate
     * @param {number} deg - degrees to rotate
     */
    rotate(deg: number): Color;
}
/**
 * Construct new Color instance
 * @param {Color|RGBA|string|number[]} input
 */
export default function _default(input: string | number[] | Color | RGBA): Color;
