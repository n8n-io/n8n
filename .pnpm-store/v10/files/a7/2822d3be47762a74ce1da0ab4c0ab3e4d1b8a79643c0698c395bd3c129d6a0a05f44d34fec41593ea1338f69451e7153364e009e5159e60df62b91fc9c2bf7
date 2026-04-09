export type Feature = 'colorScheme' | 'iconSet' | 'checkboxStyle' | 'inputStyle' | 'tabStyle';
export type WithParamTypes<T> = {
    [K in keyof T]: K extends string ? ParamTypeForLowercaseKey<Lowercase<K>> : LengthValue;
};
type ParamTypeForLowercaseKey<K extends string> = K extends `${string}color` ? ColorValue : K extends `${string}colorscheme` ? ColorSchemeValue : K extends `${string}color` ? ColorValue : K extends `${string}scale` ? ScaleValue : K extends `${string}borderstyle` ? BorderStyleValue : K extends `${string}border` ? BorderValue : K extends `${string}shadow` ? ShadowValue : K extends `${string}image` ? ImageValue : K extends `${string}fontfamily` ? FontFamilyValue : K extends `${string}fontweight` ? FontWeightValue : K extends `${string}duration` ? DurationValue : LengthValue;
type AnyString = string & {};
/**
 * The 'brand color' for the grid, used wherever a non-neutral color is
 * required. Selections, focus outlines and checkboxes use the accent color by
 * default.
 */
export type ColorValue = string | {
    /**
     * The name of the color parameter to reference
     */
    ref: string;
    /**
     * Enable color mixing. Provide a value between 0 and 1 determining the amount of the referenced color used in the mix.
     *
     * By default, the referenced color will be mixed with `transparent` so 0 = fully transparent and 1 = fully opaque.
     */
    mix?: number;
    /**
     * Provide a second color reference to mix with instead of `transparent`. This has no effect if `mix` is unspecified.
     */
    onto?: string;
};
/**
 * A CSS color-scheme value, e.g. "light", "dark", or "inherit" to use the
 * same setting as the parent application
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
 */
export type ColorSchemeValue = 'light' | 'dark' | 'inherit' | 'normal' | AnyString | {
    ref: string;
};
/**
 * A CSS dimension value with length units, e.g. "1px" or "2em". Alternatively:
 *
 * - `4` -> "4px" (a plain JavaScript number will be given pixel units)
 * - `{ref: "foo"}` -> use the same value as the `foo` param (`ref` must be a valid param name)
 * - `{calc: "foo + bar * 2"}` -> Use a dynamically calculated expression. You can use param names like spacing and fontSize in the expression, as well as built-in CSS math functions like `min(spacing, fontSize)`
 */
export type LengthValue = number | string | {
    /**
     * An expression that can include param names and maths, e.g.
     * "spacing * 2". NOTE: In CSS the `-` character is valid in variable
     * names, so leave a space around it.
     */
    calc: string;
} | {
    ref: string;
};
/**
 * A number without units.
 */
export type ScaleValue = number | {
    ref: 'string';
};
/**
 * A CSS border value e.g. "solid 1px red". Alternatively an object containing optional properties:
 *
 * - `style` -> a CSS border-style, default `"solid"`
 * - `width` -> a width in pixels, default `{ref: "borderWidth"}` (and the default borderWidth is 1)
 * - `color` -> a ColorValue as you would pass to any color param, default `{ref: "borderColor"}`
 *
 * Or a reference:
 * - `{ref: "foo"}` -> use the same value as the `foo` param (`ref` must be a valid param name)
 *
 * Or boolean value
 * - `true` -> `{}` (the default border style, equivalent to `{style: "solid", width: 1, color: {ref: "borderColor"}`)
 * - `false` -> `"none"` (no border).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/border
 */
