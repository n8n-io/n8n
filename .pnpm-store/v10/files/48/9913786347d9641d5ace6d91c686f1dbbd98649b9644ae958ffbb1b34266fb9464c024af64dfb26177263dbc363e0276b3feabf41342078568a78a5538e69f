import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { AgEvent } from '../interfaces/agEvent';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IEventEmitter } from '../interfaces/iEventEmitter';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { TooltipCtrl } from '../interfaces/iTooltip';
import { AgTooltipFeature } from './agTooltipFeature';
import type { BaseTooltipParams } from './baseTooltipStateManager';
export type HighlightTooltipEventType = 'itemHighlighted';
export interface HighlightTooltipEvent extends AgEvent<HighlightTooltipEventType> {
    highlighted: boolean;
}
export declare class AgHighlightTooltipFeature<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TTooltipParams extends BaseTooltipParams<TLocation>, TTooltipCtrlParams, TLocation extends string> extends AgTooltipFeature<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TTooltipParams, TTooltipCtrlParams, TLocation> {
    private readonly highlightTracker;
    private tooltipMode;
    constructor(ctrl: TooltipCtrl<TLocation, TTooltipCtrlParams>, highlightTracker: IEventEmitter<HighlightTooltipEventType>, beans?: TBeanCollection);
    postConstruct(): void;
    private wireHighlightListeners;
    private onHighlight;
    private setTooltipMode;
    destroy(): void;
}
