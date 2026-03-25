import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { IAfterGuiAttachedParams } from '../interfaces/iAfterGuiAttachedParams';
import type { Column } from '../interfaces/iColumn';
import type { PopupEventParams, PopupPositionParams } from '../interfaces/iPopup';
import type { IRowNode } from '../interfaces/iRowNode';
import { AgPromise } from '../utils/promise';
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
export type AddPopupParams = {
    modal?: boolean;
    eChild: HTMLElement;
    closeOnEsc?: boolean;
    closedCallback?: (e?: MouseEvent | TouchEvent | KeyboardEvent) => void;
    click?: MouseEvent | Touch | null;
    alwaysOnTop?: boolean;
    afterGuiAttached?: (params: IAfterGuiAttachedParams) => void;
    positionCallback?: () => void;
    anchorToElement?: HTMLElement;
} & XOR<{
    ariaLabel: string;
}, {
    ariaOwns: HTMLElement;
}>;
interface AddPopupResult {
    hideFunc: (params?: PopupEventParams) => void;
}
export declare class PopupService extends BeanStub implements NamedBean {
    beanName: "popupSvc";
    private gridCtrl;
    private popupList;
    postConstruct(): void;
    getPopupParent(): HTMLElement;
    positionPopupForMenu(params: {
        eventSource: HTMLElement;
        ePopup: HTMLElement;
        column: Column | null;
        node: IRowNode | null;
        event?: MouseEvent | KeyboardEvent;
    }): void;
    positionPopupUnderMouseEvent(params: PopupPositionParams & {
        type: string;
        mouseEvent: MouseEvent | Touch;
    }): void;
    private calculatePointerAlign;
    positionPopupByComponent(params: PopupPositionParams & {
        type: string;
        eventSource: HTMLElement;
    }): void;
    private shouldRenderUnderOrAbove;
    private setAlignedStyles;
    private setAlignedTo;
    callPostProcessPopup(type: string, ePopup: HTMLElement, eventSource?: HTMLElement | null, mouseEvent?: MouseEvent | Touch | null, column?: Column | null, rowNode?: IRowNode | null): void;
    positionPopup(params: PopupPositionParams): void;
    getActivePopups(): HTMLElement[];
    getParentRect(): {
        top: number;
        left: number;
        right: number;
        bottom: number;
    };
    private keepXYWithinBounds;
    addPopup(params: AddPopupParams): AddPopupResult;
    private initialisePopupPosition;
    private createPopupWrapper;
    private handleThemeChange;
    private addEventListenersToPopup;
    private addPopupToPopupList;
    private getPopupIndex;
    setPopupPositionRelatedToElement(popupEl: HTMLElement, relativeElement?: HTMLElement | null): AgPromise<() => void> | undefined;
    private removePopupFromPopupList;
    private keepPopupPositionedRelativeTo;
    hasAnchoredPopup(): boolean;
    private isEventFromCurrentPopup;
    isElementWithinCustomPopup(el: HTMLElement): boolean;
    private getWrapper;
    setAlwaysOnTop(ePopup: HTMLElement, alwaysOnTop?: boolean): void;
    /** @returns true if moved */
    bringPopupToFront(ePopup: HTMLElement): void;
}
export {};
