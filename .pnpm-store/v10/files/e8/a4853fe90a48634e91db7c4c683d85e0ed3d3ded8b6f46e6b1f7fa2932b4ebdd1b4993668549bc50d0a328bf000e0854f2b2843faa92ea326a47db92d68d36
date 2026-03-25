import type { AgInputFieldParams } from '../interfaces/agFieldParams';
import type { AgAbstractFieldEvent, FieldElement } from './agAbstractField';
import { AgAbstractField } from './agAbstractField';
export type AgAbstractInputFieldEvent = AgAbstractFieldEvent;
export declare abstract class AgAbstractInputField<TElement extends FieldElement, TValue, TConfig extends AgInputFieldParams = AgInputFieldParams, TEventType extends string = AgAbstractInputFieldEvent> extends AgAbstractField<TValue, TConfig, AgAbstractInputFieldEvent | TEventType> {
    private inputType;
    private readonly displayFieldTag;
    protected readonly eLabel: HTMLElement;
    protected readonly eWrapper: HTMLElement;
    protected readonly eInput: TElement;
    constructor(config?: TConfig, className?: string, inputType?: string | null | undefined, displayFieldTag?: keyof HTMLElementTagNameMap);
    postConstruct(): void;
    protected addInputListeners(): void;
    setInputType(inputType?: string): void;
    getInputElement(): TElement;
    setInputWidth(width: number | 'flex'): this;
    setInputName(name: string): this;
    getFocusableElement(): HTMLElement;
    setMaxLength(length: number): this;
    setInputPlaceholder(placeholder?: string | null): this;
    setInputAriaLabel(label?: string | null): this;
    setDisabled(disabled: boolean): this;
    setAutoComplete(value: boolean | string): this;
}
