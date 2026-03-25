import { BeanStub } from '../context/beanStub';
import { RowNode } from '../entities/rowNode';
import type { RowPinningState } from '../interfaces/gridState';
import type { IPinnedRowModel } from '../interfaces/iPinnedRowModel';
import type { RowPinnedType } from '../interfaces/iRowNode';
export declare class StaticPinnedRowModel extends BeanStub implements IPinnedRowModel {
    private nextId;
    private pinnedTopRows;
    private pinnedBottomRows;
    postConstruct(): void;
    reset(): void;
    isEmpty(floating: RowPinnedType): boolean;
    isRowsToRender(floating: RowPinnedType): boolean;
    isManual(): boolean;
    pinRow(_node: RowNode<any>, _container: RowPinnedType): void;
    private onGridStylesChanges;
    ensureRowHeightsValid(): boolean;
    private setPinnedRowData;
    /**
     * Updates existing RowNode instances and creates new ones if necessary
     *
     * Setting data as `undefined` will clear row nodes
     */
    private updateNodesFromRowData;
    private setRowTopAndRowIndex;
    getPinnedTopTotalHeight(): number;
    getPinnedBottomTotalHeight(): number;
    getPinnedTopRowCount(): number;
    getPinnedBottomRowCount(): number;
    getPinnedTopRow(index: number): RowNode | undefined;
    getPinnedBottomRow(index: number): RowNode | undefined;
    getPinnedRowById(id: string, floating: NonNullable<RowPinnedType>): RowNode | undefined;
    forEachPinnedRow(floating: NonNullable<RowPinnedType>, callback: (node: RowNode, index: number) => void): void;
    private getCache;
    getPinnedState(): RowPinningState;
    setPinnedState(): void;
    getGrandTotalPinned(): RowPinnedType;
    setGrandTotalPinned(): void;
}
