import type { AgNumericAxisFormattableLabelOptions } from '../../chart/axisOptions';
import type { ContextCallbackParams, DatumCallbackParams } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, DatumKey, Opacity, PixelSize } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseHighlightStyleOptions, AgBaseSeriesOptions, AgHighlightOptions } from '../seriesOptions';
import type { AgColorType, FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export interface AgConeFunnelSeriesLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
    /** Spacing between label and the associated divider. */
    spacing?: PixelSize;
    /** The placement of the label in relation to the divider between drop-offs. */
    placement?: 'before' | 'middle' | 'after';
}
export interface AgConeFunnelSeriesStageLabelOptions<TContext = ContextDefault> extends AgNumericAxisFormattableLabelOptions<TContext> {
    /** Placement of the label in relation to the chart. */
    placement?: 'before' | 'after';
}
export interface AgConeFunnelSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgConeFunnelSeriesOptionsKeys<TDatum>, Required<AgConeFunnelSeriesStyle> {
}
export interface AgConeFunnelSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgConeFunnelSeriesLabelFormatterParams<TDatum = DatumDefault> extends AgConeFunnelSeriesOptionsKeys<TDatum> {
}
export interface AgConeFunnelSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgConeFunnelSeriesOptionsKeys<TDatum>, AgConeFunnelSeriesOptionsNames, AgSeriesTooltipRendererParams<TDatum, TContext>, AgConeFunnelSeriesStyle {
}
export interface AgConeFunnelSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'showInMiniChart' | 'showInLegend'>, LineDashOptions {
    /** The colours to cycle through for the fills of the drop-offs. */
    fills?: AgColorType[];
    /** The colours to cycle through for the strokes of the drop-offs. */
    strokes?: CssColor[];
    /** The opacity of the fill for the drop-offs. */
    fillOpacity?: Opacity;
    /** The opacity of the stroke for the drop-offs. */
    strokeOpacity?: Opacity;
    /** The width in pixels of the stroke for the drop-offs. */
    strokeWidth?: PixelSize;
    /** Bar rendering direction. */
    direction?: 'horizontal' | 'vertical';
    /** Configuration for the labels shown on between drop-offs. */
    label?: AgConeFunnelSeriesLabelOptions<TDatum, AgConeFunnelSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Configuration for the stage labels. */
    stageLabel?: AgConeFunnelSeriesStageLabelOptions<TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgConeFunnelSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgHighlightOptions<AgBaseHighlightStyleOptions>;
}
export interface AgConeFunnelSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve stage values from the data. */
    stageKey: DatumKey<TDatum>;
    /** The key to use to retrieve values from the data. */
    valueKey: DatumKey<TDatum>;
}
export interface AgConeFunnelSeriesOptionsNames {
}
export interface AgConeFunnelSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight' | 'showInLegend'>, AgConeFunnelSeriesOptionsKeys<TDatum>, AgConeFunnelSeriesOptionsNames, AgConeFunnelSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Cone Funnel Series. */
    type: 'cone-funnel';
}
