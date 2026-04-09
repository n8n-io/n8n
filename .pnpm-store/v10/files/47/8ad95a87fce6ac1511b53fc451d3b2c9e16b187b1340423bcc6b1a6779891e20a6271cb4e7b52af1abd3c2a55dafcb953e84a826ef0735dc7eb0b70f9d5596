import type { LabelBoxOptions, TextOrSegments } from '../series/cartesian/commonOptions';
import type { RichFormatter, Styler } from './callbackOptions';
import type { ContextDefault, CssColor, Degree, FontFamilyFull, FontSize, FontStyle, FontWeight, PixelSize, Ratio } from './types';
export interface AgAxisBoundSeries {
    /** ID of the series for values on the related axis. */
    seriesId: string;
    /** Key used by the series for values on the related axis. */
    key: string;
    /** Optional name used by the series for values on the related axis. */
    name?: string;
}
export interface AgAxisCaptionFormatterParams {
    /** Default value to be used for the axis title (as specified in chart options or theme). */
    defaultValue?: string;
    /** Direction of the axis the title belongs to. */
    direction: 'x' | 'y' | 'angle' | 'radius';
    /** Metadata about series bound to the axis the title belongs to. */
    boundSeries: AgAxisBoundSeries[];
    /** Computed domain of the axis */
    domain: any[];
}
export interface AgAxisCaptionOptions {
    /** Whether the title should be shown. */
    enabled?: boolean;
    /** The text to show in the title. */
    text?: string;
    /** The font style to use for the title. */
    fontStyle?: FontStyle;
    /** The font weight to use for the title. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the title. */
    fontSize?: FontSize;
    /** The font family to use for the title. */
    fontFamily?: FontFamilyFull;
    /** The colour to use for the title. */
    color?: CssColor;
    /** Spacing between the axis labels and the axis title. */
    spacing?: PixelSize;
    /** Formatter to allow dynamic axis title calculation. */
    formatter?: RichFormatter<AgAxisCaptionFormatterParams>;
}
export interface AgBaseAxisOptions<LabelType = any, TContext = ContextDefault> {
    /** Axis type identifier. */
    type: string;
    /** Context object to use in callbacks. */
    context?: TContext;
    /** Reverse the axis scale domain if `true`. */
    reverse?: boolean;
    /** Configuration for the axis line. */
    line?: AgAxisLineOptions;
    /** Configuration for the axis grid lines. */
    gridLine?: AgAxisGridLineOptions;
    /** Configuration for the axis labels, shown next to the ticks. */
    label?: LabelType;
    /** Configuration for the axis ticks. */
    tick?: AgAxisBaseTickOptions;
    /** Configuration for the axis ticks interval. */
    interval?: AgAxisBaseIntervalOptions;
}
export interface AgBaseContinuousAxisOptions<TDatum extends Date | number = number> {
    /** User override for the automatically determined min value (based on series data). */
    min?: TDatum;
    /** User override for the automatically determined max value (based on series data). */
    max?: TDatum;
}
export interface AgContinuousAxisOptions<TDatum extends Date | number = number, TInterval extends AgTimeInterval | AgTimeIntervalUnit | number = number> extends AgBaseContinuousAxisOptions<TDatum> {
    /** If `true`, the range will be rounded up to ensure nice equal spacing between the ticks. */
    nice?: boolean;
    /** Configuration for the axis ticks interval. */
    interval?: AgAxisContinuousIntervalOptions<TInterval>;
}
export interface AgAxisContinuousIntervalOptions<T extends AgTimeInterval | AgTimeIntervalUnit | number> extends AgAxisBaseIntervalOptions {
    /** The axis interval. Expressed in the units of the axis. If the configured interval results in too many items given the chart size, it will be ignored. */
    step?: T;
    /** Maximum gap in pixels between items. */
    maxSpacing?: PixelSize;
}
export interface AgAxisLineOptions {
    /** Set to `false` to hide the axis line. */
    enabled?: boolean;
    /** The width in pixels of the axis line. */
    width?: PixelSize;
    /** The colour of the axis line. */
    stroke?: CssColor;
}
export interface AgAxisGridLineOptions {
    /** Set to `false` to hide the axis grid lines. */
    enabled?: boolean;
    /** The width in pixels of the axis grid lines. */
    width?: PixelSize;
    /** Configuration of the lines used to form the grid in the chart series area. */
    style?: AgAxisGridStyle[];
}
export interface AgAxisBaseTickOptions {
    /** Set to `false` to hide the axis ticks. */
    enabled?: boolean;
    /** The width in pixels of the axis ticks. */
    width?: PixelSize;
    /** The length in pixels of the axis ticks. */
    size?: PixelSize;
    /** The colour of the axis ticks. */
    stroke?: CssColor;
}
export interface AgAxisBaseIntervalOptions {
    /** Array of values in axis units for specified intervals along the axis. The values in this array must be compatible with the axis type. */
    values?: any[];
    /** Minimum gap in pixels between intervals. */
    minSpacing?: PixelSize;
}
export interface AgBaseAxisLabelStyleOptions extends LabelBoxOptions {
    /** The font style to use for the labels. */
    fontStyle?: FontStyle;
    /** The font weight to use for the labels. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the labels. */
    fontSize?: FontSize;
    /** The font family to use for the labels */
    fontFamily?: FontFamilyFull;
    /** Spacing in pixels between the axis label and the tick. */
    spacing?: PixelSize;
    /** The colour to use for the labels */
    color?: CssColor;
}
export interface AgAxisLabelFormatterParams<TContext = ContextDefault> {
    readonly value: any;
    readonly index: number;
    readonly fractionDigits?: number;
    readonly unit?: AgTimeIntervalUnit;
    readonly step?: number;
    readonly boundSeries: AgAxisBoundSeries[];
    readonly domain: any[];
    /** Context for this callback. */
    readonly context?: TContext;
}
export interface AgAxisLabelStylerParams<TContext = ContextDefault> extends AgBaseAxisLabelStyleOptions {
    /** The label value that would be used, before applying formating. */
    readonly value: any;
    /** The label value that would be used, after applying formating. */
    readonly formattedValue?: TextOrSegments;
    /** Context for this callback. */
    readonly context?: TContext;
}
export interface AgBaseAxisLabelOptions<TContext = ContextDefault> extends AgBaseAxisLabelStyleOptions {
    /** Set to `false` to hide the axis labels. */
    enabled?: boolean;
    /** The rotation of the axis labels in degrees. Note: for integrated charts the default is 335 degrees, unless the axis shows grouped or default categories (indexes). The first row of labels in a grouped category axis is rotated perpendicular to the axis line. */
    rotation?: Degree;
    /** Avoid axis label collision by automatically reducing the number of ticks displayed. If set to `false`, axis labels may collide. */
    avoidCollisions?: boolean;
    /** Minimum gap in pixels between the axis labels before being removed to avoid collisions. */
    minSpacing?: PixelSize;
    /** Function used to render axis labels. If `value` is a number, `fractionDigits` will also be provided, which indicates the number of fractional digits used in the step between ticks; for example, a tick step of `0.0005` would have `fractionDigits` set to `4` */
    formatter?: RichFormatter<AgAxisLabelFormatterParams<TContext>>;
    /** Function used to style axis labels. */
    itemStyler?: Styler<AgAxisLabelStylerParams<TContext>, AgBaseAxisLabelStyleOptions>;
}
export interface AgNumericAxisFormattableLabelOptions<TContext = ContextDefault> extends AgBaseAxisLabelOptions<TContext> {
    /** Format string used when rendering labels. */
    format?: string;
}
export interface AgTimeAxisFormattableLabelUnitFormat {
    millisecond?: string;
    second?: string;
    hour?: string;
    day?: string;
    month?: string;
    year?: string;
}
export type AgTimeAxisFormattableLabelFormat = string | AgTimeAxisFormattableLabelUnitFormat;
export interface AgTimeAxisFormattableLabelOptions<TContext = ContextDefault> extends AgBaseAxisLabelOptions<TContext> {
    /** Format string used when rendering labels. */
    format?: AgTimeAxisFormattableLabelFormat;
}
export interface AgAxisGridStyle {
    /** The colour of the fill between grid lines. */
    fill?: CssColor;
    /** The opacity of the fill between grid lines. */
    fillOpacity?: Ratio;
    /** The colour of the grid line. */
    stroke?: CssColor;
    /** The width of the grid line in pixels. */
    strokeWidth?: PixelSize;
    /** Defines how the grid lines are rendered. Every number in the array specifies the length in pixels of alternating dashes and gaps. For example, `[6, 3]` means dashes with a length of `6` pixels with gaps between of `3` pixels. */
    lineDash?: PixelSize[];
}
export type AgTimeIntervalUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';
export interface AgTimeInterval {
    /** The base duration of the time interval. */
    unit: AgTimeIntervalUnit;
    /** A multiplier of the `unit`.
     *
     * For example, a unit of `'week'` and a step of `2` would be every two weeks. */
    step?: number;
    /** Defines the alignment of time interval.
     *
     * For example, a unit of `'week'` with an epoch date of a Monday would be every Monday.
     * */
    epoch?: Date;
    /** Whether all dates should be in UTC, or local time. */
    utc?: boolean;
}
