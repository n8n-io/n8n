import type { Comparator } from '../iScalarFilter';
import { ScalarFilterHandler } from '../scalarFilterHandler';
import type { INumberFilterParams, NumberFilterModel } from './iNumberFilter';
import { NumberFilterModelFormatter } from './numberFilterModelFormatter';
export declare class NumberFilterHandler extends ScalarFilterHandler<NumberFilterModel, number, INumberFilterParams> {
    readonly filterType: "number";
    protected readonly FilterModelFormatterClass: typeof NumberFilterModelFormatter;
    constructor();
    protected comparator(): Comparator<number>;
    protected isValid(value: number): boolean;
}
