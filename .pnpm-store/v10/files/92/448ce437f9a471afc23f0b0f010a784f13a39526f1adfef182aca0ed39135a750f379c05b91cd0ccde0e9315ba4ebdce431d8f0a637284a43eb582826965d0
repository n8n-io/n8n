import type { ContextCallbackParams, DatumCallbackParams, SeriesCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, Opacity } from '../../chart/types';
import type { LineDashOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgSeriesMarkerOptions, AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgRadialSeriesOptionsKeys, AgRadialSeriesOptionsNames } from './radialOptions';
export interface AgRadarSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault, TStyle extends AgRadarSeriesStyle = AgRadarSeriesStyle, TStylerParams extends AgRadarSeriesStylerParams<TDatum, TContext, TStyle> = AgRadarSeriesStylerParams<TDatum, TContext, TStyle>> extends StrokeOptions, LineDashOptions, AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the markers used in the series. */
    marker?: AgSeriesMarkerOptions<TDatum, AgRadialSeriesOptionsKeys<TDatum>, TContext>;
    /** Configuration for the labels shown on top of data points. */
    label?: AgChartLabelOptions<TDatum, AgRadarSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgRadarSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Set to `true` to connect across missing data points. */
    connectMissingData?: boolean;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<TStylerParams, TStyle>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgRadarHighlightStyleOptions<TStyle>>;
}
export type AgRadarHighlightStyleOptions<TStyle extends AgRadarSeriesStyle> = Omit<TStyle, 'marker'> & {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
};
export interface AgBaseRadarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault, TStyle extends AgRadarSeriesStyle = AgRadarSeriesStyle, TStylerParams extends AgRadarSeriesStylerParams<TDatum, TContext, TStyle> = AgRadarSeriesStylerParams<TDatum, TContext, TStyle>> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgRadialSeriesOptionsKeys<TDatum>, AgRadialSeriesOptionsNames, AgRadarSeriesThemeableOptions<TDatum, TContext, TStyle, TStylerParams> {
    type: 'radar-line' | 'radar-area';
}
export type AgRadarSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> = AgSeriesTooltipRendererParams<TDatum, TContext> & AgRadialSeriesOptionsKeys<TDatum> & AgRadialSeriesOptionsNames & Omit<AgSeriesMarkerStyle, 'shape'>;
export type AgRadarSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgRadialSeriesOptionsKeys<TDatum> & StrokeOptions & LineDashOptions;
export type AgRadarSeriesStylerParams<TDatum, TContext, TStyle extends AgRadarSeriesStyle> = SeriesCallbackParams & ContextCallbackParams<TContext> & AgRadialSeriesOptionsKeys<TDatum> & Required<TStyle>;
export interface AgRadarSeriesStyle extends StrokeOptions, LineDashOptions {
    /** Configuration for the markers used in the series. */
    marker?: AgSeriesMarkerStyle;
}
export type AgRadarSeriesLabelFormatterParams<TDatum = DatumDefault> = AgRadialSeriesOptionsKeys<TDatum> & AgRadialSeriesOptionsNames;
