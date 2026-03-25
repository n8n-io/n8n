import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import type { RowNode } from '../../entities/rowNode';
import type { CellPosition } from '../../interfaces/iCellPosition';
export declare class CellSpan {
    readonly col: AgColumn;
    readonly firstNode: RowNode;
    readonly cellSpan = true;
    readonly spannedNodes: Set<RowNode>;
    private lastNode;
    constructor(col: AgColumn, firstNode: RowNode);
    /**
     * Reset the span leaving only the head.
     * Head is used as a comparison as this is the row used to render this cell
     * Even if the row data changes, the cell will properly reflect the correct value.
     */
    reset(): void;
    addSpannedNode(node: RowNode): void;
    getLastNode(): RowNode;
    getCellHeight(): number;
    doesSpanContain(cellPosition: CellPosition): boolean;
    /**
     * Gets the auto height value for last node in the spanned cell.
     * The first node is used to store the auto height for the cell, but the additional height for this cell
     * needs applied to the last row in the span.
     */
    getLastNodeAutoHeight(): number | undefined;
}
/**
 * Belongs to a column, when cells are to be rendered they call back to this service with the values.
 * This service determines if the cell should instead be replaced with a spanning cell, in which case the cell is
 * stretched over multiple rows.
 *
 * Only create if spanning is enabled for this column.
 */
export declare class RowSpanCache extends BeanStub {
    private readonly column;
    private centerValueNodeMap;
    private topValueNodeMap;
    private bottomValueNodeMap;
    constructor(column: AgColumn);
    buildCache(pinned: 'top' | 'center' | 'bottom'): void;
    isCellSpanning(node: RowNode): boolean;
    getCellSpan(node: RowNode): CellSpan | undefined;
}
