import type { AgPromise } from '../agStack/utils/promise';
import type { AgColumn } from '../entities/agColumn';
import type { CreateFilterHandlerFunc, DoesFilterPassParams, FilterAction, FilterDisplayComp, FilterDisplayParams, FilterDisplayState, FilterHandler, FilterHandlerBaseParams, FilterModel, IFilterComp, IFilterParams } from '../interfaces/iFilter';
import type { UserCompDetails } from '../interfaces/iUserCompDetails';
export declare const FILTER_HANDLER_MAP: {
    readonly agSetColumnFilter: "agSetColumnFilterHandler";
    readonly agMultiColumnFilter: "agMultiColumnFilterHandler";
    readonly agGroupColumnFilter: "agGroupColumnFilterHandler";
    readonly agNumberColumnFilter: "agNumberColumnFilterHandler";
    readonly agDateColumnFilter: "agDateColumnFilterHandler";
    readonly agTextColumnFilter: "agTextColumnFilterHandler";
};
export declare const FILTER_HANDLERS: Set<"agSetColumnFilterHandler" | "agMultiColumnFilterHandler" | "agGroupColumnFilterHandler" | "agNumberColumnFilterHandler" | "agDateColumnFilterHandler" | "agTextColumnFilterHandler">;
export type FilterHandlerName = (typeof FILTER_HANDLER_MAP)[keyof typeof FILTER_HANDLER_MAP];
interface BaseFilterUi<TComp = IFilterComp, TParams = IFilterParams> {
    create: (update?: boolean) => AgPromise<TComp>;
    filterParams: TParams;
    compDetails: UserCompDetails;
    /**
     * True if has been refreshed but not created yet
     */
    refreshed?: boolean;
}
interface CreatedFilterUi<TComp = IFilterComp, TParams = IFilterParams> extends BaseFilterUi<TComp, TParams> {
    created: true;
    promise: AgPromise<TComp>;
}
interface UncreatedFilterUi<TComp = IFilterComp, TParams = IFilterParams> extends BaseFilterUi<TComp, TParams> {
    created: false;
}
export type FilterUi<TComp = IFilterComp, TParams = IFilterParams> = CreatedFilterUi<TComp, TParams> | UncreatedFilterUi<TComp, TParams>;
interface BaseFilterWrapper<TComp extends IFilterComp | FilterDisplayComp = IFilterComp, TParams extends IFilterParams | FilterDisplayParams = IFilterParams> {
    column: AgColumn;
    /**
     * `null` if invalid
     */
    filterUi: FilterUi<TComp, TParams> | null;
}
export interface LegacyFilterWrapper extends BaseFilterWrapper<IFilterComp, IFilterParams> {
    isHandler: false;
    filter?: IFilterComp;
}
interface HandlerFilterWrapper extends BaseFilterWrapper<FilterDisplayComp, FilterDisplayParams> {
    isHandler: true;
    handler: FilterHandler;
    /** This is only used to see whether the handler has changed */
    handlerGenerator: CreateFilterHandlerFunc | FilterHandlerName | ((params: DoesFilterPassParams) => boolean);
    handlerParams: FilterHandlerBaseParams;
}
export type FilterWrapper = LegacyFilterWrapper | HandlerFilterWrapper;
export declare function getFilterUiFromWrapper<TComp extends IFilterComp | FilterDisplayComp>(filterWrapper: FilterWrapper, skipCreate?: boolean): AgPromise<TComp> | null;
export declare function _refreshHandlerAndUi(getFilterUi: () => AgPromise<{
    filter: FilterDisplayComp;
    filterParams: FilterDisplayParams;
} | undefined>, handler: FilterHandler, handlerParams: FilterHandlerBaseParams, model: any, state: FilterDisplayState, source: 'ui' | 'api' | 'colDef' | 'floating' | 'handler', additionalEventAttributes?: any): AgPromise<void>;
export declare function _refreshFilterUi(filter: FilterDisplayComp | null | undefined, filterParams: FilterDisplayParams, model: any, state: FilterDisplayState, source: 'ui' | 'api' | 'colDef' | 'floating' | 'handler' | 'init', additionalEventAttributes?: any): void;
export declare function getAndRefreshFilterUi(getFilterUi: () => FilterUi<FilterDisplayComp, FilterDisplayParams> | undefined, getModel: () => any, getState: () => FilterDisplayState | undefined): void;
export declare function _updateFilterModel(action: FilterAction, getFilterUi: () => FilterUi<FilterDisplayComp, FilterDisplayParams> | undefined, getModel: () => any, getState: () => FilterDisplayState | undefined, updateState: (state: FilterDisplayState) => void, updateModel: (model: any) => void, processModelToApply?: (model: any) => any): void;
export declare function _getFilterModel<TModel = any>(model: FilterModel, colId: string): TModel | null;
export {};
