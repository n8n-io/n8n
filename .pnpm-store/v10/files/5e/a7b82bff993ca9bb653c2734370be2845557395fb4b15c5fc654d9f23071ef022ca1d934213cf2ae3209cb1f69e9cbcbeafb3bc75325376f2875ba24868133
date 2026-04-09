import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, PixelSize } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgCartesianSeriesTooltipRendererParams } from './cartesianSeriesTooltipOptions';
import type { FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export interface AgHistogramSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends Omit<AgCartesianSeriesTooltipRendererParams<AgHistogramBinDatum<TDatum>, TContext>, 'yKey'>, FillOptions, StrokeOptions {
    /** yKey as specified on series options. */
    readonly yKey?: DatumKey<TDatum>;
    /** Range for x values. */
    readonly xRange: [number, number];
    /** Number of values within xRange. */
    readonly frequency: number;
}
export type AgHistogramSeriesLabelFormatterParams<TDatum = DatumDefault> = AgHistogramSeriesOptionsKeys<TDatum> & AgHistogramSeriesOptionsNames;
export interface AgHistogramBinDatum<TDatum> {
    data: TDatum[];
    aggregatedValue: number;
    frequency: number;
    domain: [number, number];
}
export interface AgHistogramSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Apply rounded corners to each bar. */
    cornerRadius?: PixelSize;
}
export interface AgHistogramSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeableOptions<TDatum, TContext>, AgHistogramSeriesStyle {
    /** Configuration for the shadow used behind the chart series. */
    shadow?: AgDropShadowOptions;
    /** Configuration for the labels shown on bars. */
    label?: AgChartLabelOptions<TDatum, AgHistogramSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgHistogramSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
    /**
     * If `true`, the aggregated `yKey` values will be represented using the area of the bar, instead of just the height.
     */
    areaPlot?: boolean;
    /** Set the bin sizes explicitly.
     *
     * __Note:__ `bins` is ignored if `binCount` is also supplied.
     */
    bins?: [number, number][];
    /** The number of bins to try to split the x-axis into.  */
    binCount?: number;
    /** Dictates how the `yKey` values are aggregated within each bin.
     *
     * Default: `sum`
     */
    aggregation?: 'count' | 'sum' | 'mean';
}
export interface AgHistogramSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey?: DatumKey<TDatum>;
}
export interface AgHistogramSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
}
export interface AgHistogramSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgHistogramSeriesOptionsKeys<TDatum>, AgHistogramSeriesOptionsNames, AgHistogramSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for Histogram Series. */
    type: 'histogram';
}
