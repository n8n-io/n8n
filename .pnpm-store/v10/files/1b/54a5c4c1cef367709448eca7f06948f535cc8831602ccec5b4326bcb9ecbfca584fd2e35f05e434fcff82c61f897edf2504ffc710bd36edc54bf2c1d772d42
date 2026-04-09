import { AgBeanStub } from '../core/agBeanStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { ITooltipFeature, TooltipCtrl } from '../interfaces/iTooltip';
import type { BaseTooltipParams } from './baseTooltipStateManager';
export declare class AgTooltipFeature<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TTooltipParams extends BaseTooltipParams<TLocation>, TTooltipCtrlParams, TLocation extends string> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService> implements ITooltipFeature {
    private readonly ctrl;
    private tooltip;
    private tooltipManager;
    private browserTooltips;
    constructor(ctrl: TooltipCtrl<TLocation, TTooltipCtrlParams>, beans?: TBeanCollection);
    postConstruct(): void;
    /**
     *
     * @param tooltip The tooltip value
     * @param allowEmptyString Set it to true to allow the title to be set to `''`. This is necessary
     * when the browser adds a default tooltip the element and the tooltip service will be displayed
     * next to a browser tooltip causing confusion.
     */
    private setBrowserTooltip;
    private updateTooltipText;
    private createTooltipFeatureIfNeeded;
    attemptToShowTooltip(): void;
    attemptToHideTooltip(): void;
    setTooltipAndRefresh(tooltip: any): void;
    refreshTooltip(clearWithEmptyString?: boolean): void;
    destroy(): void;
}
