import type { GridOptionsService } from '../gridOptionsService';
import type { IFrameworkOverrides } from '../interfaces/iFrameworkOverrides';
/**
 * a user once raised an issue - they said that when you opened a popup (eg context menu)
 * and then clicked on a selection checkbox, the popup wasn't closed. this is because the
 * popup listens for clicks on the body, however ag-grid WAS stopping propagation on the
 * checkbox clicks (so the rows didn't pick them up as row selection selection clicks).
 * to get around this, we have a pattern to stop propagation for the purposes of AG Grid,
 * but we still let the event pass back to the body.
 * @param {Event} event
 */
export declare function _stopPropagationForAgGrid(event: Event): void;
export declare function _isStopPropagationForAgGrid(event: Event): boolean;
export declare const _isEventSupported: (eventName: any) => boolean;
export declare function _getCtrlForEventTarget<T>(gos: GridOptionsService, eventTarget: EventTarget | null, type: string): T | null;
export declare function _isElementInEventPath(element: HTMLElement, event: Event): boolean;
export declare function _addSafePassiveEventListener(frameworkOverrides: IFrameworkOverrides, eElement: HTMLElement, event: string, listener: (event?: any) => void): void;
export declare const getPassiveStateForEvent: (event: string) => boolean | undefined;
