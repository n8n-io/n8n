import type { IFilterParams } from '../../interfaces/iFilter';
import type { IFloatingFilterParent } from '../floating/floatingFilter';
import type { IProvidedFilter, IProvidedFilterParams, ProvidedFilterModel } from './iProvidedFilter';
import type { OptionsFactory } from './optionsFactory';
export interface IFilterOptionDef {
    /** A unique key that does not clash with the built-in filter keys. */
    displayKey: string;
    /** Display name for the filter. Can be replaced by a locale-specific value using a `localeTextFunc`. */
    displayName: string;
    /** Custom filter logic that returns a boolean based on the `filterValues` and `cellValue`. */
    predicate?: (filterValues: any[], cellValue: any) => boolean;
    /** Number of inputs to display for this option. Defaults to `1` if unspecified. */
    numberOfInputs?: 0 | 1 | 2;
}
export type JoinOperator = 'AND' | 'OR';
/** Interface contract for the public aspects of the SimpleFilter implementation(s). */
export interface ISimpleFilter extends IProvidedFilter, IFloatingFilterParent {
    readonly filterType: 'text' | 'number' | 'date';
}
export interface IFilterPlaceholderFunctionParams {
    /**
     * The filter option key
     */
    filterOptionKey: ISimpleFilterModelType;
    /**
     * The filter option name as localised text
     */
    filterOption: string;
    /**
     * The default placeholder text
     */
    placeholder: string;
}
export type FilterPlaceholderFunction = (params: IFilterPlaceholderFunctionParams) => string;
/**
 * Parameters provided by the grid to the `init` method of a `SimpleFilter`.
 * Do not use in `colDef.filterParams` - see `ISimpleFilterParams` instead.
 */
export type SimpleFilterParams<TData = any> = ISimpleFilterParams & IFilterParams<TData>;
/**
 * Common parameters in `colDef.filterParams` used by all simple filters. Extended by the specific filter types.
 */
export interface ISimpleFilterParams extends IProvidedFilterParams {
    /**
     * Array of filter options to present to the user.
     */
    filterOptions?: (IFilterOptionDef | ISimpleFilterModelType)[];
    /** The default filter option to be selected. */
    defaultOption?: string;
    /**
     * By default, the two conditions are combined using `AND`.
     * You can change this default by setting this property.
     * Options: `AND`, `OR`
     */
    defaultJoinOperator?: JoinOperator;
    /**
     * Maximum number of conditions allowed in the filter.
     *
     * @default 2
     */
    maxNumConditions?: number;
    /**
     * By default only one condition is shown, and additional conditions are made visible when the previous conditions are entered
     * (up to `maxNumConditions`). To have more conditions shown by default, set this to the number required.
     * Conditions will be disabled until the previous conditions have been entered.
     * Note that this cannot be greater than `maxNumConditions` - anything larger will be ignored.
     *
     * @default 1
     */
    numAlwaysVisibleConditions?: number;
    /**
     * Placeholder text for the filter textbox.
     */
    filterPlaceholder?: FilterPlaceholderFunction | string;
}
export type ISimpleFilterModelType = 'empty' | 'equals' | 'notEqual' | 'lessThan' | 'lessThanOrEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'inRange' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'blank' | 'notBlank';
export interface ISimpleFilterModel extends ProvidedFilterModel {
    /** One of the filter options, e.g. `'equals'` */
    type?: ISimpleFilterModelType | null;
}
export interface ICombinedSimpleModel<M extends ISimpleFilterModel> extends ProvidedFilterModel {
    operator: JoinOperator;
    conditions: M[];
}
export declare function isCombinedFilterModel<M extends ISimpleFilterModel>(model: M | ICombinedSimpleModel<M>): model is ICombinedSimpleModel<M>;
export type Tuple<T> = (T | null)[];
export type MapValuesFromSimpleFilterModel<TModel extends ISimpleFilterModel, TValue> = (filterModel: TModel | null, optionsFactory: OptionsFactory) => Tuple<TValue>;
