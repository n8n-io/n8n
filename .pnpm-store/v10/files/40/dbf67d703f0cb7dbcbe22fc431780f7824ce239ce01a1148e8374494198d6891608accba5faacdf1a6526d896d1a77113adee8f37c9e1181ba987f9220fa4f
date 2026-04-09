import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgAbstractInputFieldEvent } from './agAbstractInputField';
import { AgAbstractInputField } from './agAbstractInputField';
import type { AgInputFieldParams } from './agFieldParams';
import type { AgWidgetSelectorType } from './agWidgetSelectorType';
export interface AgInputTextFieldParams<TComponentSelectorType extends string> extends AgInputFieldParams<TComponentSelectorType> {
    allowedCharPattern?: string;
}
export type AgInputTextFieldEvent = AgAbstractInputFieldEvent;
export declare class AgInputTextField<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TConfig extends AgInputTextFieldParams<TComponentSelectorType> = AgInputTextFieldParams<TComponentSelectorType>, TEventType extends string = AgInputTextFieldEvent> extends AgAbstractInputField<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, HTMLInputElement, string, TConfig, AgInputTextFieldEvent | TEventType> {
    constructor(config?: TConfig, className?: string, inputType?: string);
    postConstruct(): void;
    setValue(value?: string | null, silent?: boolean): this;
    /** Used to set an initial value into the input without necessarily setting `this.value` or triggering events (e.g. to set an invalid value) */
    setStartValue(value?: string | null): void;
    private preventDisallowedCharacters;
}
export declare const AgInputTextFieldSelector: AgComponentSelector<AgWidgetSelectorType>;
