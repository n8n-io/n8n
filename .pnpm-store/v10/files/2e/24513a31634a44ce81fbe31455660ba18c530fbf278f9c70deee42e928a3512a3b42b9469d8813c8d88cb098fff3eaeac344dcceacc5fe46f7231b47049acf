import type { AgEvent } from './events';
import type { IEventEmitter, IEventListener, IGlobalEventListener } from './interfaces/iEventEmitter';
import type { IFrameworkOverrides } from './interfaces/iFrameworkOverrides';
export declare class LocalEventService<TEventType extends string> implements IEventEmitter<TEventType> {
    private allSyncListeners;
    private allAsyncListeners;
    private globalSyncListeners;
    private globalAsyncListeners;
    private frameworkOverrides?;
    private asyncFunctionsQueue;
    private scheduled;
    private firedEvents;
    setFrameworkOverrides(frameworkOverrides: IFrameworkOverrides): void;
    private getListeners;
    noRegisteredListenersExist(): boolean;
    addEventListener<T extends TEventType>(eventType: T, listener: IEventListener<T>, async?: boolean): void;
    removeEventListener<T extends TEventType>(eventType: T, listener: IEventListener<T>, async?: boolean): void;
    addGlobalListener(listener: IGlobalEventListener<TEventType>, async?: boolean): void;
    removeGlobalListener(listener: IGlobalEventListener<TEventType>, async?: boolean): void;
    dispatchEvent<TEvent extends AgEvent<TEventType>>(event: TEvent): void;
    dispatchEventOnce(event: AgEvent<TEventType>): void;
    private dispatchToListeners;
    private getGlobalListeners;
    private dispatchAsync;
    private flushAsyncQueue;
}
