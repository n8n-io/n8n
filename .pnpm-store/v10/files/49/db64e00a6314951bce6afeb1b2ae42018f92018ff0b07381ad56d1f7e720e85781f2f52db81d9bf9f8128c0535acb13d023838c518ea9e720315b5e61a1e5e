import type { AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgInputTextFieldParams } from './agInputTextField';
import { AgInputTextField } from './agInputTextField';
import type { AgWidgetSelectorType } from './agWidgetSelectorType';
export declare class AgInputDateField<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string> extends AgInputTextField<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType> {
    private min?;
    private max?;
    private step?;
    private includeTime?;
    constructor(config?: AgInputTextFieldParams<TComponentSelectorType>);
    postConstruct(): void;
    private onWheel;
    setMin(minDate: Date | string | undefined): this;
    setMax(maxDate: Date | string | undefined): this;
    setStep(step?: number): this;
    setIncludeTime(includeTime?: boolean): this;
    getDate(): Date | undefined;
    setDate(date: Date | undefined, silent?: boolean): void;
}
export declare const AgInputDateFieldSelector: AgComponentSelector<AgWidgetSelectorType>;
