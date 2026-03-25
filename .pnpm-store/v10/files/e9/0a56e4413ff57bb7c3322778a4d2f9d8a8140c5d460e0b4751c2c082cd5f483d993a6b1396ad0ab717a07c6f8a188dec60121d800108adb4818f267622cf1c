import type { AgColumn } from '../entities/agColumn';
import type { EventService } from '../eventService';
import type { ColumnEventType } from '../events';
export declare function dispatchColumnPinnedEvent(eventSvc: EventService, changedColumns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnVisibleEvent(eventSvc: EventService, changedColumns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnChangedEvent<T extends 'columnValueChanged' | 'columnPivotChanged' | 'columnRowGroupChanged'>(eventSvc: EventService, type: T, columns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnResizedEvent(eventSvc: EventService, columns: AgColumn[] | null, finished: boolean, source: ColumnEventType, flexColumns?: AgColumn[] | null): void;
