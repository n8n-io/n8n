import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { RowNode } from '../entities/rowNode';
import type { RowPinningState } from '../interfaces/gridState';
import type { IPinnedRowModel } from '../interfaces/iPinnedRowModel';
import type { RowPinnedType } from '../interfaces/iRowNode';
export declare class ManualPinnedRowModel extends BeanStub implements IPinnedRowModel {
    private top;
    private bottom;
    /**
     * Determines where the grand total row should be pinned. Need a separate flag to break
     * an infinite recursion with CSRM.
     */
    private _grandTotalPinned;
    postConstruct(): void;
    destroy(): void;
    reset(dispatch?: boolean): void;
    pinRow(rowNode: RowNode, float: RowPinnedType, column?: AgColumn | null): void;
    isManual(): boolean;
    isEmpty(floating: NonNullable<RowPinnedType>): boolean;
    isRowsToRender(floating: NonNullable<RowPinnedType>): boolean;
    ensureRowHeightsValid(): boolean;
    getPinnedTopTotalHeight(): number;
    getPinnedBottomTotalHeight(): number;
    getPinnedTopRowCount(): number;
    getPinnedBottomRowCount(): number;
    getPinnedTopRow(index: number): RowNode | undefined;
    getPinnedBottomRow(index: number): RowNode | undefined;
    getPinnedRowById(id: string, floating: NonNullable<RowPinnedType>): RowNode | undefined;
    forEachPinnedRow(floating: NonNullable<RowPinnedType>, callback: (node: RowNode, index: number) => void): void;
    getPinnedState(): RowPinningState;
    setPinnedState(state: RowPinningState): void;
    getGrandTotalPinned(): RowPinnedType;
    setGrandTotalPinned(value: RowPinnedType): void;
    private tryToEmptyQueues;
    private pinGrandTotalRow;
    private onGridStylesChanges;
    private getContainer;
    private findPinnedRowNode;
    private refreshRowPositions;
    private forContainers;
    private dispatchRowPinnedEvents;
}
