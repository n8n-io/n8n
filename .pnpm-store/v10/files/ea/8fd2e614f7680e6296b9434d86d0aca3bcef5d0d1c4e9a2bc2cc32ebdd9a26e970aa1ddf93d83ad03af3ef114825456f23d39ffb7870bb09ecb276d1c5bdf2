import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgElementParams } from '../utils/dom';
import { AgAbstractLabel } from './agAbstractLabel';
import type { AgFieldParams } from './agFieldParams';
export type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type AgAbstractFieldEvent = 'fieldValueChanged';
export declare abstract class AgAbstractField<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TValue, TConfig extends AgFieldParams = AgFieldParams, TEventType extends string = AgAbstractFieldEvent> extends AgAbstractLabel<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, TConfig, TEventType | AgAbstractFieldEvent> {
    protected readonly className?: string | undefined;
    protected previousValue: TValue | null | undefined;
    protected value: TValue | null | undefined;
    constructor(config?: TConfig, template?: AgElementParams<TComponentSelectorType>, components?: AgComponentSelector<TComponentSelectorType>[], className?: string | undefined);
    postConstruct(): void;
    setLabel(label: string | HTMLElement): this;
    protected refreshAriaLabelledBy(): void;
    setAriaLabel(label?: string | null): this;
    onValueChange(callbackFn: (newValue?: TValue | null) => void): this;
    getWidth(): number;
    setWidth(width: number): this;
    getPreviousValue(): TValue | null | undefined;
    getValue(): TValue | null | undefined;
    setValue(value?: TValue | null, silent?: boolean): this;
}
