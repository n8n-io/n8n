import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import { AgCheckbox } from './agCheckbox';
import type { AgCheckboxParams } from './agFieldParams';
export interface AgRadioButtonParams<TComponentSelectorType extends string> extends AgCheckboxParams<TComponentSelectorType> {
}
export declare class AgRadioButton<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string> extends AgCheckbox<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, AgRadioButtonParams<TComponentSelectorType>> {
    constructor(config?: AgRadioButtonParams<TComponentSelectorType>);
    protected isSelected(): boolean;
    toggle(): void;
    protected addInputListeners(): void;
    /**
     * This ensures that if another radio button in the same named group is selected, we deselect this radio button.
     * By default the browser does this for you, but we are managing classes ourselves in order to ensure input
     * elements are styled correctly in IE11, and the DOM 'changed' event is only fired when a button is selected,
     * not deselected, so we need to use our own event.
     */
    private onChange;
}
