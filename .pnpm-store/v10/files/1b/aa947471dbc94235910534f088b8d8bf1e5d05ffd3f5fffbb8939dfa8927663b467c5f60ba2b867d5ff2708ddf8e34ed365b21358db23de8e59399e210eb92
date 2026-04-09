import type { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { IAbstractHeaderCellComp } from '../headerRendering/cells/abstractCell/abstractHeaderCellCtrl';
import type { Column } from '../interfaces/iColumn';
import type { RowPinnedType } from '../interfaces/iRowNode';
import type { CellCtrl } from '../rendering/cell/cellCtrl';
import type { CellPosition } from './iCellPosition';
import type { ICellRangeFeature } from './iCellRangeFeature';
import type { RowPosition } from './iRowPosition';
export interface IRangeService {
    isEmpty(): boolean;
    removeAllCellRanges(silent?: boolean): void;
    getCellRangeCount(cell: CellPosition): number;
    getRangeRowCount(cellRange: CellRange): number;
    isCellInAnyRange(cell: CellPosition): boolean;
    isCellInSpecificRange(cell: CellPosition, range: CellRange): boolean;
    isRowInRange(rowIndex: number, rowPinned: RowPinnedType, cellRange: CellRange): boolean;
    isBottomRightCell(cellRange: CellRange, cell: CellPosition): boolean;
    isContiguousRange(cellRange: CellRange): boolean;
    isMoreThanOneCell(): boolean;
    areAllRangesAbleToMerge(): boolean;
    onDragStart(mouseEvent: MouseEvent): void;
    onDragStop(): void;
    onDragging(mouseEvent: MouseEvent): void;
    getCellRanges(): CellRange[];
    setRangeToCell(cell: CellPosition, appendRange?: boolean): void;
    intersectLastRange(fromMouseClick?: boolean): void;
    setCellRange(params: CellRangeParams): void;
    addCellRange(params: CellRangeParams): void;
    extendLatestRangeInDirection(event: KeyboardEvent): CellPosition | undefined;
    extendLatestRangeToCell(cell: CellPosition): void;
    extendRangeRowCountBy(cellRange: CellRange, targetCount: number): void;
    extendRangeColumnCountBy(cellRange: CellRange, delta: number): void;
    updateRangeRowBoundary(params: CellRangeBoundaryParams): void;
    getRangeStartRow(cellRange: PartialCellRange): RowPosition;
    getRangeEndRow(cellRange: PartialCellRange): RowPosition;
    createCellRangeFromCellRangeParams(params: CellRangeParams): CellRange | undefined;
    createPartialCellRangeFromRangeParams(params: CellRangeParams, allowEmptyColumns: boolean): PartialCellRange | undefined;
    setCellRanges(cellRanges: CellRange[]): void;
    clearCellRangeCellValues(params: ClearCellRangeParams): void;
    createDragListenerFeature(eContainer: HTMLElement): BeanStub;
    createCellRangeFeature(beans: BeanCollection, ctrl: CellCtrl): ICellRangeFeature;
    createRangeHighlightFeature(compBean: BeanStub, column: AgColumn | AgColumnGroup, headerComp: IAbstractHeaderCellComp): void;
    forEachRowInRange(cellRange: CellRange, callback: (row: RowPosition) => void): void;
}
export declare enum CellRangeType {
    VALUE = 0,
    DIMENSION = 1
}
/** Describes a single range of cells */
export interface CellRange {
    id?: string;
    type?: CellRangeType;
    /** The start row of the range */
    startRow?: RowPosition;
    /** The end row of the range */
    endRow?: RowPosition;
    /** The columns in the range */
    columns: Column[];
    /** The start column for the range */
    startColumn: Column;
}
export type PartialCellRange = Omit<CellRange, 'startColumn'> & Partial<Pick<CellRange, 'startColumn'>>;
export interface CellRangeParams {
    /** Start row index */
    rowStartIndex: number | null;
    /** Pinned state of start row. Either 'top', 'bottom' or null */
    rowStartPinned?: RowPinnedType;
    /** End row index */
    rowEndIndex: number | null;
    /** Pinned state of end row. Either 'top', 'bottom' or null */
    rowEndPinned?: RowPinnedType;
    /** Starting column for range */
    columnStart?: string | Column;
    /** End column for range */
    columnEnd?: string | Column;
    /** Specify Columns to include instead of using `columnStart` and `columnEnd` */
    columns?: (string | Column)[];
}
export interface CellRangeBoundaryParams {
    cellRange: CellRange;
    boundary: 'start' | 'end';
    cellPosition: CellPosition;
    silent?: boolean;
}
export interface ClearCellRangeParams {
    cellRanges?: CellRange[];
    /** Source passed to `cellValueChanged` event */
    cellEventSource?: string;
    /** `true` to dispatch `cellSelectionDeleteStart` and `cellSelectionDeleteEnd` events */
    dispatchWrapperEvents?: boolean;
    /** Source passed to `cellSelectionDeleteStart` and `cellSelectionDeleteEnd` events */
    wrapperEventSource?: 'deleteKey';
}
