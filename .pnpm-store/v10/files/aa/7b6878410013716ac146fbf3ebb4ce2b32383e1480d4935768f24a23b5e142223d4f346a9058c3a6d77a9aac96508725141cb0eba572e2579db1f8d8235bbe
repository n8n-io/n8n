import type { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { CellFocusedEvent } from '../../events';
import type { CellPosition } from '../../interfaces/iCellPosition';
import type { ICellComp } from '../cell/cellCtrl';
import { CellCtrl } from '../cell/cellCtrl';
import type { RowCtrl } from '../row/rowCtrl';
import type { CellSpan } from './rowSpanCache';
export declare class SpannedCellCtrl extends CellCtrl {
    private readonly cellSpan;
    private readonly SPANNED_CELL_CSS_CLASS;
    private eWrapper;
    constructor(cellSpan: CellSpan, rowCtrl: RowCtrl, beans: BeanCollection);
    private focusedCellPosition;
    setComp(comp: ICellComp, eCell: HTMLElement, eWrapper: HTMLElement | undefined, eCellWrapper: HTMLElement | undefined, printLayout: boolean, startEditing: boolean, compBean: BeanStub<'destroyed'> | undefined): void;
    isCellSpanning(): boolean;
    getCellSpan(): CellSpan | undefined;
    /**
     * When cell is spanning, ensure row index is also available on the cell
     */
    refreshAriaRowIndex(): void;
    /**
     * When cell is spanning, ensure row index is also available on the cell
     */
    private setAriaRowSpan;
    setFocusedCellPosition(cellPos: CellPosition): void;
    getFocusedCellPosition(): CellPosition;
    protected checkCellFocused(): boolean;
    protected applyStaticCssClasses(): void;
    onCellFocused(event?: CellFocusedEvent): void;
    getRootElement(): HTMLElement;
}
