import type { IComponent } from '../../agStack/interfaces/iComponent';
import type { FilterChangedEvent } from '../../events';
import type { Column } from '../../interfaces/iColumn';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { FilterHandler, IFilter, IFilterParams } from '../../interfaces/iFilter';
export interface IFloatingFilterParent {
    /**
     * Notification that a new floating-filter value was input by the user.
     *
     * @param type operation type selected.
     * @param value model-typed value entered.
     */
    onFloatingFilterChanged(type: string | null, value: any): void;
}
type InbuiltParentType = IFloatingFilterParent & IFilter;
export type IFloatingFilterParentCallback<P = InbuiltParentType> = (parentFilterInstance: P) => void;
interface SharedFloatingFilterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The column this filter is for. */
    column: Column;
    /**
     * Shows the parent filter popup.
     */
    showParentFilter: () => void;
}
export interface IFloatingFilterParams<P = InbuiltParentType, TData = any, TContext = any> extends SharedFloatingFilterParams<TData, TContext> {
    /**
     * The params object passed to the filter.
     * This is to allow the floating filter access to the configuration of the parent filter.
     * For example, the provided filters use debounceMs from the parent filter params.
     * */
    filterParams: IFilterParams;
    /**
     * This is a shortcut to invoke getModel on the parent filter.
     * If the parent filter doesn't exist (filters are lazily created as needed)
     * then it returns null rather than calling getModel() on the parent filter.
     */
    currentParentModel: () => any;
    /**
     * Gets a reference to the parent filter. The result is returned asynchronously
     * via a callback as the parent filter may not exist yet. If it does
     * not exist, it is created and asynchronously returned (AG Grid itself
     * does not create components asynchronously, however if providing a framework
     * provided filter e.g. React, it might be).
     *
     * The floating filter can then call any method it likes on the parent filter.
     * The parent filter will typically provide its own method for the floating
     * filter to call to set the filter. For example, if creating custom filter A,
     * it should have a method your floating A can call to set the state
     * when the user updates via the floating filter.
     */
    parentFilterInstance: (callback: IFloatingFilterParentCallback<P>) => void;
}
export interface FloatingFilterDisplayParams<TData = any, TContext = any, TModel = any, TCustomParams = object> extends SharedFloatingFilterParams<TData, TContext> {
    /**
     * The params object passed to the filter.
     * This is to allow the floating filter access to the configuration of the parent filter.
     * For example, the provided filters use debounceMs from the parent filter params.
     * */
    filterParams: TCustomParams;
    /**
     * The current applied filter model for the column.
     */
    model: TModel | null;
    /**
     * Callback that should be called every time the model in the component changes.
     * @param additionalEventAttributes If provided, will be passed to the filter changed event
     */
    onModelChange: (model: TModel | null, additionalEventAttributes?: any) => void;
    /**
     * Callback that can be optionally called every time the floating filter UI changes.
     * The grid will respond with emitting a FloatingFilterUiChangedEvent.
     * Apart from emitting the event, the grid takes no further action.
     * The callback takes one optional parameter which, if included,
     * will get merged to the FloatingFilterUiChangedEvent object.
     */
    onUiChange: (additionalEventAttributes?: any) => void;
    /**
     * Get the filter handler instance.
     * If using a `SimpleColumnFilter`,
     * the handler is is a wrapper object containing the provided `doesFilterPass` callback.
     */
    getHandler: () => FilterHandler<TData, TContext, TModel, TCustomParams>;
    source: 'init' | 'ui' | 'filter' | 'api' | 'colDef' | 'dataChanged';
}
export interface BaseFloatingFilter {
    /**
     * Optional: A hook to perform any necessary operation just after the GUI for this component has been rendered on the screen.
     * This is useful for any logic that requires attachment before executing, such as putting focus on a particular DOM element.
     */
    afterGuiAttached?(): void;
}
export interface IFloatingFilter<P = any> extends BaseFloatingFilter {
    /**
     * Gets called every time the parent filter changes.
     * Your floating filter would typically refresh its UI to reflect the new filter state.
     * The provided parentModel is what the parent filter returns from its getModel() method.
     * The event is the FilterChangedEvent that the grid fires.
     */
    onParentModelChanged(parentModel: any, filterChangedEvent?: FilterChangedEvent | null): void;
    /** A hook to perform any necessary operations when the column definition is updated. */
    refresh?(params: IFloatingFilterParams<P>): void;
}
export interface FloatingFilterDisplay<TData = any, TContext = any, TModel = any, TCustomParams = object> extends BaseFloatingFilter {
    /** Called when the column definition or model is updated. */
    refresh(params: FloatingFilterDisplayParams<TData, TContext, TModel, TCustomParams>): void;
}
export interface IFloatingFilterComp<P = any> extends IFloatingFilter<P>, IComponent<IFloatingFilterParams<P>> {
}
export interface FloatingFilterDisplayComp<TData = any, TContext = any, TModel = any, TCustomParams = object> extends FloatingFilterDisplay<TData, TContext, TModel, TCustomParams>, IComponent<FloatingFilterDisplayParams<TData, TContext, TModel, TCustomParams>> {
}
export {};
