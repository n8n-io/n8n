import type { ContextDefault, DatumDefault } from './types';
export interface AgDataSourceOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Asynchronous callback to load data into the chart. */
    getData: (params: AgDataSourceCallbackParams<TContext>) => Promise<TDatum[]>;
}
export interface AgDataSourceCallbackParams<TContext = ContextDefault> {
    /** The start of the visible window, if a time axis is available. */
    windowStart?: Date;
    /** The end of the visible window, if a time axis is available. */
    windowEnd?: Date;
    /** Chart context object. */
    context?: TContext;
}
