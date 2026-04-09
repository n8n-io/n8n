import { AgBeanStub } from '../core/agBeanStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IComponent } from '../interfaces/iComponent';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { TooltipCtrl } from '../interfaces/iTooltip';
export declare enum TooltipTrigger {
    HOVER = 0,
    FOCUS = 1
}
export interface BaseTooltipParams<TLocation extends string, TValue = any> {
    location: TLocation;
    /** The value to be rendered by the tooltip. */
    value?: TValue | null;
    /** A callback function that hides the tooltip */
    hideTooltipCallback?: () => void;
}
export declare abstract class BaseTooltipStateManager<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TTooltipParams extends BaseTooltipParams<TLocation>, TTooltipCtrlParams, TLocation extends string> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService> {
    private readonly tooltipCtrl;
    private readonly getTooltipValue;
    private popupSvc?;
    wireBeans(beans: TBeanCollection): void;
    private showTooltipTimeoutId;
    private hideTooltipTimeoutId;
    private interactiveTooltipTimeoutId;
    private interactionEnabled;
    private isInteractingWithTooltip;
    private state;
    private lastMouseEvent;
    private tooltipComp;
    private tooltipPopupDestroyFunc;
    private tooltipInstanceCount;
    private tooltipMouseTrack;
    private tooltipTrigger;
    private tooltipMouseEnterListener;
    private tooltipMouseLeaveListener;
    private tooltipFocusInListener;
    private tooltipFocusOutListener;
    private onBodyScrollEventCallback;
    private onDocumentKeyDownCallback;
    constructor(tooltipCtrl: TooltipCtrl<TLocation, TTooltipCtrlParams>, getTooltipValue: () => any);
    protected abstract createTooltipComp(params: TTooltipParams, callback: (comp: IComponent<TTooltipParams>) => void): void;
    protected abstract setEventHandlers(listener: () => void): void;
    protected abstract clearEventHandlers(): void;
    postConstruct(): void;
    private getGridOptionsTooltipDelay;
    private getTooltipDelay;
    destroy(): void;
    private getTooltipTrigger;
    onMouseEnter(e: MouseEvent): void;
    private onMouseMove;
    private onMouseDown;
    private onMouseLeave;
    private onFocusIn;
    private onFocusOut;
    private onKeyDown;
    prepareToShowTooltip(mouseEvent?: MouseEvent): void;
    private isLastTooltipHiddenRecently;
    private setToDoNothing;
    private showTooltip;
    hideTooltip(forceHide?: boolean): void;
    private newTooltipComponentCallback;
    private onTooltipMouseEnter;
    private onTooltipMouseLeave;
    private onTooltipFocusIn;
    private isTooltipFocused;
    private onTooltipFocusOut;
    private positionTooltip;
    private destroyTooltipComp;
    private clearTooltipListeners;
    private lockService;
    private unlockService;
    private startHideTimeout;
    private clearShowTimeout;
    private clearHideTimeout;
    private clearInteractiveTimeout;
    private clearTimeouts;
}
