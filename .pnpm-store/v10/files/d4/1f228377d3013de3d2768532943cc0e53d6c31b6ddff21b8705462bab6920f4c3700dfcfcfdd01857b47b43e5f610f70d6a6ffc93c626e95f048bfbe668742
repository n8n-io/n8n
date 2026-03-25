import type { NamedBean } from './context/bean';
import { BeanStub } from './context/beanStub';
import type { AgEventType } from './eventTypes';
import type { AgEventListener, AgGlobalEventListener, AllEventsWithoutGridCommon } from './events';
import type { IEventEmitter } from './interfaces/iEventEmitter';
export declare class EventService extends BeanStub<AgEventType> implements NamedBean, IEventEmitter<AgEventType> {
    beanName: "eventSvc";
    private readonly globalSvc;
    postConstruct(): void;
    addEventListener<TEventType extends AgEventType>(eventType: TEventType, listener: AgEventListener<any, any, TEventType>, async?: boolean): void;
    removeEventListener<TEventType extends AgEventType>(eventType: TEventType, listener: AgEventListener<any, any, TEventType>, async?: boolean): void;
    addGlobalListener(listener: AgGlobalEventListener, async?: boolean): void;
    removeGlobalListener(listener: AgGlobalEventListener, async?: boolean): void;
    /** @deprecated DO NOT FIRE LOCAL EVENTS OFF THE EVENT SERVICE */
    dispatchLocalEvent(): void;
    dispatchEvent(event: AllEventsWithoutGridCommon): void;
    dispatchEventOnce(event: AllEventsWithoutGridCommon): void;
}
