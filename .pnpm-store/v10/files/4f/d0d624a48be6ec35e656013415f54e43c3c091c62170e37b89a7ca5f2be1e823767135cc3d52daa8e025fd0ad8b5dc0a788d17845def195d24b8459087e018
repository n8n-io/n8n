import type { AgColumn } from '../entities/agColumn';
import type { ColumnEventType } from '../events';
export interface IGroupFilterService {
    isGroupFilter(column: AgColumn): boolean;
    isFilterAllowed(column: AgColumn): boolean;
    isFilterActive(column: AgColumn): boolean;
    updateFilterFlags(source: ColumnEventType, additionalEventAttributes?: any): void;
}
