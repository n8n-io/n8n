import type { AfterGuiAttachedParams } from './iAfterGuiAttachedParams';
export type AddPopupParams<TContainerType extends string> = LabelAddPopupParams<TContainerType> | OwnsAddPopupParams<TContainerType>;
interface BaseAddPopupParams<TContainerType extends string> {
    modal?: boolean;
    eChild: HTMLElement;
    closeOnEsc?: boolean;
    closedCallback?: (e?: MouseEvent | TouchEvent | KeyboardEvent) => void;
    click?: MouseEvent | Touch | null;
    alwaysOnTop?: boolean;
    afterGuiAttached?: (params: AfterGuiAttachedParams<TContainerType>) => void;
    positionCallback?: () => void;
    anchorToElement?: HTMLElement;
}
interface LabelAddPopupParams<TContainerType extends string> extends BaseAddPopupParams<TContainerType> {
    ariaLabel: string;
    ariaOwns?: never;
}
interface OwnsAddPopupParams<TContainerType extends string> extends BaseAddPopupParams<TContainerType> {
    ariaLabel?: never;
    ariaOwns: HTMLElement;
}
export interface PopupEventParams {
    originalMouseEvent?: MouseEvent | Touch | null;
    mouseEvent?: MouseEvent;
    touchEvent?: TouchEvent;
    keyboardEvent?: KeyboardEvent;
    forceHide?: boolean;
}
export interface AddPopupResult {
    hideFunc: (params?: PopupEventParams) => void;
}
export interface BasePopupPositionParams {
    ePopup: HTMLElement;
    nudgeX?: number;
    nudgeY?: number;
    position?: 'over' | 'under';
    alignSide?: 'left' | 'right';
    keepWithinBounds?: boolean;
    skipObserver?: boolean;
    updatePosition?: () => {
        x: number;
        y: number;
    };
    postProcessCallback?: () => void;
}
export {};
