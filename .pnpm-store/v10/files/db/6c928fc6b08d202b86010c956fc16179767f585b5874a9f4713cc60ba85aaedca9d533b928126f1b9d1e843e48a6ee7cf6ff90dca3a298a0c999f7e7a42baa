import type { BeanCollection } from '../../context/context';
import type { AgPublicEventType } from '../../eventTypes';
import type { AgEventListener, AgGlobalEventListener } from '../../events';
export declare function addEventListener<TEventType extends AgPublicEventType>(beans: BeanCollection, eventType: TEventType, listener: AgEventListener<any, any, TEventType>): void;
export declare function removeEventListener<TEventType extends AgPublicEventType>(beans: BeanCollection, eventType: TEventType, listener: AgEventListener<any, any, TEventType>): void;
export declare function addGlobalListener<TEventType extends AgPublicEventType>(beans: BeanCollection, listener: AgGlobalEventListener<any, any, TEventType>): void;
export declare function removeGlobalListener<TEventType extends AgPublicEventType>(beans: BeanCollection, listener: AgGlobalEventListener<any, any, TEventType>): void;
