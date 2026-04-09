import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgGridCommon } from './iCommon';
import type { FilterAction } from './iFilter';
export interface BaseToolPanelParams<TData = any, TContext = any, TState = any> extends AgGridCommon<TData, TContext> {
    /** The tool-panel-specific initial state as provided in grid options if applicable */
    initialState?: TState;
}
export interface IToolPanelParams<TData = any, TContext = any, TState = any> extends BaseToolPanelParams<TData, TContext, TState> {
    /** If tool panel is saving and restoring state, this should be called after the state is updated */
    onStateUpdated: () => void;
}
export interface IToolPanel<TData = any, TContext = any, TState = any> {
    /**
     * Called when `api.refreshToolPanel()` is called (with the current params).
     * Also called when the `sideBar` grid option is updated (with the updated params).
     * When `sideBar` is updated, if this method returns `true`,
     * then the grid will take no further action.
     * Otherwise, the tool panel will be destroyed and recreated.
     */
    refresh(params: IToolPanelParams<TData, TContext, TState>): boolean | void;
    /** If saving and restoring state, this should return the current state */
    getState?(): TState;
}
export interface IToolPanelComp<TData = any, TContext = any, TState = any> extends IToolPanel<TData, TContext, TState>, IComponent<IToolPanelParams<TData, TContext, TState>> {
}
export interface IToolPanelColumnCompParams {
    /** Suppress Column Move */
    suppressColumnMove: boolean;
    /** Suppress Row Groups section */
    suppressRowGroups: boolean;
    /** Suppress Values section */
    suppressValues: boolean;
    /** Suppress Column Labels (Pivot) section */
    suppressPivots: boolean;
    /** Suppress Pivot Mode selection */
    suppressPivotMode: boolean;
    /** Suppress Column Filter section */
    suppressColumnFilter: boolean;
    /** Suppress Select / Un-select all widget */
    suppressColumnSelectAll: boolean;
    /** Suppress Expand / Collapse all widget */
    suppressColumnExpandAll: boolean;
    /** By default, column groups start expanded. Pass `true` to default to contracted groups */
    contractColumnSelection: boolean;
    /** Suppress updating the layout of columns as they are rearranged in the grid */
    suppressSyncLayoutWithGrid: boolean;
}
export interface IToolPanelFiltersCompParams {
    /** To suppress Expand / Collapse All */
    suppressExpandAll: boolean;
    /** To suppress the Filter Search */
    suppressFilterSearch: boolean;
    /** Suppress updating the layout of columns as they are rearranged in the grid */
    suppressSyncLayoutWithGrid: boolean;
}
export interface IToolPanelNewFiltersCompParams {
    /** Allows global buttons to be provided to the filter tool panel */
    buttons?: FilterAction[];
}
