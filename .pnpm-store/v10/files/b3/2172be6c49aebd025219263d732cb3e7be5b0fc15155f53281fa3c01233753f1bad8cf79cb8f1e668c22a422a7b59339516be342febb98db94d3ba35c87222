import type { AgColumn } from '../entities/agColumn';
import type { ColumnEventType } from '../events';
import type { IEventService } from '../interfaces/iEventService';
export declare function dispatchColumnPinnedEvent(eventSvc: IEventService, changedColumns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnVisibleEvent(eventSvc: IEventService, changedColumns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnChangedEvent<T extends 'columnValueChanged' | 'columnPivotChanged' | 'columnRowGroupChanged'>(eventSvc: IEventService, type: T, columns: AgColumn[], source: ColumnEventType): void;
export declare function dispatchColumnResizedEvent(eventSvc: IEventService, columns: AgColumn[] | null, finished: boolean, source: ColumnEventType, flexColumns?: AgColumn[] | null): void;
