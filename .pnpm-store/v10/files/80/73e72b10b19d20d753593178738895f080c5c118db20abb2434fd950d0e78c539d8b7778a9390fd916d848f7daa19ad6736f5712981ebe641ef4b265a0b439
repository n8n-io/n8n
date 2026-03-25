import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, PixelSize, Ratio } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
interface BoxPlotOptionsKeys<TDatum = DatumDefault> {
    /** The key used to retrieve x-values (categories) from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve minimum values from the data. */
    minKey: DatumKey<TDatum>;
    /** The key to use to retrieve lower quartile values from the data. */
    q1Key: DatumKey<TDatum>;
    /** The key to use to retrieve median values from the data. */
    medianKey: DatumKey<TDatum>;
    /** The key to use to retrieve upper quartile values from the data. */
    q3Key: DatumKey<TDatum>;
    /** The key to use to retrieve maximum values from the data. */
    maxKey: DatumKey<TDatum>;
}
interface BoxPlotOptionsNames {
    /** A descriptive label for x-values. */
    xName?: string;
    /** A descriptive label for y-values. */
    yName?: string;
    /** A human-readable description of minimum values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    minName?: string;
    /** A human-readable description of lower quartile values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    q1Name?: string;
    /** A human-readable description of median values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    medianName?: string;
    /** A human-readable description of upper quartile values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    q3Name?: string;
    /** A human-readable description of maximum values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    maxName?: string;
}
export interface AgBoxPlotCapOptions {
    lengthRatio?: Ratio;
}
export type AgBoxPlotWhiskerOptions = StrokeOptions & LineDashOptions;
export type AgBoxPlotSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & BoxPlotOptionsKeys<TDatum> & Required<AgBoxPlotSeriesStyle>;
export interface AgBoxPlotSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends BoxPlotOptionsKeys<TDatum>, BoxPlotOptionsNames, AgSeriesTooltipRendererParams<TDatum, TContext>, AgBoxPlotSeriesStyle {
}
export interface AgBoxPlotSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Apply rounded corners to each bar. */
    cornerRadius?: PixelSize;
    /** Options to style chart's caps */
    cap?: AgBoxPlotCapOptions;
    /** Options to style chart's whiskers */
    whisker?: AgBoxPlotWhiskerOptions;
}
export interface AgBoxPlotSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeableOptions<TDatum, TContext>, AgBoxPlotSeriesStyle {
    /**
     * Bar rendering direction.
     *
     * __Note:__ This option affects the layout direction of X and Y data values.
     */
    direction?: 'horizontal' | 'vertical';
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgBoxPlotSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for individual columns, based on the given parameters. If the current column is highlighted, the `highlighted` property will be set to `true`; make sure to check this if you want to differentiate between the highlighted and un-highlighted states. */
    itemStyler?: Styler<AgBoxPlotSeriesItemStylerParams<TDatum, TContext>, AgBoxPlotSeriesStyle>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgBoxPlotHighlightStyleOptions, AgBoxPlotHighlightStyleOptions>;
}
export interface AgBoxPlotHighlightStyleOptions extends AgBoxPlotSeriesStyle {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: number;
}
export interface AgBoxPlotSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBoxPlotSeriesThemeableOptions<TDatum, TContext>, Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, BoxPlotOptionsKeys<TDatum>, BoxPlotOptionsNames {
    /** Configuration for the Box Plot Series. */
    type: 'box-plot';
    /** Whether to group together (adjacently) separate columns. */
    grouped?: boolean;
    /** Human-readable description of the y-values. If supplied, matching items with the same value will be toggled together. */
    legendItemName?: string;
}
export {};
