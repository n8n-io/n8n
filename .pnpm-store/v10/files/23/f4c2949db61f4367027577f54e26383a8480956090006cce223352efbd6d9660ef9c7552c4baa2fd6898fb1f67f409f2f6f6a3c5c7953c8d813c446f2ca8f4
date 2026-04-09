import type { AgEvent } from '../agStack/interfaces/agEvent';
import { AgPromise } from '../agStack/utils/promise';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanName } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { ColDef, ValueGetterFunc } from '../entities/colDef';
import type { BaseCellDataType, CoreDataTypeDefinition, DataTypeFormatValueFunc } from '../entities/dataType';
import type { RowNode } from '../entities/rowNode';
import type { ColumnEventType, FilterChangedEventSourceType } from '../events';
import type { ContainerType } from '../interfaces/iAfterGuiAttachedParams';
import type { Column } from '../interfaces/iColumn';
import type { BaseFilterParams, ColumnFilterState, CreateFilterHandlerFunc, DoesFilterPassParams, FilterAction, FilterDisplayComp, FilterDisplayParams, FilterDisplayState, FilterHandler, FilterHandlerBaseParams, FilterModel, IFilter, IFilterComp, IFilterDef, IFilterParams } from '../interfaces/iFilter';
import type { UserCompDetails } from '../interfaces/iUserCompDetails';
import type { FilterHandlerName } from './columnFilterUtils';
import type { FilterComp } from './filterComp';
export interface FilterDisplayWrapper {
    comp: IFilterComp | FilterDisplayComp;
    params: IFilterParams | FilterDisplayParams;
    isHandler: boolean;
}
export interface FilterParamsChangedEvent extends AgEvent<'filterParamsChanged'> {
    column: AgColumn;
    params: IFilterParams | FilterDisplayParams;
}
export interface FilterStateChangedEvent extends AgEvent<'filterStateChanged'> {
    column: AgColumn;
    state: FilterDisplayState;
}
export interface FilterActionEvent extends AgEvent<'filterAction'> {
    column: AgColumn;
    action: FilterAction;
    event?: KeyboardEvent;
}
export interface FilterGlobalButtonsEvent extends AgEvent<'filterGlobalButtons'> {
    isGlobal: boolean;
}
export declare class ColumnFilterService extends BeanStub<'filterParamsChanged' | 'filterStateChanged' | 'filterAction' | 'filterGlobalButtons'> implements NamedBean {
    beanName: BeanName;
    private readonly allColumnFilters;
    private readonly allColumnListeners;
    private activeAggregateFilters;
    private activeColumnFilters;
    private processingFilterChange;
    private modelUpdates;
    private columnModelUpdates;
    initialModel: FilterModel;
    /** This may not contain the model for non-handler columns */
    model: FilterModel;
    /** This contains the UI state for handler columns */
    private readonly state;
    private readonly handlerMap;
    isGlobalButtons: boolean;
    activeFilterComps: Set<FilterComp>;
    postConstruct(): void;
    refreshModel(): void;
    setModel(model: FilterModel | null, source?: FilterChangedEventSourceType, forceUpdateActive?: boolean): void;
    getModel(excludeInitialState?: boolean): FilterModel;
    setState(model: FilterModel | null, state: ColumnFilterState | null, source?: FilterChangedEventSourceType): void;
    getState(): ColumnFilterState | undefined;
    private getModelFromFilterWrapper;
    isFilterPresent(): boolean;
    isAggFilterPresent(): boolean;
    disableFilters(): boolean;
    private updateActiveFilters;
    private updateFilterFlagInColumns;
    doFiltersPass(node: RowNode, colIdToSkip?: string, targetAggregates?: boolean): boolean;
    getHandlerParams(column: Column): FilterHandlerBaseParams | undefined;
    private callOnFilterChangedOutsideRenderCycle;
    updateBeforeFilterChanged(params?: {
        column?: AgColumn;
        additionalEventAttributes?: any;
    }): AgPromise<void>;
    updateAfterFilterChanged(): void;
    isSuppressFlashingCellsBecauseFiltering(): boolean;
    private onNewRowsLoaded;
    private updateActive;
    createGetValue(filterColumn: AgColumn, filterValueGetterOverride?: string | ValueGetterFunc): IFilterParams['getValue'];
    isFilterActive(column: AgColumn): boolean;
    private isHandlerActive;
    getOrCreateFilterUi(column: AgColumn): AgPromise<IFilterComp> | null;
    getFilterUiForDisplay(column: AgColumn): AgPromise<FilterDisplayWrapper> | null;
    getHandler(column: AgColumn, createIfMissing?: boolean): FilterHandler | undefined;
    private getOrCreateFilterWrapper;
    private cachedFilter;
    getDefaultFilter(column: AgColumn, isFloating?: boolean): string;
    getDefaultFilterFromDataType(getCellDataType: () => BaseCellDataType | undefined, isFloating?: boolean): string;
    getDefaultFloatingFilter(column: AgColumn): string;
    private createFilterComp;
    createFilterInstance(column: AgColumn, filterDef: IFilterDef, defaultFilter: string, getFilterParams: (defaultParams: BaseFilterParams, isHandler: boolean) => BaseFilterParams): {
        compDetails: UserCompDetails | null;
        handler?: FilterHandler;
        handlerGenerator?: CreateFilterHandlerFunc | FilterHandlerName | ((params: DoesFilterPassParams) => boolean);
        handlerParams?: FilterHandlerBaseParams;
        createFilterUi: ((update?: boolean) => AgPromise<IFilterComp>) | null;
    };
    createBaseFilterParams(column: AgColumn, forFloatingFilter?: boolean): BaseFilterParams;
    private createFilterCompParams;
    private createFilterUiForHandler;
    private createFilterUiLegacy;
    private createFilterWrapper;
    private createHandlerFunc;
    createHandler(column: AgColumn, filterDef: IFilterDef, defaultFilter: string): {
        handler: FilterHandler;
        handlerParams: FilterHandlerBaseParams;
        handlerGenerator: CreateFilterHandlerFunc | FilterHandlerName | ((params: DoesFilterPassParams) => boolean);
    } | undefined;
    private createHandlerFromFunc;
    private createHandlerParams;
    private onColumnsChanged;
    isFilterAllowed(column: AgColumn): boolean;
    getFloatingFilterCompDetails(column: AgColumn, showParentFilter: () => void): UserCompDetails | undefined;
    getCurrentFloatingFilterParentModel(column: AgColumn): any;
    private destroyFilterUi;
    destroyFilter(column: AgColumn, source?: 'api' | 'paramsUpdated'): void;
    private disposeColumnListener;
    private disposeFilterWrapper;
    private filterChangedCallbackFactory;
    filterParamsChanged(colId: string, source?: FilterChangedEventSourceType): void;
    private refreshHandlerAndUi;
    private setColumnFilterWrapper;
    areFilterCompsDifferent(oldCompDetails: UserCompDetails | null, newCompDetails: UserCompDetails | null): boolean;
    hasFloatingFilters(): boolean;
    getFilterInstance<TFilter extends IFilter>(key: string | AgColumn): Promise<TFilter | null | undefined>;
    private processFilterModelUpdateQueue;
    getModelForColumn(column: AgColumn, useUnapplied?: boolean): any;
    setModelForColumn(key: string | AgColumn, model: any): Promise<void>;
    getStateForColumn(colId: string): FilterDisplayState;
    setModelForColumnLegacy(key: string | AgColumn, model: any): AgPromise<void>;
    setColDefPropsForDataType(colDef: ColDef, dataTypeDefinition: CoreDataTypeDefinition, formatValue: DataTypeFormatValueFunc): void;
    setColFilterActive(column: AgColumn, active: boolean, source: ColumnEventType, additionalEventAttributes?: any): void;
    private setModelOnFilterWrapper;
    /** for handlers only */
    private updateStoredModel;
    private filterModified;
    filterUiChanged(column: Column, additionalEventAttributes?: any): void;
    private floatingFilterUiChanged;
    updateModel(column: AgColumn, action: FilterAction, additionalEventAttributes?: any): void;
    updateAllModels(action: FilterAction, additionalEventAttributes?: any): void;
    private updateOrRefreshFilterUi;
    private updateState;
    canApplyAll(): boolean;
    hasUnappliedModel(colId: string): boolean;
    setGlobalButtons(isGlobal: boolean): void;
    shouldKeepStateOnDetach(column: Column, lastContainerType?: ContainerType): boolean;
    destroy(): void;
}
