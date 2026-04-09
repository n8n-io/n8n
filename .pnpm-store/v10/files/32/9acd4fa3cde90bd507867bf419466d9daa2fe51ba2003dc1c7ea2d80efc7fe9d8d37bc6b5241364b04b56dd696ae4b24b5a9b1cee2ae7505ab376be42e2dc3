import type { AgEvent } from './agEvent';
export type IEventListener<TEventType extends string> = (params: AgEvent<TEventType>) => void;
export type IGlobalEventListener<TEventType extends string> = (eventType: TEventType, event: AgEvent<TEventType>) => void;
export interface IEventEmitter<TEventType extends string> {
    addEventListener(eventType: TEventType, listener: IEventListener<TEventType>, async?: boolean, options?: AddEventListenerOptions): void;
    removeEventListener(eventType: TEventType, listener: IEventListener<TEventType>, async?: boolean, options?: AddEventListenerOptions): void;
}
/** Internal version of IEventEmitter so that we can avoid the public api methods on RowNode and Column that need
 * to handle the Angular Zone wrapping of event handlers.
 */
export interface IAgEventEmitter<TEventType extends string> {
    __addEventListener(eventType: TEventType, listener: IEventListener<TEventType>, async?: boolean, options?: AddEventListenerOptions): void;
    __removeEventListener(eventType: TEventType, listener: IEventListener<TEventType>, async?: boolean, options?: AddEventListenerOptions): void;
}
