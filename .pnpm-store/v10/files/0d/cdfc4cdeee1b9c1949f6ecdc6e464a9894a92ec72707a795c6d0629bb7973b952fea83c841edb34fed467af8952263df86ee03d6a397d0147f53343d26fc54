import type { NamedBean } from './context/bean';
import { BeanStub } from './context/beanStub';
import type { BeanCollection } from './context/context';
import type { ColDef, ColGroupDef } from './entities/colDef';
import type { GridOptions } from './entities/gridOptions';
import type { AgEvent } from './events';
import type { GridOptionOrDefault } from './gridOptionsDefault';
import type { AgGridCommon, WithoutGridCommon } from './interfaces/iCommon';
import type { ModuleName, ValidationModuleName } from './interfaces/iModule';
import type { RowModelType } from './interfaces/iRowModel';
import type { AnyGridOptions } from './propertyKeys';
import type { MissingModuleErrors } from './validation/errorMessages/errorText';
type GetKeys<T, U> = {
    [K in keyof T]: T[K] extends U | undefined ? K : never;
}[keyof T];
/**
 * Get all the GridOption properties that strictly contain the provided type.
 * Does not include `any` properties.
 */
type KeysOfType<U> = Exclude<GetKeys<GridOptions, U>, AnyGridOptions>;
type BooleanProps = Exclude<KeysOfType<boolean>, AnyGridOptions>;
type NoArgFuncs = KeysOfType<() => any>;
type AnyArgFuncs = KeysOfType<(arg: 'NO_MATCH') => any>;
type CallbackProps = Exclude<KeysOfType<(params: AgGridCommon<any, any>) => any>, NoArgFuncs | AnyArgFuncs>;
export type ExtractParamsFromCallback<TCallback> = TCallback extends (params: infer PA) => any ? PA : never;
export type ExtractReturnTypeFromCallback<TCallback> = TCallback extends (params: AgGridCommon<any, any>) => infer RT ? RT : never;
type WrappedCallback<K extends CallbackProps, OriginalCallback extends GridOptions[K]> = undefined | ((params: WithoutGridCommon<ExtractParamsFromCallback<OriginalCallback>>) => ExtractReturnTypeFromCallback<OriginalCallback>);
export interface PropertyChangeSet {
    /** Unique id which can be used to link changes of multiple properties that were updated together.
     * i.e a user updated multiple properties at the same time.
     */
    id: number;
    /** All the properties that have been updated in this change set */
    properties: (keyof GridOptions)[];
}
export type PropertyChangedSource = 'api' | 'gridOptionsUpdated';
export interface PropertyChangedEvent extends AgEvent {
    type: 'gridPropertyChanged';
    changeSet: PropertyChangeSet | undefined;
    source: PropertyChangedSource;
}
/**
 * For boolean properties the changed value will have been coerced to a boolean, so we do not want the type to include the undefined value.
 */
type GridOptionsOrBooleanCoercedValue<K extends keyof GridOptions> = K extends BooleanProps ? boolean : GridOptions[K];
export interface PropertyValueChangedEvent<K extends keyof GridOptions> extends AgEvent {
    type: K;
    changeSet: PropertyChangeSet | undefined;
    currentValue: GridOptionsOrBooleanCoercedValue<K>;
    previousValue: GridOptionsOrBooleanCoercedValue<K>;
    source: PropertyChangedSource;
}
export type PropertyChangedListener = (event: PropertyChangedEvent) => void;
export type PropertyValueChangedListener<K extends keyof GridOptions> = (event: PropertyValueChangedEvent<K>) => void;
export declare class GridOptionsService extends BeanStub implements NamedBean {
    beanName: "gos";
    private gridOptions;
    private validation?;
    private api;
    private gridId;
    wireBeans(beans: BeanCollection): void;
    private domDataKey;
    /** This is only used for the main DOM element */
    readonly gridInstanceId: number;
    private gridReadyFired;
    private queueEvents;
    private get gridOptionsContext();
    private propEventSvc;
    postConstruct(): void;
    destroy(): void;
    /**
     * Get the raw value of the GridOptions property provided.
     * @param property
     */
    get<K extends keyof GridOptions>(property: K): GridOptionOrDefault<K>;
    /**
     * Get the GridOption callback but wrapped so that the common params of api and context are automatically applied to the params.
     * @param property GridOption callback properties based on the fact that this property has a callback with params extending AgGridCommon
     */
    getCallback<K extends CallbackProps>(property: K): WrappedCallback<K, GridOptions[K]>;
    /**
     * Returns `true` if a value has been specified for this GridOption.
     * @param property GridOption property
     */
    exists(property: keyof GridOptions): boolean;
    /**
     * Wrap the user callback and attach the api and context to the params object on the way through.
     * @param callback User provided callback
     * @returns Wrapped callback where the params object not require api and context
     */
    private mergeGridCommonParams;
    updateGridOptions({ options, force, source, }: {
        options: Partial<GridOptions>;
        force?: boolean;
        source?: PropertyChangedSource;
    }): void;
    addPropertyEventListener<K extends keyof GridOptions>(key: K, listener: PropertyValueChangedListener<K>): void;
    removePropertyEventListener<K extends keyof GridOptions>(key: K, listener: PropertyValueChangedListener<K>): void;
    private globalEventHandlerFactory;
    getDomDataKey(): string;
    /** Prefer _addGridCommonParams from gridOptionsUtils for bundle size savings */
    addGridCommonParams<T extends AgGridCommon<TData, TContext>, TData = any, TContext = any>(params: WithoutGridCommon<T>): T;
    private validateOptions;
    private validateGridOptions;
    validateColDef(colDef: ColDef | ColGroupDef, colId: string, skipInferenceCheck?: boolean): void;
    assertModuleRegistered<TId extends keyof MissingModuleErrors, TShowMessageAtCallLocation = MissingModuleErrors[TId]>(moduleName: ValidationModuleName | ValidationModuleName[], reasonOrId: string | TId): boolean;
    getModuleErrorParams(): {
        gridScoped: boolean;
        gridId: string;
        rowModelType: RowModelType;
        isUmd: boolean;
    };
    isModuleRegistered(moduleName: ModuleName): boolean;
}
export {};
