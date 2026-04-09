import type { FilterHandlerParams, IDoesFilterPassParams } from '../../../interfaces/iFilter';
import type { ICombinedSimpleModel, ISimpleFilterModelType, Tuple } from '../iSimpleFilter';
import { SimpleFilterHandler } from '../simpleFilterHandler';
import type { ITextFilterParams, TextFilterModel } from './iTextFilter';
import { TextFilterModelFormatter } from './textFilterModelFormatter';
export declare class TextFilterHandler extends SimpleFilterHandler<TextFilterModel, string, ITextFilterParams> {
    readonly filterType: "text";
    protected readonly FilterModelFormatterClass: typeof TextFilterModelFormatter;
    private matcher;
    private formatter;
    constructor();
    protected updateParams(params: FilterHandlerParams<any, any, TextFilterModel | ICombinedSimpleModel<TextFilterModel>, ITextFilterParams>): void;
    protected evaluateNullValue(filterType: ISimpleFilterModelType | null): boolean;
    protected evaluateNonNullValue(values: Tuple<string>, cellValue: string, filterModel: TextFilterModel, params: IDoesFilterPassParams): boolean;
    processModelToApply(model: TextFilterModel | ICombinedSimpleModel<TextFilterModel> | null): TextFilterModel | ICombinedSimpleModel<TextFilterModel> | null;
}
