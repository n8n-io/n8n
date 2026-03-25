import type { AgGridCommon } from '../../interfaces/iCommon';
import type { IComponent } from '../../interfaces/iComponent';
import { Component } from '../../widgets/component';
export interface IOverlayParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
}
export interface IOverlay<TData = any, TContext = any, TParams extends Readonly<IOverlayParams<TData, TContext>> = IOverlayParams<TData, TContext>> {
    refresh?(params: TParams): void;
}
export interface IOverlayComp<TData = any, TContext = any, TParams extends Readonly<IOverlayParams<TData, TContext>> = IOverlayParams<TData, TContext>> extends IComponent<TParams>, IOverlay<TData, TContext, TParams> {
}
export declare abstract class OverlayComponent<TData = any, TContext = any, TParams extends Readonly<IOverlayParams<TData, TContext>> = IOverlayParams<TData, TContext>> extends Component implements IOverlayComp<TData, TContext, TParams> {
    constructor();
    abstract init(): void;
}
