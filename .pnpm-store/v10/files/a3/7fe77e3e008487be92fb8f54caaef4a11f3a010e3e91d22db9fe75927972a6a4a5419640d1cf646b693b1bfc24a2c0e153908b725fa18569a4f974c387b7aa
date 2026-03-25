import type { ContextCallbackParams, DatumItemCallbackParams } from '../../chart/callbackOptions';
import type { AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey } from '../../chart/types';
import type { LineDashOptions, StrokeOptions } from './commonOptions';
export type AgOhlcSeriesItemType = 'up' | 'down';
export type AgOhlcSeriesBaseOptions<TDatum = DatumDefault> = AgOhlcSeriesOptionsKeys<TDatum> & AgOhlcSeriesOptionsNames;
export interface AgOhlcSeriesOptionsKeys<TDatum = DatumDefault> {
    /** xKey as specified on series options. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve open values from the data. */
    openKey: DatumKey<TDatum>;
    /** The key to use to retrieve close values from the data. */
    closeKey: DatumKey<TDatum>;
    /** The key to use to retrieve high values from the data. */
    highKey: DatumKey<TDatum>;
    /** The key to use to retrieve low values from the data. */
    lowKey: DatumKey<TDatum>;
}
export interface AgOhlcSeriesOptionsNames {
    /** xName as specified on series options. */
    xName?: string;
    /** yName as specified on series options. */
    yName?: string;
    /** A human-readable description of open values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    openName?: string;
    /** A human-readable description of close values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    closeName?: string;
    /** A human-readable description of high values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    highName?: string;
    /** A human-readable description of low values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    lowName?: string;
}
type OhlcItemCallbackParams<TDatum = DatumDefault> = DatumItemCallbackParams<AgOhlcSeriesItemType, TDatum>;
export type AgOhlcSeriesBaseItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = OhlcItemCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgOhlcSeriesOptionsKeys<TDatum> & StrokeOptions & LineDashOptions;
export interface AgOhlcSeriesBaseTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgOhlcSeriesOptionsKeys<TDatum>, AgOhlcSeriesOptionsNames, StrokeOptions, LineDashOptions {
    /** Direction of the datum */
    itemId: 'up' | 'down';
}
export {};
