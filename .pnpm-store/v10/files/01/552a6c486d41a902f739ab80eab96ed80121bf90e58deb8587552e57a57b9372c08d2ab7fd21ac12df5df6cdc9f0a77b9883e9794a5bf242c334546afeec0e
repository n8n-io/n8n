import type { Comparator } from '../iScalarFilter';
import { ScalarFilterHandler } from '../scalarFilterHandler';
import { DateFilterModelFormatter } from './dateFilterModelFormatter';
import type { DateFilterModel, IDateFilterParams } from './iDateFilter';
export declare class DateFilterHandler extends ScalarFilterHandler<DateFilterModel, Date, IDateFilterParams> {
    readonly filterType: "date";
    protected readonly FilterModelFormatterClass: typeof DateFilterModelFormatter;
    constructor();
    protected comparator(): Comparator<Date>;
    protected isValid(value: Date): boolean;
}
