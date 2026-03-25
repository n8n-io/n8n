import type { EditingCellPosition } from './iCellEditor';
import type { CellPosition } from './iCellPosition';
import type { ChartToolbarMenuItemOptions, DefaultChartMenuItem } from './iChartOptions';
import type { Column, ProvidedColumnGroup } from './iColumn';
import type { AgGridCommon } from './iCommon';
import type { HeaderPosition } from './iHeaderPosition';
import type { IRowNode, RowPinnedType } from './iRowNode';
import type { DefaultMenuItem } from './menuItem';
import type { ServerSideTransaction } from './serverSideTransaction';
export interface GetContextMenuItemsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** Names of the items that would be provided by default. */
    defaultItems: DefaultMenuItem[] | undefined;
    /** The column, if a cell was clicked, otherwise null. */
    column: Column | null;
    /** The row node, if a cell was clicked, otherwise null. */
    node: IRowNode<TData> | null;
    /** The value, if a cell was clicked, otherwise null.  */
    value: any;
    /** The ContextMenu event that triggered the creation of the Context Menu */
    event: MouseEvent | Touch;
}
export interface GetMainMenuItemsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The column that was clicked. Will be `null` if clicking on a column group or empty header space. */
    column: Column | null;
    /** The column group that was clicked. Will be `null` if clicking on a column or empty header space. */
    columnGroup: ProvidedColumnGroup | null;
    /** List of the items that would be displayed by default */
    defaultItems: DefaultMenuItem[];
}
export interface GetChartMenuItemsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** List of the items that would be displayed by default */
    defaultItems: DefaultChartMenuItem[];
    /** Chart ID that the menu is displayed for */
    chartId: string;
}
export interface ProcessUnpinnedColumnsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    columns: Column[];
    viewportWidth: number;
}
export interface PostProcessPopupParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** If popup is for a column, this gives the Column */
    column?: Column | null;
    /** If popup is for a row, this gives the RowNode */
    rowNode?: IRowNode<TData> | null;
    /** The popup we are showing */
    ePopup: HTMLElement;
    /**
     * The different types are:
     * 'contextMenu', 'columnMenu', 'aggFuncSelect', 'popupCellEditor', 'chart',
     * 'advancedFilterBuilder', 'colorPicker', 'columnChooser', 'subMenu'
     */
    type: string;
    /** If the popup is as a result of a button click (eg menu button),
     *  this is the component that the user clicked */
    eventSource?: HTMLElement | null;
    /** If the popup is as a result of a click or touch,
     *  this is the event - eg user showing context menu */
    mouseEvent?: MouseEvent | Touch | null;
}
export interface SendToClipboardParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    data: string;
}
export interface ProcessDataFromClipboardParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** 2D array of all cells from the clipboard */
    data: string[][];
}
export interface FullRowEditValidationParams {
    editorsState: EditingCellPosition[];
}
export interface GetChartToolbarItemsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    defaultItems?: ChartToolbarMenuItemOptions[];
}
export interface FocusGridInnerElementParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** This will be true if the focus is coming from and element below the grid in the DOM structure. */
    fromBottom: boolean;
}
export interface NavigateToNextHeaderParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The key for the arrow key pressed,
     *  left = 'ArrowLeft', up = 'ArrowUp', right = 'ArrowRight', down = 'ArrowDown' */
    key: string;
    /** The header that currently has focus */
    previousHeaderPosition: HeaderPosition | null;
    /** The header the grid would normally pick as the next header for this navigation */
    nextHeaderPosition: HeaderPosition | null;
    /** The number of header rows present in the grid */
    headerRowCount: number;
    event: KeyboardEvent;
}
export interface TabToNextHeaderParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** True if the Shift key is also down */
    backwards: boolean;
    /** The header that currently has focus */
    previousHeaderPosition: HeaderPosition | null;
    /** The header the grid would normally pick as the next header for this navigation */
    nextHeaderPosition: HeaderPosition | null;
    /** The number of header rows present in the grid */
    headerRowCount: number;
}
export interface TabToNextCellParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** True if the Shift key is also down */
    backwards: boolean;
    /** True if the current cell is editing
     * (you may want to skip cells that are not editable, as the grid will enter the next cell in editing mode also if tabbing) */
    editing: boolean;
    /** The cell that currently has focus */
    previousCellPosition: CellPosition;
    /** The cell the grid would normally pick as the next cell for navigation.  */
    nextCellPosition: CellPosition | null;
}
export interface NavigateToNextCellParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The keycode for the arrow key pressed:
     *  left = 'ArrowLeft', up = 'ArrowUp', right = 'ArrowRight', down = 'ArrowDown' */
    key: string;
    /** The cell that currently has focus */
    previousCellPosition: CellPosition;
    /** The cell the grid would normally pick as the next cell for navigation */
    nextCellPosition: CellPosition | null;
    event: KeyboardEvent | null;
}
export interface PaginationNumberFormatterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    value: number;
}
export interface IsGroupOpenByDefaultParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The row node being considered. */
    rowNode: IRowNode<TData>;
    /** The Column for which this row is grouping. */
    rowGroupColumn: Column;
    /** Same as `rowNode.level` - what level the group is at, e.g. 0 for top level, 1 for second etc */
    level: number;
    /** Same as `rowNode.field` - the field we are grouping on, e.g. 'country' */
    field: string;
    /** Same as `rowNode.key`, the value of this group, e.g. 'Ireland' */
    key: string;
}
export interface GetServerSideGroupLevelParamsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The level of the store. Top level is 0. */
    level: number;
    /** The Row Node for the group that got expanded, or undefined if top level (ie no parent) */
    parentRowNode?: IRowNode;
    /** Active Row Group Columns, if any. */
    rowGroupColumns: Column[];
    /** Active Pivot Columns, if any. */
    pivotColumns: Column[];
    /** true if pivot mode is active. */
    pivotMode: boolean;
}
export interface IsServerSideGroupOpenByDefaultParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    data: any;
    rowNode: IRowNode;
}
export interface IsApplyServerSideTransactionParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The transaction getting applied. */
    transaction: ServerSideTransaction;
    /** The parent RowNode, if transaction is applied to a group. */
    parentNode: IRowNode;
    /** Store info, if any, as passed via the success() callback when loading data. */
    groupLevelInfo: any;
}
export interface GetRowIdParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The data item provided to the grid for the row in question */
    data: TData;
    /** Pinned state of the row */
    rowPinned?: RowPinnedType;
    /** If grouping, the level, ie how many levels from the top. Used by ServerSide Row Model only */
    level: number;
    /** If grouping, provides the keys of the parent groups. Used by ServerSide Row Model only */
    parentKeys?: string[];
}
export type RenderedRowEvent = 'virtualRowRemoved';
export interface ProcessRowParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    eRow: HTMLElement;
    ePinnedLeftRow?: HTMLElement;
    ePinnedRightRow?: HTMLElement;
    rowIndex: number;
    node: IRowNode<TData>;
    addRenderedRowListener: (eventType: RenderedRowEvent, listener: (...args: any[]) => any) => void;
}
export interface FillOperationParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The mouse event for the fill operation. */
    event: MouseEvent;
    /** The values that have been processed by the fill operation. */
    values: any[];
    /** The RowNode of the current cell being changed. */
    rowNode: IRowNode<TData>;
    /** The Column of the current cell being changed. */
    column: Column;
    /** The values that were present before processing started. */
    initialValues: any[];
    /** The values that were present before processing, without the aggregation function. */
    initialNonAggregatedValues: any[];
    /** The values that were present before processing, after being formatted by their value formatter */
    initialFormattedValues: any[];
    /** The index of the current processed value. */
    currentIndex: number;
    /** The value of the cell being currently processed by the Fill Operation. */
    currentCellValue: any;
    /** The direction of the Fill Operation. */
    direction: 'up' | 'down' | 'left' | 'right';
}
export interface RowHeightParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The data associated with this row from rowData. Data is `undefined` for row groups. */
    data: TData | undefined;
    /** The RowNode of the row in question. */
    node: IRowNode<TData>;
}
export interface IsExternalFilterPresentParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
}
export interface InitialGroupOrderComparatorParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    nodeA: IRowNode<TData>;
    nodeB: IRowNode<TData>;
}
export interface GetGroupRowAggParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    nodes: IRowNode<TData>[];
}
export interface PostSortRowsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    nodes: IRowNode<TData>[];
}
export interface IsFullWidthRowParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    rowNode: IRowNode<TData>;
}
export interface GetLocaleTextParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    key: string;
    defaultValue: string;
    variableValues?: string[];
}
export interface GetGroupAggFilteringParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    node: IRowNode<TData>;
}
export interface GetGroupIncludeFooterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    node: IRowNode<TData>;
}
export interface GetGroupIncludeTotalRowParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    node: IRowNode<TData>;
}
export interface IMenuActionParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The column, if a cell was clicked, otherwise null. */
    column: Column | null;
    /** The row node, if a cell was clicked, otherwise null. */
    node: IRowNode<TData> | null;
    /** The value, if a cell was clicked, otherwise null.  */
    value: any;
}
