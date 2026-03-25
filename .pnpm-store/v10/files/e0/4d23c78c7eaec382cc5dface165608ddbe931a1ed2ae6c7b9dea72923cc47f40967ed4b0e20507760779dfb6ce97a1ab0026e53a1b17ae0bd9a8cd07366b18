import type { AgInputTextFieldParams } from './agInputTextField';
import { AgInputTextField } from './agInputTextField';
import type { ComponentSelector } from './component';
export interface AgInputNumberFieldParams extends AgInputTextFieldParams {
    precision?: number;
    step?: number;
    min?: number;
    max?: number;
}
export declare class AgInputNumberField extends AgInputTextField<AgInputNumberFieldParams> {
    private precision?;
    private step?;
    private min?;
    private max?;
    constructor(config?: AgInputNumberFieldParams);
    postConstruct(): void;
    private onWheel;
    normalizeValue(value: string): string;
    private adjustPrecision;
    setMin(min: number | undefined): this;
    setMax(max: number | undefined): this;
    setPrecision(precision: number): this;
    setStep(step?: number): this;
    setValue(value?: string | null, silent?: boolean): this;
    setStartValue(value?: string | null): void;
    private setValueOrInputValue;
    getValue(): string | null | undefined;
    private isScientificNotation;
}
export declare const AgInputNumberFieldSelector: ComponentSelector;
