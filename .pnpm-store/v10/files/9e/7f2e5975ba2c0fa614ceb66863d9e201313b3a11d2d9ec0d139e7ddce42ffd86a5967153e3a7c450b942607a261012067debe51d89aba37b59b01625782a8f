import type { RowNode } from '../entities/rowNode';
import type { IChangedRowNodes, RefreshModelParams } from './iClientSideRowModel';
import type { RowDataTransaction } from './rowDataTransaction';
import type { RowNodeTransaction } from './rowNodeTransaction';
/** Result of IClientSideNodeManager.updateRowData method */
export interface ClientSideNodeManagerUpdateRowDataResult<TData = any> {
    changedRowNodes: IChangedRowNodes<TData>;
    /** The RowNodeTransaction containing all the removals, updates and additions */
    rowNodeTransaction: RowNodeTransaction<TData>;
    /** True if at least one row was inserted (and not just appended) */
    rowsInserted: boolean;
}
export interface IClientSideNodeManager<TData = any> {
    activate(rootNode: RowNode<TData> | null): void;
    deactivate(): void;
    getRowNode(id: string): RowNode<TData> | undefined;
    extractRowData(): (TData | undefined)[] | null | undefined;
    setNewRowData(rowData: TData[]): void;
    setImmutableRowData(params: RefreshModelParams<TData>, rowData: TData[]): void;
    updateRowData(rowDataTran: RowDataTransaction<TData>, changedRowNodes: IChangedRowNodes<TData>): ClientSideNodeManagerUpdateRowDataResult<TData>;
}
