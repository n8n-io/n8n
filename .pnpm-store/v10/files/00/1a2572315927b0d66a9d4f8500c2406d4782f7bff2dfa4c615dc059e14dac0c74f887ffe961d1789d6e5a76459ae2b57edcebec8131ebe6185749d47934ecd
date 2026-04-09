import type { Styler } from '../../chart/callbackOptions';
import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { FillOptions } from '../cartesian/commonOptions';
import type { AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgBaseRadarSeriesOptions, AgRadarSeriesStyle, AgRadarSeriesStylerParams, AgRadarSeriesThemeableOptions } from './radarOptions';
export interface AgRadarAreaSeriesStyle extends FillOptions, AgRadarSeriesStyle {
}
export interface AgRadarAreaSeriesStylerParams<TDatum = DatumDefault, TContext = ContextDefault> extends AgRadarSeriesStylerParams<TDatum, TContext, AgRadarAreaSeriesStyle> {
}
export interface AgRadarAreaSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends FillOptions, AgRadarSeriesThemeableOptions<TDatum, TContext, AgRadarAreaSeriesStyle, AgRadarAreaSeriesStylerParams<TDatum, TContext>> {
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
    /** Function used to return formatting for entire series, based on the given parameters.*/
    styler?: Styler<AgRadarAreaSeriesStylerParams<TDatum, TContext>, AgRadarAreaSeriesStyle>;
}
export interface AgRadarAreaSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgRadarAreaSeriesThemeableOptions<TDatum, TContext>, Omit<AgBaseRadarSeriesOptions<TDatum, TContext, AgRadarAreaSeriesStyle, AgRadarAreaSeriesStylerParams<TDatum, TContext>>, 'highlight'> {
    /** Configuration for the Radar Area Series. */
    type: 'radar-area';
}
