import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { FillOptions } from '../cartesian/commonOptions';
import type { AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
import type { AgBaseRadarSeriesOptions, AgRadarSeriesThemeableOptions } from './radarOptions';
export interface AgRadarAreaSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends FillOptions, AgRadarSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgRadarAreaSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgRadarAreaSeriesThemeableOptions<TDatum, TContext>, Omit<AgBaseRadarSeriesOptions<TDatum, TContext>, 'highlight'> {
    /** Configuration for the Radar Area Series. */
    type: 'radar-area';
}
