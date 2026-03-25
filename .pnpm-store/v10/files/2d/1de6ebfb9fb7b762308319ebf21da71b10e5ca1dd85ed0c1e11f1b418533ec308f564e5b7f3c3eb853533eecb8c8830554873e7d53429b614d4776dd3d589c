import type { BorderOptions, FillOptions, Padding } from '../series/cartesian/commonOptions';
import type { AgAxisContinuousIntervalOptions, AgAxisLabelFormatterParams } from './axisOptions';
import type { Formatter } from './callbackOptions';
import type { AgChartLegendPosition } from './legendOptions';
import type { ContextDefault, CssColor, FontFamilyFull, FontSize, FontStyle, FontWeight, PixelSize } from './types';
export interface AgGradientLegendLabelOptions<TContext = ContextDefault> {
    /** The font style to use for the labels. */
    fontStyle?: FontStyle;
    /** The font weight to use for the labels. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the labels. */
    fontSize?: FontSize;
    /** The font family to use for the labels. */
    fontFamily?: FontFamilyFull;
    /** The colour to use for the labels. */
    color?: CssColor;
    /** Minimum gap in pixels between the axis labels before being removed to avoid collisions. */
    minSpacing?: PixelSize;
    /** Format string used when rendering labels. */
    format?: string;
    /** Function used to render scale labels. If `value` is a number, `fractionDigits` will also be provided, which indicates the number of fractional digits used in the step between intervals; for example, a interval step of `0.0005` would have `fractionDigits` set to `4`. */
    formatter?: Formatter<AgAxisLabelFormatterParams<TContext>>;
}
export interface AgGradientLegendScaleOptions<TContext = ContextDefault> {
    /** Options for the labels on the scale. */
    label?: AgGradientLegendLabelOptions<TContext>;
    /** Distance between the gradient box and the labels. */
    padding?: PixelSize;
    /** Options for intervals on the scale. */
    interval?: AgAxisContinuousIntervalOptions<number>;
}
export interface AgGradientLegendOptions<TContext = ContextDefault> extends FillOptions {
    /** Whether to show the gradient legend. By default, the chart displays a gradient legend for series using a `colorKey`. */
    enabled?: boolean;
    /** Positioning options for legend.
     *
     * Default: `'bottom'`
     */
    position?: AgChartLegendPosition;
    /** Gradient bar configuration. */
    gradient?: AgGradientLegendBarOptions;
    /** The spacing in pixels to use outside the legend.
     *
     * __Note:__ This only applies when `floating: false`.
     *
     * Default: `20` */
    spacing?: PixelSize;
    /** Reverse the display order of legend items if `true`. */
    reverseOrder?: boolean;
    /** Options for the numbers that appear below or to the side of the gradient. */
    scale?: AgGradientLegendScaleOptions<TContext>;
    /** The border around the legend. */
    border?: BorderOptions;
    /** The corner radius of the legend. */
    cornerRadius?: PixelSize;
    /** The padding between the border and legend items. */
    padding?: Padding;
}
export interface AgGradientLegendBarOptions {
    /** Preferred length of the gradient bar (may expand to fit labels or shrink to fit inside a chart). */
    preferredLength?: PixelSize;
    /** The thickness of the gradient bar (width for vertical or height for horizontal layout). */
    thickness?: PixelSize;
}
