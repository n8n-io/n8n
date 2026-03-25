import type { FloatingFilterInputService } from '../../floating/provided/iFloatingFilterInputService';
import { TextInputFloatingFilter } from '../../floating/provided/textInputFloatingFilter';
import type { INumberFloatingFilterParams, NumberFilterModel } from './iNumberFilter';
import { NumberFilterModelFormatter } from './numberFilterModelFormatter';
export declare class NumberFloatingFilter extends TextInputFloatingFilter<INumberFloatingFilterParams, NumberFilterModel> {
    protected readonly FilterModelFormatterClass: typeof NumberFilterModelFormatter;
    private allowedCharPattern;
    protected readonly filterType = "number";
    protected readonly defaultOptions: import("../iSimpleFilter").ISimpleFilterModelType[];
    protected updateParams(params: INumberFloatingFilterParams): void;
    protected createFloatingFilterInputService(params: INumberFloatingFilterParams): FloatingFilterInputService;
    protected convertValue<TValue>(value: string | null | undefined): TValue | null;
}
