import type { IEventEmitter } from '../agStack/interfaces/iEventEmitter';
import type { AgColumn } from '../entities/agColumn';
import type { ValueGetterFunc } from '../entities/colDef';
import type { NewFiltersToolPanelState } from './gridState';
import type { IAfterGuiAttachedParams } from './iAfterGuiAttachedParams';
import type { FilterAction, FilterWrapperParams, IFilterDef } from './iFilter';
import type { IToolPanel, IToolPanelNewFiltersCompParams } from './iToolPanel';
export interface SelectableFilterDef {
    /**
     * Name that will be displayed in the filter card dropdown.
     * Required for custom filters
     */
    name?: string;
    /**
     * Filter to use for this column.
     * - Set to `true` to use the default filter.
     * - Set to the name of a provided filter: `agNumberColumnFilter`, `agTextColumnFilter`, `agDateColumnFilter`, `agMultiColumnFilter`, `agSetColumnFilter`.
     * - Set to a `ColumnFilter`
     */
    filter: any;
    /** Params to be passed to the filter component specified in `filter`. */
    filterParams?: any;
    /**
     * Function or expression. Gets the value for filtering purposes.
     * Allows for different values to be used for different filters
     * instead of using `colDef.filterValueGetter`.
     */
    filterValueGetter?: string | ValueGetterFunc;
}
export interface SelectableFilterParams {
    /**
     * List of possible filters which will show in the filter card.
     * If not provided, will default to grid-provided filters
     */
    filters?: SelectableFilterDef[];
    /**
     * If providing `filters`, the index of the filter that should be active by default.
     * @default 0
     */
    defaultFilterIndex?: number;
    /**
     * Params which will be passed to all filters
     */
    defaultFilterParams?: FilterWrapperParams;
}
interface FilterPanelBaseState {
    column: AgColumn;
    name: string;
    isEditing: boolean;
}
export interface FilterPanelSummaryState extends FilterPanelBaseState {
    expanded: false;
    summary: string;
}
export interface FilterPanelDetailState extends FilterPanelBaseState {
    expanded: true;
    activeFilterDef?: SelectableFilterDef;
    filterDefs?: SelectableFilterDef[];
    detail: HTMLElement;
    afterGuiAttached: (params?: IAfterGuiAttachedParams) => void;
    afterGuiDetached: () => void;
}
export type FilterPanelFilterState = FilterPanelSummaryState | FilterPanelDetailState;
export interface INewFiltersToolPanel extends IToolPanel {
    getState(): NewFiltersToolPanelState;
}
export interface IFilterPanelService extends IEventEmitter<'filterPanelStateChanged' | 'filterPanelStatesChanged'> {
    isActive: boolean;
    getAvailable(): {
        id: string;
        name: string;
    }[];
    getIds(): string[];
    add(id: string): void;
    remove(id: string): void;
    getState(id: string): FilterPanelFilterState | undefined;
    expand(id: string, expanded: boolean): void;
    updateType(id: string, filterDef: SelectableFilterDef): void;
    getActions(): {
        actions: FilterAction[];
        canApply: boolean;
    } | undefined;
    doAction(action: FilterAction): void;
    updateParams(params: IToolPanelNewFiltersCompParams, initialState?: NewFiltersToolPanelState): void;
    getGridState(): NewFiltersToolPanelState;
}
export interface ISelectableFilterService {
    getFilterValueGetter(colId: string): string | ValueGetterFunc | undefined;
    isSelectable(filterDef: IFilterDef): boolean;
    getFilterDef(column: AgColumn, filterDef: IFilterDef): IFilterDef;
    getDefs(column: AgColumn, filterDef: IFilterDef): {
        filterDefs: SelectableFilterDef[];
        activeFilterDef: SelectableFilterDef;
    } | undefined;
    setActive(colId: string, filterDefs: SelectableFilterDef[], activeFilterDef: SelectableFilterDef): void;
    clearActive(colId: string): void;
}
export {};
