import type { FilterDisplayParams } from '../../../interfaces/iFilter';
import type { GridInputNumberField, GridInputTextField } from '../../../widgets/gridWidgetTypes';
import type { ICombinedSimpleModel, Tuple } from '../iSimpleFilter';
import { SimpleFilter } from '../simpleFilter';
import type { INumberFilterParams, NumberFilterModel } from './iNumberFilter';
/** temporary type until `NumberFilterParams` is updated as breaking change */
type NumberFilterDisplayParams = INumberFilterParams & FilterDisplayParams<any, any, NumberFilterModel | ICombinedSimpleModel<NumberFilterModel>>;
export declare class NumberFilter extends SimpleFilter<NumberFilterModel, number, GridInputTextField | GridInputNumberField, NumberFilterDisplayParams> {
    private readonly eValuesFrom;
    private readonly eValuesTo;
    readonly filterType: "number";
    constructor();
    protected defaultDebounceMs: number;
    protected setElementValue(element: GridInputTextField | GridInputNumberField, value: number | null, fromFloatingFilter?: boolean): void;
    protected createEValue(): HTMLElement;
    private createFromToElement;
    protected removeEValues(startPosition: number, deleteCount?: number): void;
    protected getValues(position: number): Tuple<number>;
    protected areSimpleModelsEqual(aSimple: NumberFilterModel, bSimple: NumberFilterModel): boolean;
    private stringToFloat;
    protected createCondition(position: number): NumberFilterModel;
    protected getInputs(position: number): Tuple<GridInputTextField | GridInputNumberField>;
    protected hasInvalidInputs(): boolean;
}
export {};
