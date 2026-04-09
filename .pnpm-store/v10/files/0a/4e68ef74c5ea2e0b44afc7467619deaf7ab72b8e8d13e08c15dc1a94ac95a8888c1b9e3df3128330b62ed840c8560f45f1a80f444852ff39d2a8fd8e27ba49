import type { IComponent } from '../agStack/interfaces/iComponent';
import type { ICellRendererParams } from '../rendering/cellRenderers/iCellRenderer';
export interface ILoadingCellRendererParams<TData = any, TValue = any, TContext = any> extends ICellRendererParams<TData, TValue, TContext> {
    /**
     * `true` if the loading cell renderer is being displayed in place of a slow cell renderer via `cellRendererParams.deferRender`.
     */
    deferRender?: boolean;
}
export interface ILoadingCellRenderer {
}
export interface ILoadingCellRendererComp extends ILoadingCellRenderer, IComponent<ILoadingCellRendererParams> {
}
