import type { ColKey, ColumnCollections } from '../columns/columnModel';
import type { AgColumn } from '../entities/agColumn';
import type { GridOptions } from '../entities/gridOptions';
import type { PropertyChangedEvent, PropertyValueChangedEvent } from '../gridOptionsService';
export interface IColumnCollectionService {
    columns: ColumnCollections | null;
    addColumns(cols: ColumnCollections): void;
    createColumns(cols: ColumnCollections, updateOrders: (callback: (cols: AgColumn[] | null) => AgColumn[] | null) => void): void;
    updateColumns(event: PropertyChangedEvent | PropertyValueChangedEvent<keyof GridOptions>): void;
    getColumn(key: ColKey): AgColumn | null;
    getColumns(): AgColumn[] | null;
}
