/**
 * convert all properties in an interface to a number
 */
export type Numberify<T> = {
    [P in keyof T]: number;
};
/**
 * A representation of additive color mixing.
 * Projection of primary color lights on a white screen shows secondary
 * colors where two overlap; the combination of all three of red, green,
 * and blue in equal intensities makes white.
 */
export interface RGB {
    r: number | string;
    g: number | string;
    b: number | string;
}
export interface RGBA extends RGB {
    a: number;
}
/**
 * The HSL model describes colors in terms of hue, saturation,
 * and lightness (also called luminance).
 * @link https://en.wikibooks.org/wiki/Color_Models:_RGB,_HSV,_HSL#HSL
 */
export interface HSL {
    h: number | string;
    s: number | string;
    l: number | string;
}
export interface HSLA extends HSL {
    a: number;
}
/**
 * The HSV, or HSB, model describes colors in terms of
 * hue, saturation, and value (brightness).
 * @link https://en.wikibooks.org/wiki/Color_Models:_RGB,_HSV,_HSL#HSV
 */
export interface HSV {
    h: number | string;
    s: number | string;
    v: number | string;
}
export interface HSVA extends HSV {
    a: number;
}
