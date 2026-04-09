import type { AgChartThemeOverrides } from 'ag-charts-types';
import type { AgEvent } from './agStack/interfaces/agEvent';
import type { ScrollDirection } from './agStack/interfaces/baseEvents';
import type { RowsDropParams } from './dragAndDrop/rowDragTypes';
import type { ColDef } from './entities/colDef';
import type { GridOptions } from './entities/gridOptions';
import type { RowNode } from './entities/rowNode';
import type { AgEventType, AgInternalEventType, AgPublicEventType } from './eventTypes';
import type { FilterRequestSource } from './filter/iColumnFilter';
import type { CellRange, CellRangeParams } from './interfaces/IRangeService';
import type { GridState } from './interfaces/gridState';
import type { ChartType } from './interfaces/iChartOptions';
import type { Column, ColumnEventName, ColumnGroup, ColumnPinnedType, ProvidedColumnGroup } from './interfaces/iColumn';
import type { AgGridCommon, WithoutGridCommon } from './interfaces/iCommon';
import type { IFilterComp } from './interfaces/iFilter';
import type { FindMatch } from './interfaces/iFind';
import type { IRowNode, RowPinnedType } from './interfaces/iRowNode';
import type { IServerSideGroupSelectionState, IServerSideSelectionState } from './interfaces/iServerSideSelection';
import type { CellValueChange } from './interfaces/iUndoRedo';
import type { RowNodeTransaction } from './interfaces/rowNodeTransaction';
import type { ServerSideTransactionResult } from './interfaces/serverSideTransaction';
export declare const ALWAYS_SYNC_GLOBAL_EVENTS: Set<AgEventType>;
export type BuildEventTypeMap<TEventTypes extends string, T extends {
    [K in TEventTypes]: AgEvent<K>;
}> = T;
export type AgEventTypeParams<TData = any, TContext = any> = BuildEventTypeMap<AgPublicEventType | AgInternalEventType, {
    columnEverythingChanged: ColumnEverythingChangedEvent<TData, TContext>;
    newColumnsLoaded: NewColumnsLoadedEvent<TData, TContext>;
    columnPivotModeChanged: ColumnPivotModeChangedEvent<TData, TContext>;
    pivotMaxColumnsExceeded: PivotMaxColumnsExceededEvent<TData, TContext>;
    columnRowGroupChanged: ColumnRowGroupChangedEvent<TData, TContext>;
    expandOrCollapseAll: ExpandOrCollapseAllEvent<TData, TContext>;
    columnPivotChanged: ColumnPivotChangedEvent<TData, TContext>;
    gridColumnsChanged: GridColumnsChangedEvent<TData, TContext>;
    columnValueChanged: ColumnValueChangedEvent<TData, TContext>;
    columnMoved: ColumnMovedEvent<TData, TContext>;
    columnVisible: ColumnVisibleEvent<TData, TContext>;
    columnPinned: ColumnPinnedEvent<TData, TContext>;
    columnGroupOpened: ColumnGroupOpenedEvent<TData, TContext>;
    columnResized: ColumnResizedEvent<TData, TContext>;
    displayedColumnsChanged: DisplayedColumnsChangedEvent<TData, TContext>;
    virtualColumnsChanged: VirtualColumnsChangedEvent<TData, TContext>;
    columnHeaderMouseOver: ColumnHeaderMouseOverEvent<TData, TContext>;
    columnHeaderMouseLeave: ColumnHeaderMouseLeaveEvent<TData, TContext>;
    columnHeaderClicked: ColumnHeaderClickedEvent<TData, TContext>;
    columnHeaderContextMenu: ColumnHeaderContextMenuEvent<TData, TContext>;
    asyncTransactionsFlushed: AsyncTransactionsFlushedEvent<TData, TContext>;
    rowGroupOpened: RowGroupOpenedEvent<TData, TContext>;
    rowDataUpdated: RowDataUpdatedEvent<TData, TContext>;
    pinnedRowDataChanged: PinnedRowDataChangedEvent<TData, TContext>;
    pinnedRowsChanged: PinnedRowsChangedEvent<TData, TContext>;
    rangeSelectionChanged: RangeSelectionChangedEvent<TData, TContext>;
    cellSelectionChanged: CellSelectionChangedEvent<TData, TContext>;
    chartCreated: ChartCreatedEvent<TData, TContext>;
    chartRangeSelectionChanged: ChartRangeSelectionChangedEvent<TData, TContext>;
    chartOptionsChanged: ChartOptionsChangedEvent<TData, TContext>;
    chartDestroyed: ChartDestroyedEvent<TData, TContext>;
    toolPanelVisibleChanged: ToolPanelVisibleChangedEvent<TData, TContext>;
    toolPanelSizeChanged: ToolPanelSizeChangedEvent<TData, TContext>;
    modelUpdated: ModelUpdatedEvent<TData, TContext>;
    cutStart: CutStartEvent<TData, TContext>;
    cutEnd: CutEndEvent<TData, TContext>;
    pasteStart: PasteStartEvent<TData, TContext>;
    pasteEnd: PasteEndEvent<TData, TContext>;
    fillStart: FillStartEvent<TData, TContext>;
    fillEnd: FillEndEvent<TData, TContext>;
    cellSelectionDeleteStart: CellSelectionDeleteStartEvent<TData, TContext>;
    cellSelectionDeleteEnd: CellSelectionDeleteEndEvent<TData, TContext>;
    rangeDeleteStart: RangeDeleteStartEvent<TData, TContext>;
    rangeDeleteEnd: RangeDeleteEndEvent<TData, TContext>;
    undoStarted: UndoStartedEvent<TData, TContext>;
    undoEnded: UndoEndedEvent<TData, TContext>;
    redoStarted: RedoStartedEvent<TData, TContext>;
    redoEnded: RedoEndedEvent<TData, TContext>;
    cellClicked: CellClickedEvent<TData, TContext>;
    cellDoubleClicked: CellDoubleClickedEvent<TData, TContext>;
    cellMouseDown: CellMouseDownEvent<TData, TContext>;
    cellContextMenu: CellContextMenuEvent<TData, TContext>;
    cellValueChanged: CellValueChangedEvent<TData, TContext>;
    cellEditRequest: CellEditRequestEvent<TData, TContext>;
    rowValueChanged: RowValueChangedEvent<TData, TContext>;
    headerFocused: HeaderFocusedEvent<TData, TContext>;
    cellFocused: CellFocusedEvent<TData, TContext>;
    rowSelected: RowSelectedEvent<TData, TContext>;
    selectionChanged: SelectionChangedEvent<TData, TContext>;
    tooltipShow: TooltipShowEvent<TData, TContext>;
    tooltipHide: TooltipHideEvent<TData, TContext>;
    cellKeyDown: FullWidthCellKeyDownEvent<TData, TContext> | CellKeyDownEvent<TData, TContext>;
    cellMouseOver: CellMouseOverEvent<TData, TContext>;
    cellMouseOut: CellMouseOutEvent<TData, TContext>;
    filterChanged: FilterChangedEvent<TData, TContext>;
    filterModified: FilterModifiedEvent<TData, TContext>;
    filterUiChanged: FilterUiChangedEvent<TData, TContext>;
    filterOpened: FilterOpenedEvent<TData, TContext>;
    floatingFilterUiChanged: FloatingFilterUiChangedEvent<TData, TContext>;
    advancedFilterBuilderVisibleChanged: AdvancedFilterBuilderVisibleChangedEvent<TData, TContext>;
    sortChanged: SortChangedEvent<TData, TContext>;
    virtualRowRemoved: VirtualRowRemovedEvent<TData, TContext>;
    rowClicked: RowClickedEvent<TData, TContext>;
    rowDoubleClicked: RowDoubleClickedEvent<TData, TContext>;
    gridReady: GridReadyEvent<TData, TContext>;
    gridPreDestroyed: GridPreDestroyedEvent<TData, TContext>;
    gridSizeChanged: GridSizeChangedEvent<TData, TContext>;
    viewportChanged: ViewportChangedEvent<TData, TContext>;
    firstDataRendered: FirstDataRenderedEvent<TData, TContext>;
    dragStarted: DragStartedEvent<TData, TContext>;
    dragStopped: DragStoppedEvent<TData, TContext>;
    dragCancelled: DragCancelledEvent<TData, TContext>;
    rowEditingStarted: RowEditingStartedEvent<TData, TContext>;
    rowEditingStopped: RowEditingStoppedEvent<TData, TContext>;
    cellEditingStarted: CellEditingStartedEvent<TData, TContext>;
    cellEditingStopped: CellEditingStoppedEvent<TData, TContext>;
    bodyScroll: BodyScrollEvent<TData, TContext>;
    bodyScrollEnd: BodyScrollEndEvent<TData, TContext>;
    paginationChanged: PaginationChangedEvent<TData, TContext>;
    componentStateChanged: ComponentStateChangedEvent<TData, TContext>;
    storeRefreshed: StoreRefreshedEvent<TData, TContext>;
    stateUpdated: StateUpdatedEvent<TData, TContext>;
    columnMenuVisibleChanged: ColumnMenuVisibleChangedEvent<TData, TContext>;
    contextMenuVisibleChanged: ContextMenuVisibleChangedEvent<TData, TContext>;
    rowDragEnter: RowDragEnterEvent<TData, TContext>;
    rowDragMove: RowDragMoveEvent<TData, TContext>;
    rowDragLeave: RowDragLeaveEvent<TData, TContext>;
    rowDragEnd: RowDragEndEvent<TData, TContext>;
    rowDragCancel: RowDragCancelEvent<TData, TContext>;
    findChanged: FindChangedEvent<TData, TContext>;
    rowResizeStarted: RowResizeStartedEvent<TData, TContext>;
    rowResizeEnded: RowResizeEndedEvent<TData, TContext>;
    scrollbarWidthChanged: ScrollbarWidthChangedEvent<TData, TContext>;
    keyShortcutChangedCellStart: KeyShortcutChangedCellStartEvent<TData, TContext>;
    keyShortcutChangedCellEnd: KeyShortcutChangedCellEndEvent<TData, TContext>;
    pinnedHeightChanged: PinnedHeightChangedEvent<TData, TContext>;
    cellFocusCleared: CellFocusClearedEvent<TData, TContext>;
    fullWidthRowFocused: FullWidthRowFocusedEvent<TData, TContext>;
    checkboxChanged: CheckboxChangedEvent<TData, TContext>;
    heightScaleChanged: HeightScaleChangedEvent<TData, TContext>;
    suppressMovableColumns: SuppressMovableColumnsEvent<TData, TContext>;
    suppressMenuHide: SuppressMenuHideEvent<TData, TContext>;
    suppressFieldDotNotation: SuppressFieldDotNotationEvent<TData, TContext>;
    columnPanelItemDragStart: ColumnPanelItemDragStartEvent<TData, TContext>;
    columnPanelItemDragEnd: ColumnPanelItemDragEndEvent<TData, TContext>;
    bodyHeightChanged: BodyHeightChangedEvent<TData, TContext>;
    columnContainerWidthChanged: ColumnContainerWidthChangedEvent<TData, TContext>;
    displayedColumnsWidthChanged: DisplayedColumnsWidthChangedEvent<TData, TContext>;
    scrollVisibilityChanged: ScrollVisibilityChangedEvent<TData, TContext>;
    scrollGapChanged: ScrollOverflowChangedEvent<TData, TContext>;
    columnHoverChanged: ColumnHoverChangedEvent<TData, TContext>;
    flashCells: FlashCellsEvent<TData, TContext>;
    paginationPixelOffsetChanged: PaginationPixelOffsetChangedEvent<TData, TContext>;
    displayedRowsChanged: DisplayedRowsChangedEvent<TData, TContext>;
    leftPinnedWidthChanged: LeftPinnedWidthChangedEvent<TData, TContext>;
    rightPinnedWidthChanged: RightPinnedWidthChangedEvent<TData, TContext>;
    rowContainerHeightChanged: RowContainerHeightChangedEvent<TData, TContext>;
    headerHeightChanged: HeaderHeightChangedEvent<TData, TContext>;
    columnGroupHeaderHeightChanged: ColumnGroupHeaderHeightChangedEvent<TData, TContext>;
    columnHeaderHeightChanged: ColumnHeaderHeightChangedEvent<TData, TContext>;
    gridStylesChanged: GridStylesChangedEvent<TData, TContext>;
    storeUpdated: StoreUpdatedEvent<TData, TContext>;
    filterDestroyed: FilterDestroyedEvent<TData, TContext>;
    filterHandlerDestroyed: FilterHandlerDestroyedEvent<TData, TContext>;
    filterClosed: FilterClosedEvent<TData, TContext>;
    rowDataUpdateStarted: RowDataUpdateStartedEvent<TData, TContext>;
    rowCountReady: RowCountReadyEvent<TData, TContext>;
    advancedFilterEnabledChanged: AdvancedFilterEnabledChangedEvent<TData, TContext>;
    dataTypesInferred: DataTypesInferredEvent<TData, TContext>;
    fieldValueChanged: FieldValueChangedEvent<TData, TContext>;
    fieldPickerValueSelected: FieldPickerValueSelectedEvent<TData, TContext>;
    richSelectListRowSelected: RichSelectListRowSelectedEvent<TData, TContext>;
    sideBarUpdated: SideBarUpdatedEvent<TData, TContext>;
    alignedGridScroll: AlignedGridScrollEvent<TData, TContext>;
    alignedGridColumn: AlignedGridColumnEvent<TData, TContext>;
    gridOptionsChanged: GridOptionsChangedEvent<TData, TContext>;
    chartTitleEdit: ChartTitleEditEvent<TData, TContext>;
    recalculateRowBounds: RecalculateRowBoundsEvent<TData, TContext>;
    stickyTopOffsetChanged: StickyTopOffsetChangedEvent<TData, TContext>;
    overlayExclusiveChanged: AgEvent<'overlayExclusiveChanged'>;
    rowNodeDataChanged: RowNodeDataChangedEvent<TData, TContext>;
    columnsReset: ColumnsResetEvent<TData, TContext>;
    cellEditValuesChanged: CellEditValuesChangedEvent<TData, TContext>;
    filterSwitched: FilterSwitchedEvent<TData, TContext>;
    batchEditingStarted: BatchEditingStartedEvent<TData, TContext>;
    batchEditingStopped: BatchEditingStoppedEvent<TData, TContext>;
    bulkEditingStarted: BulkEditingStartedEvent<TData, TContext>;
    bulkEditingStopped: BulkEditingStoppedEvent<TData, TContext>;
    headerRowsChanged: AgEvent<'headerRowsChanged'>;
    rowExpansionStateChanged: AgEvent<'rowExpansionStateChanged'>;
}>;
/** Internal Interface for AG Grid Events */
export type AllEventsWithoutGridCommon<TData = any, TContext = any> = {
    [K in keyof AgEventTypeParams<TData, TContext>]: WithoutGridCommon<AgEventTypeParams<TData, TContext>[K]>;
}[keyof AgEventTypeParams];
/** Union Type of all AG Grid Events */
export type AllEvents<TData = any, TContext = any> = {
    [K in keyof AgEventTypeParams<TData, TContext>]: AgEventTypeParams<TData, TContext>[K];
}[keyof AgEventTypeParams];
export interface AgGridEvent<TData = any, TContext = any, TEventType extends string = string> extends AgGridCommon<TData, TContext>, AgEvent<TEventType> {
}
export interface AgGlobalEvent<T extends AgEventType, TData = any, TContext = any> extends AgGridEvent<TData, TContext, T> {
}
export type AgEventListener<TData = any, TContext = any, TEventType extends AgEventType = AgEventType> = (params: AgEventTypeParams<TData, TContext>[TEventType]) => void;
export type AgGlobalEventListener<TData = any, TContext = any, T extends AgEventType = AgEventType> = (eventType: T, event: AgEventTypeParams<TData, TContext>[T]) => void;
export interface ModelUpdatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'modelUpdated', TData, TContext> {
    /** If true, the grid will try and animate the rows to the new positions */
    animate: boolean | undefined;
    /** If the grid has new data loaded, eg user called setRowData(), this will be false,
     * otherwise it's the same data but sorted or filtered, in which case this is true, and rows
     * can animate around (eg rowNode id 24 is the same row node as last time). */
    keepRenderedRows: boolean | undefined;
    /** If true, then this update was a result of setRowData() getting called. This
     * gets the grid to scroll to the top again. */
    newData: boolean | undefined;
    /** True when pagination and a new page is navigated to. */
    newPage: boolean;
    /** True when page size changes from the page size selector. */
    newPageSize?: boolean;
    /** true if all we did is changed row height, data still the same, no need to clear the undo/redo stacks */
    keepUndoRedoStack?: boolean;
}
export interface PaginationChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'paginationChanged', TData, TContext> {
    /** True if rows were animated to new position */
    animate?: boolean;
    /** True if rows were kept (otherwise complete redraw) */
    keepRenderedRows?: boolean;
    /** True if data was new (i.e user set new data) */
    newData?: boolean;
    /** True if user went to a new page */
    newPage: boolean;
    /** True if user changed the page size */
    newPageSize?: boolean;
}
export interface ToolPanelSizeChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'toolPanelSizeChanged', TData, TContext> {
    /** True if this is the first change to the Tool Panel size. */
    started: boolean;
    /** True if this is the last change to the Tool Panel size. */
    ended: boolean;
    /** New width of the ToolPanel component. */
    width: number;
}
export interface ColumnPivotModeChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnPivotModeChanged', TData, TContext> {
}
export interface VirtualColumnsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'virtualColumnsChanged', TData, TContext> {
    afterScroll: boolean;
}
/**
 * @deprecated v32.2 Either use `displayedColumnsChanged` which is fired at the same time,
 * or use one of the more specific column events.
 */
