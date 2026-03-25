import type { AgBaseThemeableChartOptions } from '../../chart/chartOptions';
import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { AgSunburstSeriesOptions } from './sunburstOptions';
import type { AgTreemapSeriesOptions } from './treemapOptions';
export type AgHierarchySeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgTreemapSeriesOptions<TDatum, TContext> | AgSunburstSeriesOptions<TDatum, TContext>;
export interface AgBaseHierarchyChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Series configurations. */
    series?: AgHierarchySeriesOptions<TDatum, TContext>[];
}
export interface AgBaseHierarchyThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
}
