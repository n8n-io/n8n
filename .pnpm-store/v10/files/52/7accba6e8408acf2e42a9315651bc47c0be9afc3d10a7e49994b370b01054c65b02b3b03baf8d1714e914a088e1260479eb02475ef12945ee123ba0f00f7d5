import type { BeanCollection } from '../context/context';
import type { CellPosition } from '../interfaces/iCellPosition';
import type { RowPinnedType } from '../interfaces/iRowNode';
import type { RowPosition } from '../interfaces/iRowPosition';
import type { CellCtrl } from '../rendering/cell/cellCtrl';
import type { RowNode } from './rowNode';
export declare function _createCellId(cellPosition: CellPosition): string;
export declare function _areCellsEqual(cellA: CellPosition, cellB: CellPosition): boolean;
export declare function _isRowBefore(rowA: RowPosition, rowB: RowPosition): boolean;
export declare function _isSameRow(rowA: RowPosition | undefined, rowB: RowPosition | undefined): boolean;
export declare function _getFirstRow(beans: BeanCollection): RowPosition | null;
export declare function _getLastRow(beans: BeanCollection): RowPosition | null;
export declare function _getRowNode(beans: BeanCollection, gridRow: RowPosition): RowNode | undefined;
export declare function _getCellByPosition(beans: BeanCollection, cellPosition: CellPosition): CellCtrl | null;
export declare function _getRowById(beans: BeanCollection, rowId: string, rowPinned?: RowPinnedType): RowNode | undefined;
/**
 * Gets the row position above the given row position. Considers pinned and sticky rows for navigation.
 * RowModel.getRow() is expensive, so it is only called if `checkSticky` is true.
 */
export declare function _getRowAbove(beans: BeanCollection, rowPosition: RowPosition, checkSticky?: boolean): RowPosition | null;
export declare function _getAbsoluteRowIndex(beans: BeanCollection, rowPosition: RowPosition): number;
/**
 * Returns the row position below the given row position. Considers pinned and sticky rows for navigation.
 * RowModel.getRow() is expensive, so it is only called if `checkSticky` is true.
 */
export declare function _getRowBelow(beans: BeanCollection, rowPosition: RowPosition, checkSticky?: boolean): RowPosition | null;
