import type { AgBaseThemeableChartOptions } from '../../chart/chartOptions';
import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { AgChordSeriesOptions } from './chordOptions';
import type { AgSankeySeriesOptions } from './sankeyOptions';
export type AgFlowProportionSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgSankeySeriesOptions<TDatum, TContext> | AgChordSeriesOptions<TDatum, TContext>;
export interface AgBaseFlowProportionChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Series configurations. */
    series?: AgFlowProportionSeriesOptions<TDatum, TContext>[];
}
export interface AgBaseFlowProportionThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
}
