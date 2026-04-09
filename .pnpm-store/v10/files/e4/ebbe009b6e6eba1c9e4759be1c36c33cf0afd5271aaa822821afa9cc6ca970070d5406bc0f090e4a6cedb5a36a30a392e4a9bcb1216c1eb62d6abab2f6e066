import type { AgEvent } from '../interfaces/agEvent';
import type { AgFrameworkOverrides } from '../interfaces/agFrameworkOverrides';
import type { IEventEmitter, IEventListener, IGlobalEventListener } from '../interfaces/iEventEmitter';
export declare class LocalEventService<TEventType extends string> implements IEventEmitter<TEventType> {
    private readonly allSyncListeners;
    private readonly allAsyncListeners;
    private readonly globalSyncListeners;
    private readonly globalAsyncListeners;
    private frameworkOverrides?;
    private asyncFunctionsQueue;
    private scheduled;
    private firedEvents;
    setFrameworkOverrides(frameworkOverrides: AgFrameworkOverrides): void;
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
