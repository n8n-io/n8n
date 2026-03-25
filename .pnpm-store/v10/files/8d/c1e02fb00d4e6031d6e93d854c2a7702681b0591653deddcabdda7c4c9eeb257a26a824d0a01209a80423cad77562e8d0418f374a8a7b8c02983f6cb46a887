import type { Styler } from '../../chart/callbackOptions';
import type { AgSeriesTooltip } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AxisOptions, LineDashOptions, StrokeOptions } from './commonOptions';
import type { AgOhlcSeriesBaseItemStylerParams, AgOhlcSeriesBaseOptions, AgOhlcSeriesBaseTooltipRendererParams } from './ohlcBaseOptions';
export type AgOhlcSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = AgOhlcSeriesBaseItemStylerParams<TDatum, TContext>;
export interface AgOhlcSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgOhlcSeriesBaseTooltipRendererParams<TDatum, TContext>, AgOhlcSeriesBaseOptions<TDatum>, AgOhlcSeriesItemOptions {
}
export type AgOhlcSeriesItemOptions = StrokeOptions & LineDashOptions;
export interface AgOhlcSeriesItem {
    /** Configuration for the rising series items. */
    up?: AgOhlcSeriesItemOptions;
    /** Configuration for the falling series items. */
    down?: AgOhlcSeriesItemOptions;
}
export interface AgOhlcSeriesStyles {
    /** Configuration used for the series items. */
    item?: AgOhlcSeriesItem;
}
export interface AgOhlcSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'showInLegend'>, AgOhlcSeriesStyles {
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgOhlcSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for individual items, based on the given parameters. If the current datum is highlighted, the `highlighted` property will be set to `true`; make sure to check this if you want to differentiate between the highlighted and un-highlighted states. */
    itemStyler?: Styler<AgOhlcSeriesItemStylerParams<TDatum, TContext>, AgOhlcSeriesItemOptions>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgOhlcHighlightStyleOptions, AgOhlcHighlightStyleOptions>;
}
export interface AgOhlcHighlightStyleOptions extends AgOhlcSeriesItemOptions {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: number;
}
export interface AgOhlcSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgOhlcSeriesThemeableOptions<TDatum, TContext>, Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgOhlcSeriesBaseOptions<TDatum>, Omit<AxisOptions<TDatum>, 'yKey'> {
    /** Configuration for the OHLC Series. */
    type: 'ohlc';
}
