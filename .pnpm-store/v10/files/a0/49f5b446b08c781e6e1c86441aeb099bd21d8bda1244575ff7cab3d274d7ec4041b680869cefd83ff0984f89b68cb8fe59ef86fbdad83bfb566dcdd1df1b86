import type { FilterAction } from './iFilter';
/**
 * Parameters passed to the Advanced Filter
 */
export interface IAdvancedFilterParams {
    /**
     * Specifies the buttons to be shown in the Advanced Filter, in the order they should be displayed in.
     * The options are:
     *
     *  - `'apply'`: The Apply button will apply the filter.
     *  - `'clear'`: The Clear button will clear the filter input without removing the current active filter.
     *  - `'reset'`: The Reset button will clear the filter and apply an empty filter.
     *  - `'cancel'`: The Cancel button will discard any changes that have been made to the filter in the UI, restoring the applied model.
     *
     * @default ['apply']
     */
    buttons?: FilterAction[];
    /**
     * Whether to hide the Builder button to open the Advanced Filter Builder
     * @default false
     */
    suppressBuilderButton?: boolean;
}
