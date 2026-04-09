import type { AgPromise } from '../../agStack/utils/promise';
import type { ContainerType, IAfterGuiAttachedParams } from '../../interfaces/iAfterGuiAttachedParams';
import type { FilterDisplayParams, FilterDisplayState, IDoesFilterPassParams, IFilterComp } from '../../interfaces/iFilter';
import type { ElementParams } from '../../utils/element';
import type { ComponentSelector } from '../../widgets/component';
import { Component } from '../../widgets/component';
import type { FilterLocaleTextKey } from '../filterLocaleText';
import type { IProvidedFilter, IProvidedFilterParams, ProvidedFilterModel, ProvidedFilterParams } from './iProvidedFilter';
/** temporary type until `ProvidedFilterParams` is updated as breaking change */
type ProvidedFilterDisplayParams<M extends ProvidedFilterModel> = IProvidedFilterParams & FilterDisplayParams<any, any, M>;
/**
 * Contains common logic to all provided filters (apply button, clear button, etc).
 * All the filters that come with AG Grid extend this class. User filters do not
 * extend this class.
 *
 * @param M type of filter-model managed by the concrete sub-class that extends this type
 * @param V type of value managed by the concrete sub-class that extends this type
 */
export declare abstract class ProvidedFilter<M extends ProvidedFilterModel, V, P extends ProvidedFilterDisplayParams<M> = ProvidedFilterDisplayParams<M>> extends Component implements IProvidedFilter, IFilterComp {
    private readonly filterNameKey;
    private readonly cssIdentifier;
    protected params: P;
    private applyActive;
    private applyDebounced;
    private debouncePending;
    protected state: FilterDisplayState<M>;
    protected lastContainerType?: ContainerType;
    private positionableFeature;
    constructor(filterNameKey: FilterLocaleTextKey, cssIdentifier: string);
    protected abstract updateUiVisibility(): void;
    protected abstract createBodyTemplate(): ElementParams | null;
    protected abstract getAgComponents(): ComponentSelector[];
    protected abstract setModelIntoUi(model: M | null, isInitialLoad?: boolean): AgPromise<void>;
    protected abstract areNonNullModelsEqual(a: M, b: M): boolean;
    /** Used to get the filter type for filter models. */
    abstract readonly filterType: 'text' | 'number' | 'date' | 'set' | 'multi';
    postConstruct(): void;
    protected handleKeyDown(_e: KeyboardEvent): void;
    abstract getModelFromUi(): M | null;
    init(legacyParams: ProvidedFilterParams): void;
    refresh(legacyNewParams: ProvidedFilterParams): boolean;
    /** Called on init only. Override in subclasses */
    protected setParams(params: P): void;
    /** Called on refresh only. Override in subclasses */
    protected updateParams(newParams: P, oldParams: P): void;
    private commonUpdateParams;
    /**
     * @deprecated v34 Use the same method on the filter handler (`api.getColumnFilterHandler()`) instead.
     */
    doesFilterPass(params: IDoesFilterPassParams): boolean;
    getFilterTitle(): string;
    /**
     * @deprecated v34 Filters are active when they have a model. Use `api.getColumnFilterModel()` instead.
     */
    isFilterActive(): boolean;
    protected defaultDebounceMs: number;
    private setupApplyDebounced;
    private checkApplyDebounce;
    /**
     * @deprecated v34 Use (`api.getColumnFilterModel()`) instead.
     */
    getModel(): M | null;
    /**
     * @deprecated v34 Use (`api.setColumnFilterModel()`) instead.
     */
    setModel(model: M | null): AgPromise<void>;
    /**
     * Applies changes made in the UI to the filter, and returns true if the model has changed.
     */
    applyModel(_source?: 'api' | 'ui' | 'rowDataUpdated'): boolean;
    protected canApply(_model: M | null): boolean;
    private doApplyModel;
    /**
     * @deprecated v34 Internal method - should only be called by the grid.
     */
    onNewRowsLoaded(): void;
    /**
     * By default, if the change came from a floating filter it will be applied immediately, otherwise if there is no
     * apply button it will be applied after a debounce, otherwise it will not be applied at all. This behaviour can
     * be adjusted by using the apply parameter.
     */
    protected onUiChanged(apply?: 'immediately' | 'debounce' | 'prevent', afterFloatingFilter?: boolean): void;
    protected getState(): any;
    protected getUiChangeEventParams(): any;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    private refreshFilterResizer;
    afterGuiDetached(): void;
    destroy(): void;
    protected translate(key: FilterLocaleTextKey): string;
    protected getPositionableElement(): HTMLElement;
    private areModelsEqual;
}
export {};
