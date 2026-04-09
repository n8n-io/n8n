import type { ColumnCollections } from '../../columns/columnModel';
import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { CellCtrl } from '../cell/cellCtrl';
export declare class RowAutoHeightService extends BeanStub implements NamedBean {
    beanName: "rowAutoHeight";
    /** grid columns have colDef.autoHeight set */
    active: boolean;
    private wasEverActive;
    /**
     * If row height has been active, request a refresh of the row heights.
     */
    requestCheckAutoHeight(): void;
    private readonly _debouncedCalculateRowHeights;
    private calculateRowHeights;
    /**
     * Set the cell height into the row node, and request a refresh of the row heights if there's been a change.
     * @param rowNode the node to set the auto height on
     * @param cellHeight the height to set, undefined if the cell has just been destroyed
     * @param column the column of the cell
     */
    private setRowAutoHeight;
    /**
     * If using col span, then cells which have been spanned over do not need an auto height value
     * @param col the column of the cell
     * @param node the node of the cell
     * @returns whether the row needs auto height value for that column
     */
    private colSpanSkipCell;
    /**
     * If required, sets up observers to continuously measure changes in the cell height.
     * @param cellCtrl the cellCtrl of the cell
     * @param eCellWrapper the HTMLElement to track the height of
     * @param compBean the component bean to add the destroy/cleanup function to
     * @returns whether or not auto height has been set up on this cell
     */
    setupCellAutoHeight(cellCtrl: CellCtrl, eCellWrapper: HTMLElement | undefined, compBean: BeanStub): boolean;
    setAutoHeightActive(cols: ColumnCollections): void;
    /**
     * Determines if the row auto height service has cells to grow.
     * @returns true if all of the rendered rows are at least as tall as their rendered cells.
     */
    areRowsMeasured(): boolean;
}
