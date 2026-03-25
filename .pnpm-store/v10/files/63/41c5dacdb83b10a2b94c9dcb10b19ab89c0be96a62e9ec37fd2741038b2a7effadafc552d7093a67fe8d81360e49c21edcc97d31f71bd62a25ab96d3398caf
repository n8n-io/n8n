import type { ContextCallbackParams, DatumCallbackParams } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, Opacity } from '../../chart/types';
import type { LineDashOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgSeriesMarkerOptions, AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgRadialSeriesOptionsKeys, AgRadialSeriesOptionsNames } from './radialOptions';
export interface AgRadarSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends StrokeOptions, LineDashOptions, AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the markers used in the series. */
    marker?: AgSeriesMarkerOptions<TDatum, AgRadialSeriesOptionsKeys<TDatum>, TContext>;
    /** Configuration for the labels shown on top of data points. */
    label?: AgChartLabelOptions<TDatum, AgRadarSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgRadarSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Set to `true` to connect across missing data points. */
    connectMissingData?: boolean;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgRadarLineHighlightStyleOptions>;
}
export interface AgRadarLineHighlightStyleOptions extends StrokeOptions, LineDashOptions {
    /** The opacity of the whole series (line, fill, labels and markers, if any) */
    opacity?: Opacity;
}
export interface AgBaseRadarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgRadialSeriesOptionsKeys<TDatum>, AgRadialSeriesOptionsNames, AgRadarSeriesThemeableOptions<TDatum, TContext> {
    type: 'radar-line' | 'radar-area';
}
export type AgRadarSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> = AgSeriesTooltipRendererParams<TDatum, TContext> & AgRadialSeriesOptionsKeys<TDatum> & AgRadialSeriesOptionsNames & Omit<AgSeriesMarkerStyle, 'shape'>;
export type AgRadarSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgRadialSeriesOptionsKeys<TDatum> & StrokeOptions & LineDashOptions;
export type AgRadarSeriesLabelFormatterParams<TDatum = DatumDefault> = AgRadialSeriesOptionsKeys<TDatum> & AgRadialSeriesOptionsNames;