export interface ColumnEverythingChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnEverythingChanged', TData, TContext> {
    source: string;
}
export interface NewColumnsLoadedEvent<TData = any, TContext = any> extends AgGlobalEvent<'newColumnsLoaded', TData, TContext> {
    source: ColumnEventType;
}
export interface GridColumnsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridColumnsChanged', TData, TContext> {
}
export interface DisplayedColumnsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'displayedColumnsChanged', TData, TContext> {
    source: ColumnEventType;
}
export interface RowDataUpdatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rowDataUpdated', TData, TContext> {
}
export interface RowDataUpdateStartedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rowDataUpdateStarted', TData, TContext> {
    firstRowData: TData | null;
}
export interface PinnedRowDataChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'pinnedRowDataChanged', TData, TContext> {
}
export interface PinnedHeightChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'pinnedHeightChanged', TData, TContext> {
}
export interface PinnedRowsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'pinnedRowsChanged', TData, TContext> {
}
/**
 * - `api` - from API method
 * - `apiSelectAll` - from API methods `selectAll`/`deselectAll`
 * - `apiSelectAllFiltered` - from API methods `selectAllFiltered`/`deselectAllFiltered`
 * - `apiSelectAllCurrentPage` - from API methods `selectAllOnCurrentPage`/`deselectAllOnCurrentPage`
 * - `checkboxSelected` - row selection checkbox clicked
 * - `rowClicked` - row clicked when row selection enabled
 * - `rowDataChanged` - row data updated which triggered selection updates
 * - `rowGroupChanged` - grouping changed which updated the selection
 * - `selectableChanged`- selectable status of row has changed when `rowSelection.groupSelects` is `'descendants'` or `'filteredDescendants'`
 * - `spaceKey` - space key pressed on row
 * - `keyboardSelectAll` - select all via keyboard shortcut (CTRL+A)
 * - `uiSelectAll` - select all in header clicked
 * - `uiSelectAllFiltered` - select all in header clicked when `rowSelection.selectAll = 'filtered'`
 * - `uiSelectAllCurrentPage` - select all in header clicked when `rowSelection.selectAll = 'currentPage'`
 * - `masterDetail` - Syncing selection state between master row and detail grid
 * - 'gridInitializing' - set as part of initial state while the grid is initializing
 */
