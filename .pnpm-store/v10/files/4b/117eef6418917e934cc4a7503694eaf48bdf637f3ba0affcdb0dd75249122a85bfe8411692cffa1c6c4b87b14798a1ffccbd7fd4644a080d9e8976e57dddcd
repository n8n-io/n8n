import {List} from 'immutable';

import {Value} from './index';

/** The HSL color space name. */
export type ColorSpaceHsl = 'hsl';

/** The HSL color space channel names. */
export type ChannelNameHsl = 'hue' | 'saturation' | 'lightness' | 'alpha';

/** The HWB color space name. */
export type ColorSpaceHwb = 'hwb';

/** The HWB color space channel names. */
export type ChannelNameHwb = 'hue' | 'whiteness' | 'blackness' | 'alpha';

/** The Lab / Oklab color space names. */
export type ColorSpaceLab = 'lab' | 'oklab';

/** The Lab / Oklab color space channel names. */
export type ChannelNameLab = 'lightness' | 'a' | 'b' | 'alpha';

/** The LCH / Oklch color space names. */
export type ColorSpaceLch = 'lch' | 'oklch';

/** The LCH / Oklch color space channel names. */
export type ChannelNameLch = 'lightness' | 'chroma' | 'hue' | 'alpha';

/** Names of color spaces with RGB channels. */
export type ColorSpaceRgb =
  | 'a98-rgb'
  | 'display-p3'
  | 'prophoto-rgb'
  | 'rec2020'
  | 'rgb'
  | 'srgb'
  | 'srgb-linear';

/** RGB channel names. */
export type ChannelNameRgb = 'red' | 'green' | 'blue' | 'alpha';

/** Names of color spaces with XYZ channels. */
export type ColorSpaceXyz = 'xyz' | 'xyz-d50' | 'xyz-d65';

/** XYZ channel names. */
export type ChannelNameXyz = 'x' | 'y' | 'z' | 'alpha';

/** All supported color space channel names. */
export type ChannelName =
  | ChannelNameHsl
  | ChannelNameHwb
  | ChannelNameLab
  | ChannelNameLch
  | ChannelNameRgb
  | ChannelNameXyz;

/** All supported color space names. */
export type KnownColorSpace =
  | ColorSpaceHsl
  | ColorSpaceHwb
  | ColorSpaceLab
  | ColorSpaceLch
  | ColorSpaceRgb
  | ColorSpaceXyz;

/** Polar color space names (HSL, HWB, LCH, and Oklch spaces). */
export type PolarColorSpace = ColorSpaceHsl | ColorSpaceHwb | ColorSpaceLch;

/** Rectangular color space names (Lab, Oklab, RGB, and XYZ spaces). */
export type RectangularColorSpace = Exclude<KnownColorSpace, PolarColorSpace>;

/**
 * Methods by which two hues are adjusted when interpolating between polar
 * colors.
 */
export type HueInterpolationMethod =
  | 'decreasing'
  | 'increasing'
  | 'longer'
  | 'shorter';

/**
 * Methods by which colors in bounded spaces can be mapped to within their
 * gamut.
 *
 * * `local-minde`: The algorithm specified in [the original Color Level 4
 *   candidate recommendation]. This maps in the Oklch color space, using the
 *   [deltaEOK] color difference formula and the [local-MINDE] improvement.
 *
 * * `clip`: Clamp each color channel that's outside the gamut to the minimum or
 *   maximum value for that channel. This algorithm will produce poor visual
 *   results, but it may be useful to match the behavior of other situations in
 *   which a color can be clipped.
 *
 * [the original Color Level 4 candidate recommendation]: https://www.w3.org/TR/2024/CRD-css-color-4-20240213/#css-gamut-mapping
 * [deltaEOK]: https://www.w3.org/TR/2024/CRD-css-color-4-20240213/#color-difference-OK
 * [local-MINDE]: https://www.w3.org/TR/2024/CRD-css-color-4-20240213/#GM-chroma-local-MINDE
 */
export type GamutMapMethod = 'clip' | 'local-minde';

/**
 * Sass's [color type](https://sass-lang.com/documentation/values/colors).
 *
 * No matter what representation was originally used to create this color, all
 * of its channels are accessible.
 *
 * @category Custom Function
 */
