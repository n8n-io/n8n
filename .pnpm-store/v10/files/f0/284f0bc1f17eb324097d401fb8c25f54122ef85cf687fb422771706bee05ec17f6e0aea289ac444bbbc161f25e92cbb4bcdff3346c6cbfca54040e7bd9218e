import type { FilterDisplayParams } from '../../../interfaces/iFilter';
import { AgInputNumberField } from '../../../widgets/agInputNumberField';
import { AgInputTextField } from '../../../widgets/agInputTextField';
import type { ICombinedSimpleModel, Tuple } from '../iSimpleFilter';
import { SimpleFilter } from '../simpleFilter';
import type { INumberFilterParams, NumberFilterModel } from './iNumberFilter';
/** temporary type until `NumberFilterParams` is updated as breaking change */
type NumberFilterDisplayParams = INumberFilterParams & FilterDisplayParams<any, any, NumberFilterModel | ICombinedSimpleModel<NumberFilterModel>>;
export declare class NumberFilter extends SimpleFilter<NumberFilterModel, number, AgInputTextField | AgInputNumberField, NumberFilterDisplayParams> {
    private readonly eValuesFrom;
    private readonly eValuesTo;
    readonly filterType: "number";
    constructor();
    protected defaultDebounceMs: number;
    protected setElementValue(element: AgInputTextField | AgInputNumberField, value: number | null, fromFloatingFilter?: boolean): void;
    protected createEValue(): HTMLElement;
    private createFromToElement;
    protected removeEValues(startPosition: number, deleteCount?: number): void;
    protected getValues(position: number): Tuple<number>;
    protected areSimpleModelsEqual(aSimple: NumberFilterModel, bSimple: NumberFilterModel): boolean;
    private stringToFloat;
    protected createCondition(position: number): NumberFilterModel;
    protected getInputs(position: number): Tuple<AgInputTextField | AgInputNumberField>;
    protected hasInvalidInputs(): boolean;
}
export {};
