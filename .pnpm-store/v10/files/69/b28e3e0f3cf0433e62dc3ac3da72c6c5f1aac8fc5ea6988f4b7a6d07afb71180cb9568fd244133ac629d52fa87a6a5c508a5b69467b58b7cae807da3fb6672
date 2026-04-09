import type { ContextCallbackParams, DatumCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, LabelPlacement, PixelSize } from '../../chart/types';
import type { AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { FillOptions, StrokeOptions } from './commonOptions';
export interface AgBubbleSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgBubbleSeriesOptionsKeys<TDatum>, AgBubbleSeriesOptionsNames, FillOptions, StrokeOptions {
}
export type AgBubbleSeriesLabelFormatterParams<TDatum = DatumDefault> = AgBubbleSeriesOptionsKeys<TDatum> & AgBubbleSeriesOptionsNames;
export interface AgBubbleSeriesLabel<TDatum, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, AgBubbleSeriesLabelFormatterParams<TDatum>, TContext> {
    /**
     * Placement of label in relation to the marker.
     *
     * Default: `top`
     */
    placement?: LabelPlacement;
}
export interface AgBubbleSeriesStyle extends AgSeriesMarkerStyle {
}
export interface AgBubbleSeriesStylerParams<TDatum, TContext> extends AgBubbleSeriesOptionsKeys<TDatum>, SeriesCallbackParams, ContextCallbackParams<TContext>, AgBubbleSeriesStyle {
    /** The largest size a marker can be in pixels. */
    maxSize: PixelSize;
}
export interface AgBubbleSeriesStylerResult extends AgBubbleSeriesStyle {
    /** The largest size a marker can be in pixels. */
    maxSize?: PixelSize;
}
export type BubbleSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgBubbleSeriesOptionsKeys<TDatum> & Required<AgBubbleSeriesStyle>;
export type AgBubbleSeriesItemStylerParams<TDatum, TContext> = BubbleSeriesItemStylerParams<TDatum, TContext>;
export interface AgBubbleSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBubbleSeriesStyle, AgBaseCartesianThemeableOptions<TDatum, TContext> {
    /** Explicitly specifies the extent of the domain for series `sizeKey`. */
    domain?: [number, number];
    /** Determines the smallest size a marker can be in pixels. */
    size?: PixelSize;
    /** Determines the largest size a marker can be in pixels. */
    maxSize?: PixelSize;
    /** Determines the largest number of items that can be rendered at once. If there are more items, they will be aggregated to resemble similar visual appearance. */
    maxRenderedItems?: number;
    /** The title to use for the series. Defaults to `yName` if it exists, or `yKey` if not. */
    title?: string;
    /** Configuration for the labels shown on top of data points. */
    label?: AgBubbleSeriesLabel<TDatum, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgBubbleSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgBubbleSeriesStylerParams<TDatum, TContext>, AgBubbleSeriesStylerResult>;
    /** Function used to return formatting for individual markers, based on the supplied information.*/
    itemStyler?: Styler<AgBubbleSeriesItemStylerParams<TDatum, TContext>, AgBubbleSeriesStyle>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgBubbleSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
    /** The key to use to retrieve size values from the data, used to control the size of the markers. */
    sizeKey: DatumKey<TDatum>;
    /** The key to use to retrieve values from the data to use as labels for the markers. */
    labelKey?: DatumKey<TDatum>;
}
export interface AgBubbleSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** A human-readable description of the size values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    sizeName?: string;
    /** A human-readable description of the label values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    labelName?: string;
    /** The text to display in the legend for this series. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export interface AgBubbleSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgBubbleSeriesThemeableOptions<TDatum, TContext>, AgBubbleSeriesOptionsKeys<TDatum>, AgBubbleSeriesOptionsNames {
    /** Configuration for Bubble Series. */
    type: 'bubble';
}
