import type { ChangedRowNodes } from '../clientSideRowModel/changedRowNodes';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ChangedPath } from '../utils/changedPath';
import type { ClientSideRowModelStage } from './iClientSideRowModel';
export interface StageExecuteParams<TData = any> {
    rowNode: RowNode<TData>;
    changedRowNodes?: ChangedRowNodes<TData>;
    changedPath?: ChangedPath;
    afterColumnsChanged?: boolean;
}
export interface IRowNodeStage<TResult = void, TData = any> {
    readonly step: ClientSideRowModelStage;
    readonly refreshProps: (keyof GridOptions<any>)[];
    execute(params: StageExecuteParams<TData>): TResult;
}
export type NestedDataGetter<TData = any> = (data: TData) => TData[] | null | undefined;
export interface IRowGroupStage<TResult = void, TData = any> extends IRowNodeStage<TResult, TData> {
    readonly treeData: boolean;
    getNestedDataGetter(): NestedDataGetter<TData> | null | undefined;
    onPropChange(changedProps: ReadonlySet<keyof GridOptions<any>>): boolean;
    extractData(): TData[];
    /** Gets a tree data filler or row grouping group row by id */
    getNode(id: string): RowNode<TData> | undefined;
    /** Used to lazily compute and store allLeafChildren for a row node */
    loadLeafs(node: RowNode<TData>): RowNode<TData>[] | null;
}
