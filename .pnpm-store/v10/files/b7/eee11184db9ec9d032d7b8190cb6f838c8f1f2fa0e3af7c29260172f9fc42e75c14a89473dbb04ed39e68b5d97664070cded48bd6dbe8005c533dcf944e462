import type { IOverlay, IOverlayComp, IOverlayParams } from './overlayComponent';
import { OverlayComponent } from './overlayComponent';
export interface ILoadingOverlayParams<TData = any, TContext = any> extends IOverlayParams<TData, TContext> {
}
export interface ILoadingOverlay<TData = any, TContext = any> extends IOverlay<TData, TContext, ILoadingOverlayParams> {
}
export interface ILoadingOverlayComp<TData = any, TContext = any> extends IOverlayComp<TData, TContext, ILoadingOverlayParams<TData, TContext>> {
}
export declare class LoadingOverlayComponent extends OverlayComponent<any, any, ILoadingOverlayParams> implements ILoadingOverlayComp<any, any> {
    init(): void;
}
