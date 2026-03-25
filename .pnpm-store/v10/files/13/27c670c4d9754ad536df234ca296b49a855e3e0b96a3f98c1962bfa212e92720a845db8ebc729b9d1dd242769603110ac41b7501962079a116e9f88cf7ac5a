import type { AgPickerFieldParams } from '../interfaces/agFieldParams';
import type { ListOption } from './agList';
import { AgList } from './agList';
import { AgPickerField } from './agPickerField';
import type { ComponentSelector } from './component';
export interface AgSelectParams<TValue = string> extends Omit<AgPickerFieldParams, 'pickerType' | 'pickerAriaLabelKey' | 'pickerAriaLabelValue'> {
    options?: ListOption<TValue>[];
    pickerType?: string;
    pickerAriaLabelKey?: string;
    pickerAriaLabelValue?: string;
    placeholder?: string;
}
type AgSelectEvent = 'selectedItem';
export declare class AgSelect<TValue = string | null> extends AgPickerField<TValue, AgSelectParams<TValue> & AgPickerFieldParams, AgSelectEvent, AgList<AgSelectEvent, TValue>> {
    protected listComponent: AgList<AgSelectEvent, TValue> | undefined;
    private tooltipFeature?;
    constructor(config?: AgSelectParams<TValue>);
    postConstruct(): void;
    private onWrapperFocusOut;
    private createListComponent;
    protected createPickerComponent(): AgList<"selectedItem", TValue>;
    protected onKeyDown(e: KeyboardEvent): void;
    showPicker(): void;
    addOptions(options: ListOption<TValue>[]): this;
    addOption(option: ListOption<TValue>): this;
    clearOptions(): this;
    setValue(value?: TValue, silent?: boolean, fromPicker?: boolean): this;
    destroy(): void;
}
export declare const AgSelectSelector: ComponentSelector;
export {};
