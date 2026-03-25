import { BeanStub } from '../context/beanStub';
import type { GetRowIdFunc } from '../entities/gridOptions';
import { RowNode } from '../entities/rowNode';
import type { ClientSideNodeManagerUpdateRowDataResult, IClientSideNodeManager } from '../interfaces/iClientSideNodeManager';
import type { IChangedRowNodes, RefreshModelParams } from '../interfaces/iClientSideRowModel';
import type { RowDataTransaction } from '../interfaces/rowDataTransaction';
/**
 * This is the type of any row in allLeafChildren and childrenAfterGroup of the ClientSideNodeManager rootNode.
 * ClientSideNodeManager is allowed to update the sourceRowIndex property of the nodes.
 */
interface ClientSideNodeManagerRowNode<TData> extends RowNode<TData> {
    sourceRowIndex: number;
}
/**
 * This is the type of the root RowNode of the ClientSideNodeManager
 * ClientSideNodeManager is allowed to update the allLeafChildren and childrenAfterGroup properties of the root node.
 */
interface ClientSideNodeManagerRootNode<TData> extends RowNode<TData> {
    sibling: ClientSideNodeManagerRootNode<TData>;
    allLeafChildren: ClientSideNodeManagerRowNode<TData>[] | null;
    childrenAfterGroup: ClientSideNodeManagerRowNode<TData>[] | null;
}
export declare namespace AbstractClientSideNodeManager {
    type RowNode<TData> = ClientSideNodeManagerRowNode<TData>;
    type RootNode<TData> = ClientSideNodeManagerRootNode<TData>;
}
export declare abstract class AbstractClientSideNodeManager<TData = any> extends BeanStub implements IClientSideNodeManager<TData> {
    private nextId;
    protected allNodesMap: {
        [id: string]: RowNode<TData>;
    };
    rootNode: AbstractClientSideNodeManager.RootNode<TData> | null;
    getRowNode(id: string): RowNode | undefined;
    extractRowData(): TData[] | null | undefined;
    activate(rootNode: ClientSideNodeManagerRootNode<TData>): void;
    deactivate(): void;
    destroy(): void;
    setNewRowData(rowData: TData[]): void;
    private updateRootSiblingArrays;
    protected loadNewRowData(rowData: TData[]): void;
    setImmutableRowData(params: RefreshModelParams<TData>, rowData: TData[]): void;
    /** Called when a node needs to be deleted */
    protected rowNodeDeleted(node: RowNode<TData>): void;
    updateRowData(rowDataTran: RowDataTransaction<TData>, changedRowNodes: IChangedRowNodes<TData>): ClientSideNodeManagerUpdateRowDataResult<TData>;
    protected executeAdd(rowDataTran: RowDataTransaction, result: ClientSideNodeManagerUpdateRowDataResult<TData>): void;
    protected executeRemove(getRowIdFunc: GetRowIdFunc<TData> | undefined, rowDataTran: RowDataTransaction, { changedRowNodes, rowNodeTransaction }: ClientSideNodeManagerUpdateRowDataResult<TData>, nodesToUnselect: RowNode<TData>[]): void;
    protected executeUpdate(getRowIdFunc: GetRowIdFunc<TData> | undefined, rowDataTran: RowDataTransaction, { changedRowNodes, rowNodeTransaction }: ClientSideNodeManagerUpdateRowDataResult<TData>, nodesToUnselect: RowNode<TData>[]): void;
    protected dispatchRowDataUpdateStartedEvent(rowData?: TData[] | null): void;
    protected deselectNodes(nodesToUnselect: RowNode<TData>[]): void;
    private sanitizeAddIndex;
    protected createRowNode(data: TData, sourceRowIndex: number): RowNode<TData>;
    protected lookupRowNode(getRowIdFunc: ((data: any) => string) | undefined, data: TData): RowNode<TData> | null;
}
export {};
