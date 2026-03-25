import type { GridOptions } from '../entities/gridOptions';
import type { EventService } from '../eventService';
import type { AgEventType } from '../eventTypes';
import type { AgEvent, AgEventListener, AgEventTypeParams } from '../events';
import type { GridOptionsService, PropertyChangedListener, PropertyValueChangedListener } from '../gridOptionsService';
import type { IAgEventEmitter, IEventEmitter } from '../interfaces/iEventEmitter';
import { LocalEventService } from '../localEventService';
import type { LocaleTextFunc } from '../misc/locale/localeUtils';
import type { Bean } from './bean';
import type { BeanCollection, Context } from './context';
import type { BaseBean } from './genericContext';
export type BeanStubEvent = 'destroyed';
type EventOrDestroyed<TEventType extends string> = TEventType | BeanStubEvent;
type EventHandlers<TEventKey extends string, TEvent = any> = {
    [K in TEventKey]?: (event?: TEvent) => void;
};
type AgEventHandlers = {
    [K in AgEventType]?: (event: AgEventTypeParams[K]) => void;
};
export declare abstract class BeanStub<TEventType extends string = BeanStubEvent> implements BaseBean<BeanCollection>, Bean, IEventEmitter<EventOrDestroyed<TEventType>> {
    protected localEventService?: LocalEventService<EventOrDestroyed<TEventType>>;
    private stubContext;
    private destroyFunctions;
    private destroyed;
    __v_skip: boolean;
    protected beans: BeanCollection;
    protected eventSvc: EventService;
    protected gos: GridOptionsService;
    preWireBeans(beans: BeanCollection): void;
    destroy(): void;
    /** Add a local event listener against this BeanStub */
    addEventListener<T extends TEventType>(eventType: T, listener: AgEventListener<any, any, any>, async?: boolean): void;
    /** Remove a local event listener from this BeanStub */
    removeEventListener<T extends TEventType>(eventType: T, listener: AgEventListener<any, any, any>, async?: boolean): void;
    dispatchLocalEvent<TEvent extends AgEvent<TEventType>>(event: TEvent): void;
    addManagedElementListeners<TEvent extends keyof HTMLElementEventMap>(object: Element | Document | ShadowRoot, handlers: EventHandlers<TEvent, HTMLElementEventMap[TEvent]>): (() => null)[];
    addManagedEventListeners(handlers: AgEventHandlers): (() => null)[];
    addManagedListeners<TEvent extends string>(object: IEventEmitter<TEvent> | IAgEventEmitter<TEvent>, handlers: EventHandlers<TEvent>): (() => null)[];
    private _setupListeners;
    private _setupListener;
    /**
     * Setup a managed property listener for the given GridOption property.
     * However, stores the destroy function in the beanStub so that if this bean
     * is a component the destroy function will be called when the component is destroyed
     * as opposed to being cleaned up only when the GridOptionsService is destroyed.
     */
    private setupGridOptionListener;
    /**
     * Setup a managed property listener for the given GridOption property.
     * @param event GridOption property to listen to changes for.
     * @param listener Listener to run when property value changes
     */
    addManagedPropertyListener<K extends keyof GridOptions>(event: K, listener: PropertyValueChangedListener<K>): () => null;
    private propertyListenerId;
    private lastChangeSetIdLookup;
    /**
     * Setup managed property listeners for the given set of GridOption properties.
     * The listener will be run if any of the property changes but will only run once if
     * multiple of the properties change within the same framework lifecycle event.
     * Works on the basis that GridOptionsService updates all properties *before* any property change events are fired.
     * @param events Array of GridOption properties to listen for changes too.
     * @param listener Shared listener to run if any of the properties change
     */
    addManagedPropertyListeners(events: (keyof GridOptions)[], listener: PropertyChangedListener): void;
    isAlive: () => boolean;
    getLocaleTextFunc(): LocaleTextFunc;
    addDestroyFunc(func: () => void): void;
    /** doesn't throw an error if `bean` is undefined */
    createOptionalManagedBean<T extends Bean | null | undefined>(bean: T, context?: Context): T | undefined;
    createManagedBean<T extends Bean>(bean: T, context?: Context): T;
    createBean<T extends Bean>(bean: T, context?: Context | null, afterPreCreateCallback?: (bean: Bean) => void): T;
    /**
     * Destroys a bean and returns undefined to support destruction and clean up in a single line.
     * this.dateComp = this.context.destroyBean(this.dateComp);
     */
    destroyBean<T extends Bean | null | undefined>(bean: T, context?: Context): undefined;
    /**
     * Destroys an array of beans and returns an empty array to support destruction and clean up in a single line.
     * this.dateComps = this.context.destroyBeans(this.dateComps);
     */
    protected destroyBeans<T extends Bean | null | undefined>(beans: T[], context?: Context): T[];
}
export {};
