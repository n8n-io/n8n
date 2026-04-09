import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgInputTextFieldParams } from './agInputTextField';
import { AgInputTextField } from './agInputTextField';
import type { AgWidgetSelectorType } from './agWidgetSelectorType';
export interface AgInputNumberFieldParams<TComponentSelectorType extends string> extends AgInputTextFieldParams<TComponentSelectorType> {
    precision?: number;
    step?: number;
    min?: number;
    max?: number;
}
export declare class AgInputNumberField<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string> extends AgInputTextField<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, AgInputNumberFieldParams<TComponentSelectorType>> {
    private precision?;
    private step?;
    private min?;
    private max?;
    constructor(config?: AgInputNumberFieldParams<TComponentSelectorType>);
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
export declare const AgInputNumberFieldSelector: AgComponentSelector<AgWidgetSelectorType>;
