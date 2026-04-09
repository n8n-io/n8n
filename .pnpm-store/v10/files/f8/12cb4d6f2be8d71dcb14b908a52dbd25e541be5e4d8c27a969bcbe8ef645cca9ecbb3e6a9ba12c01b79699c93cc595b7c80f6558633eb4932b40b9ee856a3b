import { LocalEventService } from '../events/localEventService';
import type { AgBaseBean } from '../interfaces/agBaseBean';
import type { AgBean } from '../interfaces/agBean';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { AgEvent } from '../interfaces/agEvent';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IContext } from '../interfaces/iContext';
import type { AgEventService } from '../interfaces/iEvent';
import type { IAgEventEmitter, IEventEmitter, IEventListener } from '../interfaces/iEventEmitter';
import type { LocaleTextFunc } from '../interfaces/iLocaleService';
import type { AgPropertyChangedListener, AgPropertyValueChangedListener, IPropertiesService } from '../interfaces/iProperties';
export type AgBeanStubEvent = 'destroyed';
type AgEventOrDestroyed<TEventType extends string> = TEventType | AgBeanStubEvent;
type EventHandlers<TEventKey extends string, TEvent = any> = {
    [K in TEventKey]?: (event?: TEvent) => void;
};
export declare abstract class AgBeanStub<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TLocalEventType extends string = AgBeanStubEvent> implements AgBean<TBeanCollection, TProperties, TGlobalEvents, TLocalEventType>, IEventEmitter<AgEventOrDestroyed<TLocalEventType>> {
    protected localEventService?: LocalEventService<AgEventOrDestroyed<TLocalEventType>>;
    private stubContext;
    private destroyFunctions;
    private destroyed;
    __v_skip: boolean;
    protected beans: TBeanCollection;
    protected eventSvc: AgEventService<TGlobalEvents, TCommon>;
    protected gos: TPropertiesService;
    preWireBeans(beans: TBeanCollection): void;
    destroy(): void;
    /** Add a local event listener against this BeanStub */
    addEventListener<T extends TLocalEventType>(eventType: T, listener: IEventListener<T>, async?: boolean): void;
    /** Remove a local event listener from this BeanStub */
    removeEventListener<T extends TLocalEventType>(eventType: T, listener: IEventListener<T>, async?: boolean): void;
    dispatchLocalEvent<TEvent extends AgEvent<TLocalEventType>>(event: TEvent): void;
    addManagedElementListeners<TEvent extends keyof HTMLElementEventMap>(object: Element | Document | ShadowRoot, handlers: EventHandlers<TEvent, HTMLElementEventMap[TEvent]>): (() => null)[];
    addManagedEventListeners(handlers: {
        [K in keyof TGlobalEvents]?: (event: TGlobalEvents[K]) => void;
    } | {
        [K in keyof BaseEvents]?: (event: BaseEvents[K]) => void;
    }): (() => null)[];
    addManagedListeners<TEvent extends string>(object: IEventEmitter<TEvent> | IAgEventEmitter<TEvent> | AgEventService<TGlobalEvents, TCommon>, handlers: EventHandlers<TEvent>): (() => null)[];
    private _setupListeners;
    private _setupListener;
    /**
     * Setup a managed property listener for the given property.
     * However, stores the destroy function in the beanStub so that if this bean
     * is a component the destroy function will be called when the component is destroyed
     * as opposed to being cleaned up only when the properties service is destroyed.
     */
    private setupPropertyListener;
    /**
     * Setup a managed property listener for the given GridOption property.
     * @param event GridOption property to listen to changes for.
     * @param listener Listener to run when property value changes
     */
    addManagedPropertyListener<K extends keyof TProperties & string>(event: K, listener: AgPropertyValueChangedListener<TProperties, K>): () => null;
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
    addManagedPropertyListeners(events: (keyof TProperties)[], listener: AgPropertyChangedListener<TProperties>): void;
    isAlive: () => boolean;
    getLocaleTextFunc(): LocaleTextFunc;
    addDestroyFunc(func: () => void): void;
    /** doesn't throw an error if `bean` is undefined */
    createOptionalManagedBean<T extends AgBaseBean<TBeanCollection> | null | undefined>(bean: T, context?: IContext<TBeanCollection>): T | undefined;
    createManagedBean<T extends AgBaseBean<TBeanCollection>>(bean: T, context?: IContext<TBeanCollection>): T;
    createBean<T extends AgBaseBean<TBeanCollection>>(bean: T, context?: IContext<TBeanCollection> | null, afterPreCreateCallback?: (bean: AgBaseBean<TBeanCollection>) => void): T;
    /**
     * Destroys a bean and returns undefined to support destruction and clean up in a single line.
     * this.dateComp = this.context.destroyBean(this.dateComp);
     */
    destroyBean(bean: AgBaseBean<TBeanCollection> | null | undefined, context?: IContext<TBeanCollection>): undefined;
    /**
     * Destroys an array of beans and returns an empty array to support destruction and clean up in a single line.
     * this.dateComps = this.context.destroyBeans(this.dateComps);
     */
    protected destroyBeans<T extends AgBaseBean<TBeanCollection>>(beans: (T | null | undefined)[], context?: IContext<TBeanCollection>): T[];
}
export {};
