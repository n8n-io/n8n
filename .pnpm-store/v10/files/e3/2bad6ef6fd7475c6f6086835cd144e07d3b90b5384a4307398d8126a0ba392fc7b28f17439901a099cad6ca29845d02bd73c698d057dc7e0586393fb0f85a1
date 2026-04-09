import type { AgCoreBean } from './agCoreBean';
import type { AgEvent } from './agEvent';
import type { BaseEvents } from './baseEvents';
import type { BaseProperties } from './baseProperties';
import type { AgEventHandlers } from './iContext';
import type { IAgEventEmitter, IEventEmitter, IEventListener } from './iEventEmitter';
import type { LocaleTextFunc } from './iLocaleService';
import type { AgPropertyChangedListener, AgPropertyValueChangedListener } from './iProperties';
/** Includes bean event and property handling logic */
export interface AgBean<TBeanCollection, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TLocalEventType extends string> extends AgCoreBean<TBeanCollection> {
    addEventListener<T extends TLocalEventType>(eventType: T, listener: IEventListener<TLocalEventType>, async?: boolean): void;
    removeEventListener<T extends TLocalEventType>(eventType: T, listener: IEventListener<TLocalEventType>, async?: boolean): void;
    dispatchLocalEvent<TEvent extends AgEvent<TLocalEventType>>(event: TEvent): void;
    addManagedElementListeners<TEvent extends keyof HTMLElementEventMap>(object: Element | Document | ShadowRoot, handlers: AgEventHandlers<TEvent, HTMLElementEventMap[TEvent]>): (() => null)[];
    addManagedEventListeners(handlers: {
        [K in keyof TGlobalEvents]?: (event: TGlobalEvents[K]) => void;
    }): (() => null)[];
    addManagedListeners<TEvent extends string>(object: IEventEmitter<TEvent> | IAgEventEmitter<TEvent>, handlers: AgEventHandlers<TEvent>): (() => null)[];
    /**
     * Setup a managed property listener for the given GridOption property.
     * @param event GridOption property to listen to changes for.
     * @param listener Listener to run when property value changes
     */
    addManagedPropertyListener<K extends keyof TProperties & string>(event: K, listener: AgPropertyValueChangedListener<TProperties, K>): () => null;
    /**
     * Setup managed property listeners for the given set of GridOption properties.
     * The listener will be run if any of the property changes but will only run once if
     * multiple of the properties change within the same framework lifecycle event.
     * Works on the basis that GridOptionsService updates all properties *before* any property change events are fired.
     * @param events Array of GridOption properties to listen for changes too.
     * @param listener Shared listener to run if any of the properties change
     */
    addManagedPropertyListeners(events: (keyof TProperties)[], listener: AgPropertyChangedListener<TProperties>): void;
    getLocaleTextFunc(): LocaleTextFunc;
}
