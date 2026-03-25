import type { AgInputTextFieldParams } from './agInputTextField';
import { AgInputTextField } from './agInputTextField';
import type { ComponentSelector } from './component';
export declare class AgInputDateField extends AgInputTextField {
    private min?;
    private max?;
    private step?;
    private includeTime?;
    constructor(config?: AgInputTextFieldParams);
    postConstruct(): void;
    private onWheel;
    setMin(minDate: Date | string | undefined): this;
    setMax(maxDate: Date | string | undefined): this;
    setStep(step?: number): this;
    setIncludeTime(includeTime?: boolean): this;
    getDate(): Date | undefined;
    setDate(date: Date | undefined, silent?: boolean): void;
}
export declare const AgInputDateFieldSelector: ComponentSelector;
