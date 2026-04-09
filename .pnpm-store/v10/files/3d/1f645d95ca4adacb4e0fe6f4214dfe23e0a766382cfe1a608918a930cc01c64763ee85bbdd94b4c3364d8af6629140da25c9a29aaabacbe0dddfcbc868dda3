import type { AgSeriesListeners } from '../chart/eventOptions';
import type { AxisValue, ContextDefault, DatumDefault, InteractionRange, Opacity, PixelSize } from '../chart/types';
import type { FillOptions, LineDashOptions, StrokeOptions } from './cartesian/commonOptions';
export type AgSeriesHighlightMarkerStyle = FillOptions & StrokeOptions;
export interface AgSeriesHighlightSeriesStyle {
    enabled?: boolean;
    /** The opacity of the whole series (area line, area fill, labels and markers, if any) when another chart series or another stack level in the same area series is highlighted by hovering a data point or a legend item. Use `undefined` or `1` for no dimming. */
    dimOpacity?: Opacity;
    /** The stroke width of the area line when one of the markers is tapped or hovered over, or when a tooltip is shown for a data point, even when series markers are disabled. Use `undefined` for no highlight. */
    strokeWidth?: PixelSize;
}
export interface AgSeriesHighlightStyle {
    /** Highlight style used for an individual item within a series. */
    item?: AgSeriesHighlightMarkerStyle;
    /** Highlight style used for whole series when a series or legend item is hovered. */
    series?: AgSeriesHighlightSeriesStyle;
}
export interface AgMultiSeriesHighlightOptions<ItemHighlightStyleOptions, SeriesHighlightStyleOptions = ItemHighlightStyleOptions> extends AgHighlightOptions<ItemHighlightStyleOptions> {
    /** Options for the highlighted series. */
    highlightedSeries?: SeriesHighlightStyleOptions;
    /** Options for the un-highlighted series when there is an active highlight. */
    unhighlightedSeries?: SeriesHighlightStyleOptions;
    /** Show this series in front when highlighted.
     *
     * Default: `false`
     */
    bringToFront?: boolean;
}
export interface AgHighlightOptions<ItemHighlightStyleOptions = AgHighlightStyleOptions> {
    /** Set to `false` to disable highlighting. */
    enabled?: boolean;
    /** Options for the highlighted item.  */
    highlightedItem?: ItemHighlightStyleOptions;
    /** Options for the un-highlighted items when there is an active highlight. */
    unhighlightedItem?: ItemHighlightStyleOptions;
}
export interface AgHighlightStyleOptions extends AgBaseHighlightStyleOptions, FillOptions {
}
export interface AgBaseHighlightStyleOptions extends StrokeOptions, LineDashOptions {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
}
export interface AgBaseSeriesThemeableOptions<TDatum, TContext = ContextDefault> {
    /** The cursor to use for hovered markers. This config is identical to the CSS `cursor` property. */
    cursor?: string;
    /** Context object to use in callbacks. */
    context?: TContext;
    /** @deprecated Configuration for highlighting when a series or legend item is hovered over. */
    highlightStyle?: AgSeriesHighlightStyle;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgHighlightOptions<AgHighlightStyleOptions>;
    /** Range from a node that a click triggers the listener. */
    nodeClickRange?: InteractionRange;
    /** Whether to include the series in the legend. */
    showInLegend?: boolean;
    /** A map of event names to event listeners. */
    listeners?: AgSeriesListeners<TDatum, TContext>;
}
export interface AgBaseCartesianThemeableOptions<TDatum, TContext = ContextDefault> extends AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /** Whether to include the series in the Mini Chart. */
    showInMiniChart?: boolean;
}
export interface AgSeriesSegmentation<SegmentOptions = AgSeriesShapeSegmentOptions> {
    enabled?: boolean;
    key: 'x' | 'y';
    segments: SegmentOptions[];
}
export interface AgSeriesLineSegmentOptions extends StrokeOptions, LineDashOptions {
    /** The axis value at which the styles should start. This is the start of the axis domain by default. */
    start?: AxisValue;
    /** The axis value at which the styles should stop. This is the end of the axis domain by default. */
    stop?: AxisValue;
}
export interface AgSeriesShapeSegmentOptions extends AgSeriesLineSegmentOptions, FillOptions {
}
export interface AgBaseSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /**
     * Primary identifier for the series. This is provided as `seriesId` in user callbacks to differentiate multiple series. Auto-generated ids are subject to future change without warning, if your callbacks need to vary behaviour by series please supply your own unique `id` value.
     *
     * Default: `auto-generated value`
     */
    id?: string;
    /** Context object to use in callbacks. */
    context?: TContext;
    /** The data to use when rendering the series. If this is not supplied, data must be set on the chart instead. */
    data?: TDatum[];
    /** Whether to display the series. */
    visible?: boolean;
}
