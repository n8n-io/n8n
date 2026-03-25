import type { OptionsFactory } from '../optionsFactory';
import { SCALAR_FILTER_TYPE_KEYS, SimpleFilterModelFormatter } from '../simpleFilterModelFormatter';
import type { DateFilterModel, IDateFilterParams } from './iDateFilter';
export declare class DateFilterModelFormatter extends SimpleFilterModelFormatter<IDateFilterParams, typeof SCALAR_FILTER_TYPE_KEYS, Date> {
    protected readonly filterTypeKeys: {
        readonly equals: "Equals";
        readonly notEqual: "NotEqual";
        readonly greaterThan: "GreaterThan";
        readonly greaterThanOrEqual: "GreaterThanOrEqual";
        readonly lessThan: "LessThan";
        readonly lessThanOrEqual: "LessThanOrEqual";
        readonly inRange: "InRange";
    };
    constructor(optionsFactory: OptionsFactory, filterParams: IDateFilterParams);
    protected conditionToString(condition: DateFilterModel, forToolPanel: boolean, isRange: boolean, customDisplayKey: string | undefined, customDisplayName: string | undefined): string;
}