export type BorderValue = string | boolean | {
    style?: BorderStyleValue;
    width?: LengthValue;
    color?: ColorValue;
} | {
    ref: string;
};
/**
 * A CSS box shadow value e.g. "10px 5px 5px red;". Alternatively an object containing optional properties:
 *
 * - `offsetX` -> number of pixels to move the shadow to the right, or a negative value to move left, default 0
 * - `offsetY` -> number of pixels to move the shadow downwards, or a negative value to move up, default 0
 * - `radius` -> softness of the shadow. 0 = hard edge, 10 = 10px wide blur
 * - `spread` -> size of the shadow. 0 = same size as the shadow-casting element. 10 = 10px wider in all directions.
 * - `color` -> color of the shadow e.g. `"red"`. Default `{ref: "foregroundColor"}`
 *
 * Or a reference:
 * - `{ref: "foo"}` -> use the same value as the `foo` param (`ref` must be a valid param name)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
 */
export type ShadowValue = string | false | {
    /**
     * Positive values move the shadow to the right, negative values move left
     *
     * @default 0
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
     */
    offsetX?: LengthValue;
    /**
     * Positive values move the shadow downwards, negative values move up
     *
     * @default 0
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
     */
    offsetY?: LengthValue;
    /**
     * Softness of the shadow. 0 = hard edge, 10 = 10px wide blur.
     *
     * @default 0
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
     */
    radius?: LengthValue;
    /**
     * Size of the shadow. 0 = same size as the shadow-casting element. 10 = 10px wider in all directions.
     *
     * @default 0
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
     */
    spread?: LengthValue;
    /**
     * Shadow color. Can accept any value that is valid for a color parameter, e.g. 'red' or {ref: 'accentColor'}
     *
     * @default {ref: 'foregroundColor'}
     */
    color?: ColorValue;
} | {
    ref: string;
};
/**
 * A CSS line-style value e.g. "solid" or "dashed".
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/line-style
 */
export type BorderStyleValue = 'none' | 'solid' | 'dotted' | 'dashed' | 'inset' | 'outset' | AnyString | {
    ref: string;
};
/**
 * A CSS font-family value consisting of a font name or comma-separated list of fonts in order of preference e.g. `"Roboto, -apple-system, 'Segoe UI', sans-serif"`. Alternatively:
 *
 * - `["Roboto", "-apple-system", "Segoe UI", "sans-serif"]` -> an array of font names in order of preference
 * - `["Dave's Font"]` -> when passing an array, special characters in font names will automatically be escaped
 * - `{ref: "foo"}` -> use the same value as `foo` which must be a valid font family param name
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-family
 */
export type FontFamilyValue = string | {
    googleFont: string;
} | Array<string | {
    googleFont: string;
}> | {
    ref: string;
};
/**
 * A CSS font-weight value e.g. `500` or `"bold"`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
 */
export type FontWeightValue = 'normal' | 'bold' | AnyString | number | {
    ref: string;
};
/**
 * A CSS image value e.g. `"url(...image-url...)"`. Alternatively:
 *
 * - `{svg: "...XML source of SVG image..."}` -> embed an SVG as a data: uri
 * - `{url: "https://..."}` -> a URL to load an image asset from. Can be a HTTPS URL, or image assets such as PNGs can be converted to data: URLs
 * - `{ref: "foo"}` -> use the same value as the `foo` param (`ref` must be a valid param name)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/image
 */
export type ImageValue = string | {
    /**
     * The URL of an image. data: URLs can be used embed assets.
     */
    url: string;
} | {
    /**
     * The XML text of an SVG file
     */
    svg: string;
} | {
    ref: string;
};
/**
 * A CSS time value with second or millisecond units e.g. `"0.3s"` or `"300ms"`. Alternatively:
 *
 * - `0.4` -> "0.4s" (a plain JavaScript number is assumed to be a number of seconds.
 * - `{ref: "foo"}` -> use the same value as the `foo` param (`ref` must be a valid param name)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/animation-duration
 */
export type DurationValue = number | string | {
    ref: string;
};
export {};
