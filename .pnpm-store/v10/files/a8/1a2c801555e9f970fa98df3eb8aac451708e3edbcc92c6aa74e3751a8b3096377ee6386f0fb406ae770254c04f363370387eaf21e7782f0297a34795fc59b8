import type { AgAxisLabelFormatterParams } from '../../chart/axisOptions';
import type { Formatter } from '../../chart/callbackOptions';
import type { ContextDefault, CssColor, Degree, FontFamily, FontSize, FontStyle, FontWeight, InteractionRange, PixelSize } from '../../chart/types';
import type { AgHighlightOptions, AgHighlightStyleOptions, AgSeriesHighlightStyle } from '../../series/seriesOptions';
export interface AgBaseGaugeThemeableOptions<TContext = ContextDefault> {
    /** The cursor to use for the gauge. This config is identical to the CSS `cursor` property. */
    cursor?: string;
    /** Context object to use in callbacks. */
    context?: TContext;
    /** @deprecated Configuration for marker and series highlighting when a series or legend item is hovered over. */
    highlightStyle?: AgSeriesHighlightStyle;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgHighlightOptions<AgHighlightStyleOptions>;
    /** Range from a node that a click triggers the listener. */
    nodeClickRange?: InteractionRange;
}
export interface AgGaugeScaleLabel<TContext> {
    /** Set to `false` to hide the scale labels. */
    enabled?: boolean;
    /** The font style to use for the labels. */
    fontStyle?: FontStyle;
    /** The font weight to use for the labels. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the labels. */
    fontSize?: FontSize;
    /** The font family to use for the labels */
    fontFamily?: FontFamily;
    /** Spacing in pixels between the scale label and the tick. */
    spacing?: PixelSize;
    /** The colour to use for the labels */
    color?: CssColor;
    /** The rotation of the scale labels in degrees. */
    rotation?: Degree;
    /** Avoid scale label collision by automatically reducing the number of ticks displayed. If set to `false`, scale labels may collide. */
    avoidCollisions?: boolean;
    /** Minimum gap in pixels between the scale labels before being removed to avoid collisions. */
    minSpacing?: PixelSize;
    /** Format string used when rendering labels. */
    format?: string;
    /** Function used to render scale labels. If `value` is a number, `fractionDigits` will also be provided, which indicates the number of fractional digits used in the step between ticks; for example, a tick step of `0.0005` would have `fractionDigits` set to `4` */
    formatter?: Formatter<AgAxisLabelFormatterParams<TContext>>;
}
export interface AgGaugeSegmentationInterval {
    /** The segmentation interval. If the configured interval results in too many items given the chart size, it will be ignored. */
    step?: number;
    /** Array of values for specified intervals along the gauge. */
    values?: number[];
    /** Number of evenly-divided segments in the gauge. */
    count?: number;
}
export interface AgGaugeSegmentation {
    /** Enable segmentation. */
    enabled?: boolean;
    /** Configuration for the segmentation. */
    interval?: AgGaugeSegmentationInterval;
    /** The spacing between segments. */
    spacing?: number;
}
export type AgGaugeFillMode = 'continuous' | 'discrete';
export type AgGaugeCornerMode = 'container' | 'item';
export interface AgGaugeColorStop {
    /** Colour of this category. */
    color?: string;
    /** Stop value of this category. Defaults the maximum value if unset. */
    stop?: number;
}
export interface FillsOptions {
    /** Configuration for two or more colours, and the values they are rendered at. */
    fills?: AgGaugeColorStop[];
    /**
     * Configuration the fills should be rendered.
     *
     * Default: `continuous`
     **/
    fillMode?: AgGaugeFillMode;
}
