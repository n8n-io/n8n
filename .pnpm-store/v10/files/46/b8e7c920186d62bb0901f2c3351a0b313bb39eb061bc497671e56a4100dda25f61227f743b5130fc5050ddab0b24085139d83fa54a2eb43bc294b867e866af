import { BeanStub } from '../../context/beanStub';
import type { FilterLocaleTextKey } from '../filterLocaleText';
import type { ProvidedFilterModel } from './iProvidedFilter';
import type { ISimpleFilterModel, ISimpleFilterModelType, ISimpleFilterParams } from './iSimpleFilter';
import type { OptionsFactory } from './optionsFactory';
export declare const SCALAR_FILTER_TYPE_KEYS: {
    readonly equals: "Equals";
    readonly notEqual: "NotEqual";
    readonly greaterThan: "GreaterThan";
    readonly greaterThanOrEqual: "GreaterThanOrEqual";
    readonly lessThan: "LessThan";
    readonly lessThanOrEqual: "LessThanOrEqual";
    readonly inRange: "InRange";
};
export declare const TEXT_FILTER_TYPE_KEYS: {
    readonly contains: "Contains";
    readonly notContains: "NotContains";
    readonly equals: "TextEquals";
    readonly notEqual: "TextNotEqual";
    readonly startsWith: "StartsWith";
    readonly endsWith: "EndsWith";
    readonly inRange: "InRange";
};
type FilterTypeKeys = typeof SCALAR_FILTER_TYPE_KEYS | typeof TEXT_FILTER_TYPE_KEYS;
export declare abstract class SimpleFilterModelFormatter<TFilterParams extends ISimpleFilterParams, TKeys extends FilterTypeKeys = FilterTypeKeys, TValue = any> extends BeanStub {
    private optionsFactory;
    protected filterParams: TFilterParams;
    protected readonly valueFormatter?: ((value: TValue | null) => string | null) | undefined;
    protected abstract readonly filterTypeKeys: TKeys;
    constructor(optionsFactory: OptionsFactory, filterParams: TFilterParams, valueFormatter?: ((value: TValue | null) => string | null) | undefined);
    getModelAsString(model: ISimpleFilterModel | null, source?: 'floating' | 'filterToolPanel'): string | null;
    protected abstract conditionToString(condition: ProvidedFilterModel, forToolPanel: boolean, isRange: boolean, customDisplayKey: string | undefined, customDisplayName: string | undefined): string;
    updateParams(params: {
        optionsFactory: OptionsFactory;
        filterParams: TFilterParams;
    }): void;
    protected conditionForToolPanel(type: ISimpleFilterModelType | null | undefined, isRange: boolean, getFilter: () => string, getFilterTo: () => string, customDisplayKey: string | undefined, customDisplayName: string | undefined): string | null;
    protected getTypeKey(type: ISimpleFilterModelType | null | undefined): FilterLocaleTextKey | null;
    protected formatValue(value?: TValue | null): string;
}
export {};
