import { HSL, HSV, Numberify, RGB } from './interfaces';
/**
 * Handle bounds / percentage checking to conform to CSS color spec
 * <http://www.w3.org/TR/css3-color/>
 * *Assumes:* r, g, b in [0, 255] or [0, 1]
 * *Returns:* { r, g, b } in [0, 255]
 */
export declare function rgbToRgb(r: number | string, g: number | string, b: number | string): Numberify<RGB>;
/**
 * Converts an RGB color value to HSL.
 * *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
 * *Returns:* { h, s, l } in [0,1]
 */
export declare function rgbToHsl(r: number, g: number, b: number): Numberify<HSL>;
/**
 * Converts an HSL color value to RGB.
 *
 * *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
 * *Returns:* { r, g, b } in the set [0, 255]
 */
export declare function hslToRgb(h: number | string, s: number | string, l: number | string): Numberify<RGB>;
/**
 * Converts an RGB color value to HSV
 *
 * *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
 * *Returns:* { h, s, v } in [0,1]
 */
export declare function rgbToHsv(r: number, g: number, b: number): Numberify<HSV>;
/**
 * Converts an HSV color value to RGB.
 *
 * *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
 * *Returns:* { r, g, b } in the set [0, 255]
 */
export declare function hsvToRgb(h: number | string, s: number | string, v: number | string): Numberify<RGB>;
/**
 * Converts an RGB color to hex
 *
 * Assumes r, g, and b are contained in the set [0, 255]
 * Returns a 3 or 6 character hex
 */
export declare function rgbToHex(r: number, g: number, b: number, allow3Char: boolean): string;
/**
 * Converts an RGBA color plus alpha transparency to hex
 *
 * Assumes r, g, b are contained in the set [0, 255] and
 * a in [0, 1]. Returns a 4 or 8 character rgba hex
 */
export declare function rgbaToHex(r: number, g: number, b: number, a: number, allow4Char: boolean): string;
/**
 * Converts an RGBA color to an ARGB Hex8 string
 * Rarely used, but required for "toFilter()"
 */
export declare function rgbaToArgbHex(r: number, g: number, b: number, a: number): string;
/** Converts a decimal to a hex value */
export declare function convertDecimalToHex(d: string | number): string;
/** Converts a hex value to a decimal */
export declare function convertHexToDecimal(h: string): number;
/** Parse a base-16 hex value into a base-10 integer */
export declare function parseIntFromHex(val: string): number;
export declare function numberInputToObject(color: number): RGB;
