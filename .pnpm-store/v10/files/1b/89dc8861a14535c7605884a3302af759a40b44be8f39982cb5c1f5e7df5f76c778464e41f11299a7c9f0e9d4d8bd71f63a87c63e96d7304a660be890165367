import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import type { RowNode } from '../../entities/rowNode';
import type { CellPosition } from '../../interfaces/iCellPosition';
import type { CellSpan } from './rowSpanCache';
export declare class RowSpanService extends BeanStub<'spannedCellsUpdated'> implements NamedBean {
    beanName: "rowSpanSvc";
    private readonly spanningColumns;
    postConstruct(): void;
    /**
     * When a new column is created with spanning (or spanning changes for a column)
     * @param column column that is now spanning
     */
    register(column: AgColumn): void;
    private readonly debouncePinnedEvent;
    private readonly debounceModelEvent;
    private dispatchCellsUpdatedEvent;
    /**
     * When a new column is destroyed with spanning (or spanning changes for a column)
     * @param column column that is now spanning
     */
    deregister(column: AgColumn): void;
    private pinnedTimeout;
    private modelTimeout;
    private onRowDataUpdated;
    private buildModelCaches;
    private buildPinnedCaches;
    isCellSpanning(col: AgColumn, rowNode: RowNode): boolean;
    getCellSpanByPosition(position: CellPosition): CellSpan | undefined;
    getCellStart(position: CellPosition): CellPosition | undefined;
    getCellEnd(position: CellPosition): CellPosition | undefined;
    /**
     * Look-up a spanned cell given a col and node as position indicators
     *
     * @param col a column to lookup a span at this position
     * @param rowNode a node that may be spanned at this position
     * @returns the CellSpan object if one exists
     */
    getCellSpan(col: AgColumn, rowNode: RowNode): CellSpan | undefined;
    forEachSpannedColumn(rowNode: RowNode, callback: (col: AgColumn, span: CellSpan) => void): void;
    destroy(): void;
}
