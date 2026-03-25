import type { AgBaseThemeableChartOptions } from '../../chart/chartOptions';
import type { ContextDefault, DatumDefault, GeoJSON } from '../../chart/types';
import type { AgMapLineBackgroundOptions } from './mapLineBackgroundOptions';
import type { AgMapLineSeriesOptions } from './mapLineOptions';
import type { AgMapMarkerSeriesOptions } from './mapMarkerOptions';
import type { AgMapShapeBackgroundOptions } from './mapShapeBackgroundOptions';
import type { AgMapShapeSeriesOptions } from './mapShapeOptions';
export type AgTopologySeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgMapShapeSeriesOptions<TDatum, TContext> | AgMapLineSeriesOptions<TDatum, TContext> | AgMapMarkerSeriesOptions<TDatum, TContext> | AgMapShapeBackgroundOptions | AgMapLineBackgroundOptions;
export interface AgBaseTopologyChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Series configurations. */
    series?: AgTopologySeriesOptions<TDatum, TContext>[];
    /** Topology to use in all series. */
    topology?: GeoJSON;
}
export interface AgBaseTopologyThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
}
