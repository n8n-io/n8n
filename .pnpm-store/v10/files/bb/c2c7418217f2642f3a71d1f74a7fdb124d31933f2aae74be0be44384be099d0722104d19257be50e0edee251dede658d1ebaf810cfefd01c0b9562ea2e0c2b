import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgEventType } from '../../eventTypes';
import type { AgEventListener, AgGlobalEventListener } from '../../events';
export declare class ApiEventService extends BeanStub<AgEventType> implements NamedBean {
    beanName: "apiEventSvc";
    private syncListeners;
    private asyncListeners;
    private syncGlobalListeners;
    private globalListenerPairs;
    /** wraps events for frameworks */
    private wrapSvc?;
    postConstruct(): void;
    addEventListener<T extends AgEventType>(eventType: T, userListener: AgEventListener): void;
    removeEventListener<T extends AgEventType>(eventType: T, userListener: AgEventListener): void;
    addGlobalListener(userListener: AgGlobalEventListener): void;
    removeGlobalListener(userListener: AgGlobalEventListener): void;
    private destroyEventListeners;
    private destroyGlobalListeners;
    destroy(): void;
}
