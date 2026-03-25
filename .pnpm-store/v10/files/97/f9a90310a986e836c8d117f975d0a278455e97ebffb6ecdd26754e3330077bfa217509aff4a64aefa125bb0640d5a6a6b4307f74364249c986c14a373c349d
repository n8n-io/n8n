import type { AgInputFieldParams } from '../interfaces/agFieldParams';
import type { AgAbstractInputFieldEvent } from './agAbstractInputField';
import { AgAbstractInputField } from './agAbstractInputField';
import type { ComponentSelector } from './component';
export interface AgInputTextFieldParams extends AgInputFieldParams {
    allowedCharPattern?: string;
}
type AgInputTextFieldEvent = AgAbstractInputFieldEvent;
export declare class AgInputTextField<TConfig extends AgInputTextFieldParams = AgInputTextFieldParams, TEventType extends string = AgInputTextFieldEvent> extends AgAbstractInputField<HTMLInputElement, string, TConfig, AgInputTextFieldEvent | TEventType> {
    constructor(config?: TConfig, className?: string, inputType?: string);
    postConstruct(): void;
    setValue(value?: string | null, silent?: boolean): this;
    /** Used to set an initial value into the input without necessarily setting `this.value` or triggering events (e.g. to set an invalid value) */
    setStartValue(value?: string | null): void;
    private preventDisallowedCharacters;
}
export declare const AgInputTextFieldSelector: ComponentSelector;
export {};
