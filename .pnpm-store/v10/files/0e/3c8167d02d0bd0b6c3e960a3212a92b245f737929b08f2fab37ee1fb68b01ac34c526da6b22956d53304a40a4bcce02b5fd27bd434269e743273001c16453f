import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgAbstractFieldEvent, FieldElement } from './agAbstractField';
import { AgAbstractField } from './agAbstractField';
import type { AgInputFieldParams } from './agFieldParams';
export type AgAbstractInputFieldEvent = AgAbstractFieldEvent;
export declare abstract class AgAbstractInputField<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TElement extends FieldElement, TValue, TConfig extends AgInputFieldParams<TComponentSelectorType> = AgInputFieldParams<TComponentSelectorType>, TEventType extends string = AgAbstractInputFieldEvent> extends AgAbstractField<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, TValue, TConfig, AgAbstractInputFieldEvent | TEventType> {
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
