import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ChangedPath } from '../utils/changedPath';
import type { ClientSideRowModelStage, IChangedRowNodes } from './iClientSideRowModel';
export interface StageExecuteParams<TData = any> {
    rowNode: RowNode<TData>;
    changedRowNodes?: IChangedRowNodes<TData>;
    rowNodesOrderChanged?: boolean;
    changedPath?: ChangedPath;
    afterColumnsChanged?: boolean;
}
export interface IRowNodeStage<TResult = any, TData = any> {
    step: ClientSideRowModelStage;
    refreshProps: Set<keyof GridOptions>;
    execute(params: StageExecuteParams<TData>): TResult;
}
export interface IRowGroupStage<TResult = any, TData = any> extends IRowNodeStage<TResult, TData> {
    getNode(id: string): RowNode<TData> | undefined;
}
