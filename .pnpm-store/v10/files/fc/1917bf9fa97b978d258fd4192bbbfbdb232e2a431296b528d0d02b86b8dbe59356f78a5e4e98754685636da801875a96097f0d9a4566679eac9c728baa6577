import type { UtilBeanCollection } from '../interfaces/agCoreBeanCollection';
export declare const _isEventSupported: (eventName: any) => boolean;
export declare function _isElementInEventPath(element: HTMLElement, event: Event): boolean;
export declare function _addSafePassiveEventListener(eElement: HTMLElement, event: string, listener: (event?: any) => void): void;
/**
 * `True` if the event is close to the original event by X pixels either vertically or horizontally.
 * we only start dragging after X pixels so this allows us to know if we should start dragging yet.
 * @param {MouseEvent | TouchEvent} e1
 * @param {MouseEvent | TouchEvent} e2
 * @param {number} pixelCount
 * @returns {boolean}
 */
export declare function _areEventsNear(e1: MouseEvent | Touch, e2: MouseEvent | Touch, pixelCount: number): boolean;
/**
 * Returns the first touch in the touch list that matches the identifier of the provided touch.
 * @param touch The touch to match the identifier against.
 * @param touchList The list of touches to search.
 * @returns The matching touch, or null if not found.
 */
export declare const _getFirstActiveTouch: (touch: Touch, touchList: TouchList) => Touch | null;
export declare function _isEventFromThisInstance(beans: UtilBeanCollection, event: UIEvent): boolean;
export declare function _anchorElementToMouseMoveEvent(element: HTMLElement, mouseMoveEvent: MouseEvent | Touch, beans: UtilBeanCollection): void;
/**  Tuple [target, type, listener, options?] */
export type TempEventHandler = [
    target: EventTarget,
    type: string,
    listener: (e: Event) => void,
    options?: boolean | AddEventListenerOptions
];
export declare const addTempEventHandlers: (list: TempEventHandler[], ...handlers: TempEventHandler[]) => void;
export declare const clearTempEventHandlers: (list: TempEventHandler[] | null | undefined) => void;
export declare const preventEventDefault: (event: Event) => void;
