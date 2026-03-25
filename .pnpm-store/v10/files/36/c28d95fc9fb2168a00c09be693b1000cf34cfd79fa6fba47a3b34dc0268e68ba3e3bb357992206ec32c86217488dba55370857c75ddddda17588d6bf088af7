import type { FilterAction, IFilter, IFilterParams } from '../../interfaces/iFilter';
/**
 * Parameters provided by the grid to the `init` method of a `ProvidedFilter`.
 * Do not use in `colDef.filterParams` - see `IProvidedFilterParams` instead.
 */
export type ProvidedFilterParams<TData = any> = IProvidedFilterParams & IFilterParams<TData>;
/**
 * Common parameters in `colDef.filterParams` used by all provided filters. Extended by the specific filter types.
 */
export interface IProvidedFilterParams {
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
     * If the Apply button is present, the filter popup will be closed immediately when the Apply
     * or Reset button is clicked if this is set to `true`.
     *
     * @default false
     */
    closeOnApply?: boolean;
    /**
     * Overrides the default debounce time in milliseconds for the filter. Defaults are:
     * - `TextFilter` and `NumberFilter`: 500ms. (These filters have text field inputs, so a short delay before the input is formatted and the filtering applied is usually appropriate).
     * - `DateFilter` and `SetFilter`: 0ms
     */
    debounceMs?: number;
    /**
     * If set to `true`, disables controls in the filter to mutate its state. Normally this would
     * be used in conjunction with the Filter API.
     *
     * @default false
     */
    readOnly?: boolean;
}
/** Interface contract for the public aspects of the ProvidedFilter implementation(s). */
export interface IProvidedFilter extends IFilter {
    /** The type of filter. Matches the `filterType` property in the filter model */
    readonly filterType: 'text' | 'number' | 'date' | 'set' | 'multi';
    /**
     * Applies the model shown in the UI (so that `getModel()` will now return what was in the UI
     * when `applyModel()` was called).
     * @param source The source of the method call. Default 'api'.
     */
    applyModel(source?: 'api' | 'ui' | 'rowDataUpdated'): boolean;
    /**
     * Returns the filter model from the UI. If changes have been made to the UI but not yet
     * applied, this model will reflect those changes.
     */
    getModelFromUi(): any;
}
export interface ProvidedFilterModel {
    filterType?: string;
}
