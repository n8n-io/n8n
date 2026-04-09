import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgPromise } from '../agStack/utils/promise';
import type { ColDef, ColKey } from '../entities/colDef';
import type { IFloatingFilterComp } from '../filter/floating/floatingFilter';
import type { Column } from '../interfaces/iColumn';
import type { IAfterGuiAttachedParams } from './iAfterGuiAttachedParams';
import type { AgGridCommon } from './iCommon';
import type { IRowModel } from './iRowModel';
import type { IRowNode } from './iRowNode';
export type IFilterType = string | {
    new (): IFilterComp;
} | boolean;
export type IFloatingFilterType = string | {
    new (): IFloatingFilterComp;
};
export interface DoesFilterPassParams<TData = any, TContext = any, TModel = any, TCustomParams = any> extends IDoesFilterPassParams<TData> {
    model: TModel;
    /**
     * Utility params that would be passed to the handler, including `getValue` which provides access to the cell values.
     */
    handlerParams: FilterHandlerBaseParams<TData, TContext, TModel, TCustomParams>;
}
export interface FilterHandlerBaseParams<TData = any, TContext = any, TModel = any, TCustomParams = any> extends SharedFilterParams<TData, TContext> {
    filterParams: TCustomParams;
    onModelChange: (model: TModel | null, additionalEventAttributes?: any) => void;
}
export type FilterHandlerSource = 'init' | 'ui' | 'api' | 'colDef' | 'floating' | 'handler';
export interface FilterHandlerParams<TData = any, TContext = any, TModel = any, TCustomParams = any> extends FilterHandlerBaseParams<TData, TContext, TModel, TCustomParams> {
    model: TModel | null;
    source: FilterHandlerSource;
    /**
     * If this refresh was as a result of the filter triggering an update
     * with additional event attributes, these will be set here
     */
    additionalEventAttributes?: any;
}
export interface FilterHandler<TData = any, TContext = any, TModel = any, TCustomParams = any> extends SharedFilter, ReadOnlyFloatingFilterParent<TModel> {
    /** Optional: Called once when the handler is created. */
    init?(params: FilterHandlerParams<TData, TContext, TModel, TCustomParams>): void;
    /** Optional: Called every time the handler is updated, e.g. when the model changes. */
    refresh?(params: FilterHandlerParams<TData, TContext, TModel, TCustomParams>): void;
    /**
     * The grid will ask each active filter, in turn, whether each row in the grid passes. If any
     * filter fails, then the row will be excluded from the final set.
     */
    doesFilterPass(params: DoesFilterPassParams<TData, TContext, TModel, TCustomParams>): boolean;
    /**
     * Optional: Used by AG Grid when rendering floating filters and there isn't a floating filter
     * associated for this filter, this will happen if you create a custom filter and NOT a custom floating
     * filter.
     */
    getModelAsString?(model: TModel | null, source?: 'floating' | 'filterToolPanel'): string;
    /**
     * Optional: When using an apply button with the filter, this method will be called before the apply happens,
     * The returned model will be applied, allowing for any validation or updates to be performed.
     */
    processModelToApply?(model: TModel | null): TModel | null;
    /** Optional: Gets called once by grid when the component is being removed; if your component needs to do any cleanup, do it here */
    destroy?(): void;
}
export interface CreateFilterHandlerFuncParams<TData = any, TValue = any, TContext = any> extends AgGridCommon<TData, TContext> {
    colDef: ColDef<TData, TValue>;
    column: Column<TValue>;
}
export interface CreateFilterHandlerFunc<TData = any, TValue = any, TContext = any, TModel = any, TCustomParams = any> {
    (params: CreateFilterHandlerFuncParams<TData, TValue, TContext>): FilterHandler<TData, TContext, TModel, TCustomParams>;
}
export interface ColumnFilter<TData = any, TValue = any, TContext = any, TModel = any, TCustomParams = any> {
    /**
     * Filter component to use for this column.
     * - Set to the name of a provided filter: `agNumberColumnFilter`, `agTextColumnFilter`, `agDateColumnFilter`, `agMultiColumnFilter`, `agSetColumnFilter`.
     * - Set to a custom filter `FilterDisplay`
     */
    component: any;
    /**
     * Contains the logic for executing the filter. If the filter is active,
     * will be called for each row in the grid to see if it passes.
     * If any filter fails, then the row will be excluded from the final set.
     *
     * Not required if providing a `handler`, or if not using Client-Side Row Model.
     */
    doesFilterPass?: (params: DoesFilterPassParams<TData, TContext, TModel, TCustomParams>) => boolean;
    /**
     * Returns a handler which contains the logic for executing the filter.
     * Allows for more complex filter cases than `doesFilterPass`.
     *
     * Not required if providing `doesFilterPass` (but will take precedence), or if not using Client-Side Row Model.
     */
    handler?: string | CreateFilterHandlerFunc<TData, TValue, TContext, TModel, TCustomParams>;
}
export declare function isColumnFilterComp(filter: any): filter is ColumnFilter;
export interface IFilterDef {
    /**
     * Filter to use for this column.
     * - Set to `true` to use the default filter.
     * - Set to the name of a provided filter: `agNumberColumnFilter`, `agTextColumnFilter`, `agDateColumnFilter`, `agMultiColumnFilter`, `agSetColumnFilter`.
     * - Set to a custom filter `IFilterComp` when `enableFilterHandlers = false`.
     * - Set to a `ColumnFilter` when `enableFilterHandlers = true`
     */
    filter?: any;
    /** Params to be passed to the filter component specified in `filter`. */
    filterParams?: any;
    /**
     * The custom component to be used for rendering the floating filter.
     * If none is specified the default AG Grid is used.
     */
    floatingFilterComponent?: any;
    /** Params to be passed to `floatingFilterComponent`. */
    floatingFilterComponentParams?: any;
}
interface SharedFilter {
    /**
     * Optional: Gets called when new rows are inserted into the grid. If the filter needs to change its
     * state after rows are loaded, it can do it here. For example the set filters uses this
     * to update the list of available values to select from (e.g. 'Ireland', 'UK' etc for
     * Country filter). To get the list of available values from within this method from the
     * Client Side Row Model, use `gridApi.forEachLeafNode(callback)`.
     */
    onNewRowsLoaded?(): void;
    /** Optional: Called whenever any filter is changed. */
    onAnyFilterChanged?(): void;
}
export interface SharedFilterUi extends SharedFilter {
    /**
     * Optional: A hook to perform any necessary operation just after the GUI for this component has been rendered on the screen.
     * If a parent popup is closed and reopened (e.g. for filters), this method is called each time the component is shown.
     * This is useful for any logic that requires attachment before executing, such as putting focus on a particular DOM element.
     */
    afterGuiAttached?(params?: IAfterGuiAttachedParams): void;
    /**
     * Optional: A hook to perform any necessary operation just after the GUI for this component has been removed from the screen.
     * If a parent popup is opened and closed (e.g. for filters), this method is called each time the component is hidden.
     * This is useful for any logic to reset the UI state back to the model before the component is reopened.
     */
    afterGuiDetached?(): void;
}
interface ReadOnlyFloatingFilterParent<TModel = any> {
    /**
     * Optional: Used by AG Grid when rendering floating filters and there isn't a floating filter
     * associated for this filter, this will happen if you create a custom filter and NOT a custom floating
     * filter.
     */
    getModelAsString?(model: TModel | null): string;
}
export interface BaseFilter extends SharedFilterUi, ReadOnlyFloatingFilterParent {
    /**
     * The grid will ask each active filter, in turn, whether each row in the grid passes. If any
     * filter fails, then the row will be excluded from the final set. The method is provided a
     * params object with attributes node (the rodNode the grid creates that wraps the data) and data
     * (the data object that you provided to the grid for that row). Note that this is only called for the
     * Client-Side Row Model, and can just return `true` if being used exclusively with other row models.
     */
    doesFilterPass(params: IDoesFilterPassParams): boolean;
}
export interface IFilter extends BaseFilter {
    /**
     * Returns `true` if the filter is currently active, otherwise `false`.
     * If active then 1) the grid will show the filter icon in the column header
     * and 2) the filter will be included in the filtering of the data.
     */
    isFilterActive(): boolean;
    /**
     * Returns a model representing the current state of the filter, or `null` if the filter is
     * not active. The grid calls `getModel()` on all active filters when `gridApi.getFilterModel()` is called.
     */
    getModel(): any;
    /**
     * Sets the state of the filter using the supplied model. Providing `null` as the model will
     * de-activate the filter.
     */
    setModel(model: any): void | AgPromise<void>;
    /**
     * This method is called when the filter parameters change.
     * The result returned by this method will determine if the filter should be refreshed and reused,
     * or if a new filter instance should be created.
     *
     * This method should return `true` if the filter should be refreshed and reused instead of being destroyed.
     * This is useful if the new params passed are compatible with the existing filter instance.
     *
     * When `false` is returned, the existing filter will be destroyed and a new filter will be created.
     * This should be done if the new params passed are not compatible with the existing filter instance.
     *
     * @param newParams {IFilterParams} - New filter params.
     *
     * @returns {boolean} - `true` means that the filter should be refreshed and kept.
     * `false` means that the filter will be destroyed and a new filter instance will be created.
     */
    refresh?(newParams: IFilterParams): boolean;
}
export interface FilterDisplay<TData = any, TContext = any, TModel = any, TState = any> extends SharedFilterUi {
    /** Called when the column definition, state or model is updated. */
    refresh(newParams: FilterDisplayParams<TData, TContext, TModel, TState>): boolean;
}
export interface IFilterComp<TData = any> extends IComponent<IFilterParams<TData>>, IFilter {
}
export interface FilterDisplayComp<TData = any, TContext = any, TModel = any> extends IComponent<FilterDisplayParams<TData, TContext, TModel>>, FilterDisplay<TData, TContext, TModel> {
}
export interface IDoesFilterPassParams<TData = any> {
    /** The row node in question. */
    node: IRowNode<TData>;
    /** The data part of the row node in question. */
    data: TData;
}
export type FilterAction = 'apply' | 'clear' | 'reset' | 'cancel';
/** Common filter params for all column filters (when using `enableFilterHandlers = true`) */
export interface FilterWrapperParams {
    /** If `true`, the filter will be wrapped in a `form` element that applies on submit. */
    useForm?: boolean;
    /**
     * Specifies the buttons to be shown in the filter, in the order they should be displayed in.
     * The options are:
     *
     *  - `'apply'`: If the Apply button is present, the filter is only applied after the user hits the Apply button.
     *  - `'clear'`: The Clear button will clear the (form) details of the filter without removing any active filters on the column.
     *  - `'reset'`: The Reset button will clear the details of the filter and any active filters on that column.
     *  - `'cancel'`: The Cancel button will discard any changes that have been made to the filter in the UI, restoring the applied model.
     */
    buttons?: FilterAction[];
    /**
     * When this is set to `true`, the following will happen after clicking a filter button:
     * - Apply closes popup.
     * - Reset closes popup if Apply button is present.
     * - Cancel closes popup.
     *
     * @default false
     */
    closeOnApply?: boolean;
    /**
     * If set to `true`, will disable and hide any `buttons`.
     *
     * @default false
     */
    readOnly?: boolean;
}
export interface SharedFilterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The column this filter is for. */
    column: Column;
    /** The column definition for the column. */
    colDef: ColDef<TData>;
    /**
     * Get the cell value for the given row node and column, which can be the column ID, definition, or `Column` object.
     * If no column is provided, the column this filter is on will be used.
     */
    getValue: <TValue = any>(node: IRowNode<TData>, column?: ColKey<TData, TValue>) => TValue | null | undefined;
    /**
     * A function callback, call with a node to be told whether the node passes all filters except the current filter.
     * This is useful if you want to only present to the user values that this filter can filter given the status of the other filters.
     * The set filter uses this to remove from the list,
     * items that are no longer available due to the state of other filters (like Excel type filtering).
     */
    doesRowPassOtherFilter: (rowNode: IRowNode<TData>) => boolean;
}
export interface BaseFilterParams<TData = any, TContext = any> extends SharedFilterParams<TData, TContext> {
    /**
     * @deprecated 33.1 Use the corresponding methods on the grid API (`api`) instead.
     */
    rowModel: IRowModel;
}
/**
 * Parameters provided by the grid to the `init` method of an `IFilterComp`
 */
