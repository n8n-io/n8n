import type { ContextCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgErrorBarOptions, AgErrorBarThemeableOptions } from '../../chart/errorBarOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, Opacity } from '../../chart/types';
import type { AgInterpolationType } from '../interpolationOptions';
import type { AgSeriesMarkerOptions, AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions, AgSeriesLineSegmentOptions, AgSeriesSegmentation } from '../seriesOptions';
import type { AgCartesianSeriesTooltipRendererParams, AgErrorBoundSeriesTooltipRendererParams } from './cartesianSeriesTooltipOptions';
import type { LineDashOptions, StrokeOptions } from './commonOptions';
export interface AgLineSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgCartesianSeriesTooltipRendererParams<TDatum, TContext>, AgErrorBoundSeriesTooltipRendererParams<TDatum>, AgSeriesMarkerStyle {
}
export type AgLineSeriesLabelFormatterParams<TDatum = DatumDefault> = AgLineSeriesOptionsKeys<TDatum> & AgLineSeriesOptionsNames;
export interface AgLineSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends StrokeOptions, LineDashOptions, Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'highlight'> {
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgLineSeriesStylerParams<TDatum, TContext>, AgLineSeriesStylerResult>;
    /** Configuration for the markers used in the series. */
    marker?: AgSeriesMarkerOptions<TDatum, AgLineSeriesMarkerItemStylerParams<TDatum, TContext>, TContext>;
    /** Configuration for the line used in the series. */
    interpolation?: AgInterpolationType;
    /** The title to use for the series. Defaults to `yName` if it exists, or `yKey` if not. */
    title?: string;
    /** Configuration for the labels shown on top of data points. */
    label?: AgChartLabelOptions<TDatum, AgLineSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgLineSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarThemeableOptions;
    /** Set to `true` to connect across missing data points. */
    connectMissingData?: boolean;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgLineHighlightStyleOptions>;
    /** Configuration for styling series as separate segments. */
    segmentation?: AgSeriesSegmentation<AgSeriesLineSegmentOptions>;
}
export interface AgLineHighlightStyleOptions extends StrokeOptions, LineDashOptions {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
}
export interface AgLineSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
}
export interface AgLineSeriesStylerParams<TDatum, TContext> extends AgLineSeriesOptionsKeys<TDatum>, SeriesCallbackParams, ContextCallbackParams<TContext>, Required<StrokeOptions>, Required<LineDashOptions> {
    /** Current series styling options on markers. */
    marker?: AgSeriesMarkerStyle;
}
export interface AgLineSeriesStylerResult extends StrokeOptions, LineDashOptions {
    /** Marker styling options. */
    marker?: AgSeriesMarkerStyle;
}
export interface AgLineSeriesMarkerItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgLineSeriesOptionsKeys<TDatum>, ContextCallbackParams<TContext>, Required<AgSeriesMarkerStyle> {
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
export interface AgLineSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** Human-readable description of the y-values. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export interface AgLineSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgLineSeriesOptionsKeys<TDatum>, AgLineSeriesOptionsNames, AgLineSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Line Series. */
    type: 'line';
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarOptions<TDatum, TContext>;
    /** The number to normalise the line stacks to. For example, if `normalizedTo` is set to `100`, the stacks will all be scaled proportionally so that their total height is always 100. */
    normalizedTo?: number;
    /** An option indicating if the lines should be stacked. */
    stacked?: boolean;
    /** An ID to be used to group stacked items. */
    stackGroup?: string;
}
