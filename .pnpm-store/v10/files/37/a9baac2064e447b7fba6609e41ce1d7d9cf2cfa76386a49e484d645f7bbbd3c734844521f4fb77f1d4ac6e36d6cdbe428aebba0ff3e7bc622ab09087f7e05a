import type { AgLabelParams, LabelAlignment } from '../interfaces/agFieldParams';
import type { ElementParams } from '../utils/dom';
import type { ComponentEvent, ComponentSelector } from './component';
import { Component } from './component';
type AgAbstractLabelEvent = ComponentEvent;
export declare abstract class AgAbstractLabel<TConfig extends AgLabelParams = AgLabelParams, TEventType extends string = AgAbstractLabelEvent> extends Component<TEventType | AgAbstractLabelEvent> {
    protected abstract eLabel: HTMLElement;
    protected readonly config: TConfig;
    protected labelSeparator: string;
    protected labelAlignment: LabelAlignment;
    protected disabled: boolean;
    private label;
    constructor(config?: TConfig, template?: string | ElementParams, components?: ComponentSelector[]);
    postConstruct(): void;
    protected refreshLabel(): void;
    setLabelSeparator(labelSeparator: string): this;
    getLabelId(): string;
    getLabel(): HTMLElement | string;
    setLabel(label: HTMLElement | string): this;
    setLabelAlignment(alignment: LabelAlignment): this;
    setLabelEllipsis(hasEllipsis: boolean): this;
    setLabelWidth(width: number | 'flex'): this;
    setDisabled(disabled: boolean): this;
    isDisabled(): boolean;
}
export {};
