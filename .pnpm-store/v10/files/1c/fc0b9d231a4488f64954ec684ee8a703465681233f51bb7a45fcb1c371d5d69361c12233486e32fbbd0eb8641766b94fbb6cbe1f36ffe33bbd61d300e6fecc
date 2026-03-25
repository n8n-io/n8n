import type { AgNumericAxisFormattableLabelOptions } from '../../chart/axisOptions';
import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, DatumKey, Opacity, PixelSize, Ratio } from '../../chart/types';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions } from '../seriesOptions';
import type { AgColorType, FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export interface AgFunnelSeriesLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
}
export interface AgFunnelSeriesStageLabelOptions<TContext> extends AgNumericAxisFormattableLabelOptions<TContext> {
    /** Placement of the label in relation to the chart. */
    placement?: 'before' | 'after';
}
export interface AgFunnelSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgFunnelSeriesOptionsKeys<TDatum>, Required<AgFunnelSeriesStyle> {
}
export interface AgFunnelSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgFunnelSeriesLabelFormatterParams<TDatum = DatumDefault> extends AgFunnelSeriesOptionsKeys<TDatum> {
}
export interface AgFunnelSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgFunnelSeriesOptionsKeys<TDatum>, AgFunnelSeriesOptionsNames, AgSeriesTooltipRendererParams<TDatum, TContext>, AgFunnelSeriesStyle {
}
export interface AgFunnelSeriesDropOff extends FillOptions, StrokeOptions, LineDashOptions {
    /** Whether to draw drop-offs between adjacent bars. */
    enabled?: boolean;
}
export interface AgFunnelSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseCartesianThemeableOptions<TDatum, TContext>, 'showInLegend' | 'showInMiniChart'>, LineDashOptions {
    /** The colours to cycle through for the fills of the bars. */
    fills?: AgColorType[];
    /** The colours to cycle through for the strokes of the bars. */
    strokes?: CssColor[];
    /** The opacity of the fill for the bars. */
    fillOpacity?: Opacity;
    /** The opacity of the stroke for the bars. */
    strokeOpacity?: Opacity;
    /** The width in pixels of the stroke for the bars. */
    strokeWidth?: PixelSize;
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a bar and the start of the next bar. */
    spacingRatio?: Ratio;
    /** Configuration for drop-offs between adjacent bars. */
    dropOff?: AgFunnelSeriesDropOff;
    /** Bar rendering direction. */
    direction?: 'horizontal' | 'vertical';
    /** Align bars to whole pixel values to remove anti-aliasing. */
    crisp?: boolean;
    /** Configuration for the labels shown on bars. */
    label?: AgFunnelSeriesLabelOptions<TDatum, AgFunnelSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Configuration for the stage labels. */
    stageLabel?: AgFunnelSeriesStageLabelOptions<TContext>;
    /** Configuration for the shadow used behind the series items. */
    shadow?: AgDropShadowOptions;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgFunnelSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Function used to return formatting for individual bars, based on the given parameters. If the current bar is highlighted, the `highlighted` property will be set to `true`; make sure to check this if you want to differentiate between the highlighted and un-highlighted states. */
    itemStyler?: Styler<AgFunnelSeriesItemStylerParams<TDatum, TContext>, AgFunnelSeriesStyle>;
}
export interface AgFunnelSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve stage values from the data. */
    stageKey: DatumKey<TDatum>;
    /** The key to use to retrieve values from the data. */
    valueKey: DatumKey<TDatum>;
}
export interface AgFunnelSeriesOptionsNames {
}
export interface AgFunnelSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'showInLegend'>, AgFunnelSeriesOptionsKeys<TDatum>, AgFunnelSeriesOptionsNames, AgFunnelSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Funnel Series. */
    type: 'funnel';
}
