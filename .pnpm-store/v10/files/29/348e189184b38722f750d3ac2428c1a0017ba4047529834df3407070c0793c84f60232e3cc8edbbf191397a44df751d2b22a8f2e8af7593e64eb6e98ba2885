import type { Faker } from '../../faker';
/**
 * Color space names supported by CSS.
 */
export declare const CSS_SPACES: readonly ["sRGB", "display-p3", "rec2020", "a98-rgb", "prophoto-rgb", "rec2020"];
/**
 * Functions supported by CSS to produce color.
 */
export declare const CSS_FUNCTIONS: readonly ["rgb", "rgba", "hsl", "hsla", "hwb", "cmyk", "lab", "lch", "color"];
export declare type CSSFunction = typeof CSS_FUNCTIONS[number];
export declare type CSSSpace = typeof CSS_SPACES[number];
export declare type StringColorFormat = 'css' | 'binary';
export declare type NumberColorFormat = 'decimal';
export declare type ColorFormat = StringColorFormat | NumberColorFormat;
export declare type Casing = 'lower' | 'upper' | 'mixed';
/**
 * Module to generate colors.
 */
export declare class ColorModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Returns a random human readable color name.
     *
     * @example
     * faker.color.human() // 'red'
     *
     * @since 7.0.0
     */
    human(): string;
    /**
     * Returns a random color space name from the worldwide accepted color spaces.
     * Source: https://en.wikipedia.org/wiki/List_of_color_spaces_and_their_uses
     *
     * @example
     * faker.color.space() // 'sRGB'
     *
     * @since 7.0.0
     */
    space(): string;
    /**
     * Returns a random css supported color function name.
     *
     * @example
     * faker.color.cssSupportedFunction() // 'rgb'
     *
     * @since 7.0.0
     */
    cssSupportedFunction(): string;
    /**
     * Returns a random css supported color space name.
     *
     * @example
     * faker.color.cssSupportedSpace() // 'display-p3'
     *
     * @since 7.0.0
     */
    cssSupportedSpace(): string;
    /**
     * Returns an RGB color.
     *
     * @example
     * faker.color.rgb() // '0xffffFF'
     *
     * @since 7.0.0
     */
    rgb(): string;
    /**
     * Returns an RGB color.
     *
     * @param options Options object.
     * @param options.prefix Prefix of the generated hex color. Only applied when 'hex' format is used. Defaults to `'0x'`.
     * @param options.casing Letter type case of the generated hex color. Only applied when `'hex'` format is used. Defaults to `'mixed'`.
     * @param options.format Format of generated RGB color. Defaults to `hex`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.rgb() // '0xffffFF'
     * faker.color.rgb({ prefix: '#' }) // '#ffffFF'
     * faker.color.rgb({ casing: 'upper' }) // '0xFFFFFF'
     * faker.color.rgb({ casing: 'lower' }) // '0xffffff'
     * faker.color.rgb({ prefix: '#', casing: 'lower' }) // '#ffffff'
     * faker.color.rgb({ format: 'hex', casing: 'lower' }) // '#ffffff'
     * faker.color.rgb({ format: 'css' }) // 'rgb(255, 0, 0)'
     * faker.color.rgb({ format: 'binary' }) // '10000000 00000000 11111111'
     *
     * @since 7.0.0
     */
    rgb(options?: {
        prefix?: string;
        casing?: Casing;
        format?: 'hex' | StringColorFormat;
        includeAlpha?: boolean;
    }): string;
    /**
     * Returns an RGB color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'hex'`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.rgb() // '0xffffFF'
     * faker.color.rgb({ format: 'decimal' }) // [255, 255, 255]
     * faker.color.rgb({ format: 'decimal', includeAlpha: true }) // [255, 255, 255, 0.4]
     *
     * @since 7.0.0
     */
    rgb(options?: {
        format?: NumberColorFormat;
        includeAlpha?: boolean;
    }): number[];
    /**
     * Returns an RGB color.
     *
     * @param options Options object.
     * @param options.prefix Prefix of the generated hex color. Only applied when `'hex'` format is used. Defaults to `'0x'`.
     * @param options.casing Letter type case of the generated hex color. Only applied when `'hex'` format is used. Defaults to `'mixed'`.
     * @param options.format Format of generated RGB color. Defaults to `'hex'`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.rgb() // '0xffffFF'
     * faker.color.rgb({ prefix: '#' }) // '#ffffFF'
     * faker.color.rgb({ casing: 'upper' }) // '0xFFFFFF'
     * faker.color.rgb({ casing: 'lower' }) // '0xffffff'
     * faker.color.rgb({ prefix: '#', casing: 'lower' }) // '#ffffff'
     * faker.color.rgb({ format: 'hex', casing: 'lower' }) // '#ffffff'
     * faker.color.rgb({ format: 'decimal' }) // [255, 255, 255]
     * faker.color.rgb({ format: 'css' }) // 'rgb(255, 0, 0)'
     * faker.color.rgb({ format: 'binary' }) // '10000000 00000000 11111111'
     * faker.color.rgb({ format: 'decimal', includeAlpha: true }) // [255, 255, 255, 0.4]
     *
     * @since 7.0.0
     */
    rgb(options?: {
        prefix?: string;
        casing?: Casing;
        format?: 'hex' | ColorFormat;
        includeAlpha?: boolean;
    }): string | number[];
    /**
     * Returns a CMYK color.
     *
     * @example
     * faker.color.cmyk() // [0.31, 0.52, 0.32, 0.43]
     *
     * @since 7.0.0
     */
    cmyk(): number[];
    /**
     * Returns a CMYK color.
     *
     * @param options Options object.
     * @param options.format Format of generated CMYK color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.cmyk() // [0.31, 0.52, 0.32, 0.43]
     * faker.color.cmyk({ format: 'css' }) // cmyk(100%, 0%, 0%, 0%)
     * faker.color.cmyk({ format: 'binary' }) // (8-32 bits) x 4
     *
     * @since 7.0.0
     */
    cmyk(options?: {
        format?: StringColorFormat;
    }): string;
    /**
     * Returns a CMYK color.
     *
     * @param options Options object.
     * @param options.format Format of generated CMYK color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.cmyk() // [0.31, 0.52, 0.32, 0.43]
     * faker.color.cmyk({ format: 'decimal' }) // [0.31, 0.52, 0.32, 0.43]
     *
     * @since 7.0.0
     */
    cmyk(options?: {
        format?: NumberColorFormat;
    }): number[];
    /**
     * Returns a CMYK color.
     *
     * @param options Options object.
     * @param options.format Format of generated CMYK color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.cmyk() // [0.31, 0.52, 0.32, 0.43]
     * faker.color.cmyk({ format: 'decimal' }) // [0.31, 0.52, 0.32, 0.43]
     * faker.color.cmyk({ format: 'css' }) // cmyk(100%, 0%, 0%, 0%)
     * faker.color.cmyk({ format: 'binary' }) // (8-32 bits) x 4
     *
     * @since 7.0.0
     */
    cmyk(options?: {
        format?: ColorFormat;
    }): string | number[];
    /**
     * Returns an HSL color.
     *
     * @example
     * faker.color.hsl() // [201, 0.23, 0.32]
     *
     * @since 7.0.0
     */
    hsl(): number[];
    /**
     * Returns an HSL color.
     *
     * @param options Options object.
     * @param options.format Format of generated HSL color. Defaults to `'decimal'`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.hsl() // [201, 0.23, 0.32]
     * faker.color.hsl({ format: 'css' }) // hsl(0deg, 100%, 80%)
     * faker.color.hsl({ format: 'css', includeAlpha: true }) // hsl(0deg 100% 50% / 0.5)
     * faker.color.hsl({ format: 'binary' }) // (8-32 bits) x 3
     * faker.color.hsl({ format: 'binary', includeAlpha: true }) // (8-32 bits) x 4
     *
     * @since 7.0.0
     */
    hsl(options?: {
        format?: StringColorFormat;
        includeAlpha?: boolean;
    }): string;
    /**
     * Returns an HSL color.
     *
     * @param options Options object.
     * @param options.format Format of generated HSL color. Defaults to `'decimal'`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.hsl() // [201, 0.23, 0.32]
     * faker.color.hsl({ format: 'decimal' }) // [300, 0.21, 0.52]
     * faker.color.hsl({ format: 'decimal', includeAlpha: true }) // [300, 0.21, 0.52, 0.28]
     *
     * @since 7.0.0
     */
    hsl(options?: {
        format?: NumberColorFormat;
        includeAlpha?: boolean;
    }): number[];
    /**
     * Returns an HSL color.
     *
     * @param options Options object.
     * @param options.format Format of generated HSL color. Defaults to `'decimal'`.
     * @param options.includeAlpha Adds an alpha value to the color (RGBA). Defaults to `false`.
     *
     * @example
     * faker.color.hsl() // [201, 0.23, 0.32]
     * faker.color.hsl({ format: 'decimal' }) // [300, 0.21, 0.52]
     * faker.color.hsl({ format: 'decimal', includeAlpha: true }) // [300, 0.21, 0.52, 0.28]
     * faker.color.hsl({ format: 'css' }) // hsl(0deg, 100%, 80%)
     * faker.color.hsl({ format: 'css', includeAlpha: true }) // hsl(0deg 100% 50% / 0.5)
     * faker.color.hsl({ format: 'binary' }) // (8-32 bits) x 3
     * faker.color.hsl({ format: 'binary', includeAlpha: true }) // (8-32 bits) x 4
     *
     * @since 7.0.0
     */
    hsl(options?: {
        format?: ColorFormat;
        includeAlpha?: boolean;
    }): string | number[];
    /**
     * Returns an HWB color.
     *
     * @example
     * faker.color.hwb() // [201, 0.21, 0.31]
     *
     * @since 7.0.0
     */
    hwb(): number[];
    /**
     * Returns an HWB color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.hwb() // [201, 0.21, 0.31]
     * faker.color.hwb({ format: 'css' }) // hwb(194 0% 0%)
     * faker.color.hwb({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    hwb(options?: {
        format?: StringColorFormat;
    }): string;
    /**
     * Returns an HWB color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.hwb() // [201, 0.21, 0.31]
     * faker.color.hwb({ format: 'decimal' }) // [201, 0.21, 0.31]
     *
     * @since 7.0.0
     */
    hwb(options?: {
        format?: NumberColorFormat;
    }): number[];
    /**
     * Returns an HWB color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.hwb() // [201, 0.21, 0.31]
     * faker.color.hwb({ format: 'decimal' }) // [201, 0.21, 0.31]
     * faker.color.hwb({ format: 'css' }) // hwb(194 0% 0%)
     * faker.color.hwb({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    hwb(options?: {
        format?: ColorFormat;
    }): string | number[];
    /**
     * Returns a LAB (CIELAB) color.
     *
     * @example
     * faker.color.lab() // [0.832133, -80.3245, 100.1234]
     *
     * @since 7.0.0
     */
    lab(): number[];
    /**
     * Returns a LAB (CIELAB) color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lab() // [0.832133, -80.3245, 100.1234]
     * faker.color.lab({ format: 'css' }) // lab(29.2345% 39.3825 20.0664)
     * faker.color.lab({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    lab(options?: {
        format?: StringColorFormat;
    }): string;
    /**
     * Returns a LAB (CIELAB) color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lab() // [0.832133, -80.3245, 100.1234]
     * faker.color.lab({ format: 'decimal' }) // [0.856773, -80.2345, 100.2341]
     *
     * @since 7.0.0
     */
    lab(options?: {
        format?: NumberColorFormat;
    }): number[];
    /**
     * Returns a LAB (CIELAB) color.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lab() // [0.832133, -80.3245, 100.1234]
     * faker.color.lab({ format: 'decimal' }) // [0.856773, -80.2345, 100.2341]
     * faker.color.lab({ format: 'css' }) // lab(29.2345% 39.3825 20.0664)
     * faker.color.lab({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    lab(options?: {
        format?: ColorFormat;
    }): string | number[];
    /**
     * Returns an LCH color. Even though upper bound of
     * chroma in LCH color space is theoretically unbounded,
     * it is bounded to 230 as anything above will not
     * make a noticeable difference in the browser.
     *
     * @example
     * faker.color.lch() // [0.522345, 72.2, 56.2]
     *
     * @since 7.0.0
     */
    lch(): number[];
    /**
     * Returns an LCH color. Even though upper bound of
     * chroma in LCH color space is theoretically unbounded,
     * it is bounded to 230 as anything above will not
     * make a noticeable difference in the browser.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lch() // [0.522345, 72.2, 56.2]
     * faker.color.lch({ format: 'css' }) // lch(52.2345% 72.2 56.2)
     * faker.color.lch({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    lch(options?: {
        format?: StringColorFormat;
    }): string;
    /**
     * Returns an LCH color. Even though upper bound of
     * chroma in LCH color space is theoretically unbounded,
     * it is bounded to 230 as anything above will not
     * make a noticeable difference in the browser.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lch() // [0.522345, 72.2, 56.2]
     * faker.color.lch({ format: 'decimal' }) // [0.522345, 72.2, 56.2]
     *
     * @since 7.0.0
     */
    lch(options?: {
        format?: NumberColorFormat;
    }): number[];
    /**
     * Returns an LCH color. Even though upper bound of
     * chroma in LCH color space is theoretically unbounded,
     * it is bounded to 230 as anything above will not
     * make a noticeable difference in the browser.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     *
     * @example
     * faker.color.lch() // [0.522345, 72.2, 56.2]
     * faker.color.lch({ format: 'decimal' }) // [0.522345, 72.2, 56.2]
     * faker.color.lch({ format: 'css' }) // lch(52.2345% 72.2 56.2)
     * faker.color.lch({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    lch(options?: {
        format?: ColorFormat;
    }): string | number[];
    /**
     * Returns a random color based on CSS color space specified.
     *
     * @example
     * faker.color.colorByCSSColorSpace() // [0.93, 1, 0.82]
     *
     * @since 7.0.0
     */
    colorByCSSColorSpace(): number[];
    /**
     * Returns a random color based on CSS color space specified.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     * @param options.space Color space to generate the color for. Defaults to `'sRGB'`.
     *
     * @example
     * faker.color.colorByCSSColorSpace() // [0.93, 1, 0.82]
     * faker.color.colorByCSSColorSpace({ format: 'css', space: 'display-p3' }) // color(display-p3 0.12 1 0.23)
     * faker.color.colorByCSSColorSpace({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    colorByCSSColorSpace(options?: {
        format?: StringColorFormat;
        space?: CSSSpace;
    }): string;
    /**
     * Returns a random color based on CSS color space specified.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     * @param options.space Color space to generate the color for. Defaults to `'sRGB'`.
     *
     * @example
     * faker.color.colorByCSSColorSpace() // [0.93, 1, 0.82]
     * faker.color.colorByCSSColorSpace({ format: 'decimal' }) // [0.12, 0.21, 0.31]
     *
     * @since 7.0.0
     */
    colorByCSSColorSpace(options?: {
        format?: NumberColorFormat;
        space?: CSSSpace;
    }): number[];
    /**
     * Returns a random color based on CSS color space specified.
     *
     * @param options Options object.
     * @param options.format Format of generated RGB color. Defaults to `'decimal'`.
     * @param options.space Color space to generate the color for. Defaults to `'sRGB'`.
     *
     * @example
     * faker.color.colorByCSSColorSpace() // [0.93, 1, 0.82]
     * faker.color.colorByCSSColorSpace({ format: 'decimal' }) // [0.12, 0.21, 0.31]
     * faker.color.colorByCSSColorSpace({ format: 'css', space: 'display-p3' }) // color(display-p3 0.12 1 0.23)
     * faker.color.colorByCSSColorSpace({ format: 'binary' }) // (8-32 bits x 3)
     *
     * @since 7.0.0
     */
    colorByCSSColorSpace(options?: {
        format?: ColorFormat;
        space?: CSSSpace;
    }): string | number[];
}
