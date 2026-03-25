import type { ContextDefault, DatumDefault } from '../../chart/types';
import type { AgBaseSeriesOptions } from '../seriesOptions';
import type { AgBaseRadialSeriesThemeableOptions, AgRadialSeriesOptionsKeys, AgRadialSeriesOptionsNames } from './radialOptions';
export type AgRadialBarSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgBaseRadialSeriesThemeableOptions<TDatum, TContext>;
export interface AgRadialBarSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgRadialSeriesOptionsKeys<TDatum>, AgRadialSeriesOptionsNames, AgBaseRadialSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for Radial Bar Series. */
    type: 'radial-bar';
    /** The number to normalise the bar stacks to. Has no effect unless series are stacked. */
    normalizedTo?: number;
    /** Whether to group together (adjacently) separate sectors. */
    grouped?: boolean;
    /** An option indicating if the sectors should be stacked. */
    stacked?: boolean;
    /** An ID to be used to group stacked items. */
    stackGroup?: string;
}
