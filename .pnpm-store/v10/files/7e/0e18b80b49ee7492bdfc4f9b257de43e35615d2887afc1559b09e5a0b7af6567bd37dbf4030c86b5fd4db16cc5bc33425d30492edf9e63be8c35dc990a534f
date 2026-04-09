import { Direction } from '../constants/direction';
import { AgBeanStub } from '../core/agBeanStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { AddPopupParams, AddPopupResult, BasePopupPositionParams, PopupEventParams } from '../interfaces/iPopup';
import type { IPopupService } from '../interfaces/iPopupService';
import type { IPropertiesService } from '../interfaces/iProperties';
import { AgPromise } from '../utils/promise';
interface AgPopup {
    element: HTMLElement;
    wrapper: HTMLElement;
    hideFunc: (params?: PopupEventParams) => void;
    isAnchored: boolean;
    instanceId: number;
    alignedToElement?: HTMLElement;
    stopAnchoringPromise?: AgPromise<() => void>;
}
export declare abstract class BasePopupService<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TPopupPositionParams extends BasePopupPositionParams> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService> implements IPopupService<TPopupPositionParams> {
    beanName: "popupSvc";
    protected popupList: AgPopup[];
    getPopupParent(): HTMLElement;
    protected abstract getDefaultPopupParent(): HTMLElement;
    positionPopupUnderMouseEvent(params: TPopupPositionParams & {
        type: string;
        mouseEvent: MouseEvent | Touch;
    }): void;
    private calculatePointerAlign;
    positionPopupByComponent(params: TPopupPositionParams & {
        type: string;
        eventSource: HTMLElement;
    }): void;
    private shouldRenderUnderOrAbove;
    protected setAlignedStyles(ePopup: HTMLElement, positioned: 'right' | 'left' | 'over' | 'above' | 'under' | null): void;
    protected setAlignedTo(eventSource: HTMLElement, ePopup: HTMLElement): void;
    protected abstract callPostProcessPopup(params: Omit<TPopupPositionParams, keyof BasePopupPositionParams>, type: string, ePopup: HTMLElement, eventSource?: HTMLElement | null, mouseEvent?: MouseEvent | Touch | null): void;
    positionPopup(params: BasePopupPositionParams): void;
    getParentRect(): {
        top: number;
        left: number;
        right: number;
        bottom: number;
    };
    protected keepXYWithinBounds(ePopup: HTMLElement, position: number, direction: Direction): number;
    addPopup<TContainerType extends string>(params: AddPopupParams<TContainerType>): AddPopupResult;
    private initialisePopupPosition;
    private createPopupWrapper;
    protected abstract isStopPropagation(event: Event): boolean;
    private addEventListenersToPopup;
    private addPopupToPopupList;
    private getPopupIndex;
    setPopupPositionRelatedToElement(popupEl: HTMLElement, relativeElement?: HTMLElement | null): AgPromise<() => void> | undefined;
    private removePopupFromPopupList;
    private keepPopupPositionedRelativeTo;
    private isEventFromCurrentPopup;
    isElementWithinCustomPopup(el: HTMLElement): boolean;
    private getWrapper;
    private setAlwaysOnTop;
    /** @returns true if moved */
    bringPopupToFront(ePopup: HTMLElement): void;
}
export {};
