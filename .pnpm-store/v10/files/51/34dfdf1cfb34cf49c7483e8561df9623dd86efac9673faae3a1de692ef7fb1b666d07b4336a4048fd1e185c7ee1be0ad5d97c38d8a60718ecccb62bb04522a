import type { TextOrSegments } from '../series/cartesian/commonOptions';
import type { ContextDefault, DatumDefault } from './types';
export interface AgChartCallbackParams<TDatum = DatumDefault, TContext = ContextDefault> {
    /** The data point associated with the label. */
    datum: TDatum;
    /** The unique identifier of the item. */
    itemId?: string;
    /** The unique identifier of the series. */
    seriesId: string;
    /** Context for this callback. */
    context?: TContext;
}
export type HighlightState = 'highlighted-item' | 'unhighlighted-item' | 'highlighted-series' | 'unhighlighted-series' | 'none';
export interface DatumCallbackParams<TDatum> {
    /** The data point associated with the label. */
    datum: TDatum;
    /** The unique identifier of the series. */
    seriesId: string;
    /** Indicates whether the element is highlighted. */
    highlighted: boolean;
    /** The specific highlight state of the element. */
    highlightState?: HighlightState;
}
export interface SeriesCallbackParams {
    /** The unique identifier of the series. */
    seriesId: string;
    /** Indicates whether the element is highlighted. */
    highlighted: boolean;
    /** The specific highlight state of the element. */
    highlightState?: HighlightState;
}
export interface ContextCallbackParams<TContext> {
    /** Context for this callback. */
    context?: TContext;
}
export interface DatumItemCallbackParams<ItemType extends string, TDatum> extends DatumCallbackParams<TDatum> {
    /** The unique identifier of the item. */
    itemId: ItemType;
}
export type Formatter<P> = (params: P) => string | undefined;
export type RichFormatter<P> = (params: P) => TextOrSegments | undefined;
export type Styler<P, S> = (params: P) => S | undefined;
export type Renderer<P, R> = (params: P) => string | R;
export type Listener<E> = (event: E) => void;
