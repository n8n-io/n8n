import { Component } from './component';
export interface ListOption<TValue = string> {
    value: TValue;
    text?: string;
}
type AgListEvent = 'fieldValueChanged' | 'selectedItem';
export declare class AgList<TEventType extends string = AgListEvent, TValue = string> extends Component<TEventType | AgListEvent> {
    private readonly cssIdentifier;
    private readonly unFocusable;
    private readonly activeClass;
    private options;
    private itemEls;
    private highlightedEl;
    private value;
    private displayValue;
    constructor(cssIdentifier?: string, unFocusable?: boolean);
    postConstruct(): void;
    handleKeyDown(e: KeyboardEvent): void;
    private navigate;
    private navigateToPage;
    addOptions(listOptions: ListOption<TValue>[]): this;
    addOption(listOption: ListOption<TValue>): this;
    clearOptions(): void;
    private refreshAriaRole;
    private updateIndices;
    private renderOption;
    setValue(value?: TValue | null, silent?: boolean): this;
    setValueByIndex(idx: number): this;
    getValue(): TValue | null;
    getDisplayValue(): string | null;
    refreshHighlighted(): void;
    private reset;
    private highlightItem;
    private clearHighlighted;
    private fireChangeEvent;
    private fireItemSelected;
}
export {};
