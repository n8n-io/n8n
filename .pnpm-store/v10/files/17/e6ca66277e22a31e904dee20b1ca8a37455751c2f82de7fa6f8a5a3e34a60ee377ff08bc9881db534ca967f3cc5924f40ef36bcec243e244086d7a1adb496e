import type { AgBaseThemeableChartOptions } from '../../chart/chartOptions';
import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { AgChordSeriesOptions } from './chordOptions';
import type { AgPyramidSeriesOptions } from './pyramidOptions';
import type { AgSankeySeriesOptions } from './sankeyOptions';
import type { AgSunburstSeriesOptions } from './sunburstOptions';
import type { AgTreemapSeriesOptions } from './treemapOptions';
export type AgStandaloneSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgPyramidSeriesOptions<TDatum, TContext> | AgTreemapSeriesOptions<TDatum, TContext> | AgSunburstSeriesOptions<TDatum, TContext> | AgSankeySeriesOptions<TDatum, TContext> | AgChordSeriesOptions<TDatum, TContext>;
export interface AgBaseStandaloneChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Series configurations. */
    series?: AgStandaloneSeriesOptions<TDatum, TContext>[];
}
export interface AgBaseStandaloneThemeOptions<TDatum = ContextDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
}
