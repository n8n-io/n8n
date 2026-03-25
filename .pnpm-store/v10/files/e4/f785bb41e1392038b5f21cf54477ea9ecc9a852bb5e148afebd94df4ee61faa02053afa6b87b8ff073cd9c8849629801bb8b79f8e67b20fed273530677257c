import type { AgFieldParams } from '../interfaces/agFieldParams';
import type { ElementParams } from '../utils/dom';
import { AgAbstractLabel } from './agAbstractLabel';
import type { ComponentSelector } from './component';
export type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export type AgAbstractFieldEvent = 'fieldValueChanged';
export declare abstract class AgAbstractField<TValue, TConfig extends AgFieldParams = AgFieldParams, TEventType extends string = AgAbstractFieldEvent> extends AgAbstractLabel<TConfig, TEventType | AgAbstractFieldEvent> {
    protected readonly className?: string | undefined;
    protected previousValue: TValue | null | undefined;
    protected value: TValue | null | undefined;
    constructor(config?: TConfig, template?: ElementParams, components?: ComponentSelector[], className?: string | undefined);
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
