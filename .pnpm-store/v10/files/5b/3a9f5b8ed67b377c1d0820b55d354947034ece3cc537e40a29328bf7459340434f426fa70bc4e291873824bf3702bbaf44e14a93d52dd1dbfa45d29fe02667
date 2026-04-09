import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { ListOption } from './agList';
import { AgList } from './agList';
import { AgPickerField } from './agPickerField';
import type { AgPickerFieldParams } from './agPickerFieldParams';
import type { AgWidgetSelectorType } from './agWidgetSelectorType';
export interface AgSelectParams<TComponentSelectorType extends string, TValue = string> extends Omit<AgPickerFieldParams<TComponentSelectorType>, 'pickerType' | 'pickerAriaLabelKey' | 'pickerAriaLabelValue'> {
    options?: ListOption<TValue>[];
    pickerType?: string;
    pickerAriaLabelKey?: string;
    pickerAriaLabelValue?: string;
    placeholder?: string;
}
type AgSelectEvent = 'selectedItem';
export declare class AgSelect<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TValue = string | null> extends AgPickerField<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, TValue, AgSelectParams<TComponentSelectorType, TValue> & AgPickerFieldParams<TComponentSelectorType>, AgSelectEvent, AgList<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, AgSelectEvent, TValue>> {
    protected listComponent: AgList<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, AgSelectEvent, TValue> | undefined;
    private tooltipFeature?;
    constructor(config?: AgSelectParams<TComponentSelectorType, TValue>);
    postConstruct(): void;
    private onWrapperFocusOut;
    private createListComponent;
    protected createPickerComponent(): AgList<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, "selectedItem", TValue>;
    protected beforeHidePicker(): void;
    protected onKeyDown(e: KeyboardEvent): void;
    showPicker(): void;
    addOptions(options: ListOption<TValue>[]): this;
    addOption(option: ListOption<TValue>): this;
    clearOptions(): this;
    setValue(value?: TValue, silent?: boolean, fromPicker?: boolean): this;
    destroy(): void;
}
export declare const AgSelectSelector: AgComponentSelector<AgWidgetSelectorType>;
export {};
