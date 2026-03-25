import type { AgEventType } from '../eventTypes';
import type { ColumnEventName } from './iColumn';
import type { RowNodeEventType } from './iRowNode';
type EventType = AgEventType | RowNodeEventType | ColumnEventName;
export interface IFrameworkEventListenerService<TEventListener extends (e: any) => void, TGlobalEventListener extends (name: string, e: any) => void> {
    wrap(eventType: EventType, userListener: TEventListener): TEventListener;
    wrapGlobal(userListener: TGlobalEventListener): TGlobalEventListener;
    unwrap(eventType: EventType, userListener: TEventListener): TEventListener;
    unwrapGlobal(userListener: TGlobalEventListener): TGlobalEventListener;
}
export {};
