import type { ContextCallbackParams, DatumCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgErrorBarOptions, AgErrorBarThemeableOptions } from '../../chart/errorBarOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, Opacity, PixelSize } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgMultiSeriesHighlightOptions, AgSeriesSegmentation, AgSeriesShapeSegmentOptions } from '../seriesOptions';
import type { AgErrorBoundSeriesTooltipRendererParams } from './cartesianSeriesTooltipOptions';
import type { FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export type AgBarSeriesLabelPlacement = 'inside-center' | 'inside-start' | 'inside-end' | 'outside-start' | 'outside-end';
export interface AgBarSeriesLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
    /** Where to render series labels relative to the segments. */
    placement?: AgBarSeriesLabelPlacement;
    /** Distance between the shape edges and the text. */
    spacing?: PixelSize;
}
export interface AgBarSeriesItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgBarSeriesOptionsKeys<TDatum>, Required<AgBarSeriesStyle> {
    readonly stackGroup?: string;
    /** The x value of the datum. */
    xValue: any;
    /** The y value of the datum. */
    yValue: any;
    /** Whether the item's x value is the first in the data domain. */
    first: boolean;
    /** Whether the item's x value is the last in the data domain. */
    last: boolean;
    /** Whether the item's y value is the lowest in the data. */
    min: boolean;
    /** Whether the item's y value is the highest in the data. */
    max: boolean;
}
export interface AgBarSeriesStylerParams<TDatum, TContext> extends SeriesCallbackParams, ContextCallbackParams<TContext>, AgBarSeriesOptionsKeys<TDatum>, Required<AgBarSeriesStyle> {
    readonly stackGroup?: string;
}
export interface AgBarSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Apply rounded corners to each bar. */
    cornerRadius?: PixelSize;
}
export type AgBarSeriesLabelFormatterParams<TDatum = DatumDefault> = AgBarSeriesOptionsKeys<TDatum> & AgBarSeriesOptionsNames;
export interface AgBarSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgBarSeriesOptionsKeys<TDatum>, AgBarSeriesOptionsNames, AgBarSeriesStyle, AgErrorBoundSeriesTooltipRendererParams<TDatum>, AgSeriesTooltipRendererParams<TDatum, TContext> {
    readonly stackGroup?: string;
}
export interface AgBarSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBarSeriesStyle, Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'highlight'> {
    /**
     * Bar rendering direction.
     *
     * __Note:__ This option affects the layout direction of X and Y data values.
     */
    direction?: 'horizontal' | 'vertical';
    /** Align bars to whole pixel values to remove anti-aliasing. */
    crisp?: boolean;
    /** Configuration for the shadow used behind the chart series. */
    shadow?: AgDropShadowOptions;
    /** Configuration for the labels shown on bars. */
    label?: AgBarSeriesLabelOptions<TDatum, AgBarSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgBarSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgBarSeriesStylerParams<TDatum, TContext>, AgBarSeriesStyle>;
    /** Function used to return formatting for individual bars, based on the given parameters.*/
    itemStyler?: Styler<AgBarSeriesItemStylerParams<TDatum, TContext>, AgBarSeriesStyle>;
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarThemeableOptions;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgBarHighlightStyleOptions, AgBarHighlightStyleOptions>;
    /** Configuration for styling series as separate segments. */
    segmentation?: AgSeriesSegmentation<AgSeriesShapeSegmentOptions>;
}
export interface AgBarHighlightStyleOptions extends AgBarSeriesStyle {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
}
export interface AgBarSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
}
export interface AgBarSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** Human-readable description of the y-values. If supplied, a corresponding `yName` will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** Human-readable description of the y-values. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export interface AgBarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgBarSeriesOptionsKeys<TDatum>, AgBarSeriesOptionsNames, AgBarSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Bar Series. */
    type: 'bar';
    /** Whether to group together (adjacently) separate bars. */
    grouped?: boolean;
    /** An option indicating if the bars should be stacked. */
    stacked?: boolean;
    /** An ID to be used to group stacked items. */
    stackGroup?: string;
    /** The number to normalise the bar stacks to. Has no effect when `grouped` is `true`. For example, if `normalizedTo` is set to `100`, the bar stacks will all be scaled proportionally so that each of their totals is 100. */
    normalizedTo?: number;
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarOptions<TDatum, TContext>;
}
