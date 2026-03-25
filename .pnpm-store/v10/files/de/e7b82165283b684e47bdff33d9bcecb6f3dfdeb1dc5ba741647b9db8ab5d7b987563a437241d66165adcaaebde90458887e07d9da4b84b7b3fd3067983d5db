import { SimpleFilterModelFormatter, TEXT_FILTER_TYPE_KEYS } from '../simpleFilterModelFormatter';
import type { ITextFilterParams, TextFilterModel } from './iTextFilter';
export declare class TextFilterModelFormatter extends SimpleFilterModelFormatter<ITextFilterParams, typeof TEXT_FILTER_TYPE_KEYS> {
    protected readonly filterTypeKeys: {
        readonly contains: "Contains";
        readonly notContains: "NotContains";
        readonly equals: "TextEquals";
        readonly notEqual: "TextNotEqual";
        readonly startsWith: "StartsWith";
        readonly endsWith: "EndsWith";
        readonly inRange: "InRange";
    };
    protected conditionToString(condition: TextFilterModel, forToolPanel: boolean, isRange: boolean, customDisplayKey: string | undefined, customDisplayName: string | undefined): string;
}
