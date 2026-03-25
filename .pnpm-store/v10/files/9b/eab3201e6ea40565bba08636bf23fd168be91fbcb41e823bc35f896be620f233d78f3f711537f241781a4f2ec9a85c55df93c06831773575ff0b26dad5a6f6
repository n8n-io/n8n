import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartAutoSizedSecondaryLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, PixelSize, TextAlign, VerticalAlign } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions } from '../seriesOptions';
import type { FillOptions, StrokeOptions } from './commonOptions';
export type AgHeatmapSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgHeatmapSeriesOptionsKeys<TDatum> & Required<AgHeatmapSeriesStyle>;
export type AgHeatmapSeriesStyle = FillOptions & StrokeOptions;
export type AgHeatmapSeriesLabelFormatterParams<TDatum = DatumDefault> = AgHeatmapSeriesOptionsKeys<TDatum> & AgHeatmapSeriesOptionsNames;
export type AgHeatmapSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> = AgSeriesTooltipRendererParams<TDatum, TContext> & AgHeatmapSeriesOptionsKeys<TDatum> & AgHeatmapSeriesOptionsNames & AgHeatmapSeriesStyle;
export interface AgHeatmapSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends StrokeOptions, Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'showInLegend'> {
    /** Options for the label in each cell. */
    label?: AgChartAutoSizedSecondaryLabelOptions<TDatum, AgHeatmapSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Minimum distance between the label text and the edges of the cell. */
    itemPadding?: PixelSize;
    /** Horizontal position of the label. */
    textAlign?: TextAlign;
    /** Vertical position of the label. */
    verticalAlign?: VerticalAlign;
    /** The title to use for the series. Defaults to `yName` if it exists, or `yKey` if not. */
    title?: string;
    /** Function used to return formatting for individual heatmap cells, based on the given parameters. If the current cell is highlighted, the `highlighted` property will be set to `true`; make sure to check this if you want to differentiate between the highlighted and un-highlighted states. */
    itemStyler?: Styler<AgHeatmapSeriesItemStylerParams<TDatum, TContext>, AgHeatmapSeriesStyle>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgHeatmapSeriesTooltipRendererParams<TDatum, TContext>>;
}
export interface AgHeatmapSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey: DatumKey<TDatum>;
    /** The name of the node key containing the colour value. This value (along with `colorRange` configs) will be used to determine the cell colour. */
    colorKey?: DatumKey<TDatum>;
}
export interface AgHeatmapSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
    /** A human-readable description of the colour values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    colorName?: string;
}
export interface AgHeatmapSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'showInLegend'>, AgHeatmapSeriesOptionsKeys<TDatum>, AgHeatmapSeriesOptionsNames, AgHeatmapSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Heatmap Series. */
    type: 'heatmap';
    /** The colour range to interpolate the numeric colour domain (min and max `colorKey` values) into. For example, if the colour domain is `[-5, 5]` and `colorRange` is `['red', 'green']`, a `colorKey` value of `-5` will be assigned the 'red' colour, `5` - 'green' colour and `0` a blend of 'red' and 'green'. */
    colorRange?: string[];
}
