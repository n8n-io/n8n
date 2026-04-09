import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgEventType } from '../../eventTypes';
import type { AgEventListener, AgGlobalEventListener } from '../../events';
export declare class ApiEventService extends BeanStub<AgEventType> implements NamedBean {
    beanName: "apiEventSvc";
    private readonly syncListeners;
    private readonly asyncListeners;
    private readonly syncGlobalListeners;
    private readonly globalListenerPairs;
    /** wraps events for frameworks */
    private wrapSvc?;
    postConstruct(): void;
    addListener<T extends AgEventType>(eventType: T, userListener: AgEventListener): void;
    removeListener<T extends AgEventType>(eventType: T, userListener: AgEventListener): void;
    addGlobalListener(userListener: AgGlobalEventListener): void;
    removeGlobalListener(userListener: AgGlobalEventListener): void;
    private destroyEventListeners;
    private destroyGlobalListeners;
    destroy(): void;
}