export interface IFilterParams<TData = any, TContext = any> extends BaseFilterParams<TData, TContext> {
    /**
     * A function callback to be called when the filter changes. The
     * grid will then respond by filtering the grid data. The callback
     * takes one optional parameter which, if included, will get merged
     * to the FilterChangedEvent object (useful for passing additional
     * information to anyone listening to this event, however such extra
     * attributes are not used by the grid).
     */
    filterChangedCallback: (additionalEventAttributes?: any) => void;
    /**
     * A function callback, to be optionally called, when the filter UI changes.
     * The grid will respond with emitting a FilterModifiedEvent.
     * Apart from emitting the event, the grid takes no further action.
     * The callback takes one optional parameter which, if included,
     * will get merged to the FilterModifiedEvent object.
     */
    filterModifiedCallback: (additionalEventAttributes?: any) => void;
}
export interface FilterDisplayState<TModel = any, TState = any> {
    /** The current filter model to be displayed in the UI. */
    model: TModel | null;
    /**
     * If there is additional UI state not represented in the filter model,
     * this will be stored here.
     */
    state?: TState;
    /** If `false` and apply button is present, apply button will be disabled. */
    valid?: boolean;
}
export type FilterDisplaySource = 'init' | 'ui' | 'api' | 'colDef' | 'handler' | 'floating';
export interface FilterDisplayParams<TData = any, TContext = any, TModel = any, TState = any> extends SharedFilterParams<TData, TContext> {
    /** The current applied filter model for the component. */
    model: TModel | null;
    /** The current state to display in the component. */
    state: FilterDisplayState<TModel, TState>;
    /**
     * Callback that should be called every time the model in the component changes.
     * @param additionalEventAttributes If provided, will be passed to the filter changed event
     */
    onModelChange: (model: TModel | null, additionalEventAttributes?: any) => void;
    /** If using the filter with apply buttons, callback that should be called every time the unapplied model in the component changes. */
    onStateChange: (componentState: FilterDisplayState<TModel, TState>) => void;
    /**
     * Can be called to manually apply any of the filter actions that would be done via buttons.
     * @param additionalEventAttributes If provided, will be passed to the filter changed event
     * @param event If the action was via the keyboard, provide the event here for correct focus handling.
     */
    onAction: (action: FilterAction, additionalEventAttributes?: any, event?: KeyboardEvent) => void;
    /**
     * Callback that can be optionally called every time the filter UI changes.
     * The grid will respond with emitting a FilterUiChangedEvent.
     * Apart from emitting the event, the grid takes no further action.
     * The callback takes one optional parameter which, if included,
     * will get merged to the FilterUiChangedEvent object.
     */
    onUiChange: (additionalEventAttributes?: any) => void;
    /**
     * Get the filter handler instance.
     * If using a `SimpleColumnFilter`,
     * the handler is is a wrapper object containing the provided `doesFilterPass` callback.
     */
    getHandler: () => FilterHandler<TData, TContext, TModel>;
    source: FilterDisplaySource;
    /**
     * If this refresh was as a result of the filter triggering an update
     * with additional event attributes, these will be set here
     */
    additionalEventAttributes?: any;
}
/**
 * FilterModel represents the applied filter model for all columns in the grid keyed by the column id.
 * If using inbuilt AG Grid filters then the type of the column filter model could be one of:
 *      `TextFilterModel`, `NumberFilterModel`, `DateFilterModel`, `SetFilterModel`, `IMultiFilterModel`, `AdvancedFilterModel`
 */
export interface FilterModel {
    [colId: string]: any;
}
/**
 * ColumnFilterState represents the filter state for all columns in the grid keyed by the column id.
 * This excludes the filter model.
 */
export interface ColumnFilterState {
    /**
     * Filter state keyed by the column id.
     * The values will be passed into each of the filter component params as `state.state`.
     */
    [colId: string]: any;
}
export interface FilterActionParams {
    /** Column ID to perform action on. If `undefined`, will run for all columns. */
    colId?: string;
    /** Action to perform */
    action: FilterAction;
}
export {};
