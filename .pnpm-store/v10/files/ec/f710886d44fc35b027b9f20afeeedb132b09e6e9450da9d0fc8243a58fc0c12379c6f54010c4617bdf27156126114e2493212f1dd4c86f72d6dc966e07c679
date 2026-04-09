import type { FilterDisplayParams } from '../../../interfaces/iFilter';
import type { GridInputTextField } from '../../../widgets/gridWidgetTypes';
import type { ICombinedSimpleModel, Tuple } from '../iSimpleFilter';
import { SimpleFilter } from '../simpleFilter';
import type { ITextFilterParams, TextFilterModel } from './iTextFilter';
/** temporary type until `TextFilterParams` is updated as breaking change */
type TextFilterDisplayParams = ITextFilterParams & FilterDisplayParams<any, any, TextFilterModel | ICombinedSimpleModel<TextFilterModel>>;
export declare class TextFilter extends SimpleFilter<TextFilterModel, string, GridInputTextField, TextFilterDisplayParams> {
    readonly filterType: "text";
    private readonly eValuesFrom;
    private readonly eValuesTo;
    constructor();
    protected defaultDebounceMs: number;
    protected createCondition(position: number): TextFilterModel;
    protected areSimpleModelsEqual(aSimple: TextFilterModel, bSimple: TextFilterModel): boolean;
    protected getInputs(position: number): Tuple<GridInputTextField>;
    protected getValues(position: number): Tuple<string>;
    protected createEValue(): HTMLElement;
    private createFromToElement;
    protected removeEValues(startPosition: number, deleteCount?: number): void;
}
export {};
