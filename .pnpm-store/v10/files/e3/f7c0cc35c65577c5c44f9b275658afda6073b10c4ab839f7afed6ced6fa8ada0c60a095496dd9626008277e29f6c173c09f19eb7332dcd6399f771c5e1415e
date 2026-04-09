import { AgComponentStub } from '../core/agComponentStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { ITooltipFeature } from '../interfaces/iTooltip';
import type { HighlightTooltipEventType } from '../tooltip/agHighlightTooltipFeature';
export declare class AgListItem<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TValue> extends AgComponentStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType, HighlightTooltipEventType> {
    private readonly label;
    private readonly value;
    private readonly eText;
    tooltipFeature: ITooltipFeature;
    constructor(cssIdentifier: string, label: string, value: TValue);
    postConstruct(): void;
    setHighlighted(highlighted: boolean): void;
    getHeight(): number;
    setIndex(idx: number, setSize: number): void;
    private createTooltip;
    private addEventListeners;
}
