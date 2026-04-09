import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import { AgCheckbox } from './agCheckbox';
import type { AgCheckboxParams } from './agFieldParams';
import type { AgWidgetSelectorType } from './agWidgetSelectorType';
export interface AgToggleButtonParams<TComponentSelectorType extends string> extends AgCheckboxParams<TComponentSelectorType> {
}
export declare class AgToggleButton<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string> extends AgCheckbox<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, AgToggleButtonParams<TComponentSelectorType>> {
    constructor(config?: AgToggleButtonParams<TComponentSelectorType>);
    setValue(value: boolean, silent?: boolean): this;
}
export declare const AgToggleButtonSelector: AgComponentSelector<AgWidgetSelectorType>;