export class SassColor extends Value {
  /**
   * Creates an [RGB color].
   *
   * If `space` is missing, **only** `undefined` should be used to indicate that
   * `alpha` isn't passed. If `null` is used instead, it will be treated as a
   * [missing component]. See [breaking changes] for details.
   *
   * If `space` is defined and `null` is passed for any component, it will be
   * treated as a [missing component].
   *
   * [RGB color]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   * [breaking changes]: /documentation/breaking-changes/null-alpha
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    red: number | null;
    green: number | null;
    blue: number | null;
    alpha?: number | null;
    space?: 'rgb';
  });

  /**
   * Creates an [HSL color].
   *
   * If `space` is missing, **only** `undefined` should be used to indicate that
   * `alpha` isn't passed. If `null` is used instead, it will be treated as a
   * [missing component]. See [breaking changes] for details.
   *
   * If `space` is defined and `null` is passed for any component, it will be
   * treated as a [missing component].
   *
   * [HSL color]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   * [breaking changes]: /documentation/breaking-changes/null-alpha
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    hue: number | null;
    saturation: number | null;
    lightness: number | null;
    alpha?: number | null;
    space?: ColorSpaceHsl;
  });

  /**
   * Creates an [HWB color].
   *
   * If `space` is missing, **only** `undefined` should be used to indicate that
   * `alpha` isn't passed. If `null` is used instead, it will be treated as a
   * [missing component]. See [breaking changes] for details.
   *
   * If `space` is defined and `null` is passed for any component, it will be
   * treated as a [missing component].
   *
   * [HWB color]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hwb
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   * [breaking changes]: /documentation/breaking-changes/null-alpha
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    hue: number | null;
    whiteness: number | null;
    blackness: number | null;
    alpha?: number | null;
    space?: ColorSpaceHwb;
  });

  /**
   * Creates a [Lab] or [Oklab] color.
   *
   * If `null` is passed for any component, it will be treated as a [missing
   * component].
   *
   * [Lab]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lab
   * [Oklab]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    lightness: number | null;
    a: number | null;
    b: number | null;
    alpha?: number | null;
    space: ColorSpaceLab;
  });

  /**
   * Creates an [LCH] or [Oklch] color.
   *
   * If `null` is passed for any component, it will be treated as a [missing
   * component].
   *
   * [LCH]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch
   * [Oklch]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    lightness: number | null;
    chroma: number | null;
    hue: number | null;
    alpha?: number | null;
    space: ColorSpaceLch;
  });

  /**
   * Creates a color in a predefined [RGB color space].
   *
   * If `null` is passed for any component, it will be treated as a [missing
   * component].
   *
   * [RGB color space]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color#using_predefined_colorspaces_with_color
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    red: number | null;
    green: number | null;
    blue: number | null;
    alpha?: number | null;
    space: Exclude<ColorSpaceRgb, 'rgb'>;
  });

  /**
   * Creates a color in a predefined [XYZ color space].
   *
   * If `null` is passed for any component, it will be treated as a [missing
   * component].
   *
   * [XYZ color space]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color#using_the_xyz_colorspace_with_color
   * [missing component]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  constructor(options: {
    x: number | null;
    y: number | null;
    z: number | null;
    alpha?: number | null;
    space: ColorSpaceXyz;
  });

  /** The name of this color's space. */
  get space(): KnownColorSpace;

  /**
   * Returns a new color that's the result of converting this color to the
   * specified `space`.
   */
  toSpace(space: KnownColorSpace): SassColor;

  /**
   * A boolean indicating whether this color is in a legacy color space (`rgb`,
   * `hsl`, or `hwb`).
   */
  get isLegacy(): boolean;

  /**
   * Returns a boolean indicating whether this color is in-gamut (as opposed to
   * having one or more of its channels out of bounds) for the specified
   * `space`, or its current color space if `space` is not specified.
   */
  isInGamut(space?: KnownColorSpace): boolean;

  /**
   * Returns a copy of this color, modified so it is in-gamut for the specified
   * `space`—or the current color space if `space` is not specified—using
   * `method` to map out-of-gamut colors into the desired gamut.
   */
  toGamut(options: {
    space?: KnownColorSpace;
    method: GamutMapMethod;
  }): SassColor;

  /**
   * A list of this color's channel values (excluding alpha), with [missing
   * channels] converted to `null`.
   *
   * [missing channels]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   */
  get channelsOrNull(): List<number | null>;

  /**
   * A list of this color's channel values (excluding alpha), with [missing
   * channels] converted to `0`.
   *
   * [missing channels]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   */
  get channels(): List<number>;

  /**
   * Returns the value of a single specified `channel` of this color, with
   * [missing channels] converted to `0`.
   *
   * [missing channels]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `channel` is not `alpha` or a channel in this color's
   * space.
   */
  channel(channel: ChannelName): number;

  /**
   * Returns the value of a single specified `channel` of this color after
   * converting this color to the specified `space`, with [missing channels]
   * converted to `0`.
   *
   * [missing channels]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   *
   * @throws `Error` if `channel` is not `alpha` or a channel in `space`.
   */
  channel(channel: ChannelNameHsl, options: {space: ColorSpaceHsl}): number;
  channel(channel: ChannelNameHwb, options: {space: ColorSpaceHwb}): number;
  channel(channel: ChannelNameLab, options: {space: ColorSpaceLab}): number;
  channel(channel: ChannelNameLch, options: {space: ColorSpaceLch}): number;
  channel(channel: ChannelNameRgb, options: {space: ColorSpaceRgb}): number;
  channel(channel: ChannelNameXyz, options: {space: ColorSpaceXyz}): number;

