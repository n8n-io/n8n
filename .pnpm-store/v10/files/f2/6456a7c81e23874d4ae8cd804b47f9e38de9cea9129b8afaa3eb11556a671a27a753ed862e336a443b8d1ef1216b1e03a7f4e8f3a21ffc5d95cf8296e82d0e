import { HSL, HSLA, HSV, HSVA, Numberify, RGB, RGBA } from './interfaces';
export interface TinyColorOptions {
    format: string;
    gradientType: string;
}
export type ColorInput = string | number | RGB | RGBA | HSL | HSLA | HSV | HSVA | TinyColor;
export type ColorFormats = 'rgb' | 'prgb' | 'hex' | 'hex3' | 'hex4' | 'hex6' | 'hex8' | 'name' | 'hsl' | 'hsv';
export declare class TinyColor {
    /** red */
    r: number;
    /** green */
    g: number;
    /** blue */
    b: number;
    /** alpha */
    a: number;
    /** the format used to create the tinycolor instance */
    format: ColorFormats;
    /** input passed into the constructer used to create the tinycolor instance */
    originalInput: ColorInput;
    /** the color was successfully parsed */
    isValid: boolean;
    gradientType?: string;
    /** rounded alpha */
    roundA: number;
    constructor(color?: ColorInput, opts?: Partial<TinyColorOptions>);
    isDark(): boolean;
    isLight(): boolean;
    /**
     * Returns the perceived brightness of the color, from 0-255.
     */
    getBrightness(): number;
    /**
     * Returns the perceived luminance of a color, from 0-1.
     */
    getLuminance(): number;
    /**
     * Returns the alpha value of a color, from 0-1.
     */
    getAlpha(): number;
    /**
     * Sets the alpha value on the current color.
     *
     * @param alpha - The new alpha value. The accepted range is 0-1.
     */
    setAlpha(alpha?: string | number): this;
    /**
     * Returns whether the color is monochrome.
     */
    isMonochrome(): boolean;
    /**
     * Returns the object as a HSVA object.
     */
    toHsv(): Numberify<HSVA>;
    /**
     * Returns the hsva values interpolated into a string with the following format:
     * "hsva(xxx, xxx, xxx, xx)".
     */
    toHsvString(): string;
    /**
     * Returns the object as a HSLA object.
     */
    toHsl(): Numberify<HSLA>;
    /**
     * Returns the hsla values interpolated into a string with the following format:
     * "hsla(xxx, xxx, xxx, xx)".
     */
    toHslString(): string;
    /**
     * Returns the hex value of the color.
     * @param allow3Char will shorten hex value to 3 char if possible
     */
    toHex(allow3Char?: boolean): string;
    /**
     * Returns the hex value of the color -with a # prefixed.
     * @param allow3Char will shorten hex value to 3 char if possible
     */
    toHexString(allow3Char?: boolean): string;
    /**
     * Returns the hex 8 value of the color.
     * @param allow4Char will shorten hex value to 4 char if possible
     */
    toHex8(allow4Char?: boolean): string;
    /**
     * Returns the hex 8 value of the color -with a # prefixed.
     * @param allow4Char will shorten hex value to 4 char if possible
     */
    toHex8String(allow4Char?: boolean): string;
    /**
     * Returns the shorter hex value of the color depends on its alpha -with a # prefixed.
     * @param allowShortChar will shorten hex value to 3 or 4 char if possible
     */
    toHexShortString(allowShortChar?: boolean): string;
    /**
     * Returns the object as a RGBA object.
     */
    toRgb(): Numberify<RGBA>;
    /**
     * Returns the RGBA values interpolated into a string with the following format:
     * "RGBA(xxx, xxx, xxx, xx)".
     */
    toRgbString(): string;
    /**
     * Returns the object as a RGBA object.
     */
    toPercentageRgb(): RGBA;
    /**
     * Returns the RGBA relative values interpolated into a string
     */
    toPercentageRgbString(): string;
    /**
     * The 'real' name of the color -if there is one.
     */
    toName(): string | false;
    /**
     * String representation of the color.
     *
     * @param format - The format to be used when displaying the string representation.
     */
    toString<T extends 'name'>(format: T): boolean | string;
    toString<T extends ColorFormats>(format?: T): string;
    toNumber(): number;
    clone(): TinyColor;
    /**
     * Lighten the color a given amount. Providing 100 will always return white.
     * @param amount - valid between 1-100
     */
    lighten(amount?: number): TinyColor;
    /**
     * Brighten the color a given amount, from 0 to 100.
     * @param amount - valid between 1-100
     */
    brighten(amount?: number): TinyColor;
    /**
     * Darken the color a given amount, from 0 to 100.
     * Providing 100 will always return black.
     * @param amount - valid between 1-100
     */
    darken(amount?: number): TinyColor;
    /**
     * Mix the color with pure white, from 0 to 100.
     * Providing 0 will do nothing, providing 100 will always return white.
     * @param amount - valid between 1-100
     */
    tint(amount?: number): TinyColor;
    /**
     * Mix the color with pure black, from 0 to 100.
     * Providing 0 will do nothing, providing 100 will always return black.
     * @param amount - valid between 1-100
     */
    shade(amount?: number): TinyColor;
    /**
     * Desaturate the color a given amount, from 0 to 100.
     * Providing 100 will is the same as calling greyscale
     * @param amount - valid between 1-100
     */
    desaturate(amount?: number): TinyColor;
    /**
     * Saturate the color a given amount, from 0 to 100.
     * @param amount - valid between 1-100
     */
    saturate(amount?: number): TinyColor;
    /**
     * Completely desaturates a color into greyscale.
     * Same as calling `desaturate(100)`
     */
    greyscale(): TinyColor;
    /**
     * Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
     * Values outside of this range will be wrapped into this range.
     */
    spin(amount: number): TinyColor;
    /**
     * Mix the current color a given amount with another color, from 0 to 100.
     * 0 means no mixing (return current color).
     */
    mix(color: ColorInput, amount?: number): TinyColor;
    analogous(results?: number, slices?: number): TinyColor[];
    /**
     * taken from https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js
     */
    complement(): TinyColor;
    monochromatic(results?: number): TinyColor[];
    splitcomplement(): TinyColor[];
    /**
     * Compute how the color would appear on a background
     */
    onBackground(background: ColorInput): TinyColor;
    /**
     * Alias for `polyad(3)`
     */
    triad(): TinyColor[];
    /**
     * Alias for `polyad(4)`
     */
    tetrad(): TinyColor[];
    /**
     * Get polyad colors, like (for 1, 2, 3, 4, 5, 6, 7, 8, etc...)
     * monad, dyad, triad, tetrad, pentad, hexad, heptad, octad, etc...
     */
    polyad(n: number): TinyColor[];
    /**
     * compare color vs current color
     */
    equals(color?: ColorInput): boolean;
}
export declare function tinycolor(color?: ColorInput, opts?: Partial<TinyColorOptions>): TinyColor;
