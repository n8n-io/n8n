import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgGridCommon } from './iCommon';
export interface StatusPanelDef {
    statusPanel?: any;
    align?: string;
    key?: string;
    statusPanelParams?: any;
}
export interface IStatusPanelValueFormatterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    value: number | null;
    totalRows: number;
    key: string;
}
export interface IProvidedStatusPanelParams {
    valueFormatter?: (params: IStatusPanelValueFormatterParams) => string;
}
export interface IStatusPanelParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    key: string;
}
export type AggregationStatusPanelAggFunc = 'count' | 'sum' | 'min' | 'max' | 'avg';
export interface IAggregationStatusPanelParams extends IProvidedStatusPanelParams {
    aggFuncs: AggregationStatusPanelAggFunc[];
}
export interface AggregationStatusPanelParams<TData = any, TContext = any> extends IAggregationStatusPanelParams, IStatusPanelParams<TData, TContext> {
    aggFuncs: AggregationStatusPanelAggFunc[];
}
export interface IStatusPanel<TData = any, TContext = any> {
    /**
     * Called when the `statusBar` grid option is updated.
     * If this method returns `true`,
     * the grid assumes that the status panel has updated with the latest params,
     * and takes no further action.
     * If this method returns `false`, or is not implemented,
     * the grid will destroy and recreate the status panel.
     */
    refresh?(params: IStatusPanelParams<TData, TContext>): boolean;
}
export interface IStatusPanelComp<TData = any, TContext = any> extends IStatusPanel<TData, TContext>, IComponent<IStatusPanelParams<TData, TContext>> {
}
