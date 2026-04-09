import { AgComponentStub } from '../core/agComponentStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import { AgListItem } from './agListItem';
export interface ListOption<TValue = string> {
    value: TValue;
    text?: string;
}
export type AgListEvent = 'fieldValueChanged' | 'selectedItem';
export declare class AgList<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TEventType extends string = AgListEvent, TValue = string> extends AgComponentStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, TEventType | AgListEvent> {
    private readonly cssIdentifier;
    private options;
    private listItems;
    private highlightedItem;
    private value;
    private displayValue;
    constructor(cssIdentifier?: string);
    postConstruct(): void;
    handleKeyDown(e: KeyboardEvent): void;
    addOptions(listOptions: ListOption<TValue>[]): this;
    addOption(listOption: ListOption<TValue>): this;
    clearOptions(): void;
    setValue(value?: TValue | null, silent?: boolean): this;
    setValueByIndex(idx: number): this;
    getValue(): TValue | null;
    getDisplayValue(): string | null;
    refreshHighlighted(): void;
    highlightItem(item: AgListItem<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, TValue>): void;
    hideItemTooltip(): void;
    destroy(): void;
    private reset;
    private clearHighlighted;
    private renderOption;
    private navigate;
    private navigateToPage;
    private refreshAriaRole;
    private updateIndices;
    private fireChangeEvent;
    private fireItemSelected;
}