export type SelectionEventSourceType = 'api' | 'apiSelectAll' | 'apiSelectAllFiltered' | 'apiSelectAllCurrentPage' | 'checkboxSelected' | 'rowClicked' | 'rowDataChanged' | 'rowGroupChanged' | 'selectableChanged' | 'spaceKey' | 'keyboardSelectAll' | 'uiSelectAll' | 'uiSelectAllFiltered' | 'uiSelectAllCurrentPage' | 'masterDetail' | 'gridInitializing';
export interface SelectionChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'selectionChanged', TData, TContext> {
    /** The source that triggered the selection change event. */
    source: SelectionEventSourceType;
    /** The row nodes that are selected at the time the event is generated. When selecting all nodes in SSRM or when group selecting in SSRM, this will be `null`. */
    selectedNodes: IRowNode<TData>[] | null;
    /** The SSRM selection state. This can be referred to when `selectedNodes` is `null`. This will be `null` when using a row model other than SSRM. */
    serverSideState: IServerSideSelectionState | IServerSideGroupSelectionState | null;
}
export type FilterChangedEventSourceType = 'api' | 'quickFilter' | 'columnFilter' | 'advancedFilter';
export interface FilterChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterChanged', TData, TContext> {
    /**
     * The source that triggered the filter change event. Can be one of the following:
     * - `api` - triggered by an API call
     * - `quickFilter` - triggered by user filtering from Quick Filter
     * - `columnFilter` - triggered by user filtering from Column Menu
     * - `advancedFilter` - triggered by user filtering from Advanced Filter
     */
    source?: FilterChangedEventSourceType;
    /** True if the filter was changed as a result of data changing */
    afterDataChange?: boolean;
    /** True if filter was changed via floating filter */
    afterFloatingFilter?: boolean;
    /**
     * Columns affected by the filter change. Array contents depend on the source of the event.
     *
     * - Expect 1 element for UI-driven column filter changes.
     * - Expect 0-N elements (all affected columns) for calls to `api.setFilterModel()`.
     * - Expect 0-N elements (removed columns) for calls to `api.setColumnDefs()`.
     * - Expect 0 elements for quick-filters and calls to `api.onFilterChanged()`.
     */
    columns: Column[];
}
export interface FilterModifiedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterModified', TData, TContext> {
    filterInstance: IFilterComp;
    column: Column;
}
export interface FilterUiChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterUiChanged', TData, TContext> {
    column: Column;
}
export interface FilterOpenedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterOpened', TData, TContext> {
    /** Column / ProvidedColumnGroup that contains the filter */
    column: Column | ProvidedColumnGroup;
    /** Source of the open request */
    source: FilterRequestSource;
    /** Parent element of the filter */
    eGui: HTMLElement;
}
export interface FloatingFilterUiChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'floatingFilterUiChanged', TData, TContext> {
    column: Column;
}
export interface FindChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'findChanged', TData, TContext> {
    /** The current search value. */
    findSearchValue: string | undefined;
    /** The active match, or `undefined` if no active match. */
    activeMatch: FindMatch<TData> | undefined;
    /** The total number of matches in the grid. */
    totalMatches: number;
}
export interface SortChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'sortChanged', TData, TContext> {
    /** Source of the sort change. */
    source: string;
    /**
     * The list of columns impacted by the sort change.
     */
    columns?: Column[];
}
export interface GridReadyEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridReady', TData, TContext> {
}
export interface GridPreDestroyedEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridPreDestroyed', TData, TContext> {
    /** Current state of the grid */
    state: GridState;
}
export interface ColumnContainerWidthChanged<TData = any, TContext = any> extends AgGlobalEvent<'columnContainerWidthChanged', TData, TContext> {
}
export interface DisplayedColumnsWidthChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'displayedColumnsWidthChanged', TData, TContext> {
}
export interface ColumnHoverChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnHoverChanged', TData, TContext> {
}
export interface BodyHeightChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'bodyHeightChanged', TData, TContext> {
}
export interface ComponentStateChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'componentStateChanged', TData, TContext> {
}
export interface ColumnPanelItemDragStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnPanelItemDragStart', TData, TContext> {
    column: Column | ProvidedColumnGroup;
}
export interface ColumnPanelItemDragEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnPanelItemDragEnd', TData, TContext> {
}
export interface AgDragEvent<T extends AgEventType, TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    /** The DOM element that started the event. */
    target: Element;
}
export interface DragStartedEvent<TData = any, TContext = any> extends AgDragEvent<'dragStarted', TData, TContext> {
}
export interface DragStoppedEvent<TData = any, TContext = any> extends AgDragEvent<'dragStopped', TData, TContext> {
}
export interface DragCancelledEvent<TData = any, TContext = any> extends AgDragEvent<'dragCancelled', TData, TContext> {
}
export interface CheckboxChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'checkboxChanged', TData, TContext> {
    id: string;
    name: string;
    selected?: boolean;
    previousValue: boolean | undefined;
}
export interface GridSizeChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridSizeChanged', TData, TContext> {
    /** The grid's DIV's clientWidth */
    clientWidth: number;
    /** The grid's DIV's clientHeight */
    clientHeight: number;
}
export interface PivotMaxColumnsExceededEvent<TData = any, TContext = any> extends AgGlobalEvent<'pivotMaxColumnsExceeded', TData, TContext> {
    message: string;
}
interface RowResizeEvent<TData = any, TContext = any, T extends AgEventType = any> extends AgGlobalEvent<T, TData, TContext> {
    node: IRowNode<TData>;
    event: MouseEvent | Touch;
    rowHeight: number;
}
export interface RowResizeStartedEvent<TData = any, TContext = any> extends RowResizeEvent<TData, TContext, 'rowResizeStarted'> {
}
export interface RowResizeEndedEvent<TData = any, TContext = any> extends RowResizeEvent<TData, TContext, 'rowResizeEnded'> {
}
export type RowDragEventType = 'rowDragEnter' | 'rowDragLeave' | 'rowDragMove' | 'rowDragEnd' | 'rowDragCancel';
export interface RowDragEvent<TData = any, TContext = any, T extends RowDragEventType = RowDragEventType> extends AgGlobalEvent<T, TData, TContext> {
    /** The row node getting dragged. Also the node that started the drag when multi-row dragging. */
    node: IRowNode<TData>;
    /** The list of nodes being dragged. */
    nodes: IRowNode<TData>[];
    /** The underlying mouse move event associated with the drag. */
    event: MouseEvent;
    /** The `eventPath` persists the `event.composedPath()` result for access within AG Grid event handlers.  */
    eventPath?: EventTarget[];
    /** Direction of the drag, either `'up'`, `'down'` or `null` (if mouse is moving horizontally and not vertically). */
    vDirection: 'up' | 'down' | null;
    /** The row index the mouse is dragging over or -1 if over no row. */
    overIndex: number;
    /** The row node the mouse is dragging over or undefined if over no row. */
    overNode?: IRowNode<TData>;
    /** The vertical pixel location the mouse is over, with `0` meaning the top of the first row.
     * This can be compared to the `rowNode.rowHeight` and `rowNode.rowTop` to work out the mouse position relative to rows.
     * The provided attributes `overIndex` and `overNode` means the `y` property is mostly redundant.
     * The `y` property can be handy if you want more information such as 'how close is the mouse to the top or bottom of the row?'
     */
    y: number;
    /** Details about the row dragging drop target. */
    rowsDrop: RowsDropParams<TData, TContext> | null;
}
export interface RowDragEnterEvent<TData = any, TContext = any> extends RowDragEvent<TData, TContext, 'rowDragEnter'> {
}
export interface RowDragEndEvent<TData = any, TContext = any> extends RowDragEvent<TData, TContext, 'rowDragEnd'> {
}
export interface RowDragCancelEvent<TData = any, TContext = any> extends RowDragEvent<TData, TContext, 'rowDragCancel'> {
}
export interface RowDragMoveEvent<TData = any, TContext = any> extends RowDragEvent<TData, TContext, 'rowDragMove'> {
}
export interface RowDragLeaveEvent<TData = any, TContext = any> extends RowDragEvent<TData, TContext, 'rowDragLeave'> {
}
export interface CutStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'cutStart', TData, TContext> {
    source: 'api' | 'ui' | 'contextMenu';
}
export interface CutEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'cutEnd', TData, TContext> {
    source: 'api' | 'ui' | 'contextMenu';
}
export interface PasteStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'pasteStart', TData, TContext> {
    source: string;
}
export interface PasteEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'pasteEnd', TData, TContext> {
    source: string;
}
export interface FillStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'fillStart', TData, TContext> {
}
export interface FillEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'fillEnd', TData, TContext> {
    initialRange: CellRange;
    finalRange: CellRange;
}
export interface CellSelectionDeleteStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'cellSelectionDeleteStart', TData, TContext> {
    source: 'deleteKey';
}
export interface CellSelectionDeleteEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'cellSelectionDeleteEnd', TData, TContext> {
    source: 'deleteKey';
}
export interface RangeDeleteStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'rangeDeleteStart', TData, TContext> {
    source: 'deleteKey';
}
export interface RangeDeleteEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'rangeDeleteEnd', TData, TContext> {
    source: 'deleteKey';
}
export interface UndoStartedEvent<TData = any, TContext = any> extends AgGlobalEvent<'undoStarted', TData, TContext> {
    /** Source of the event. `api` if via API method. `ui` if via keyboard shortcut. */
    source: 'api' | 'ui';
}
export interface UndoEndedEvent<TData = any, TContext = any> extends AgGlobalEvent<'undoEnded', TData, TContext> {
    /** Source of the event. `api` if via API method. `ui` if via keyboard shortcut. */
    source: 'api' | 'ui';
    /** `true` if any undo operations were performed. */
    operationPerformed: boolean;
}
export interface RedoStartedEvent<TData = any, TContext = any> extends AgGlobalEvent<'redoStarted', TData, TContext> {
    /** Source of the event. `api` if via API method. `ui` if via keyboard shortcut. */
    source: 'api' | 'ui';
}
export interface RedoEndedEvent<TData = any, TContext = any> extends AgGlobalEvent<'redoEnded', TData, TContext> {
    /** Source of the event. `api` if via API method. `ui` if via keyboard shortcut. */
    source: 'api' | 'ui';
    /** `true` if any redo operations were performed. */
    operationPerformed: boolean;
}
export interface ViewportChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'viewportChanged', TData, TContext> {
    /** Index of the first rendered row */
    firstRow: number;
    /** Index of the last rendered row */
    lastRow: number;
}
export interface FirstDataRenderedEvent<TData = any, TContext = any> extends AgGlobalEvent<'firstDataRendered', TData, TContext> {
    /** Index of the first rendered row */
    firstRow: number;
    /** Index of the last rendered row */
    lastRow: number;
}
export interface RangeSelectionChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rangeSelectionChanged', TData, TContext> {
    id?: string;
    /** True for the first change event, otherwise false */
    started: boolean;
    /** True for the last change event, otherwise false */
    finished: boolean;
}
export interface CellSelectionChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'cellSelectionChanged', TData, TContext> {
    id?: string;
    /** True for the first change event, otherwise false */
    started: boolean;
    /** True for the last change event, otherwise false */
    finished: boolean;
}
export interface ChartCreatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'chartCreated', TData, TContext> {
    /** Id of the created chart. This can later be used to reference the chart via api methods. */
    chartId: string;
}
/** @deprecated v32 Use ChartCreatedEvent instead */
export interface ChartCreated<TData = any, TContext = any> extends ChartCreatedEvent<TData, TContext> {
}
export interface ChartRangeSelectionChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'chartRangeSelectionChanged', TData, TContext> {
    /** Id of the effected chart. */
    chartId: string;
    /** Same as `chartId`. */
    id: string;
    /** New cellRange selected. */
    cellRange: CellRangeParams;
}
/** @deprecated v32 Use ChartRangeSelectionChangedEvent instead */
export interface ChartRangeSelectionChanged<TData = any, TContext = any> extends ChartRangeSelectionChangedEvent<TData, TContext> {
}
export interface ChartOptionsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'chartOptionsChanged', TData, TContext> {
    /** Id of the effected chart. */
    chartId: string;
    /** ChartType */
    chartType: ChartType;
    /** Chart theme name of currently selected theme. */
    chartThemeName: string;
    /** Chart options.  */
    chartOptions: AgChartThemeOverrides;
}
/** @deprecated v32 Use ChartOptionsChangedEvent instead */
export interface ChartOptionsChanged<TData = any, TContext = any> extends ChartOptionsChangedEvent<TData, TContext> {
}
export interface ChartDestroyedEvent<TData = any, TContext = any> extends AgGlobalEvent<'chartDestroyed', TData, TContext> {
    /** Id of the effected chart. */
    chartId: string;
}
/** @deprecated v32 Use ChartDestroyedEvent instead */
export interface ChartDestroyed<TData = any, TContext = any> extends ChartDestroyedEvent<TData, TContext> {
}
export interface ColumnGroupOpenedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnGroupOpened', TData, TContext> {
    columnGroup?: ProvidedColumnGroup;
    columnGroups: ProvidedColumnGroup[];
}
interface BaseBodyScrollEvent<T extends AgEventType, TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    direction: ScrollDirection;
    left: number;
    top: number;
}
export interface BodyScrollEvent<TData = any, TContext = any> extends BaseBodyScrollEvent<'bodyScroll', TData, TContext> {
}
export interface BodyScrollEndEvent<TData = any, TContext = any> extends BaseBodyScrollEvent<'bodyScrollEnd', TData, TContext> {
}
interface TooltipEvent<T extends 'tooltipShow' | 'tooltipHide', TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    parentGui: HTMLElement;
}
export interface TooltipShowEvent<TData = any, TContext = any> extends TooltipEvent<'tooltipShow', TData, TContext> {
    tooltipGui: HTMLElement;
}
export interface TooltipHideEvent<TData = any, TContext = any> extends TooltipEvent<'tooltipHide', TData, TContext> {
}
export interface PaginationPixelOffsetChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'paginationPixelOffsetChanged', TData, TContext> {
}
export interface StickyTopOffsetChangedEvent extends AgEvent<'stickyTopOffsetChanged'> {
    offset: number;
}
export interface CommonCellFocusParams {
    /** Row index of the focused cell */
    rowIndex: number | null;
    /** Column of the focused cell */
    column: Column | string | null;
    /** either 'top', 'bottom' or null / undefined (if not pinned) */
    rowPinned: RowPinnedType;
    /** Whether the cell a full width cell or a regular cell */
    isFullWidthCell?: boolean;
}
export interface CellFocusClearedParams extends CommonCellFocusParams {
}
export interface CellFocusedParams extends CommonCellFocusParams {
    /** Whether browser focus is also set (false when editing) */
    forceBrowserFocus?: boolean;
    /** When `forceBrowserFocus` is `true`, should scroll be prevented */
    preventScrollOnBrowserFocus?: boolean;
    /** Previous focused cell params */
    previousCellFocus?: CellFocusedParams;
    /** Initiating event, if any */
    sourceEvent?: Event;
}
export interface HeaderFocusedParams {
    column: Column | ColumnGroup;
}
export interface HeaderFocusedEvent<TData = any, TContext = any> extends AgGlobalEvent<'headerFocused', TData, TContext>, HeaderFocusedParams {
}
export interface CellFocusClearedEvent<TData = any, TContext = any> extends AgGlobalEvent<'cellFocusCleared', TData, TContext>, CellFocusClearedParams {
}
export interface CellFocusedEvent<TData = any, TContext = any> extends AgGlobalEvent<'cellFocused', TData, TContext>, CellFocusedParams {
}
export interface FullWidthRowFocusedEvent<TData = any, TContext = any> extends AgGlobalEvent<'fullWidthRowFocused', TData, TContext>, CellFocusedParams {
    fromBelow: boolean;
}
/**
 * @deprecated v32 Please use `ExpandOrCollapseAllEvent` instead.
 */