  /** This color's alpha channel, between `0` and `1`. */
  get alpha(): number;

  /**
   * Returns a boolean indicating whether a given channel value is a [missing
   * channel].
   *
   * [missing channel]: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#missing_color_components
   */
  isChannelMissing(channel: ChannelName): boolean;

  /**
   * Returns a boolean indicating whether a given `channel` is [powerless] in
   * this color. This is a special state that's defined for individual color
   * spaces, which indicates that a channel's value won't affect how a color is
   * displayed.
   *
   * [powerless]: https://www.w3.org/TR/css-color-4/#powerless
   */
  isChannelPowerless(channel: ChannelName): boolean;
  isChannelPowerless(
    channel: ChannelNameHsl,
    options?: {space: ColorSpaceHsl}
  ): boolean;
  isChannelPowerless(
    channel: ChannelNameHwb,
    options?: {space: ColorSpaceHwb}
  ): boolean;
  isChannelPowerless(
    channel: ChannelNameLab,
    options?: {space: ColorSpaceLab}
  ): boolean;
  isChannelPowerless(
    channel: ChannelNameLch,
    options?: {space: ColorSpaceLch}
  ): boolean;
  isChannelPowerless(
    channel: ChannelNameRgb,
    options?: {space: ColorSpaceRgb}
  ): boolean;
  isChannelPowerless(
    channel: ChannelNameXyz,
    options?: {space: ColorSpaceXyz}
  ): boolean;

  /**
   * Returns a color partway between this color and `color2` according to
   * `method`, as defined by the CSS Color 4 [color interpolation] procedure.
   *
   * [color interpolation]: https://www.w3.org/TR/css-color-4/#interpolation
   *
   * If `method` is missing and this color is in a rectangular color space (Lab,
   * Oklab, RGB, and XYZ spaces), `method` defaults to the color space of this
   * color. Otherwise, `method` defaults to a space separated list containing
   * the color space of this color and the string "shorter".
   *
   * The `weight` is a number between 0 and 1 that indicates how much of this
   * color should be in the resulting color. If omitted, it defaults to 0.5.
   */
  interpolate(
    color2: SassColor,
    options?: {
      weight?: number;
      method?: HueInterpolationMethod;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's HSL channels.
   *
   * @throws `Error` if `space` is missing and this color is not in a legacy
   * color space (`rgb`, `hsl`, or `hwb`).
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameHsl]?: number | null;
    } & {
      space?: ColorSpaceHsl;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's HWB channels.
   *
   * @throws `Error` if `space` is missing and this color is not in a legacy
   * color space (`rgb`, `hsl`, or `hwb`).
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameHwb]?: number | null;
    } & {
      space?: ColorSpaceHwb;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's Lab channels.
   *
   * @throws `Error` if `space` is missing and this color is not in the Lab or
   * Oklab color spaces.
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameLab]?: number | null;
    } & {
      space?: ColorSpaceLab;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's LCH channels.
   *
   * @throws `Error` if `space` is missing and this color is not in the LCH or
   * Oklch color spaces.
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameLch]?: number | null;
    } & {
      space?: ColorSpaceLch;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's RGB channels.
   *
   * @throws `Error` if `space` is missing and this color is not in a legacy
   * color space (`rgb`, `hsl`, or `hwb`).
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameRgb]?: number | null;
    } & {
      space?: ColorSpaceRgb;
    }
  ): SassColor;

  /**
   * Returns a new color that's the result of changing one or more of this
   * color's XYZ channels.
   *
   * @throws `Error` if `space` is missing and this color is not in an XYZ color
   * space.
   * @throws `Error` if `alpha` is set and isn't `null` or a number between `0`
   * and `1`.
   */
  change(
    options: {
      [key in ChannelNameXyz]?: number | null;
    } & {
      space?: ColorSpaceXyz;
    }
  ): SassColor;

  /**
   * This color's red channel in the RGB color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get red(): number;

  /**
   * This color's green channel in the RGB color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get green(): number;

  /**
   * This color's blue channel in the RGB color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get blue(): number;

  /**
   * This color's hue in the HSL color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get hue(): number;

  /**
   * This color's saturation in the HSL color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get saturation(): number;

  /**
   * This color's lightness in the HSL color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get lightness(): number;

  /**
   * This color's whiteness in the HWB color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get whiteness(): number;

  /**
   * This color's blackness in the HWB color space.
   *
   * @deprecated Use {@link channel} instead.
   */
  get blackness(): number;
}
