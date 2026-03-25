import type { OptionsFactory } from '../optionsFactory';
import { SCALAR_FILTER_TYPE_KEYS, SimpleFilterModelFormatter } from '../simpleFilterModelFormatter';
import type { INumberFilterParams, NumberFilterModel } from './iNumberFilter';
export declare class NumberFilterModelFormatter extends SimpleFilterModelFormatter<INumberFilterParams, typeof SCALAR_FILTER_TYPE_KEYS, number> {
    protected readonly filterTypeKeys: {
        readonly equals: "Equals";
        readonly notEqual: "NotEqual";
        readonly greaterThan: "GreaterThan";
        readonly greaterThanOrEqual: "GreaterThanOrEqual";
        readonly lessThan: "LessThan";
        readonly lessThanOrEqual: "LessThanOrEqual";
        readonly inRange: "InRange";
    };
    constructor(optionsFactory: OptionsFactory, filterParams: INumberFilterParams);
    protected conditionToString(condition: NumberFilterModel, forToolPanel: boolean, isRange: boolean, customDisplayKey: string | undefined, customDisplayName: string | undefined): string;
}