export interface ExpandCollapseAllEvent<TData = any, TContext = any> extends ExpandOrCollapseAllEvent<TData, TContext> {
}
export interface ExpandOrCollapseAllEvent<TData = any, TContext = any> extends AgGlobalEvent<'expandOrCollapseAll', TData, TContext> {
    source: string;
}
/**---------------*/
/** COLUMN EVENTS */
/**---------------*/
export type ColumnEventType = 'sizeColumnsToFit' | 'autosizeColumns' | 'autosizeColumnHeaderHeight' | 'alignedGridChanged' | 'filterChanged' | 'filterDestroyed' | 'gridOptionsChanged' | 'gridInitializing' | 'toolPanelDragAndDrop' | 'toolPanelUi' | 'uiColumnMoved' | 'uiColumnResized' | 'uiColumnDragged' | 'uiColumnExpanded' | 'uiColumnSorted' | 'contextMenu' | 'columnMenu' | 'rowModelUpdated' | 'rowDataUpdated' | 'api' | 'flex' | 'pivotChart' | 'columnRowGroupChanged' | 'cellDataTypeInferred' | 'rowNumbersService' | 'viewportSizeFeature';
export interface ColumnEvent<T extends AgEventType | ColumnEventName = any, TData = any, TContext = any> extends AgGridEvent<TData, TContext, T> {
    /** The impacted column, only set if action was on one column */
    column: Column | null;
    /** List of all impacted columns */
    columns: Column[] | null;
    /** String describing where the event is coming from */
    source: ColumnEventType;
}
export interface ColumnResizedEvent<TData = any, TContext = any> extends ColumnEvent<'columnResized', TData, TContext> {
    /** Set to true for last event in a sequence of move events */
    finished: boolean;
    /** Any columns resized due to flex */
    flexColumns: Column[] | null;
}
export interface ColumnPivotChangedEvent<TData = any, TContext = any> extends ColumnEvent<'columnPivotChanged', TData, TContext> {
}
export interface ColumnRowGroupChangedEvent<TData = any, TContext = any> extends ColumnEvent<'columnRowGroupChanged', TData, TContext> {
}
export interface ColumnValueChangedEvent<TData = any, TContext = any> extends ColumnEvent<'columnValueChanged', TData, TContext> {
}
export interface ColumnMovedEvent<TData = any, TContext = any> extends ColumnEvent<'columnMoved', TData, TContext> {
    /** The position the column was moved to */
    toIndex?: number;
    /** `True` when the column has finished moving. */
    finished: boolean;
}
export interface ColumnVisibleEvent<TData = any, TContext = any> extends ColumnEvent<'columnVisible', TData, TContext> {
    /** True if column was set to visible, false if set to hide, undefined if in a single call some columns were shown while others hidden */
    visible?: boolean;
}
export interface ColumnPinnedEvent<TData = any, TContext = any> extends ColumnEvent<'columnPinned', TData, TContext> {
    /** Either 'left', 'right', or null (it not pinned) */
    pinned: ColumnPinnedType;
}
export interface ColumnHeaderMouseOverEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnHeaderMouseOver', TData, TContext> {
    /** Column or column-group related to the header that triggered the event */
    column: Column | ProvidedColumnGroup;
}
export interface ColumnHeaderMouseLeaveEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnHeaderMouseLeave', TData, TContext> {
    /** Column or column-group related to the header that triggered the event */
    column: Column | ProvidedColumnGroup;
}
export interface ColumnHeaderClickedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnHeaderClicked', TData, TContext> {
    /** Column or column-group related to the header that triggered the event */
    column: Column | ProvidedColumnGroup;
}
export interface ColumnHeaderContextMenuEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnHeaderContextMenu', TData, TContext> {
    /** Column or column-group related to the header that triggered the event */
    column: Column | ProvidedColumnGroup;
}
/**-------------------*/
/** VISIBILITY EVENTS */
/**-------------------*/
export interface ContextMenuVisibleChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'contextMenuVisibleChanged', TData, TContext> {
    /** True if now visible; false if now hidden. */
    visible: boolean;
    /** Source of the visibility status change. */
    source: 'api' | 'ui';
}
export interface AdvancedFilterBuilderVisibleChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'advancedFilterBuilderVisibleChanged', TData, TContext> {
    /** True if now visible; false if now hidden. */
    visible: boolean;
    /** Source of the visibility status change. */
    source: 'api' | 'ui';
}
export interface ToolPanelVisibleChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'toolPanelVisibleChanged', TData, TContext> {
    /** True if now visible; false if now hidden. */
    visible: boolean;
    source: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api';
    /** Key of tool panel. */
    key: string;
    /** True if switching between tool panels. False if showing/hiding. */
    switchingToolPanel: boolean;
}
export interface ColumnMenuVisibleChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnMenuVisibleChanged', TData, TContext> {
    /** True if now visible; false if now hidden. */
    visible: boolean;
    /** True if switching between tabs. False if showing/hiding. Only applies to legacy tabbed menu. */
    switchingTab: boolean;
    /**
     * Currently displayed menu/tab.
     * If filter launched from floating filter, will be `'floatingFilter'`.
     * If using `columnMenu = 'new'` (default behaviour), will be `'columnMenu'` for the column menu,
     * `'columnFilter'` for the column filter, and `'columnChooser'` for the column chooser.
     * If using AG Grid Enterprise and `columnMenu = 'legacy'`,
     * will be the tab `'generalMenuTab'`, `'filterMenuTab'` or `'columnsMenuTab'`.
     * If using AG Grid Community and `columnMenu = 'legacy'`, will be `'columnMenu'`.
     */
    key: 'generalMenuTab' | 'filterMenuTab' | 'columnsMenuTab' | 'columnMenu' | 'columnFilter' | 'floatingFilter' | 'columnChooser';
    /**
     * Column the menu is opened for. Will be `null` if not launched from a column
     * (e.g. column chooser from the API, or column menu via right-click on a column group or empty header).
     */
    column: Column | null;
    /**
     * Column group the menu is opened for if launched from right-click on a column group
     */
    columnGroup?: ProvidedColumnGroup | null;
}
/**--------------*/
/** BATCH EVENTS */
/**--------------*/
interface BatchEditingEvent<T extends AgEventType, TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    changes?: CellValueChange[];
}
export interface BatchEditingStartedEvent<TData = any, TContext = any> extends BatchEditingEvent<'batchEditingStarted', TData, TContext> {
}
export interface BatchEditingStoppedEvent<TData = any, TContext = any> extends BatchEditingEvent<'batchEditingStopped', TData, TContext> {
}
/**---------------------*/
/** BULK EDITING EVENTS */
/**---------------------*/
interface BulkEditingEvent<T extends AgEventType, TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    changes?: CellValueChange[];
}
export interface BulkEditingStartedEvent<TData = any, TContext = any> extends BulkEditingEvent<'bulkEditingStarted', TData, TContext> {
}
export interface BulkEditingStoppedEvent<TData = any, TContext = any> extends BulkEditingEvent<'bulkEditingStopped', TData, TContext> {
}
/**------------*/
/** ROW EVENTS */
/**------------*/
interface BaseRowEvent<T extends AgEventType, TData, TContext> extends AgGlobalEvent<T, TData, TContext> {
    /** The row node. */
    node: IRowNode<TData>;
    /** The visible row index for the row */
    rowIndex: number | null;
    /** Either 'top', 'bottom' or null / undefined (if not set) */
    rowPinned: RowPinnedType;
    /** If event was due to browser event (eg click), this is the browser event */
    event?: Event | null;
    /** If the browser `event` is present the `eventPath` persists the `event.composedPath()` result for access within AG Grid event handlers.  */
    eventPath?: EventTarget[];
}
export interface RowEvent<T extends AgEventType, TData = any, TContext = any> extends BaseRowEvent<T, TData, TContext> {
    /** The user provided data for the row. Data is `undefined` for row groups. */
    data: TData | undefined;
}
/** Base interface for row events that always have data set. */
interface RowWithDataEvent<T extends AgEventType, TData = any, TContext = any> extends BaseRowEvent<T, TData, TContext> {
    /** The user provided data for the row. */
    data: TData;
}
export interface RowGroupOpenedEvent<TData = any, TContext = any> extends RowEvent<'rowGroupOpened', TData, TContext> {
    /** True if the group is expanded. */
    expanded: boolean;
}
export interface RowValueChangedEvent<TData = any, TContext = any> extends RowEvent<'rowValueChanged', TData, TContext> {
}
export interface RowSelectedEvent<TData = any, TContext = any> extends RowEvent<'rowSelected', TData, TContext> {
    source: SelectionEventSourceType;
}
export interface VirtualRowRemovedEvent<TData = any, TContext = any> extends RowEvent<'virtualRowRemoved', TData, TContext> {
}
interface RowMouseEvent<TEventType extends 'rowClicked' | 'rowDoubleClicked', TData = any, TContext = any> extends RowEvent<TEventType, TData, TContext> {
    /** `true` if `suppressMouseEventHandling` has been implemented in the corresponding cell renderer params and has returned `true`. */
    isEventHandlingSuppressed: boolean;
}
export interface RowClickedEvent<TData = any, TContext = any> extends RowMouseEvent<'rowClicked', TData, TContext> {
}
export interface RowDoubleClickedEvent<TData = any, TContext = any> extends RowMouseEvent<'rowDoubleClicked', TData, TContext> {
}
export interface RowEditingStartedEvent<TData = any, TContext = any> extends RowEvent<'rowEditingStarted', TData, TContext> {
}
export interface RowEditingStoppedEvent<TData = any, TContext = any> extends RowEvent<'rowEditingStopped', TData, TContext> {
}
export interface FullWidthCellKeyDownEvent<TData = any, TContext = any> extends RowEvent<'cellKeyDown', TData, TContext> {
}
/**------------*/
/** CELL EVENTS */
/**------------*/
export interface CellEvent<T extends AgEventType, TData = any, TValue = any, TContext = any> extends RowEvent<T, TData, TContext> {
    column: Column<TValue>;
    colDef: ColDef<TData, TValue>;
    /** The value for the cell if available otherwise undefined. */
    value: TValue | null | undefined;
}
/** Use for cell events that will always have a data property. */
interface CellWithDataEvent<T extends AgEventType, TData = any, TValue = any, TContext = any> extends RowWithDataEvent<T, TData, TContext> {
    column: Column<TValue>;
    colDef: ColDef<TData, TValue>;
    /** The value for the cell */
    value: TValue | null | undefined;
}
export interface CellKeyDownEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellKeyDown', TData, TValue, TContext> {
}
interface CellMouseEvent<TEventType extends 'cellClicked' | 'cellMouseDown' | 'cellDoubleClicked', TData = any, TValue = any, TContext = any> extends CellEvent<TEventType, TData, TValue, TContext> {
    /** `true` if `suppressMouseEventHandling` has been implemented in the corresponding cell renderer params and has returned `true`. */
    isEventHandlingSuppressed: boolean;
}
export interface CellClickedEvent<TData = any, TValue = any, TContext = any> extends CellMouseEvent<'cellClicked', TData, TValue, TContext> {
}
export interface CellMouseDownEvent<TData = any, TValue = any, TContext = any> extends CellMouseEvent<'cellMouseDown', TData, TValue, TContext> {
}
export interface CellDoubleClickedEvent<TData = any, TValue = any, TContext = any> extends CellMouseEvent<'cellDoubleClicked', TData, TValue, TContext> {
}
export interface CellMouseOverEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellMouseOver', TData, TValue, TContext> {
}
export interface CellMouseOutEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellMouseOut', TData, TValue, TContext> {
}
export interface CellContextMenuEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellContextMenu', TData, TValue, TContext> {
}
export interface CellEditingStartedEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellEditingStarted', TData, TValue, TContext> {
}
export interface CellEditingStoppedEvent<TData = any, TValue = any, TContext = any> extends CellEvent<'cellEditingStopped', TData, TValue, TContext> {
    /** The old value before editing */
    oldValue: TValue | null | undefined;
    /** The new value after editing */
    newValue: TValue | null | undefined;
    /** Property indicating if the value of the editor has changed */
    valueChanged: boolean;
}
export interface CellValueChangedEvent<TData = any, TValue = any, TContext = any> extends CellWithDataEvent<'cellValueChanged', TData, TValue, TContext> {
    oldValue: TValue | null | undefined;
    newValue: TValue | null | undefined;
    source: string | undefined;
}
export interface CellEditValuesChangedEvent<TData = any, TValue = any, TContext = any> extends CellWithDataEvent<'cellEditValuesChanged', TData, TValue, TContext> {
    oldValue: TValue | null | undefined;
    newValue: TValue | null | undefined;
    source: string | undefined;
}
export interface CellEditRequestEvent<TData = any, TValue = any, TContext = any> extends CellWithDataEvent<'cellEditRequest', TData, TValue, TContext> {
    oldValue: TValue | null | undefined;
    newValue: TValue | null | undefined;
    source: string | undefined;
}
export interface AsyncTransactionsFlushedEvent<TData = any, TContext = any> extends AgGlobalEvent<'asyncTransactionsFlushed', TData, TContext> {
    /**
     * Array of result objects. for SSRM it's always list of `ServerSideTransactionResult`.
     * For Client-Side Row Model it's a list of `RowNodeTransaction`.
     */
    results: (RowNodeTransaction<TData> | ServerSideTransactionResult<TData>)[];
}
/** @deprecated v32 Use AsyncTransactionsFlushedEvent */
export interface AsyncTransactionsFlushed<TData = any, TContext = any> extends AsyncTransactionsFlushedEvent<TData, TContext> {
}
export interface StoreRefreshedEvent<TData = any, TContext = any> extends AgGlobalEvent<'storeRefreshed', TData, TContext> {
    /** The route of the store which has finished refreshing, undefined if root level */
    route?: string[];
}
export interface StateUpdatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'stateUpdated', TData, TContext> {
    /**
     * Which parts of the state triggered the update,
     * or `gridInitializing` when the state has been created during grid initialization,
     * or 'api' when the state has been set via `api.setState`
     */
    sources: (keyof GridState | 'gridInitializing' | 'api')[];
    /** The updated state */
    state: GridState;
}
export interface ScrollVisibilityChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'scrollVisibilityChanged', TData, TContext> {
}
export interface ScrollOverflowChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'scrollGapChanged', TData, TContext> {
}
export interface StoreUpdatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'storeUpdated', TData, TContext> {
}
export interface LeftPinnedWidthChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'leftPinnedWidthChanged', TData, TContext> {
}
export interface RightPinnedWidthChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rightPinnedWidthChanged', TData, TContext> {
}
export interface RowContainerHeightChanged<TData = any, TContext = any> extends AgGlobalEvent<'rowContainerHeightChanged', TData, TContext> {
}
/**-----------------*/
/** Internal EVENTS */
/**-----------------*/
export interface FlashCellsEvent<TData = any, TContext = any> extends AgGlobalEvent<'flashCells', TData, TContext> {
    cells: any;
}
export interface DisplayedRowsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'displayedRowsChanged', TData, TContext> {
    afterScroll: boolean;
}
export interface CssVariablesChanged<TData = any, TContext = any> extends AgGlobalEvent<'gridStylesChanged', TData, TContext> {
    themeChanged?: boolean;
    headerHeightChanged?: boolean;
    rowHeightChanged?: boolean;
    listItemHeightChanged?: boolean;
    rowBorderWidthChanged?: boolean;
}
export interface AdvancedFilterEnabledChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'advancedFilterEnabledChanged', TData, TContext> {
    enabled: boolean;
}
export interface DataTypesInferredEvent<TData = any, TContext = any> extends AgGlobalEvent<'dataTypesInferred', TData, TContext> {
}
export interface FieldValueEvent<T extends AgEventType = 'fieldValueChanged', TData = any, TContext = any> extends AgGlobalEvent<T, TData, TContext> {
    value: any;
}
export interface FieldPickerValueSelectedEvent<TData = any, TContext = any> extends FieldValueEvent<'fieldPickerValueSelected', TData, TContext> {
    fromEnterKey: boolean;
}
export interface RichSelectListRowSelectedEvent<TData = any, TContext = any> extends FieldValueEvent<'richSelectListRowSelected', TData, TContext> {
    fromEnterKey: boolean;
}
export interface AlignedGridColumnEvent<TData = any, TContext = any> extends AgGlobalEvent<'alignedGridColumn', TData, TContext> {
    event: ColumnEvent<any> | ColumnGroupOpenedEvent;
}
export interface AlignedGridScrollEvent<TData = any, TContext = any> extends AgGlobalEvent<'alignedGridScroll', TData, TContext> {
    event: BodyScrollEvent;
}
export interface GridOptionsChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridOptionsChanged', TData, TContext> {
    options: GridOptions;
}
export interface ScrollbarWidthChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'scrollbarWidthChanged', TData, TContext> {
}
export interface KeyShortcutChangedCellStartEvent<TData = any, TContext = any> extends AgGlobalEvent<'keyShortcutChangedCellStart', TData, TContext> {
}
export interface KeyShortcutChangedCellEndEvent<TData = any, TContext = any> extends AgGlobalEvent<'keyShortcutChangedCellEnd', TData, TContext> {
}
export interface HeightScaleChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'heightScaleChanged', TData, TContext> {
}
export interface SuppressMovableColumnsEvent<TData = any, TContext = any> extends AgGlobalEvent<'suppressMovableColumns', TData, TContext> {
}
export interface SuppressMenuHideEvent<TData = any, TContext = any> extends AgGlobalEvent<'suppressMenuHide', TData, TContext> {
}
export interface SuppressFieldDotNotationEvent<TData = any, TContext = any> extends AgGlobalEvent<'suppressFieldDotNotation', TData, TContext> {
}
export interface ColumnContainerWidthChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnContainerWidthChanged', TData, TContext> {
}
export interface RowContainerHeightChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rowContainerHeightChanged', TData, TContext> {
}
export interface HeaderHeightChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'headerHeightChanged', TData, TContext> {
}
export interface ColumnHeaderHeightChangedEvent<TData = any, TContext = any> extends ColumnEvent<'columnHeaderHeightChanged', TData, TContext> {
}
export interface ColumnGroupHeaderHeightChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnGroupHeaderHeightChanged', TData, TContext> {
    columnGroup: ColumnGroup | null;
    source: 'autosizeColumnGroupHeaderHeight';
}
export interface GridStylesChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'gridStylesChanged', TData, TContext> {
}
export interface RowCountReadyEvent<TData = any, TContext = any> extends AgGlobalEvent<'rowCountReady', TData, TContext> {
}
export interface FieldValueChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'fieldValueChanged', TData, TContext> {
}
export interface FieldPickerValueSelectedEvent<TData = any, TContext = any> extends AgGlobalEvent<'fieldPickerValueSelected', TData, TContext> {
}
export interface RichSelectListRowSelectedEvent<TData = any, TContext = any> extends AgGlobalEvent<'richSelectListRowSelected', TData, TContext> {
}
export interface SideBarUpdatedEvent<TData = any, TContext = any> extends AgGlobalEvent<'sideBarUpdated', TData, TContext> {
}
export interface ChartTitleEditEvent<TData = any, TContext = any> extends AgGlobalEvent<'chartTitleEdit', TData, TContext> {
}
export interface RecalculateRowBoundsEvent<TData = any, TContext = any> extends AgGlobalEvent<'recalculateRowBounds', TData, TContext> {
}
export interface StickyTopOffsetChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'stickyTopOffsetChanged', TData, TContext> {
}
export interface RowNodeDataChangedEvent<TData = any, TContext = any> extends AgGlobalEvent<'rowNodeDataChanged', TData, TContext> {
    node: RowNode<TData>;
}
export interface ColumnsResetEvent<TData = any, TContext = any> extends AgGlobalEvent<'columnsReset', TData, TContext> {
    source: ColumnEventType;
}
export interface FilterSwitchedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterSwitched', TData, TContext> {
    column: Column;
}
export interface FilterClosedEvent<TData = any, TContext = any> extends AgGlobalEvent<'filterClosed', TData, TContext> {
    column: Column;
}
interface BaseFilterDestroyedEvent<TEventType extends 'filterDestroyed' | 'filterHandlerDestroyed', TData = any, TContext = any> extends AgGlobalEvent<TEventType, TData, TContext> {
    source: 'api' | 'columnChanged' | 'gridDestroyed' | 'advancedFilterEnabled' | 'paramsUpdated';
    column: Column;
}
export interface FilterDestroyedEvent<TData = any, TContext = any> extends BaseFilterDestroyedEvent<'filterDestroyed', TData, TContext> {
}
/** This is a special version of FilterDestroyedEvent, that only fires if the UI was never created (but the handler existed) */
export interface FilterHandlerDestroyedEvent<TData = any, TContext = any> extends BaseFilterDestroyedEvent<'filterHandlerDestroyed', TData, TContext> {
}
export {};
