import type { ContextCallbackParams, DatumCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, Opacity, PixelSize } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgMultiSeriesHighlightOptions, AgSeriesHighlightStyle, AgSeriesSegmentation, AgSeriesShapeSegmentOptions } from '../seriesOptions';
import type { FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export type AgRangeBarSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgRangeBarSeriesOptionsKeys<TDatum> & Required<AgRangeBarSeriesStyle>;
export interface AgRangeBarSeriesStylerParams<TDatum, TContext> extends SeriesCallbackParams, ContextCallbackParams<TContext>, AgRangeBarSeriesOptionsKeys<TDatum>, Required<AgRangeBarSeriesStyle> {
}
export interface AgRangeBarSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Apply rounded corners to each bar. */
    cornerRadius?: PixelSize;
}
export type AgRangeBarSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> = AgSeriesTooltipRendererParams<TDatum, TContext> & AgRangeBarSeriesOptionsKeys<TDatum> & AgRangeBarSeriesOptionsNames & AgRangeBarSeriesStyle;
export interface AgRangeBarSeriesLabelOptions<TDatum, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, AgRangeBarSeriesLabelFormatterParams<TDatum>, TContext> {
    /** Where to render series labels relative to the bars. */
    placement?: AgRangeBarSeriesLabelPlacement;
    /** Spacing in pixels between the label and the edge of the bar. */
    spacing?: PixelSize;
}
export type AgRangeBarSeriesLabelPlacement = 'inside' | 'outside';
export interface AgRangeBarSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeableOptions<TDatum, TContext>, AgRangeBarSeriesStyle {
    /**
     * Bar rendering direction.
     *
     * __Note:__ This option affects the layout direction of X and Y data values.
     */
    direction?: 'horizontal' | 'vertical';
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgRangeBarSeriesTooltipRendererParams<TDatum, TContext>>;
    /** @deprecated Configuration for the range series items when they are hovered over. */
    highlightStyle?: AgSeriesHighlightStyle;
    /** Configuration for the labels shown on top of data points. */
    label?: AgRangeBarSeriesLabelOptions<TDatum, TContext>;
    /** Configuration for the shadow used behind the series items. */
    shadow?: AgDropShadowOptions;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgRangeBarSeriesStylerParams<TDatum, TContext>, AgRangeBarSeriesStyle>;
    /** Function used to return formatting for individual RangeBar series item cells, based on the given parameters.*/
    itemStyler?: Styler<AgRangeBarSeriesItemStylerParams<TDatum, TContext>, AgRangeBarSeriesStyle>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgRangeBarHighlightStyleOptions, AgRangeBarHighlightStyleOptions>;
    /** Whether to group together (adjacently) separate bars. */
    grouped?: boolean;
    /** Configuration for styling series as separate segments. */
    segmentation?: AgSeriesSegmentation<AgSeriesShapeSegmentOptions>;
}
export interface AgRangeBarHighlightStyleOptions extends AgRangeBarSeriesStyle {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
}
export type AgRangeBarSeriesLabelFormatterParams<TDatum = DatumDefault> = AgRangeBarSeriesOptionsKeys<TDatum> & AgRangeBarSeriesOptionsNames;
export interface AgRangeBarSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-low-values from the data. */
    yLowKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-high-values from the data. */
    yHighKey: DatumKey<TDatum>;
}
export interface AgRangeBarSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** A human-readable description of the y-low-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yLowName?: string;
    /** A human-readable description of the y-high-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yHighName?: string;
    /** Human-readable description of the y-values. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export interface AgRangeBarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgRangeBarSeriesOptionsKeys<TDatum>, AgRangeBarSeriesOptionsNames, AgRangeBarSeriesThemeableOptions<TDatum, TContext>, Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'> {
    /** Configuration for the Range Bar Series. */
    type: 'range-bar';
}
