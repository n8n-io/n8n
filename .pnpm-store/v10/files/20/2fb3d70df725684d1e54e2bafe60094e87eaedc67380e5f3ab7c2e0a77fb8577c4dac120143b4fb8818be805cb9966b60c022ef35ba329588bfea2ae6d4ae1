import type { IFloatingFilterParams } from '../../floating/floatingFilter';
import { SimpleFloatingFilter } from '../../floating/provided/simpleFloatingFilter';
import type { ISimpleFilterModel } from '../iSimpleFilter';
import type { DateFilter } from './dateFilter';
import { DateFilterModelFormatter } from './dateFilterModelFormatter';
export declare class DateFloatingFilter extends SimpleFloatingFilter<IFloatingFilterParams<DateFilter>> {
    private readonly eReadOnlyText;
    private readonly eDateWrapper;
    protected readonly FilterModelFormatterClass: typeof DateFilterModelFormatter;
    private dateComp;
    protected readonly filterType = "date";
    protected readonly defaultOptions: import("../iSimpleFilter").ISimpleFilterModelType[];
    constructor();
    protected setParams(params: IFloatingFilterParams<DateFilter>): void;
    protected updateParams(params: IFloatingFilterParams<DateFilter, any, any>): void;
    private updateCompOnModelChange;
    protected setEditable(editable: boolean): void;
    protected onModelUpdated(model: ISimpleFilterModel): void;
    private onDateChanged;
    private getDateComponentParams;
    private createDateComponent;
}
