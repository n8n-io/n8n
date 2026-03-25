import type { IDateComp, IDateParams } from '../../../interfaces/dateComponent';
import type { IAfterGuiAttachedParams } from '../../../interfaces/iAfterGuiAttachedParams';
import { Component } from '../../../widgets/component';
export declare class DefaultDateComponent extends Component implements IDateComp {
    private readonly eDateInput;
    constructor();
    private params;
    private usingSafariDatePicker;
    private isApply;
    private applyOnFocusOut;
    init(params: IDateParams): void;
    private handleInput;
    private handleFocusOut;
    private setParams;
    refresh(params: IDateParams): void;
    getDate(): Date | null;
    setDate(date: Date): void;
    setInputPlaceholder(placeholder: string): void;
    setInputAriaLabel(ariaLabel: string): void;
    setDisabled(disabled: boolean): void;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    private shouldUseBrowserDatePicker;
}
