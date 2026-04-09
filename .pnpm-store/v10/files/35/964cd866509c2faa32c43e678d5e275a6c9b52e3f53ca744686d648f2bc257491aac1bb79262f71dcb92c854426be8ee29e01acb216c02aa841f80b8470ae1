import { AgBeanStub } from '../core/agBeanStub';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { AgEventService, AgEventServiceGlobalListener, AgEventServiceListener, AgRawEvents } from '../interfaces/iEvent';
import type { IPropertiesService } from '../interfaces/iProperties';
export declare class BaseEventService<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, keyof TGlobalEvents & string> implements AgEventService<TGlobalEvents, TCommon> {
    beanName: "eventSvc";
    eventServiceType: "global";
    private readonly globalSvc;
    addListener<TEventType extends keyof TGlobalEvents & string>(eventType: TEventType, listener: AgEventServiceListener<TGlobalEvents, TEventType>, async?: boolean): void;
    removeListener<TEventType extends keyof TGlobalEvents & string>(eventType: TEventType, listener: AgEventServiceListener<TGlobalEvents, TEventType>, async?: boolean): void;
    addGlobalListener(listener: AgEventServiceGlobalListener<keyof TGlobalEvents & string, TGlobalEvents>, async?: boolean): void;
    removeGlobalListener(listener: AgEventServiceGlobalListener<keyof TGlobalEvents & string, TGlobalEvents>, async?: boolean): void;
    dispatchEvent(event: AgRawEvents<TGlobalEvents, TCommon> | BaseEvents[keyof BaseEvents]): void;
    dispatchEventOnce(event: AgRawEvents<TGlobalEvents, TCommon> | BaseEvents[keyof BaseEvents]): void;
}
