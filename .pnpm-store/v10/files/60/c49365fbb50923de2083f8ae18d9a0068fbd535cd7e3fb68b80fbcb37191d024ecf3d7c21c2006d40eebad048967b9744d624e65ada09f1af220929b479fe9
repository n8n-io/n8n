import type { ContextCallbackParams, DatumCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgErrorBarOptions, AgErrorBarThemeableOptions } from '../../chart/errorBarOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, LabelPlacement } from '../../chart/types';
import type { AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgErrorBoundSeriesTooltipRendererParams } from './cartesianSeriesTooltipOptions';
import type { FillOptions, StrokeOptions } from './commonOptions';
export interface AgScatterSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgScatterSeriesOptionsKeys<TDatum>, AgScatterSeriesOptionsNames, AgErrorBoundSeriesTooltipRendererParams<TDatum>, FillOptions, StrokeOptions {
}
export type AgScatterSeriesLabelFormatterParams<TDatum = DatumDefault> = AgScatterSeriesOptionsKeys<TDatum> & AgScatterSeriesOptionsNames;
export interface AgScatterSeriesStylerParams<TDatum, TContext> extends AgScatterSeriesOptionsKeys<TDatum>, SeriesCallbackParams, ContextCallbackParams<TContext>, AgSeriesMarkerStyle {
}
export interface AgScatterSeriesStylerResult extends AgSeriesMarkerStyle {
}
export type AgScatterSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgScatterSeriesOptionsKeys<TDatum> & Required<AgSeriesMarkerStyle>;
export interface AgScatterSeriesLabel<TDatum, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, AgScatterSeriesLabelFormatterParams<TDatum>, TContext> {
    /**
     * Placement of label in relation to the marker.
     *
     * Default: `top`
     */
    placement?: LabelPlacement;
}
export interface AgScatterSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeableOptions<TDatum, TContext>, AgSeriesMarkerStyle {
    /** Determines the largest number of items that can be rendered at once. If there are more items, they will be aggregated to resemble similar visual appearance. */
    maxRenderedItems?: number;
    /** The title to use for the series. Defaults to `yName` if it exists, or `yKey` if not. */
    title?: string;
    /** Configuration for the labels shown on top of data points. */
    label?: AgScatterSeriesLabel<TDatum, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgScatterSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgScatterSeriesStylerParams<TDatum, TContext>, AgScatterSeriesStylerResult>;
    /** Function used to return formatting for individual markers, based on the supplied information.*/
    itemStyler?: Styler<AgScatterSeriesItemStylerParams<TDatum, TContext>, AgSeriesMarkerStyle>;
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarThemeableOptions;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgScatterSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
    /** The key to use to retrieve values from the data to use as labels for the markers. */
    labelKey?: DatumKey<TDatum>;
}
export interface AgScatterSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** A human-readable description of the label values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    labelName?: string;
    /** The text to display in the legend for this series. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export interface AgScatterSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgScatterSeriesOptionsKeys<TDatum>, AgScatterSeriesOptionsNames, AgScatterSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Scatter Series. */
    type: 'scatter';
    /** Configuration for the Error Bars. */
    errorBar?: AgErrorBarOptions<TDatum, TContext>;
}
