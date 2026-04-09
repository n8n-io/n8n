/************************************************************************************************
 * If you change the GridOptions interface, you must also update PropertyKeys to be consistent. *
 ************************************************************************************************/
import type { AgChartTheme, AgChartThemeOverrides } from 'ag-charts-types';
import type { Theme } from '../agStack/theming/theme';
import type { IsRowValidDropPositionCallback } from '../dragAndDrop/rowDragTypes';
import type { AgPublicEventType } from '../eventTypes';
import type { AdvancedFilterBuilderVisibleChangedEvent, AsyncTransactionsFlushedEvent, BatchEditingStartedEvent, BatchEditingStoppedEvent, BodyScrollEndEvent, BodyScrollEvent, BulkEditingStartedEvent, BulkEditingStoppedEvent, CellClickedEvent, CellContextMenuEvent, CellDoubleClickedEvent, CellEditRequestEvent, CellEditingStartedEvent, CellEditingStoppedEvent, CellFocusedEvent, CellKeyDownEvent, CellMouseDownEvent, CellMouseOutEvent, CellMouseOverEvent, CellSelectionChangedEvent, CellSelectionDeleteEndEvent, CellSelectionDeleteStartEvent, CellValueChangedEvent, ChartCreatedEvent, ChartDestroyedEvent, ChartOptionsChangedEvent, ChartRangeSelectionChangedEvent, ColumnEverythingChangedEvent, ColumnGroupOpenedEvent, ColumnHeaderClickedEvent, ColumnHeaderContextMenuEvent, ColumnHeaderMouseLeaveEvent, ColumnHeaderMouseOverEvent, ColumnMenuVisibleChangedEvent, ColumnMovedEvent, ColumnPinnedEvent, ColumnPivotChangedEvent, ColumnPivotModeChangedEvent, ColumnResizedEvent, ColumnRowGroupChangedEvent, ColumnValueChangedEvent, ColumnVisibleEvent, ColumnsResetEvent, ComponentStateChangedEvent, ContextMenuVisibleChangedEvent, CutEndEvent, CutStartEvent, DisplayedColumnsChangedEvent, DragCancelledEvent, DragStartedEvent, DragStoppedEvent, ExpandOrCollapseAllEvent, FillEndEvent, FillStartEvent, FilterChangedEvent, FilterModifiedEvent, FilterOpenedEvent, FilterUiChangedEvent, FindChangedEvent, FirstDataRenderedEvent, FloatingFilterUiChangedEvent, FullWidthCellKeyDownEvent, GridColumnsChangedEvent, GridPreDestroyedEvent, GridReadyEvent, GridSizeChangedEvent, HeaderFocusedEvent, ModelUpdatedEvent, NewColumnsLoadedEvent, PaginationChangedEvent, PasteEndEvent, PasteStartEvent, PinnedRowDataChangedEvent, PinnedRowsChangedEvent, PivotMaxColumnsExceededEvent, RangeDeleteEndEvent, RangeDeleteStartEvent, RangeSelectionChangedEvent, RedoEndedEvent, RedoStartedEvent, RowClickedEvent, RowDataUpdatedEvent, RowDoubleClickedEvent, RowDragCancelEvent, RowDragEndEvent, RowDragEnterEvent, RowDragLeaveEvent, RowDragMoveEvent, RowEditingStartedEvent, RowEditingStoppedEvent, RowGroupOpenedEvent, RowResizeEndedEvent, RowResizeStartedEvent, RowSelectedEvent, RowValueChangedEvent, SelectionChangedEvent, SortChangedEvent, StateUpdatedEvent, StoreRefreshedEvent, ToolPanelSizeChangedEvent, ToolPanelVisibleChangedEvent, TooltipHideEvent, TooltipShowEvent, UndoEndedEvent, UndoStartedEvent, ViewportChangedEvent, VirtualColumnsChangedEvent, VirtualRowRemovedEvent } from '../events';
import type { AutoSizeStrategy } from '../interfaces/autoSize';
import type { EditStrategyType } from '../interfaces/editStrategyType';
import type { EditValidationCommitType } from '../interfaces/editValidationCommitType';
import type { CsvExportParams, ProcessCellForExportParams, ProcessGroupHeaderForExportParams, ProcessHeaderForExportParams } from '../interfaces/exportParams';
import type { GridState } from '../interfaces/gridState';
import type { IAdvancedFilterBuilderParams } from '../interfaces/iAdvancedFilterBuilderParams';
import type { IAdvancedFilterParams } from '../interfaces/iAdvancedFilterParams';
import type { AlignedGrid } from '../interfaces/iAlignedGrid';
import type { FillOperationParams, FocusGridInnerElementParams, FullRowEditValidationParams, GetChartMenuItemsParams, GetChartToolbarItemsParams, GetContextMenuItemsParams, GetGroupAggFilteringParams, GetGroupIncludeFooterParams, GetGroupIncludeTotalRowParams, GetGroupRowAggParams, GetLocaleTextParams, GetMainMenuItemsParams, GetRowIdParams, GetServerSideGroupLevelParamsParams, InitialGroupOrderComparatorParams, IsApplyServerSideTransactionParams, IsExternalFilterPresentParams, IsFullWidthRowParams, IsGroupOpenByDefaultParams, IsServerSideGroupOpenByDefaultParams, NavigateToNextCellParams, NavigateToNextHeaderParams, PaginationNumberFormatterParams, PostProcessPopupParams, PostSortRowsParams, ProcessDataFromClipboardParams, ProcessRowParams, ProcessUnpinnedColumnsParams, RowHeightParams, SendToClipboardParams, TabToNextCellParams, TabToNextHeaderParams } from '../interfaces/iCallbackParams';
import type { CellPosition } from '../interfaces/iCellPosition';
import type { ChartToolPanelsDef, ChartToolbarMenuItemOptions, DefaultChartMenuItem } from '../interfaces/iChartOptions';
import type { Column } from '../interfaces/iColumn';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { IDatasource } from '../interfaces/iDatasource';
import type { ExcelExportParams, ExcelStyle } from '../interfaces/iExcelCreator';
import type { CreateFilterHandlerFunc } from '../interfaces/iFilter';
import type { FindOptions } from '../interfaces/iFind';
import type { HeaderPosition } from '../interfaces/iHeaderPosition';
import type { ILoadingCellRendererParams } from '../interfaces/iLoadingCellRenderer';
import type { IRowDragItem } from '../interfaces/iRowDragItem';
import type { RowModelType } from '../interfaces/iRowModel';
import type { IRowNode, RowPinnedType } from '../interfaces/iRowNode';
import type { IServerSideDatasource } from '../interfaces/iServerSideDatasource';
import type { SideBarDef } from '../interfaces/iSideBar';
import type { StatusPanelDef } from '../interfaces/iStatusPanel';
import type { IViewportDatasource } from '../interfaces/iViewportDatasource';
import type { DefaultMenuItem, MenuItemDef } from '../interfaces/menuItem';
import type { RowNumbersOptions } from '../interfaces/rowNumbers';
import type { CheckboxSelectionCallback, ColDef, ColGroupDef, ColTypeDef, IAggFunc, SortDirection } from './colDef';
import type { DataTypeDefinition } from './dataType';
export interface GridOptions<TData = any> {
    /**
     * Specifies the status bar components to use in the status bar.
     * @agModule `StatusBarModule`
     */
    statusBar?: {
        statusPanels: StatusPanelDef[];
    };
    /**
     * Specifies the side bar components.
     * @agModule `SideBarModule`
     */
    sideBar?: SideBarDef | string | string[] | boolean | null;
    /**
     * Set to `true` to not show the context menu. Use if you don't want to use the default 'right click' context menu.
     * @default false
     */
    suppressContextMenu?: boolean;
    /**
     * When using `suppressContextMenu`, you can use the `onCellContextMenu` function to provide your own code to handle cell `contextmenu` events.
     * This flag is useful to prevent the browser from showing its default context menu.
     * @default false
     */
    preventDefaultOnContextMenu?: boolean;
    /**
     * Allows context menu to show, even when `Ctrl` key is held down.
     * @default false
     * @agModule `ContextMenuModule`
     */
    allowContextMenuWithControlKey?: boolean;
    /**
     * Changes the display type of the column menu.
     * `'new'` just displays the main list of menu items. `'legacy'` displays a tabbed menu.
     * @default 'new'
     * @initial
     */
    columnMenu?: 'legacy' | 'new';
    /**
     * Only recommended for use if `columnMenu = 'legacy'`.
     * When `true`, the column menu button will always be shown.
     * When `false`, the column menu button will only show when the mouse is over the column header.
     * When using `columnMenu = 'legacy'`, this will default to `false` instead of `true`.
     * @default true
     */
    suppressMenuHide?: boolean;
    /**
     * Set to `true` to use the browser's default tooltip instead of using the grid's Tooltip Component.
     * @default false
     * @initial
     * @agModule `TooltipModule`
     */
    enableBrowserTooltips?: boolean;
    /**
     * The trigger that will cause tooltips to show and hide.
     *  - `hover` - The tooltip will show/hide when a cell/header is hovered.
     *  - `focus` - The tooltip will show/hide when a cell/header is focused.
     * @default 'hover'
     * @initial
     * @agModule `TooltipModule`
     */
    tooltipTrigger?: 'hover' | 'focus';
    /**
     * The delay in milliseconds that it takes for tooltips to show up once an element is hovered over.
     * **Note:** This property does not work if `enableBrowserTooltips` is `true`.
     * @default 2000
     * @agModule `TooltipModule`
     */
    tooltipShowDelay?: number;
    /**
     * The delay in milliseconds that it takes for tooltips to hide once they have been displayed.
     * **Note:** This property does not work if `enableBrowserTooltips` is `true` and `tooltipHideTriggers` includes `timeout`.
     * @default 10000
     * @agModule `TooltipModule`
     */
    tooltipHideDelay?: number;
    /**
     * Set to `true` to have tooltips follow the cursor once they are displayed.
     * @default false
     * @initial
     * @agModule `TooltipModule`
     */
    tooltipMouseTrack?: boolean;
    /**
     * This defines when tooltip will show up for Cells, Headers and SetFilter Items.
     *  - `standard` - The tooltip always shows up when the items configured with Tooltips are hovered.
     * - `whenTruncated` - The tooltip will only be displayed when the items hovered have truncated (showing ellipsis) values. This property does not work when `enableBrowserTooltips={true}`.
     * @default `standard`
     * @agModule `TooltipModule`
     */
    tooltipShowMode?: 'standard' | 'whenTruncated';
    /**
     * Set to `true` to enable tooltip interaction. When this option is enabled, the tooltip will not hide while the
     * tooltip itself it being hovered or has focus.
     * @default false
     * @initial
     * @agModule `TooltipModule`
     */
    tooltipInteraction?: boolean;
    /**
     * DOM element to use as the popup parent for grid popups (context menu, column menu etc).
     */
    popupParent?: HTMLElement | null;
    /**
     * Set to `true` to also include headers when copying to clipboard using `Ctrl + C` clipboard.
     * @default false
     * @agModule `ClipboardModule`
     */
    copyHeadersToClipboard?: boolean;
    /**
     * Set to `true` to also include group headers when copying to clipboard using `Ctrl + C` clipboard.
     * @default false
     * @agModule `ClipboardModule`
     */
    copyGroupHeadersToClipboard?: boolean;
    /**
     * Specify the delimiter to use when copying to clipboard.
     * @default '\t'
     * @agModule `ClipboardModule`
     */
    clipboardDelimiter?: string;
    /**
     * Set to `true` to copy the cell range or focused cell to the clipboard and never the selected rows.
     * @default false
     * @deprecated v32.2 Use `rowSelection.copySelectedRows` instead.
     */
    suppressCopyRowsToClipboard?: boolean;
    /**
     * Set to `true` to copy rows instead of ranges when a range with only a single cell is selected.
     * @default false
     * @deprecated v32.2 Use `rowSelection.copySelectedRows` instead.
     */
    suppressCopySingleCellRanges?: boolean;
    /**
     * Set to `true` to work around a bug with Excel (Windows) that adds an extra empty line at the end of ranges copied to the clipboard.
     * @default false
     * @agModule `ClipboardModule`
     */
    suppressLastEmptyLineOnPaste?: boolean;
    /**
     * Set to `true` to turn off paste operations within the grid.
     * @default false
     * @agModule `ClipboardModule`
     */
    suppressClipboardPaste?: boolean;
    /**
     * Set to `true` to stop the grid trying to use the Clipboard API, if it is blocked, and immediately fallback to the workaround.
     * @default false
     * @agModule `ClipboardModule`
     */
    suppressClipboardApi?: boolean;
    /**
     * Set to `true` to block **cut** operations within the grid.
     * @default false
     * @agModule `ClipboardModule`
     */
    suppressCutToClipboard?: boolean;
    /**
     * Array of Column / Column Group definitions.
     */
    columnDefs?: (ColDef<TData> | ColGroupDef<TData>)[] | null;
    /**
     * A default column definition. Items defined in the actual column definitions get precedence.
     */
    defaultColDef?: ColDef<TData>;
    /**
     * A default column group definition. All column group definitions will use these properties. Items defined in the actual column group definition get precedence.
     * @initial
     */
    defaultColGroupDef?: Partial<ColGroupDef<TData>>;
    /**
     * An object map of custom column types which contain groups of properties that column definitions can reuse by referencing in their `type` property.
     */
    columnTypes?: {
        [key: string]: ColTypeDef<TData>;
    };
    /**
     * An object map of cell data types to their definitions.
     * Cell data types can either override/update the pre-defined data types
     * (`'text'`, `'number'`, `'boolean'`, `'date'`, `'dateString'`, `'dateTime'`, `'dateTimeString'` or `'object'`),
     * or can be custom data types.
     */
    dataTypeDefinitions?: {
        [cellDataType: string]: DataTypeDefinition<TData>;
    };
    /**
     * Keeps the order of Columns maintained after new Column Definitions are updated.
     *
     * @default false
     */
    maintainColumnOrder?: boolean;
    /**
     * Resets pivot column order when impacted by filters, data or configuration changes
     *
     * @default false
     * @agModule `PivotModule`
     */
    enableStrictPivotColumnOrder?: boolean;
    /**
     * If `true`, then dots in field names (e.g. `'address.firstLine'`) are not treated as deep references. Allows you to use dots in your field name if you prefer.
     * @default false
     */
    suppressFieldDotNotation?: boolean;
    /**
     * The height in pixels for the row containing the column label header. If not specified, it uses the theme value of `header-height`.
     */
    headerHeight?: number;
    /**
     * The height in pixels for the rows containing header column groups. If not specified, it uses `headerHeight`.
     */
    groupHeaderHeight?: number;
    /**
     * The height in pixels for the row containing the floating filters. If not specified, it uses the theme value of `header-height`.
     */
    floatingFiltersHeight?: number;
    /**
     * The height in pixels for the row containing the columns when in pivot mode. If not specified, it uses `headerHeight`.
     */
    pivotHeaderHeight?: number;
    /**
     * The height in pixels for the row containing header column groups when in pivot mode. If not specified, it uses `groupHeaderHeight`.
     */
    pivotGroupHeaderHeight?: number;
    /**
     * Hide any column header rows that would only contain padded groups.
     */
    hidePaddedHeaderRows?: boolean;
    /**
     * Allow reordering and pinning columns by dragging columns from the Columns Tool Panel to the grid.
     * @default false
     * @agModule `ColumnsToolPanelModule`
     */
    allowDragFromColumnsToolPanel?: boolean;
    /**
     * Set to `true` to suppress column moving, i.e. to make the columns fixed position.
     * @default false
     */
    suppressMovableColumns?: boolean;
    /**
     * If `true`, the `ag-column-moving` class is not added to the grid while columns are moving. In the default themes, this results in no animation when moving columns.
     * @default false
     */
    suppressColumnMoveAnimation?: boolean;
    /**
     * Set to `true` to suppress moving columns while dragging the Column Header. This option highlights the position where the column will be placed and it will only move it on mouse up.
     * @default false
     */
    suppressMoveWhenColumnDragging?: boolean;
    /**
     * If `true`, when you drag a column out of the grid (e.g. to the group zone) the column is not hidden.
     * @default false
     */
    suppressDragLeaveHidesColumns?: boolean;
    /**
     * Enable to prevent column visibility changing when grouped columns are changed.
     * @default false
     */
    suppressGroupChangesColumnVisibility?: boolean | 'suppressHideOnGroup' | 'suppressShowOnUngroup';
    /**
     * By default, when a column is un-grouped, i.e. using the Row Group Panel, it is made visible in the grid. This property stops the column becoming visible again when un-grouping.
     * @default false
     * @deprecated v33.0.0 - Use `suppressGroupChangesColumnVisibility: 'suppressShowOnUngroup'` instead.
     */
    suppressMakeColumnVisibleAfterUnGroup?: boolean;
    /**
     * If `true`, when you drag a column into a row group panel the column is not hidden.
     * @default false
     * @deprecated v33.0.0 - Use `suppressGroupChangesColumnVisibility: 'suppressHideOnGroup'` instead.
     */
    suppressRowGroupHidesColumns?: boolean;
    /**
     * Set to `'shift'` to have shift-resize as the default resize operation (same as user holding down `Shift` while resizing).
     */
    colResizeDefault?: 'shift';
    /**
     * Suppresses auto-sizing columns for columns. In other words, double clicking a column's header's edge will not auto-size.
     * @default false
     * @initial
     */
    suppressAutoSize?: boolean;
    /**
     * Number of pixels to add to a column width after the [auto-sizing](./column-sizing/#auto-size-columns-to-fit-cell-contents) calculation.
     * Set this if you want to add extra room to accommodate (for example) sort icons, or some other dynamic nature of the header.
     * @default 20
     */
    autoSizePadding?: number;
    /**
     * Set this to `true` to skip the `headerName` when `autoSize` is called by default.
     * @default false
     * @initial
     * @agModule `ColumnAutoSizeModule`
     */
    skipHeaderOnAutoSize?: boolean;
    /**
     * Auto-size the columns when the grid is loaded. Can size to fit the grid width, fit a provided width, or fit the cell contents.
     * @initial
     * @agModule `ColumnAutoSizeModule`
     */
    autoSizeStrategy?: AutoSizeStrategy;
    /**
     * A map of component names to components.
     * @initial
     */
    components?: {
        [p: string]: any;
    };
    /**
     * Set to `'fullRow'` to enable Full Row Editing. Otherwise leave blank to edit one cell at a time.
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    editType?: EditStrategyType;
    /**
     * Determine the behavior when navigating to the next/previous editable cell. Default is to begin editing the cell.
     */
    suppressStartEditOnTab?: boolean;
    /**
     * Validates the Full Row Edit. Only relevant when `editType="fullRow"`.
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    getFullRowEditValidationErrors?: GetFullRowEditValidationErrors;
    /**
     * Set to `block` to block the commit of invalid cell edits, keeping editors open.
     */
    invalidEditValueMode?: EditValidationCommitType;
    /**
     * Set to `true` to enable Single Click Editing for cells, to start editing with a single click.
     * @default false
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    singleClickEdit?: boolean;
    /**
     * Set to `true` so that neither single nor double click starts editing.
     * @default false
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    suppressClickEdit?: boolean;
    /**
     * Set to `true` to stop the grid updating data after `Edit`, `Clipboard` and `Fill Handle` operations. When this is set, it is intended the application will update the data, eg in an external immutable store, and then pass the new dataset to the grid. <br />**Note:** `rowNode.setDataValue()` does not update the value of the cell when this is `True`, it fires `onCellEditRequest` instead.
     * @default false
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    readOnlyEdit?: boolean;
    /**
     * Set this to `true` to stop cell editing when grid loses focus.
     * The default is that the grid stays editing until focus goes onto another cell.
     * @default false
     * @initial
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    stopEditingWhenCellsLoseFocus?: boolean;
    /**
     * Set to `true` along with `enterNavigatesVerticallyAfterEdit` to have Excel-style behaviour for the `Enter` key.
     * i.e. pressing the `Enter` key will move down to the cell beneath and `Shift+Enter` will move up to the cell above.
     * @default false
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    enterNavigatesVertically?: boolean;
    /**
     * Set to `true` along with `enterNavigatesVertically` to have Excel-style behaviour for the 'Enter' key.
     * i.e. pressing the Enter key will move down to the cell beneath and Shift+Enter key will move up to the cell above.
     * @default false
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    enterNavigatesVerticallyAfterEdit?: boolean;
    /**
     * Forces Cell Editing to start when backspace is pressed. This is only relevant for MacOS users.
     * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
     */
    enableCellEditingOnBackspace?: boolean;
    /**
     * Set to `true` to enable Undo / Redo while editing.
     * @initial
     * @agModule `UndoRedoEditModule`
     */
    undoRedoCellEditing?: boolean;
    /**
     * Set the size of the undo / redo stack.
     * @default 10
     * @initial
     * @agModule `UndoRedoEditModule`
     */
    undoRedoCellEditingLimit?: number;
    /**
     * A default configuration object used to export to CSV.
     * @agModule `CsvExportModule`
     */
    defaultCsvExportParams?: CsvExportParams;
    /**
     * Prevents the user from exporting the grid to CSV.
     * @default false
     */
    suppressCsvExport?: boolean;
    /**
     * A default configuration object used to export to Excel.
     * @agModule `ExcelExportModule`
     */
    defaultExcelExportParams?: ExcelExportParams;
    /**
     * Prevents the user from exporting the grid to Excel.
     * @default false
     */
    suppressExcelExport?: boolean;
    /**
     * A list (array) of Excel styles to be used when exporting to Excel with styles.
     * @initial
     * @agModule `ExcelExportModule`
     */
    excelStyles?: ExcelStyle[];
    /**
     * Text to find within the grid.
     * @agModule `FindModule`
     */
    findSearchValue?: string;
    /**
     * Options for the Find feature.
     * @agModule `FindModule`
     */
    findOptions?: FindOptions;
    /**
     * Rows are filtered using this text as a Quick Filter.
     * Only supported for Client-Side Row Model.
     * @agModule `QuickFilterModule`
     */
    quickFilterText?: string;
    /**
     * Set to `true` to turn on the Quick Filter cache, used to improve performance when using the Quick Filter.
     * @default false
     * @initial
     * @agModule `QuickFilterModule`
     */
    cacheQuickFilter?: boolean;
    /**
     * Hidden columns are excluded from the Quick Filter by default.
     * To include hidden columns, set to `true`.
     * @default false
     * @agModule `QuickFilterModule`
     */
    includeHiddenColumnsInQuickFilter?: boolean;
    /**
     * Changes how the Quick Filter splits the Quick Filter text into search terms.
     * @agModule `QuickFilterModule`
     */
    quickFilterParser?: (quickFilter: string) => string[];
    /**
     * Changes the matching logic for whether a row passes the Quick Filter.
     * @agModule `QuickFilterModule`
     */
    quickFilterMatcher?: (quickFilterParts: string[], rowQuickFilterAggregateText: string) => boolean;
    /**
     * When pivoting, Quick Filter is only applied on the pivoted data
     * (or aggregated data if `groupAggFiltering = true`).
     * Set to `true` to apply Quick Filter before pivoting (/aggregating) instead.
     * @default false
     * @agModule `QuickFilterModule`
     */
    applyQuickFilterBeforePivotOrAgg?: boolean;
    /**
     * Set to `true` to override the default tree data filtering behaviour to instead exclude child nodes from filter results.
     * @default false
     * @agModule `TreeDataModule`
     */
    excludeChildrenWhenTreeDataFiltering?: boolean;
    /**
     * Set to true to enable the Advanced Filter.
     * @default false
     * @agModule `AdvancedFilterModule`
     */
    enableAdvancedFilter?: boolean;
    /**
     * Allows rows to always be displayed, even if they don't match the applied filtering.
     * Return `true` for the provided row to always be displayed.
     * Only works with the Client-Side Row Model.
     * @agModule `TextFilterModule` / `NumberFilterModule` / `DateFilterModule` / `SetFilterModule` / `MultiFilterModule` / `CustomFilterModule` / `QuickFilterModule` / `ExternalFilterModule` / `AdvancedFilterModule`
     */
    alwaysPassFilter?: (rowNode: IRowNode<TData>) => boolean;
    /**
     * Hidden columns are excluded from the Advanced Filter by default.
     * To include hidden columns, set to `true`.
     * @default false
     * @agModule `AdvancedFilterModule`
     */
    includeHiddenColumnsInAdvancedFilter?: boolean;
    /**
     * DOM element to use as the parent for the Advanced Filter to allow it to appear outside of the grid.
     * Set to `null` or `undefined` to appear inside the grid.
     * @agModule `AdvancedFilterModule`
     */
    advancedFilterParent?: HTMLElement | null;
    /**
     * Customise the parameters passed to the Advanced Filter Builder.
     * @agModule `AdvancedFilterModule`
     */
    advancedFilterBuilderParams?: IAdvancedFilterBuilderParams;
    /**
     * Customise the parameters passed to the Advanced Filter
     * @agModule `AdvancedFilterModule`
     */
    advancedFilterParams?: IAdvancedFilterParams;
    /**
     * @deprecated As of v34, advanced filter no longer uses function evaluation, so this option has no effect.
     * @default true
     * @agModule `AdvancedFilterModule`
     */
    suppressAdvancedFilterEval?: boolean;
    /**
     * When using AG Grid Enterprise, the Set Filter is used by default when `filter: true` is set on column definitions.
     * Set to `true` to prevent this and instead use the Text Filter, Number Filter or Date Filter based on the cell data type,
     * the same as when using AG Grid Community.
     * @default false
     * @initial
     * @agModule TextFilterModule / NumberFilterModule / DateFilterModule / MultiFilterModule / CustomFilterModule
     */
    suppressSetFilterByDefault?: boolean;
    /**
     * Enable filter handlers for custom filter components.
     * Requires all custom filters to be implemented using handlers.
     *
     * Note that grid-provided filters (except for the Multi Filter) always use filter handlers.
     * The Multi Filter will also use a filter handler if this is enabled.
     * @initial
     */
    enableFilterHandlers?: boolean;
    /**
     * A map of filter handler key to filter handler function.
     * Allows for filter handler keys to be used in `colDef.filter.handler`.
     * @initial
     */
    filterHandlers?: {
        [key: string]: CreateFilterHandlerFunc<TData>;
    };
    /**
     * Set to `true` to Enable Charts.
     * @default false
     * @agModule `IntegratedChartsModule`
     */
    enableCharts?: boolean;
    /**
     * The list of chart themes that a user can choose from in the chart panel.
     * @default ['ag-default', 'ag-material', 'ag-sheets', 'ag-polychroma', 'ag-vivid'];
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    chartThemes?: string[];
    /**
     * A map containing custom chart themes.
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    customChartThemes?: {
        [name: string]: AgChartTheme;
    };
    /**
     * Chart theme overrides applied to all themes.
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    chartThemeOverrides?: AgChartThemeOverrides;
    /**
     * Allows customisation of the Chart Tool Panels, such as changing the tool panels visibility and order, as well as choosing which charts should be displayed in the chart panel.
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    chartToolPanelsDef?: ChartToolPanelsDef;
    /**
     * Get chart menu items. Only applies when using AG Charts Enterprise.
     * @agModule `IntegratedChartsModule`
     */
    chartMenuItems?: (DefaultChartMenuItem | MenuItemDef<TData>)[] | GetChartMenuItems<TData>;
    /**
     * Provide your own loading cell renderer to use when data is loading via a DataSource or when a cell renderer is deferred.
     * See [Loading Cell Renderer](https://www.ag-grid.com/javascript-data-grid/component-loading-cell-renderer/) for framework specific implementation details.
     */
    loadingCellRenderer?: any;
    /**
     * Params to be passed to the `loadingCellRenderer` component.
     */
    loadingCellRendererParams?: any;
    /**
     * Callback to select which loading cell renderer to be used when data is loading via a DataSource or when a cell renderer is deferred.
     * @initial
     */
    loadingCellRendererSelector?: LoadingCellRendererSelectorFunc<TData>;
    /**
     * A map of key->value pairs for localising text within the grid.
     * @initial
     * @agModule `LocaleModule`
     */
    localeText?: {
        [key: string]: string;
    };
    /**
     * Set to `true` to enable Master Detail.
     * @default false
     * @agModule `MasterDetailModule`
     */
    masterDetail?: boolean;
    /**
     * Set to `true` to keep detail rows for when they are displayed again.
     * @default false
     * @initial
     * @agModule `MasterDetailModule`
     */
    keepDetailRows?: boolean;
    /**
     * Sets the number of details rows to keep.
     * @default 10
     * @initial
     * @agModule `MasterDetailModule`
     */
    keepDetailRowsCount?: number;
    /**
     * Provide a custom `detailCellRenderer` to use when a master row is expanded.
     * See [Detail Cell Renderer](https://www.ag-grid.com/javascript-data-grid/master-detail-custom-detail/) for framework specific implementation details.
     * @agModule `MasterDetailModule`
     */
    detailCellRenderer?: any;
    /**
     * Specifies the params to be used by the Detail Cell Renderer. Can also be a function that provides the params to enable dynamic definitions of the params.
     * @agModule `MasterDetailModule`
     */
    detailCellRendererParams?: any;
    /**
     * Set fixed height in pixels for each detail row.
     * @initial
     * @agModule `MasterDetailModule`
     */
    detailRowHeight?: number;
    /**
     * Set to `true` to have the detail grid dynamically change it's height to fit it's rows.
     * @initial
     * @agModule `MasterDetailModule`
     */
    detailRowAutoHeight?: boolean;
    /**
     * Provides a context object that is provided to different callbacks the grid uses. Used for passing additional information to the callbacks used by your application.
     * @initial
     */
    context?: any;
    /**
     *
     * A list of grids to treat as Aligned Grids.
     * Provide a list if the grids / apis already exist or return via a callback to allow the aligned grids to be retrieved asynchronously.
     * If grids are aligned then the columns and horizontal scrolling will be kept in sync.
     * @agModule `AlignedGridsModule`
     */
    alignedGrids?: AlignedGrid[] | (() => AlignedGrid[]);
    /**
     * Change this value to set the tabIndex order of the Grid within your application.
     * @default 0
     * @initial
     */
    tabIndex?: number;
    /**
     * The number of rows rendered outside the viewable area the grid renders.
     * Having a buffer means the grid will have rows ready to show as the user slowly scrolls vertically.
     * @default 10
     */
    rowBuffer?: number;
    /**
     * Set to `true` to turn on the value cache.
     * @default false
     * @initial
     * @agModule `ValueCacheModule`
     */
    valueCache?: boolean;
    /**
     * Set to `true` to configure the value cache to not expire after data updates.
     * @default false
     * @initial
     * @agModule `ValueCacheModule`
     */
    valueCacheNeverExpires?: boolean;
    /**
     * Set to `true` to allow cell expressions.
     * @default false
     * @initial
     */
    enableCellExpressions?: boolean;
    /**
     * Disables touch support (but does not remove the browser's efforts to simulate mouse events on touch).
     * @default false
     * @initial
     */
    suppressTouch?: boolean;
    /**
     * Set to `true` to not set focus back on the grid after a refresh. This can avoid issues where you want to keep the focus on another part of the browser.
     * @default false
     */
    suppressFocusAfterRefresh?: boolean;
    /**
     * @deprecated As of v32.2 the grid always uses the browser's ResizeObserver, this grid option has no effect
     * @default false
     * @initial
     */
    suppressBrowserResizeObserver?: boolean;
    /**
     * @deprecated As of v33 `gridOptions` and `columnDefs` both have a `context` property that should be used for arbitrary user data. This means that column definitions and gridOptions should only contain valid properties making this property redundant.
     * @default false
     * @initial
     */
    suppressPropertyNamesCheck?: boolean;
    /**
     * Disables change detection.
     * @default false
     */
    suppressChangeDetection?: boolean;
    /**
     * Set this to `true` to enable debug information from the grid and related components. Will result in additional logging being output, but very useful when investigating problems.
     * It is also recommended to register the `ValidationModule` to identify any misconfigurations.
     * @default false
     * @initial
     */
    debug?: boolean;
    /**
     * Show or hide the loading overlay.
     */
    loading?: boolean;
    /**
     * Provide a HTML string to override the default loading overlay. Supports non-empty plain text or HTML with a single root element.
     */
    overlayLoadingTemplate?: string;
    /**
     * Provide a custom loading overlay component.
     * @initial
     */
    loadingOverlayComponent?: any;
    /**
     * Customise the parameters provided to the loading overlay component.
     */
    loadingOverlayComponentParams?: any;
    /**
     * Disables the 'loading' overlay.
     * @deprecated v32 - Deprecated. Use `loading=false` instead.
     * @default false
     * @initial
     */
    suppressLoadingOverlay?: boolean;
    /**
     * Provide a HTML string to override the default no-rows overlay. Supports non-empty plain text or HTML with a single root element.
     */
    overlayNoRowsTemplate?: string;
    /**
     * Provide a custom no-rows overlay component.
     * @initial
     */
    noRowsOverlayComponent?: any;
    /**
     * Customise the parameters provided to the no-rows overlay component.
     */
    noRowsOverlayComponentParams?: any;
    /**
     * Set to `true` to prevent the no-rows overlay being shown when there is no row data.
     * @default false
     * @initial
     */
    suppressNoRowsOverlay?: boolean;
    /**
     * Set whether pagination is enabled.
     * @default false
     * @agModule `PaginationModule`
     */
    pagination?: boolean;
    /**
     * How many rows to load per page. If `paginationAutoPageSize` is specified, this property is ignored.
     * @default 100
     * @agModule `PaginationModule`
     */
    paginationPageSize?: number;
    /**
     * Determines if the page size selector is shown in the pagination panel or not.
     * Set to an array of values to show the page size selector with custom list of possible page sizes.
     * Set to `true` to show the page size selector with the default page sizes `[20, 50, 100]`.
     * Set to `false` to hide the page size selector.
     * @default true
     * @initial
     * @agModule `PaginationModule`
     */
    paginationPageSizeSelector?: number[] | boolean;
    /**
     * Set to `true` so that the number of rows to load per page is automatically adjusted by the grid so each page shows enough rows to just fill the area designated for the grid. If `false`, `paginationPageSize` is used.
     * @default false
     * @agModule `PaginationModule`
     */
    paginationAutoPageSize?: boolean;
    /**
     * Set to `true` to have pages split children of groups when using Row Grouping or detail rows with Master Detail.
     * @default false
     * @initial
     * @agModule `PaginationModule`
     */
    paginateChildRows?: boolean;
    /**
     * If `true`, the default grid controls for navigation are hidden.
     * This is useful if `pagination=true` and you want to provide your own pagination controls.
     * Otherwise, when `pagination=true` the grid automatically shows the necessary controls at the bottom so that the user can navigate through the different pages.
     * @default false
     * @agModule `PaginationModule`
     */
    suppressPaginationPanel?: boolean;
    /**
     * Set to `true` to enable pivot mode.
     * @default false
     * @agModule `PivotModule`
     */
    pivotMode?: boolean;
    /**
     * When to show the 'pivot panel' (where you drag rows to pivot) at the top. Note that the pivot panel will never show if `pivotMode` is off.
     * @default 'never'
     * @initial
     * @agModule `RowGroupingPanelModule`
     */
    pivotPanelShow?: 'always' | 'onlyWhenPivoting' | 'never';
    /**
     * The maximum number of generated columns before the grid halts execution. Upon reaching this number, the grid halts generation of columns
     * and triggers a `pivotMaxColumnsExceeded` event. `-1` for no limit.
     * @default -1
     * @agModule `PivotModule`
     */
    pivotMaxGeneratedColumns?: number;
    /**
     * If pivoting, set to the number of column group levels to expand by default, e.g. `0` for none, `1` for first level only, etc. Set to `-1` to expand everything.
     * @default 0
     * @agModule `PivotModule`
     */
    pivotDefaultExpanded?: number;
    /**
     * When set and the grid is in pivot mode, automatically calculated totals will appear within the Pivot Column Groups, in the position specified.
     * @agModule `PivotModule`
     */
    pivotColumnGroupTotals?: 'before' | 'after';
    /**
     * When set and the grid is in pivot mode, automatically calculated totals will appear for each value column in the position specified.
     * @agModule `PivotModule`
     */
    pivotRowTotals?: 'before' | 'after';
    /**
     * If `true`, the grid will not swap in the grouping column when pivoting. Useful if pivoting using Server Side Row Model or Viewport Row Model and you want full control of all columns including the group column.
     * @default false
     * @initial
     * @agModule `PivotModule`
     */
    pivotSuppressAutoColumn?: boolean;
    /**
     * When enabled, pivot column groups will appear 'fixed', without the ability to expand and collapse the column groups.
     * @default false
     * @initial
     * @agModule `PivotModule`
     */
    suppressExpandablePivotGroups?: boolean;
    /**
     * If `true`, then row group, pivot and value aggregation will be read-only from the GUI. The grid will display what values are used for each, but will not allow the user to change the selection.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    functionsReadOnly?: boolean;
    /**
     * A map of 'function name' to 'function' for custom aggregation functions.
     * @initial
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    aggFuncs?: {
        [key: string]: IAggFunc<TData>;
    };
    /**
     * When `true`, column headers won't include the `aggFunc` name, e.g. `'sum(Bank Balance)`' will just be `'Bank Balance'`.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    suppressAggFuncInHeader?: boolean;
    /**
     * When using aggregations, the grid will always calculate the root level aggregation value.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    alwaysAggregateAtRootLevel?: boolean;
    /**
     * When using change detection, only the updated column will be re-aggregated.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    aggregateOnlyChangedColumns?: boolean;
    /**
     * Set to `true` so that aggregations are not impacted by filtering.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    suppressAggFilteredOnly?: boolean;
    /**
     * Set to `true` to omit the value Column header when there is only a single value column.
     * @default false
     * @agModule `PivotModule`
     */
    removePivotHeaderRowWhenSingleValueColumn?: boolean;
    /**
     * Set to `false` to disable Row Animation which is enabled by default.
     * @default true
     */
    animateRows?: boolean;
    /**
     * Sets the duration in milliseconds of how long a cell should remain in its "flashed" state.
     * If `0`, the cell will not flash.
     * @default 500
     */
    cellFlashDuration?: number;
    /**
     * Sets the duration in milliseconds of how long the "flashed" state animation takes to fade away after the timer set by `cellFlashDuration` has completed.
     * @default 1000
     */
    cellFadeDuration?: number;
    /**
     * Set to `true` to have cells flash after data changes even when the change is due to filtering.
     * @default false
     * @initial
     */
    allowShowChangeAfterFilter?: boolean;
    /**
     * Switch between layout options: `normal`, `autoHeight`, `print`.
     * @default 'normal'
     */
    domLayout?: DomLayoutType;
    /**
     * When `true`, the order of rows and columns in the DOM are consistent with what is on screen.
     * Disables row animations.
     * @default false
     * @initial
     */
    ensureDomOrder?: boolean;
    /**
     * When `true`, enables the cell span feature allowing for the use of the `colDef.spanRows` property.
     * @default false
     * @initial
     * @agModule `CellSpanModule`
     */
    enableCellSpan?: boolean;
    /**
     * Set to `true` to operate the grid in RTL (Right to Left) mode.
     * @default false
     * @initial
     */
    enableRtl?: boolean;
    /**
     * Set to `true` so that the grid doesn't virtualise the columns. For example, if you have 100 columns, but only 10 visible due to scrolling, all 100 will always be rendered.
     * **It is not recommended to set this to `true` as it may cause performance issues.**
     * @default false
     * @initial
     */
    suppressColumnVirtualisation?: boolean;
    /**
     * By default the grid has a limit of rendering a maximum of 500 rows at once (remember the grid only renders rows you can see, so unless your display shows more than 500 rows without vertically scrolling this will never be an issue).
     * <br />**This is only relevant if you are manually setting `rowBuffer` to a high value (rendering more rows than can be seen), or `suppressRowVirtualisation` is true, or if your grid height is able to display more than 500 rows at once.**
     * @default false
     * @initial
     */
    suppressMaxRenderedRowRestriction?: boolean;
    /**
     * Set to `true` so that the grid doesn't virtualise the rows. For example, if you have 100 rows, but only 10 visible due to scrolling, all 100 will always be rendered.
     * **It is not recommended to set this to `true` as it may cause performance issues.**
     * @default false
     * @initial
     */
    suppressRowVirtualisation?: boolean;
    /**
     * Set to `true` to enable Managed Row Dragging.
     * @default false
     * @agModule `RowDragModule`
     */
    rowDragManaged?: boolean;
    /**
     * Used if rowDragManaged is enabled and treeData is enabled,
     * - If the row is already a group, but is not expanded, it will be expanded after rowDragInsertDelay milliseconds of dragging over it.
     * - If the row is a leaf (no children), it will be converted to a group and the row inserted into it after rowDragInsertDelay milliseconds of dragging over it.
     * @default 500
     * @agModule `RowDragModule`
     */
    rowDragInsertDelay?: number;
    /**
     * Set to `true` to suppress row dragging.
     * @default false
     */
    suppressRowDrag?: boolean;
    /**
     * Set to `true` to suppress moving rows while dragging the `rowDrag` waffle. This option highlights the position where the row will be placed and it will only move the row on mouse up.
     * @default false
     * @agModule `RowDragModule`
     */
    suppressMoveWhenRowDragging?: boolean;
    /**
     * Set to `true` to enable clicking and dragging anywhere on the row without the need for a drag handle.
     * @default false
     * @agModule `RowDragModule`
     */
    rowDragEntireRow?: boolean;
    /**
     * Set to `true` to enable dragging multiple rows at the same time.
     * @default false
     * @agModule `RowDragModule`
     */
    rowDragMultiRow?: boolean;
    /**
     * A callback that should return a string to be displayed by the `rowDragComp` while dragging a row.
     * If this callback is not set, the current cell value will be used.
     * If the `rowDragText` callback is set in the ColDef it will take precedence over this, except when
     * `rowDragEntireRow=true`.
     * @initial
     * @agModule `RowDragModule`
     */
    rowDragText?: (params: IRowDragItem, dragItemCount: number) => string;
    /**
     * Provide a custom drag and drop image component.
     * @initial
     * @agModule `RowDragModule`
     */
    dragAndDropImageComponent?: any;
    /**
     * Customise the parameters provided to the Drag and Drop Image Component.
     * @agModule `RowDragModule`
     */
    dragAndDropImageComponentParams?: any;
    /**
     * Provide your own cell renderer component to use for full width rows.
     * See [Full Width Rows](https://www.ag-grid.com/javascript-data-grid/full-width-rows/) for framework specific implementation details.
     */
    fullWidthCellRenderer?: any;
    /**
     * Customise the parameters provided to the `fullWidthCellRenderer` component.
     */
    fullWidthCellRendererParams?: any;
    /**
     * Set to `true` to have the Full Width Rows embedded in grid's main container so they can be scrolled horizontally.
     */
    embedFullWidthRows?: boolean;
    /**
     * Specifies how the results of row grouping should be displayed.
     *
     *  The options are:
     *
     * - `'singleColumn'`: single group column automatically added by the grid.
     * - `'multipleColumns'`: a group column per row group is added automatically.
     * - `'groupRows'`: group rows are automatically added instead of group columns.
     * - `'custom'`: informs the grid that group columns will be provided.
     * @agModule `RowGroupingModule`
     */
    groupDisplayType?: RowGroupingDisplayType;
    /**
     * If grouping, set to the number of levels to expand by default, e.g. `0` for none, `1` for first level only, etc. Set to `-1` to expand everything.
     * @default 0
     * @agModule `RowGroupingModule` / `TreeDataModule`
     */
    groupDefaultExpanded?: number;
    /**
     * Allows specifying the group 'auto column' if you are not happy with the default. If grouping, this column definition is included as the first column in the grid. If not grouping, this column is not included.
     * @agModule `RowGroupingModule` / `TreeDataModule`
     */
    autoGroupColumnDef?: ColDef<TData>;
    /**
     * When `true`, preserves the current group order when sorting on non-group columns.
     * @default false
     * @agModule `RowGroupingModule`
     */
    groupMaintainOrder?: boolean;
    /**
     * When `true`, if you select a group, the children of the group will also be selected.
     * @default false
     * @deprecated v32.2 Use `rowSelection.groupSelects` instead
     */
    groupSelectsChildren?: boolean;
    /**
     * If grouping, locks the group settings of a number of columns, e.g. `0` for no group locking. `1` for first group column locked, `-1` for all group columns locked.
     * @default 0
     * @initial
     * @agModule `RowGroupingModule`
     */
    groupLockGroupColumns?: number;
    /**
     * Set to determine whether filters should be applied on aggregated group values.
     * @default false
     * @agModule `RowGroupingModule`
     */
    groupAggFiltering?: boolean | IsRowFilterable<TData>;
    /**
     * When provided, an extra row group total row will be inserted into row groups at the specified position, to display
     * when the group is expanded. This row will contain the aggregate values for the group. If a callback function is
     * provided, it can be used to selectively determine which groups will have a total row added.
     * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
     */
    groupTotalRow?: 'top' | 'bottom' | UseGroupTotalRow<TData>;
    /**
     * When provided, an extra grand total row will be inserted into the grid at the specified position.
     * This row displays the aggregate totals of all rows in the grid.
     * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
     */
    grandTotalRow?: 'top' | 'bottom' | 'pinnedTop' | 'pinnedBottom';
    /**
     * Suppress the sticky behaviour of the total rows, can be suppressed individually by passing `'grand'` or `'group'`.
     * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
     */
    suppressStickyTotalRow?: boolean | 'grand' | 'group';
    /**
     * If `true`, and showing footer, aggregate data will always be displayed at both the header and footer levels. This stops the possibly undesirable behaviour of the header details 'jumping' to the footer on expand.
     * @default false
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    groupSuppressBlankHeader?: boolean;
    /**
     * If using `groupSelectsChildren`, then only the children that pass the current filter will get selected.
     * @default false
     * @deprecated v32.2 Use `rowSelection.groupSelects` instead
     */
    groupSelectsFiltered?: boolean;
    /**
     * Shows the open group in the group column for non-group rows.
     * @default false
     * @agModule `RowGroupingModule`
     */
    showOpenedGroup?: boolean;
    /**
     * Enable to display the child row in place of the group row when the group only has a single child.
     * @default false
     * @agModule `RowGroupingModule`
     */
    groupHideParentOfSingleChild?: boolean | 'leafGroupsOnly';
    /**
     * Set to `true` to collapse groups that only have one child.
     * @default false
     * @deprecated v33.0.0 - use `groupHideParentOfSingleChild` instead.
     */
    groupRemoveSingleChildren?: boolean;
    /**
     * Set to `true` to collapse lowest level groups that only have one child.
     * @default false
     * @deprecated v33.0.0 - use `groupHideParentOfSingleChild: 'leafGroupsOnly'` instead.
     */
    groupRemoveLowestSingleChildren?: boolean;
    /**
     * Set to `true` to hide parents that are open. When used with multiple columns for showing groups, it can give a more pleasing user experience.
     * @default false
     * @agModule `RowGroupingModule`
     */
    groupHideOpenParents?: boolean;
    /**
     * Set to `true` to prevent the grid from creating a '(Blanks)' group for nodes which do not belong to a group, and display the unbalanced nodes alongside group nodes.
     * @default false
     * @agModule `RowGroupingModule`
     */
    groupAllowUnbalanced?: boolean;
    /**
     * When to show the 'row group panel' (where you drag rows to group) at the top.
     * @default 'never'
     * @agModule `RowGroupingPanelModule`
     */
    rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never';
    /**
     * Provide the Cell Renderer to use when `groupDisplayType = 'groupRows'`.
     * See [Group Row Cell Renderer](https://www.ag-grid.com/javascript-data-grid/grouping-group-rows/#providing-cell-renderer) for framework specific implementation details.
     * @agModule `RowGroupingModule`
     */
    groupRowRenderer?: any;
    /**
     * Customise the parameters provided to the `groupRowRenderer` component.
     * @agModule `RowGroupingModule`
     */
    groupRowRendererParams?: any;
    /**
     * Set to `true` to enable the Grid to work with Tree Data.
     * You must also implement the `getDataPath(data)` callback.
     * @default false
     * @agModule `TreeDataModule`
     */
    treeData?: boolean;
    /**
     * The name of the field to use in a data item to retrieve the array of children nodes of a node when while using treeData=true.
     * It supports accessing nested fields using the dot notation.
     * @agModule `TreeDataModule`
     */
    treeDataChildrenField?: string;
    /**
     * The name of the field to use in a data item to find the parent node of a node when using treeData=true.
     * The tree will be constructed via relationships between nodes using this field.
     * getRowId callback need to be provided as well for this to work.
     * It supports accessing nested fields using the dot notation.
     * @agModule `TreeDataModule`
     */
    treeDataParentIdField?: string;
    /**
     * Set to `true` to suppress sort indicators and actions from the row group panel.
     * @default false
     * @agModule `RowGroupingPanelModule`
     */
    rowGroupPanelSuppressSort?: boolean;
    /**
     * Set to `true` prevent Group Rows from sticking to the top of the grid.
     * @default false
     * @initial
     * @agModule `RowGroupingModule` / `TreeDataModule`
     */
    suppressGroupRowsSticky?: boolean;
    /**
     * Custom group hierarchy components can be defined here for later use in `colDef.groupHierarchy`
     * @agModule `RowGroupingModule`
     */
    groupHierarchyConfig?: {
        [k: string]: ColDef;
    };
    /**
     * Data to be displayed as pinned top rows in the grid.
     * @agModule `PinnedRowModule`
     */
    pinnedTopRowData?: any[];
    /**
     * Data to be displayed as pinned bottom rows in the grid.
     * @agModule `PinnedRowModule`
     */
    pinnedBottomRowData?: any[];
    /**
     * Determines whether manual row pinning is enabled via the row context menu.
     *
     * Set to `true` to allow pinning rows to top or bottom.
     * Set to `'top'` to allow pinning rows to the top only.
     * Set to `'bottom'` to allow pinning rows to the bottom only.
     * @agModule `PinnedRowModule`
     */
    enableRowPinning?: boolean | 'top' | 'bottom';
    /**
     * Return `true` if the grid should allow the row to be manually pinned.
     * Return `false` if the grid should prevent the row from being pinned
     *
     * When not defined, all rows default to pinnable.
     * @agModule `PinnedRowModule`
     */
    isRowPinnable?: IsRowPinnable<TData>;
    /**
     * Called for every row in the grid.
     *
     * Return "top", "bottom" if the row should be initially pinned to the top or bottom respectively.
     * Return `null` or `undefined` otherwise.
     * User interactions can subsequently still change the pinned state of a row.
     * @agModule `PinnedRowModule`
     */
    isRowPinned?: IsRowPinned<TData>;
    /**
     * Sets the row model type.
     * @default 'clientSide'
     * @initial
     * @agModule `ClientSideRowModelModule` / `InfiniteRowModelModule` / `ServerSideRowModelModule` / `ViewportRowModelModule`
     */
    rowModelType?: RowModelType;
    /**
     * Set the data to be displayed as rows in the grid.
     * @agModule `ClientSideRowModelModule`
     */
    rowData?: TData[] | null;
    /**
     * How many milliseconds to wait before executing a batch of async transactions.
     */
    asyncTransactionWaitMillis?: number;
    /**
     * Prevents Transactions changing sort, filter, group or pivot state when transaction only contains updates.
     * @default false
     */
    suppressModelUpdateAfterUpdateTransaction?: boolean;
    /**
     * Provide the datasource for infinite scrolling.
     * @agModule `InfiniteRowModelModule`
     */
    datasource?: IDatasource;
    /**
     * How many extra blank rows to display to the user at the end of the dataset, which sets the vertical scroll and then allows the grid to request viewing more rows of data.
     * @default 1
     * @initial
     * @agModule `InfiniteRowModelModule`
     */
    cacheOverflowSize?: number;
    /**
     * How many extra blank rows to display to the user at the end of the dataset, which sets the vertical scroll and then allows the grid to request viewing more rows of data.
     * @default 1
     * @initial
     * @agModule `InfiniteRowModelModule`
     */
    infiniteInitialRowCount?: number;
    /**
     * Set how many loading rows to display to the user for the root level group.
     * @default 1
     * @initial
     * @agModule `ServerSideRowModelModule`
     */
    serverSideInitialRowCount?: number;
    /**
     * When `true`, the Server-side Row Model will not use a full width loading renderer, instead using the colDef `loadingCellRenderer` if present.
     * @agModule `ServerSideRowModelModule`
     */
    suppressServerSideFullWidthLoadingRow?: boolean;
    /**
     * How many rows for each block in the store, i.e. how many rows returned from the server at a time.
     * @default 100
     * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
     */
    cacheBlockSize?: number;
    /**
     * How many blocks to keep in the store. Default is no limit, so every requested block is kept. Use this if you have memory concerns, and blocks that were least recently viewed will be purged when the limit is hit. The grid will additionally make sure it has all the blocks needed to display what is currently visible, in case this property is set to a low value.
     * @initial
     * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
     */
    maxBlocksInCache?: number;
    /**
     * How many requests to hit the server with concurrently. If the max is reached, requests are queued.
     * Set to `-1` for no maximum restriction on requests.
     * @default 2
     * @initial
     * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
     */
    maxConcurrentDatasourceRequests?: number;
    /**
     * How many milliseconds to wait before loading a block. Useful when scrolling over many blocks, as it prevents blocks loading until scrolling has settled.
     * @initial
     * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
     */
    blockLoadDebounceMillis?: number;
    /**
     * When enabled, closing group rows will remove children of that row. Next time the row is opened, child rows will be read from the datasource again. This property only applies when there is Row Grouping or Tree Data.
     * @default false
     * @agModule `ServerSideRowModelModule`
     */
    purgeClosedRowNodes?: boolean;
    /**
     * Provide the `serverSideDatasource` for server side row model.
     * @agModule `ServerSideRowModelModule`
     */
    serverSideDatasource?: IServerSideDatasource;
    /**
     * When enabled, always refreshes top level groups regardless of which column was sorted. This property only applies when there is Row Grouping & sorting is handled on the server.
     * @default false
     * @agModule `ServerSideRowModelModule`
     */
    serverSideSortAllLevels?: boolean;
    /**
     * When enabled, sorts fully loaded groups in the browser instead of requesting from the server.
     * @default false
     * @agModule `ServerSideRowModelModule`
     */
    serverSideEnableClientSideSort?: boolean;
    /**
     * When enabled, only refresh groups directly impacted by a filter. This property only applies when there is Row Grouping & filtering is handled on the server.
     * @default false
     * @initial
     * @agModule `ServerSideRowModelModule`
     */
    serverSideOnlyRefreshFilteredGroups?: boolean;
    /**
     * Used to split pivot field strings for generating pivot result columns when `pivotResultFields` is provided as part of a `getRows` success.
     * @default '_'
     * @initial
     * @agModule `ServerSideRowModelModule`
     */
    serverSidePivotResultFieldSeparator?: string;
    /**
     * To use the viewport row model you need to provide the grid with a `viewportDatasource`.
     * @agModule `ViewportRowModelModule`
     */
    viewportDatasource?: IViewportDatasource;
    /**
     * When using viewport row model, sets the page size for the viewport.
     * @initial
     * @agModule `ViewportRowModelModule`
     */
    viewportRowModelPageSize?: number;
    /**
     * When using viewport row model, sets the buffer size for the viewport.
     * @initial
     * @agModule `ViewportRowModelModule`
     */
    viewportRowModelBufferSize?: number;
    /**
     * Set to `true` to always show the horizontal scrollbar.
     * @default false
     */
    alwaysShowHorizontalScroll?: boolean;
    /**
     * Set to `true` to always show the vertical scrollbar.
     * @default false
     */
    alwaysShowVerticalScroll?: boolean;
    /**
     * Set to `true` to debounce the vertical scrollbar. Can provide smoother scrolling on slow machines.
     * @default false
     * @initial
     */
    debounceVerticalScrollbar?: boolean;
    /**
     * Set to `true` to never show the horizontal scroll. This is useful if the grid is aligned with another grid and will scroll when the other grid scrolls. (Should not be used in combination with `alwaysShowHorizontalScroll`.)
     * @default false
     */
    suppressHorizontalScroll?: boolean;
    /**
     * When `true`, the grid will not scroll to the top when new row data is provided. Use this if you don't want the default behaviour of scrolling to the top every time you load new data.
     * @default false
     */
    suppressScrollOnNewData?: boolean;
    /**
     * When `true`, the grid will not allow mousewheel / touchpad scroll when popup elements are present.
     * @default false
     */
    suppressScrollWhenPopupsAreOpen?: boolean;
    /**
     * When `true`, the grid will not use animation frames when drawing rows while scrolling. Use this if and only if the grid is working fast enough on all users machines and you want to avoid the temporarily empty rows.
     * **Note:** It is not recommended to set suppressAnimationFrame to `true` in most use cases as this can seriously degrade the user experience as all cells are rendered synchronously blocking the UI thread from scrolling.
     * @default false
     * @initial
     */
    suppressAnimationFrame?: boolean;
    /**
     * If `true`, middle clicks will result in `click` events for cells and rows. Otherwise the browser will use middle click to scroll the grid.<br />**Note:** Not all browsers fire `click` events with the middle button. Most will fire only `mousedown` and `mouseup` events, which can be used to focus a cell, but will not work to call the `onCellClicked` function.
     * @default false
     */
    suppressMiddleClickScrolls?: boolean;
    /**
     * If `true`, mouse wheel events will be passed to the browser. Useful if your grid has no vertical scrolls and you want the mouse to scroll the browser page.
     * @default false
     * @initial
     */
    suppressPreventDefaultOnMouseWheel?: boolean;
    /**
     * Tell the grid how wide in pixels the scrollbar is, which is used in grid width calculations. Set only if using non-standard browser-provided scrollbars, so the grid can use the non-standard size in its calculations.
     * @initial
     */
    scrollbarWidth?: number;
    /**
     * Use the `RowSelectionOptions` object to configure row selection. The string values `'single'` and `'multiple'` are deprecated.
     * @agModule `RowSelectionModule`
     */
    rowSelection?: RowSelectionOptions<TData> | 'single' | 'multiple';
    /**
     * Configure cell selection.
     * @agModule `CellSelectionModule`
     */
    cellSelection?: boolean | CellSelectionOptions<TData>;
    /**
     * Set to `true` to allow multiple rows to be selected using single click.
     * @default false
     * @deprecated v32.2 Use `rowSelection.enableSelectionWithoutKeys` instead
     */
    rowMultiSelectWithClick?: boolean;
    /**
     * If `true`, rows will not be deselected if you hold down `Ctrl` and click the row or press `Space`.
     * @default false
     * @deprecated v32.2 Use `rowSelection.enableClickSelection` instead
     */
    suppressRowDeselection?: boolean;
    /**
     * If `true`, row selection won't happen when rows are clicked. Use when you only want checkbox selection.
     * @default false
     * @deprecated v32.2 Use `rowSelection.enableClickSelection` instead
     */
    suppressRowClickSelection?: boolean;
    /**
     * If `true`, cells won't be focusable. This means keyboard navigation will be disabled for grid cells, but remain enabled in other elements of the grid such as column headers, floating filters, tool panels.
     * @default false
     */
    suppressCellFocus?: boolean;
    /**
     * If `true`, header cells won't be focusable. This means keyboard navigation will be disabled for grid header cells, but remain enabled in other elements of the grid such as grid cells and tool panels.
     * @default false
     */
    suppressHeaderFocus?: boolean;
    /**
     * Configure the selection column, used for displaying checkboxes.
     *
     * Note that due to the nature of this column, this type is a subset of `ColDef`, which does not support several normal column features such as editing, pivoting and grouping.
     */
    selectionColumnDef?: SelectionColumnDef;
    /**
     * Configure the Row Numbers Feature.
     * @default false
     * @agModule `RowNumbersModule`
     */
    rowNumbers?: boolean | RowNumbersOptions;
    /**
     * If `true`, only a single range can be selected.
     * @default false
     * @deprecated v32.2 Use `cellSelection.suppressMultiRanges` instead
     */
    suppressMultiRangeSelection?: boolean;
    /**
     * Set to `true` to be able to select the text within cells.
     *
     * **Note:** When this is set to `true`, the clipboard service is disabled and only selected text is copied.
     * @default false
     */
    enableCellTextSelection?: boolean;
    /**
     * Set to `true` to enable Range Selection.
     * @default false
     * @deprecated v32.2 Use `cellSelection = true` instead
     * @agModule `CellSelectionModule`
     */
    enableRangeSelection?: boolean;
    /**
     * Set to `true` to enable the Range Handle.
     * @default false
     * @deprecated v32.2 Use `cellSelection.handle` instead
     */
    enableRangeHandle?: boolean;
    /**
     * Set to `true` to enable the Fill Handle.
     * @default false
     * @deprecated v32.2 Use `cellSelection.handle` instead
     */
    enableFillHandle?: boolean;
    /**
     * Set to `'x'` to force the fill handle direction to horizontal, or set to `'y'` to force the fill handle direction to vertical.
     * @default 'xy'
     * @deprecated v32.2 Use `cellSelection.handle.direction` instead
     */
    fillHandleDirection?: 'x' | 'y' | 'xy';
    /**
     * Set this to `true` to prevent cell values from being cleared when the Range Selection is reduced by the Fill Handle.
     * @default false
     * @deprecated v32.2 Use `cellSelection.suppressClearOnFillReduction` instead
     */
    suppressClearOnFillReduction?: boolean;
    /**
     * Array defining the order in which sorting occurs (if sorting is enabled). Values can be `'asc'`, `'desc'` or `null`. For example: `sortingOrder: ['asc', 'desc']`.
     * @default [null, 'asc', 'desc']
     * @deprecated v33 Use `defaultColDef.sortingOrder` instead
     */
    sortingOrder?: SortDirection[];
    /**
     * Set to `true` to specify that the sort should take accented characters into account. If this feature is turned on the sort will be slower.
     * @default false
     */
    accentedSort?: boolean;
    /**
     * Set to `true` to show the 'no sort' icon.
     * @default false
     * @deprecated v33 Use `defaultColDef.unSortIcon` instead
     */
    unSortIcon?: boolean;
    /**
     * Set to `true` to suppress multi-sort when the user shift-clicks a column header.
     * @default false
     */
    suppressMultiSort?: boolean;
    /**
     * Set to `true` to always multi-sort when the user clicks a column header, regardless of key presses.
     * @default false
     */
    alwaysMultiSort?: boolean;
    /**
     * Set to `'ctrl'` to have multi sorting by clicking work using the `Ctrl` (or `Command ⌘` for Mac) key.
     */
    multiSortKey?: 'ctrl';
    /**
     * Set to `true` to suppress sorting of un-sorted data to match original row data.
     * @default false
     */
    suppressMaintainUnsortedOrder?: boolean;
    /**
     * Icons to use inside the grid instead of the grid's default icons.
     * @initial
     */
    icons?: {
        [key: string]: ((...args: any[]) => any) | string;
    };
    /**
     * Default row height in pixels.
     * @default 25
     */
    rowHeight?: number;
    /**
     * The style properties to apply to all rows. Set to an object of key (style names) and values (style values).
     * @agModule `RowStyleModule`
     */
    rowStyle?: RowStyle;
    /**
     * CSS class(es) for all rows. Provide either a string (class name) or array of strings (array of class names).
     * @agModule `RowStyleModule`
     */
    rowClass?: string | string[];
    /**
     * Rules which can be applied to include certain CSS classes.
     * @agModule `RowStyleModule`
     */
    rowClassRules?: RowClassRules<TData>;
    /**
     * Set to `true` to not highlight rows by adding the `ag-row-hover` CSS class.
     * @default false
     */
    suppressRowHoverHighlight?: boolean;
    /**
     * Uses CSS `top` instead of CSS `transform` for positioning rows. Useful if the transform function is causing issues such as used in row spanning.
     * @default false
     * @initial
     */
    suppressRowTransform?: boolean;
    /**
     * Set to `true` to highlight columns by adding the `ag-column-hover` CSS class.
     * @default false
     * @agModule `ColumnHoverModule`
     */
    columnHoverHighlight?: boolean;
    /**
     * Provide a custom `gridId` for this instance of the grid. Value will be set on the root DOM node using the attribute `grid-id` as well as being accessible via the `gridApi.getGridId()` method.
     * @initial
     */
    gridId?: string;
    /**
     * When enabled, sorts only the rows added/updated by a transaction.
     * @default false
     */
    deltaSort?: boolean;
    /**
     */
    treeDataDisplayType?: TreeDataDisplayType;
    /**
     * @initial
     */
    enableGroupEdit?: boolean;
    /**
     * Initial state for the grid. Only read once on initialization. Can be used in conjunction with `api.getState()` to save and restore grid state.
     * @initial
     * @agModule `GridStateModule`
     */
    initialState?: GridState;
    /**
     * **React only**.
     *
     * @deprecated As of v32 custom components are created reactively by default.
     * Set this property to `false` to switch to the legacy way of declaring custom components imperatively.
     * @initial
     * @default true
     */
    reactiveCustomComponents?: boolean;
    /**
     *
     * ** React only**.
     *
     * Enables fine grained control over the row rendering mechanism.
     * - `default` - recommended rendering approach.
     * - `legacy` - provided for backwards compatibility with previous versions of AG Grid (<= v33). Is susceptible to "Maximum Update Depth Exceeded" errors and so may be removed in a future version.
     * @default 'default'
     */
    renderingMode?: 'default' | 'legacy';
    /**
     * Theme to apply to the grid, or the string "legacy" to opt back into the
     * v32 style of theming where themes were imported as CSS files and applied
     * by setting a class name on the parent element.
     *
     * @default themeQuartz
     */
    theme?: Theme | 'legacy';
    /**
     * If your theme uses a font that is available on Google Fonts, pass true to load it from Google's CDN.
     */
    loadThemeGoogleFonts?: boolean;
    /**
     * The CSS layer that this theme should be rendered onto. If your
     * application loads its styles into a CSS layer, use this to load the grid
     * styles into a previous layer so that application styles can override grid
     * styles.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
     */
    themeCssLayer?: string;
    /**
     * The nonce attribute to set on style elements added to the document by
     * themes. If "foo" is passed to this property, the grid can use the Content
     * Security Policy `style-src 'nonce-foo'`, instead of the less secure
     * `style-src 'unsafe-inline'`.
     *
     * Note: CSP nonces are global to a page, where a page has multiple grids,
     * every one must have the same styleNonce set.
     */
    styleNonce?: string;
    /**
     * An element to insert style elements into when injecting styles into the
     * grid. If undefined, styles will be added to the document head for grids
     * rendered in the main document fragment, or to the grid wrapper element
     * for other grids (e.g. those rendered in a shadow DOM or detached from the
     * document).
     *
     * @initial
     */
    themeStyleContainer?: HTMLElement;
    /**
     * For customising the context menu.
     * @agModule `ContextMenuModule`
     */
    getContextMenuItems?: GetContextMenuItems<TData>;
    /**
     * For customising the main 'column header' menu.
     * @initial
     * @agModule `ColumnMenuModule`
     */
    getMainMenuItems?: GetMainMenuItems<TData>;
    /**
     * Allows user to process popups after they are created. Applications can use this if they want to, for example, reposition the popup.
     */
    postProcessPopup?: (params: PostProcessPopupParams<TData>) => void;
    /**
     * Allows the user to process the columns being removed from the pinned section because the viewport is too small to accommodate them.
     * Returns an array of columns to be removed from the pinned areas.
     * @initial
     */
    processUnpinnedColumns?: (params: ProcessUnpinnedColumnsParams<TData>) => Column[];
    /**
     * Allows you to process cells for the clipboard. Handy if for example you have `Date` objects that need to have a particular format if importing into Excel.
     * @agModule `ClipboardModule`
     */
    processCellForClipboard?: (params: ProcessCellForExportParams<TData>) => any;
    /**
     * Allows you to process header values for the clipboard.
     * @agModule `ClipboardModule`
     */
    processHeaderForClipboard?: (params: ProcessHeaderForExportParams<TData>) => any;
    /**
     * Allows you to process group header values for the clipboard.
     * @agModule `ClipboardModule`
     */
    processGroupHeaderForClipboard?: (params: ProcessGroupHeaderForExportParams<TData>) => any;
    /**
     * Allows you to process cells from the clipboard. Handy if for example you have number fields and want to block non-numbers from getting into the grid.
     * @agModule `ClipboardModule`
     */
    processCellFromClipboard?: (params: ProcessCellForExportParams<TData>) => any;
    /**
     * Allows you to get the data that would otherwise go to the clipboard. To be used when you want to control the 'copy to clipboard' operation yourself.
     * @agModule `ClipboardModule`
     */
    sendToClipboard?: (params: SendToClipboardParams<TData>) => void;
    /**
     * Allows complete control of the paste operation, including cancelling the operation (so nothing happens) or replacing the data with other data.
     * @agModule `ClipboardModule`
     */
    processDataFromClipboard?: (params: ProcessDataFromClipboardParams<TData>) => string[][] | null;
    /**
     * Grid calls this method to know if an external filter is present.
     * @agModule `ExternalFilterModule`
     */
    isExternalFilterPresent?: (params: IsExternalFilterPresentParams<TData>) => boolean;
    /**
     * Should return `true` if external filter passes, otherwise `false`.
     * @agModule `ExternalFilterModule`
     */
    doesExternalFilterPass?: (node: IRowNode<TData>) => boolean;
    /**
     * Callback to be used to customise the chart toolbar items.
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    getChartToolbarItems?: GetChartToolbarItems<TData>;
    /**
     * Callback to enable displaying the chart in an alternative chart container.
     * @initial
     * @agModule `IntegratedChartsModule`
     */
    createChartContainer?: (params: ChartRefParams<TData>) => void;
    /**
     * Allows overriding the element that will be focused when the grid receives focus from outside elements (tabbing into the grid).
     * @returns `True` if this function should override the grid's default behavior, `False` to allow the grid's default behavior.
     */
    focusGridInnerElement?: (params: FocusGridInnerElementParams<TData>) => boolean;
    /**
     * Allows overriding the default behaviour for when user hits navigation (arrow) key when a header is focused. Return the next Header position to navigate to or `null` to stay on current header.
     */
    navigateToNextHeader?: (params: NavigateToNextHeaderParams<TData>) => HeaderPosition | null;
    /**
     * Allows overriding the default behaviour for when user hits `Tab` key when a header is focused.
     * Return the next header position to navigate to, `true` to stay on the current header,
     * or `false` to let the browser handle the tab behaviour.
     */
    tabToNextHeader?: (params: TabToNextHeaderParams<TData>) => HeaderPosition | boolean;
    /**
     * Allows overriding the default behaviour for when user hits navigation (arrow) key when a cell is focused. Return the next Cell position to navigate to or `null` to stay on current cell.
     */
    navigateToNextCell?: (params: NavigateToNextCellParams<TData>) => CellPosition | null;
    /**
     * Allows overriding the default behaviour for when user hits `Tab` key when a cell is focused.
     * Return the next cell position to navigate to, `true` to stay on the current cell,
     * or `false` to let the browser handle the tab behaviour.
     */
    tabToNextCell?: (params: TabToNextCellParams<TData>) => CellPosition | boolean;
    /**
     * A callback for localising text within the grid.
     * @initial
     * @agModule `LocaleModule`
     */
    getLocaleText?: (params: GetLocaleTextParams<TData>) => string;
    /**
     * Allows overriding what `document` is used. Currently used by Drag and Drop (may extend to other places in the future). Use this when you want the grid to use a different `document` than the one available on the global scope. This can happen if docking out components (something which Electron supports)
     */
    getDocument?: () => Document;
    /**
     * Allows user to format the numbers in the pagination panel, i.e. 'row count' and 'page number' labels. This is for pagination panel only, to format numbers inside the grid's cells (i.e. your data), then use `valueFormatter` in the column definitions.
     * @initial
     * @agModule `PaginationModule`
     */
    paginationNumberFormatter?: (params: PaginationNumberFormatterParams<TData>) => string;
    /**
     * Callback to use when you need access to more then the current column for aggregation.
     * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
     */
    getGroupRowAgg?: (params: GetGroupRowAggParams<TData>) => any;
    /**
     * (Client-side Row Model only) Allows groups to be open by default.
     * @agModule `RowGroupingModule` / `TreeDataModule`
     */
    isGroupOpenByDefault?: (params: IsGroupOpenByDefaultParams<TData>) => boolean;
    /**
     * Controls how expand/collapse operations affect all rows and group interactions.
     * If `true`, expandAll / collapseAll applies to all rows (not just loaded ones),
     * and interacting with the group overrides the default expansion state set by `isServerSideGroupOpenByDefault`.
     * @agModule RowGroupingModule / TreeDataModule
     */
    ssrmExpandAllAffectsAllRows?: boolean;
    /**
     * Allows default sorting of groups.
     * @agModule `RowGroupingModule`
     */
    initialGroupOrderComparator?: (params: InitialGroupOrderComparatorParams<TData>) => number;
    /**
     * Callback for the mutation of the generated pivot result column definitions
     * @agModule `PivotModule`
     */
    processPivotResultColDef?: (colDef: ColDef<TData>) => void;
    /**
     * Callback for the mutation of the generated pivot result column group definitions
     * @agModule `PivotModule`
     */
    processPivotResultColGroupDef?: (colGroupDef: ColGroupDef<TData>) => void;
    /**
     * Callback to be used when working with Tree Data when `treeData = true`.
     * @initial
     * @agModule `TreeDataModule`
     */
    getDataPath?: GetDataPath<TData>;
    /**
     * Allows setting the child count for a group row.
     * @initial
     * @agModule `ServerSideRowModelModule`
     */
    getChildCount?: (dataItem: any) => number;
    /**
     * Allows providing different params for different levels of grouping.
     * @initial
     * @agModule `ServerSideRowModelModule`
     */
    getServerSideGroupLevelParams?: (params: GetServerSideGroupLevelParamsParams<TData>) => ServerSideGroupLevelParams;
    /**
     * Allows groups to be open by default.
     * @agModule `ServerSideRowModelModule`
     */
    isServerSideGroupOpenByDefault?: (params: IsServerSideGroupOpenByDefaultParams<TData>) => boolean;
    /**
     * Allows cancelling transactions.
     * @agModule `ServerSideRowModelModule`
     */
    isApplyServerSideTransaction?: IsApplyServerSideTransaction<TData>;
    /**
     * SSRM Tree Data: Allows specifying which rows are expandable.
     * @agModule `ServerSideRowModelModule`
     */
    isServerSideGroup?: IsServerSideGroup;
    /**
     * SSRM Tree Data: Allows specifying group keys.
     * @agModule `ServerSideRowModelModule`
     */
    getServerSideGroupKey?: GetServerSideGroupKey;
    /**
     * Return a business key for the node. If implemented, each row in the DOM will have an attribute `row-business-key='abc'` where `abc` is what you return as the business key.
     * This is useful for automated testing, as it provides a way for your tool to identify rows based on unique business keys.
     */
    getBusinessKeyForNode?: (node: IRowNode<TData>) => string;
    /**
     * Provide a pure function that returns a string ID to uniquely identify a given row. This enables the grid to work optimally with data changes and updates.
     * @initial
     */
    getRowId?: GetRowIdFunc<TData>;
    /**
     * When enabled, getRowId() callback is implemented and new Row Data is set, the grid will disregard all previous rows and treat the new Row Data as new data. As a consequence, all Row State (eg selection, rendered rows) will be reset.
     * @default false
     * @agModule `ClientSideRowModelModule`
     */
    resetRowDataOnUpdate?: boolean;
    /**
     * Callback fired after the row is rendered into the DOM. Should not be used to initiate side effects.
     */
    processRowPostCreate?: (params: ProcessRowParams<TData>) => void;
    /**
     * Callback to be used to determine which rows are selectable. By default rows are selectable, so return `false` to make a row un-selectable.
     * @deprecated v32.2 Use `rowSelection.isRowSelectable` instead
     */
    isRowSelectable?: IsRowSelectable<TData>;
    /**
     * Callback to be used with Master Detail to determine if a row should be a master row. If `false` is returned no detail row will exist for this row.
     * @agModule `MasterDetailModule`
     */
    isRowMaster?: IsRowMaster<TData>;
    /**
     * Callback to fill values instead of simply copying values or increasing number values using linear progression.
     * @deprecated v32.2 Use `cellSelection.handle.setFillValue` instead
     */
    fillOperation?: (params: FillOperationParams<TData>) => any;
    /**
     * Callback to perform additional sorting after the grid has sorted the rows.
     */
    postSortRows?: (params: PostSortRowsParams<TData>) => void;
    /**
     * Callback version of property `rowStyle` to set style for each row individually. Function should return an object of CSS values or undefined for no styles.
     * @agModule `RowStyleModule`
     */
    getRowStyle?: (params: RowClassParams<TData>) => RowStyle | undefined;
    /**
     * Callback version of property `rowClass` to set class(es) for each row individually. Function should return either a string (class name), array of strings (array of class names) or undefined for no class.
     * @agModule `RowStyleModule`
     */
    getRowClass?: (params: RowClassParams<TData>) => string | string[] | undefined;
    /**
     * Callback version of property `rowHeight` to set height for each row individually. Function should return a positive number of pixels, or return `null`/`undefined` to use the default row height.
     */
    getRowHeight?: (params: RowHeightParams<TData>) => number | undefined | null;
    /**
     * Tells the grid if this row should be rendered as full width.
     */
    isFullWidthRow?: (params: IsFullWidthRowParams<TData>) => boolean;
    /**
     * The tool panel visibility has changed. Fires twice if switching between panels - once with the old panel and once with the new panel.
     */
    onToolPanelVisibleChanged?(event: ToolPanelVisibleChangedEvent<TData>): void;
    /**
     * The tool panel size has been changed.
     */
    onToolPanelSizeChanged?(event: ToolPanelSizeChangedEvent<TData>): void;
    /**
     * The column menu visibility has changed. Fires twice if switching between tabs - once with the old tab and once with the new tab.
     */
    onColumnMenuVisibleChanged?(event: ColumnMenuVisibleChangedEvent<TData>): void;
    /**
     * The context menu visibility has changed (opened or closed).
     */
    onContextMenuVisibleChanged?(event: ContextMenuVisibleChangedEvent<TData>): void;
    /**
     * Cut operation has started.
     */
    onCutStart?(event: CutStartEvent<TData>): void;
    /**
     * Cut operation has ended.
     */
    onCutEnd?(event: CutEndEvent<TData>): void;
    /**
     * Paste operation has started.
     */
    onPasteStart?(event: PasteStartEvent<TData>): void;
    /**
     * Paste operation has ended.
     */
    onPasteEnd?(event: PasteEndEvent<TData>): void;
    /**
     * A column, or group of columns, was hidden / shown.
     */
    onColumnVisible?(event: ColumnVisibleEvent<TData>): void;
    /**
     * A column, or group of columns, was pinned / unpinned.
     */
    onColumnPinned?(event: ColumnPinnedEvent<TData>): void;
    /**
     * A column was resized.
     */
    onColumnResized?(event: ColumnResizedEvent<TData>): void;
    /**
     * A column was moved.
     */
    onColumnMoved?(event: ColumnMovedEvent<TData>): void;
    /**
     * A value column was added or removed.
     */
    onColumnValueChanged?(event: ColumnValueChangedEvent<TData>): void;
    /**
     * The pivot mode flag was changed.
     */
    onColumnPivotModeChanged?(event: ColumnPivotModeChangedEvent<TData>): void;
    /**
     * A pivot column was added, removed or order changed.
     */
    onColumnPivotChanged?(event: ColumnPivotChangedEvent<TData>): void;
    /**
     * A column group was opened / closed.
     */
    onColumnGroupOpened?(event: ColumnGroupOpenedEvent<TData>): void;
    /**
     * User set new columns.
     */
    onNewColumnsLoaded?(event: NewColumnsLoadedEvent<TData>): void;
    /**
     * The list of grid columns changed.
     */
    onGridColumnsChanged?(event: GridColumnsChangedEvent<TData>): void;
    /**
     * The list of displayed columns changed. This can result from columns open / close, column move, pivot, group, etc.
     */
    onDisplayedColumnsChanged?(event: DisplayedColumnsChangedEvent<TData>): void;
    /**
     * The list of rendered columns changed (only columns in the visible scrolled viewport are rendered by default).
     */
    onVirtualColumnsChanged?(event: VirtualColumnsChangedEvent<TData>): void;
    /**
     * @deprecated v32.2 Either use `onDisplayedColumnsChanged` which is fired at the same time,
     * or use one of the more specific column events.
     */
    onColumnEverythingChanged?(event: ColumnEverythingChangedEvent<TData>): void;
    /**
     * Columns have been reset to their default state as reflected by the colDefs.
     */
    onColumnsReset?(event: ColumnsResetEvent<TData>): void;
    /**
     * A mouse cursor is initially moved over a column header.
     */
    onColumnHeaderMouseOver?(event: ColumnHeaderMouseOverEvent<TData>): void;
    /**
     * A mouse cursor is moved out of a column header.
     */
    onColumnHeaderMouseLeave?(event: ColumnHeaderMouseLeaveEvent<TData>): void;
    /**
     * A click is performed on a column header.
     */
    onColumnHeaderClicked?(event: ColumnHeaderClickedEvent<TData>): void;
    /**
     * A context menu action, such as right-click or context menu key press, is performed on a column header.
     */
    onColumnHeaderContextMenu?(event: ColumnHeaderContextMenuEvent<TData>): void;
    /**
     * Only used by Angular, React and VueJS AG Grid components (not used if doing plain JavaScript).
     * If the grid receives changes due to bound properties, this event fires after the grid has finished processing the change.
     */
    onComponentStateChanged?(event: ComponentStateChangedEvent<TData>): void;
    /**
     * Cell value has changed. This occurs after the following scenarios:
     * - Editing. Will not fire if any of the following are true:
     *     new value is the same as old value;
     *     `readOnlyEdit = true`;
     *     editing was cancelled (e.g. Escape key was pressed);
     *     or new value is of the wrong cell data type for the column.
     *  - Cut.
     *  - Paste.
     *  - Cell clear (pressing Delete key).
     *  - Fill handle.
     *  - Copy range down.
     *  - Undo and redo.
     */
    onCellValueChanged?(event: CellValueChangedEvent<TData>): void;
    /**
     * Value has changed after editing. Only fires when `readOnlyEdit=true`.
     */
    onCellEditRequest?(event: CellEditRequestEvent<TData>): void;
    /**
     * A cell's value within a row has changed. This event corresponds to Full Row Editing only.
     */
    onRowValueChanged?(event: RowValueChangedEvent<TData>): void;
    /**
     * Editing a cell has started.
     */
    onCellEditingStarted?(event: CellEditingStartedEvent<TData>): void;
    /**
     * Editing a cell has stopped.
     */
    onCellEditingStopped?(event: CellEditingStoppedEvent<TData>): void;
    /**
     * Editing a row has started (when row editing is enabled). When row editing, this event will be fired once and `cellEditingStarted` will be fired for each individual cell. Only fires when doing Full Row Editing.
     */
    onRowEditingStarted?(event: RowEditingStartedEvent<TData>): void;
    /**
     * Editing a row has stopped (when row editing is enabled). When row editing, this event will be fired once and `cellEditingStopped` will be fired for each individual cell. Only fires when doing Full Row Editing.
     */
    onRowEditingStopped?(event: RowEditingStoppedEvent<TData>): void;
    /**
     * Bulk editing has started.
     */
    onBulkEditingStarted?(event: BulkEditingStartedEvent<TData>): void;
    /**
     * Bulk editing has stopped.
     */
    onBulkEditingStopped?(event: BulkEditingStoppedEvent<TData>): void;
    /**
     * Batch editing has started (when batch editing is enabled).
     */
    onBatchEditingStarted?(event: BatchEditingStartedEvent<TData>): void;
    /**
     * Batch editing has stopped (when batch editing is enabled).
     */
    onBatchEditingStopped?(event: BatchEditingStoppedEvent<TData>): void;
    /**
     * Undo operation has started.
     */
    onUndoStarted?(event: UndoStartedEvent<TData>): void;
    /**
     * Undo operation has ended.
     */
    onUndoEnded?(event: UndoEndedEvent<TData>): void;
    /**
     * Redo operation has started.
     */
    onRedoStarted?(event: RedoStartedEvent<TData>): void;
    /**
     * Redo operation has ended.
     */
    onRedoEnded?(event: RedoEndedEvent<TData>): void;
    /**
     * Cell selection delete operation (cell clear) has started.
     */
    onCellSelectionDeleteStart?(event: CellSelectionDeleteStartEvent<TData>): void;
    /**
     * Cell selection delete operation (cell clear) has ended.
     */
    onCellSelectionDeleteEnd?(event: CellSelectionDeleteEndEvent<TData>): void;
    /**
     * Range delete operation (cell clear) has started.
     *
     * @deprecated v32.2 Use `onCellSelectionDeleteStart` instead
     */
    onRangeDeleteStart?(event: RangeDeleteStartEvent<TData>): void;
    /**
     * Range delete operation (cell clear) has ended.
     *
     * @deprecated v32.2 Use `onCellSelectionDeleteEnd` instead
     */
    onRangeDeleteEnd?(event: RangeDeleteEndEvent<TData>): void;
    /**
     * Fill operation has started.
     */
    onFillStart?(event: FillStartEvent<TData>): void;
    /**
     * Fill operation has ended.
     */
    onFillEnd?(event: FillEndEvent<TData>): void;
    /**
     * Filter has been opened.
     */
    onFilterOpened?(event: FilterOpenedEvent<TData>): void;
    /**
     * Filter has been modified and applied.
     */
    onFilterChanged?(event: FilterChangedEvent<TData>): void;
    /**
     * Filter was modified but not applied  (when using `enableFilterHandlers = false`). Used when filters have 'Apply' buttons.
     */
    onFilterModified?(event: FilterModifiedEvent<TData>): void;
    /**
     * Filter UI was modified (when using `enableFilterHandlers = true`).
     */
    onFilterUiChanged?(event: FilterUiChangedEvent<TData>): void;
    /**
     * Floating filter UI modified (when using `enableFilterHandlers = true`).
     */
    onFloatingFilterUiChanged?(event: FloatingFilterUiChangedEvent<TData>): void;
    /**
     * Advanced Filter Builder visibility has changed (opened or closed).
     */
    onAdvancedFilterBuilderVisibleChanged?(event: AdvancedFilterBuilderVisibleChangedEvent<TData>): void;
    /**
     * Find details have changed (e.g. Find search value, active match, or updates to grid cells).
     */
    onFindChanged?(event: FindChangedEvent<TData>): void;
    /**
     * A chart has been created.
     */
    onChartCreated?(event: ChartCreatedEvent<TData>): void;
    /**
     * The data range for the chart has been changed.
     */
    onChartRangeSelectionChanged?(event: ChartRangeSelectionChangedEvent<TData>): void;
    /**
     * Formatting changes have been made by users through the Customize Panel.
     */
    onChartOptionsChanged?(event: ChartOptionsChangedEvent<TData>): void;
    /**
     * A chart has been destroyed.
     */
    onChartDestroyed?(event: ChartDestroyedEvent<TData>): void;
    /**
     * DOM event `keyDown` happened on a cell.
     */
    onCellKeyDown?(event: CellKeyDownEvent<TData> | FullWidthCellKeyDownEvent<TData>): void;
    /**
     * The grid has initialised and is ready for most api calls, but may not be fully rendered yet  */
    onGridReady?(event: GridReadyEvent<TData>): void;
    /**
     * Invoked immediately before the grid is destroyed. This is useful for cleanup logic that needs to run before the grid is torn down.
     */
    onGridPreDestroyed?(event: GridPreDestroyedEvent<TData>): void;
    /**
     * Fired the first time data is rendered into the grid. Use this event if you want to auto resize columns based on their contents */
    onFirstDataRendered?(event: FirstDataRenderedEvent<TData>): void;
    /**
     * The size of the grid `div` has changed. In other words, the grid was resized.
     */
    onGridSizeChanged?(event: GridSizeChangedEvent<TData>): void;
    /**
     * Displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
     */
    onModelUpdated?(event: ModelUpdatedEvent<TData>): void;
    /**
     * A row was removed from the DOM, for any reason. Use to clean up resources (if any) used by the row.
     */
    onVirtualRowRemoved?(event: VirtualRowRemovedEvent<TData>): void;
    /**
     * Which rows are rendered in the DOM has changed.
     */
    onViewportChanged?(event: ViewportChangedEvent<TData>): void;
    /**
     * The body was scrolled horizontally or vertically.
     */
    onBodyScroll?(event: BodyScrollEvent<TData>): void;
    /**
     * Main body of the grid has stopped scrolling, either horizontally or vertically.
     */
    onBodyScrollEnd?(event: BodyScrollEndEvent<TData>): void;
    /**
     * When dragging starts. This could be any action that uses the grid's Drag and Drop service, e.g. Column Moving, Column Resizing, Range Selection, Fill Handle, etc.
     */
    onDragStarted?(event: DragStartedEvent<TData>): void;
    /**
     * When dragging stops. This could be any action that uses the grid's Drag and Drop service, e.g. Column Moving, Column Resizing, Range Selection, Fill Handle, etc.
     */
    onDragStopped?(event: DragStoppedEvent<TData>): void;
    /**
     * When dragging is cancelled stops. This is caused by pressing `Escape` while dragging elements within the grid that uses the grid's Drag and Drop service, e.g. Column Moving, Column Resizing, Range Selection, Fill Handle, etc.
     */
    onDragCancelled?(event: DragCancelledEvent<TData>): void;
    /**
     * Grid state has been updated.
     */
    onStateUpdated?(event: StateUpdatedEvent<TData>): void;
    /**
     * Triggered every time the paging state changes. Some of the most common scenarios for this event to be triggered are:
     *
     *  - The page size changes.
     *  - The current shown page is changed.
     *  - New data is loaded onto the grid.
     */
    onPaginationChanged?(event: PaginationChangedEvent<TData>): void;
    /**
     * A drag has started, or dragging was already started and the mouse has re-entered the grid having previously left the grid.
     */
    onRowDragEnter?(event: RowDragEnterEvent<TData>): void;
    /**
     * The mouse has moved while dragging.
     */
    onRowDragMove?(event: RowDragMoveEvent<TData>): void;
    /**
     * The mouse has left the grid while dragging.
     */
    onRowDragLeave?(event: RowDragLeaveEvent<TData>): void;
    /**
     * The drag has finished over the grid.
     */
    onRowDragEnd?(event: RowDragEndEvent<TData>): void;
    /**
     * The drag has been cancelled over the grid.
     */
    onRowDragCancel?(event: RowDragCancelEvent<TData>): void;
    /**
     * Called by drag and drop when rows are dragged over another row to conditionally prevent dropping the dragged row on the hovered row.
     * The user can cancel the drop by returning `false` or customize the operation by returning a `IsRowValidDropPositionResult`.
     * @agModule `RowDragModule`
     */
    isRowValidDropPosition?: IsRowValidDropPositionCallback<TData>;
    /**
     * The row resize has started (Row Numbers Feature)
     */
    onRowResizeStarted?(event: RowResizeStartedEvent<TData>): void;
    /**
     * The row resize has ended (Row Numbers Feature)
     */
    onRowResizeEnded?(event: RowResizeEndedEvent<TData>): void;
    /**
     * A row group column was added, removed or reordered.
     */
    onColumnRowGroupChanged?(event: ColumnRowGroupChangedEvent<TData>): void;
    /**
     * A row group was opened or closed.
     */
    onRowGroupOpened?(event: RowGroupOpenedEvent<TData>): void;
    /**
     * Fired when calling either of the API methods `expandAll()` or `collapseAll()`.
     */
    onExpandOrCollapseAll?(event: ExpandOrCollapseAllEvent<TData>): void;
    /**
     * Exceeded the `pivotMaxGeneratedColumns` limit when generating columns.
     */
    onPivotMaxColumnsExceeded?(event: PivotMaxColumnsExceededEvent<TData>): void;
    /**
     * The client has set new pinned row data into the grid.
     */
    onPinnedRowDataChanged?(event: PinnedRowDataChangedEvent<TData>): void;
    /**
     * A row has been pinned to top or bottom, or unpinned.
     */
    onPinnedRowsChanged?(event: PinnedRowsChangedEvent<TData>): void;
    /**
     * Client-Side Row Model only. The client has updated data for the grid by either a) setting new Row Data or b) Applying a Row Transaction.
     */
    onRowDataUpdated?(event: RowDataUpdatedEvent<TData>): void;
    /**
     * Async transactions have been applied. Contains a list of all transaction results.
     */
    onAsyncTransactionsFlushed?(event: AsyncTransactionsFlushedEvent<TData>): void;
    /**
     * A server side store has finished refreshing.
     */
    onStoreRefreshed?(event: StoreRefreshedEvent<TData>): void;
    /**
     * Header is focused.
     */
    onHeaderFocused?(event: HeaderFocusedEvent<TData>): void;
    /**
     * Cell is clicked.
     */
    onCellClicked?(event: CellClickedEvent<TData>): void;
    /**
     * Cell is double clicked.
     */
    onCellDoubleClicked?(event: CellDoubleClickedEvent<TData>): void;
    /**
     * Cell is focused.
     */
    onCellFocused?(event: CellFocusedEvent<TData>): void;
    /**
     * Mouse entered cell.
     */
    onCellMouseOver?(event: CellMouseOverEvent<TData>): void;
    /**
     * Mouse left cell.
     */
    onCellMouseOut?(event: CellMouseOutEvent<TData>): void;
    /**
     * Mouse down on cell.
     */
    onCellMouseDown?(event: CellMouseDownEvent<TData>): void;
    /**
     * Row is clicked.
     */
    onRowClicked?(event: RowClickedEvent<TData>): void;
    /**
     * Row is double clicked.
     */
    onRowDoubleClicked?(event: RowDoubleClickedEvent<TData>): void;
    /**
     * Row is selected or deselected. The event contains the node in question, so call the node's `isSelected()` method to see if it was just selected or deselected.
     */
    onRowSelected?(event: RowSelectedEvent<TData>): void;
    /**
     * Row selection is changed. Use the `selectedNodes` field to get the list of selected nodes at the time of the event. When using the SSRM, `selectedNodes` will be `null`
     * when selecting all nodes. Instead, refer to the `serverSideState` field.
     */
    onSelectionChanged?(event: SelectionChangedEvent<TData>): void;
    /**
     * Cell is right clicked.
     */
    onCellContextMenu?(event: CellContextMenuEvent<TData>): void;
    /**
     * A change to range selection has occurred.
     *
     * @deprecated v32.2 Use `onCellSelectionChanged` instead
     */
    onRangeSelectionChanged?(event: RangeSelectionChangedEvent<TData>): void;
    /**
     * A change to cell selection has occurred.
     */
    onCellSelectionChanged?(event: CellSelectionChangedEvent<TData>): void;
    /**
     * A tooltip has been displayed */
    onTooltipShow?(event?: TooltipShowEvent<TData>): void;
    /**
     * A tooltip was hidden */
    onTooltipHide?(event?: TooltipHideEvent<TData>): void;
    /**
     * Sort has changed. The grid also listens for this and updates the model.
     */
    onSortChanged?(event: SortChangedEvent<TData>): void;
}
export type RowGroupingDisplayType = 'singleColumn' | 'multipleColumns' | 'groupRows' | 'custom';
export type TreeDataDisplayType = 'auto' | 'custom';
export interface GetDataPath<TData = any> {
    (data: TData): string[];
}
export interface IsServerSideGroup {
    (dataItem: any): boolean;
}
export interface IsRowFilterable<TData = any, TContext = any> {
    (params: GetGroupAggFilteringParams<TData, TContext>): boolean;
}
export interface UseGroupFooter<TData = any, TContext = any> {
    (params: GetGroupIncludeFooterParams<TData, TContext>): boolean;
}
export interface UseGroupTotalRow<TData = any, TContext = any> {
    (params: GetGroupIncludeTotalRowParams<TData, TContext>): 'top' | 'bottom' | undefined;
}
export interface IsApplyServerSideTransaction<TData = any, TContext = any> {
    (params: IsApplyServerSideTransactionParams<TData, TContext>): boolean;
}
export interface GetServerSideGroupKey {
    (dataItem: any): string;
}
export interface IsRowMaster<TData = any> {
    (dataItem: TData): boolean;
}
export interface IsRowSelectable<TData = any> {
    (node: IRowNode<TData>): boolean;
}
export interface IsRowPinnable<TData = any> {
    (node: IRowNode<TData>): boolean;
}
export interface IsRowPinned<TData = any> {
    (node: IRowNode<TData>): RowPinnedType;
}
export interface RowClassRules<TData = any, TContext = any> {
    [cssClassName: string]: ((params: RowClassParams<TData, TContext>) => boolean) | string;
}
export interface RowStyle {
    [cssProperty: string]: string | number;
}
export interface RowClassParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /**
     * The data associated with this row from rowData. Data is `undefined` for row groups.
     */
    data: TData | undefined;
    /**
     * The RowNode associated with this row */
    node: IRowNode<TData>;
    /**
     * The index of the row */
    rowIndex: number;
}
type MenuCallbackReturn<TMenuItem extends string, TData = any, TContext = any> = (TMenuItem | MenuItemDef<TData, TContext>)[];
export interface GetContextMenuItems<TData = any, TContext = any> {
    (params: GetContextMenuItemsParams<TData, TContext>): MenuCallbackReturn<DefaultMenuItem, TData, TContext> | Promise<MenuCallbackReturn<DefaultMenuItem, TData, TContext>>;
}
export interface GetFullRowEditValidationErrors {
    (params: FullRowEditValidationParams): string[] | null;
}
export interface GetChartToolbarItems<TData = any, TContext = any> {
    (params: GetChartToolbarItemsParams<TData, TContext>): ChartToolbarMenuItemOptions[];
}
export interface GetMainMenuItems<TData = any, TContext = any> {
    (params: GetMainMenuItemsParams<TData, TContext>): MenuCallbackReturn<DefaultMenuItem, TData, TContext>;
}
export interface GetChartMenuItems<TData = any, TContext = any> {
    (params: GetChartMenuItemsParams<TData, TContext>): MenuCallbackReturn<DefaultChartMenuItem, TData, TContext>;
}
export interface GetRowNodeIdFunc<TData = any> {
    (data: TData): string;
}
export interface GetRowIdFunc<TData = any, TContext = any> {
    (params: GetRowIdParams<TData, TContext>): string;
}
export interface ChartRef {
    /**
     * The id of the created chart.
     */
    chartId: string;
    /**
     * The chart instance that is produced by AG Charts which can be used to interact with the chart directly.
     */
    chart: any;
    /**
     * The chart DOM element, which the application is responsible for placing into the DOM.
     */
    chartElement: HTMLElement;
    /**
     * The application is responsible for calling this when the chart is no longer needed.
     */
    destroyChart: () => void;
    /**
     * Focuses the chart.
     * If opening the dialog via the API, the chart is not focused by default, and this method can be used.
     */
    focusChart: () => void;
    /**
     * If opening the chart in a dialog, sets the maximized status of the dialog, else does nothing.
     */
    setMaximized: (maximized: boolean) => void;
}
export interface ChartRefParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext>, ChartRef {
}
export interface ServerSideGroupLevelParams {
    /**
     * For Infinite Scroll only.
     * How many blocks to keep in cache.
     * If missing, defaults to grid options `maxBlocksInCache`.
     */
    maxBlocksInCache?: number;
    /**
     * For Infinite Scroll only.
     * Cache block size.
     * If missing, defaults to grid options `cacheBlockSize`.
     */
    cacheBlockSize?: number;
}
/**
 * @deprecated use ServerSideGroupLevelParams instead */
export interface ServerSideStoreParams extends ServerSideGroupLevelParams {
}
export interface LoadingCellRendererSelectorFunc<TData = any, TValue = any, TContext = any> {
    (params: ILoadingCellRendererParams<TData, TValue, TContext>): LoadingCellRendererSelectorResult | undefined;
}
export interface LoadingCellRendererSelectorResult {
    /**
     * Equivalent of setting `loadingCellRenderer` */
    component?: any;
    /**
     * Equivalent of setting `loadingCellRendererParams` */
    params?: any;
}
export type DomLayoutType = 'normal' | 'autoHeight' | 'print';
/** Cell selection options */
export interface CellSelectionOptions<TData = any> {
    /**
     * If `true`, only a single range can be selected
     * @default false
     */
    suppressMultiRanges?: boolean;
    /**
     * If `true` the header of cells containing ranges will be highlighted.
     */
    enableHeaderHighlight?: boolean;
    /**
     * Determine the selection handle behaviour. Can be used to configure the range handle and the fill handle.
     */
    handle?: RangeHandleOptions | FillHandleOptions<TData>;
}
/**
 * Configuration options for the range handle
 */
export interface RangeHandleOptions {
    mode: 'range';
}
/**
 * Configuration options for the fill handle
 */
export interface FillHandleOptions<TData = any> {
    mode: 'fill';
    /**
     * Set this to `true` to prevent cell values from being cleared when the Range Selection is reduced by the Fill Handle.
     * @default false
     */
    suppressClearOnFillReduction?: boolean;
    /**
     * Set to `'x'` to force the fill handle direction to horizontal, or set to `'y'` to force the fill handle direction to vertical.
     * @default 'xy'
     */
    direction?: 'x' | 'y' | 'xy';
    /**
     * Callback to fill values instead of simply copying values or increasing number values using linear progression.
     */
    setFillValue?: <TContext = any>(params: FillOperationParams<TData, TContext>) => any;
}
export type RowSelectionOptions<TData = any, TValue = any, TContext = any> = SingleRowSelectionOptions<TData, TValue, TContext> | MultiRowSelectionOptions<TData, TValue, TContext>;
interface CommonRowSelectionOptions<TData = any, TValue = any, TContext = any> {
    /**
     * Modifies the selection behaviour when clicking a row.
     *
     * Choosing `'enableSelection'` allows selection of a row by clicking the row itself.
     * Choosing `'enableDeselection'` allows deselection of a row by CTRL-clicking the row itself.
     * Choosing `true` allows both selection of a row by clicking and deselection of a row by CTRL-clicking.
     * Choosing `false` prevents rows from being selected or deselected by clicking.
     *
     * @default false
     */
    enableClickSelection?: boolean | 'enableDeselection' | 'enableSelection';
    /**
     * Set to `true` or return `true` from the callback to render a selection checkbox.
     * @default true
     */
    checkboxes?: boolean | CheckboxSelectionCallback<TData, TValue, TContext>;
    /**
     * Configure where checkboxes are displayed.
     *
     * Choosing `'selectionColumn'` displays checkboxes in a dedicated selection column. Choosing `'autoGroupColumn'`
     * displays checkboxes in the autoGroupColumn. This applies to row checkboxes and header checkboxes.
     *
     * @default 'selectionColumn'
     */
    checkboxLocation?: CheckboxLocation;
    /**
     * Set to `true` to hide a disabled checkbox when row is not selectable and checkboxes are enabled.
     * @default false
     */
    hideDisabledCheckboxes?: boolean;
    /**
     * Callback to be used to determine which rows are selectable. By default rows are selectable, so return `false` to make a row non-selectable.
     */
    isRowSelectable?: IsRowSelectable<TData>;
    /**
     * When enabled and a row is selected, the copy action should copy the entire row, rather than just the focused cell
     * @default false
     */
    copySelectedRows?: boolean;
    /**
     * Set to `true` to allow (possibly multiple) rows to be selected and deselected using single click or touch.
     * @default false
     */
    enableSelectionWithoutKeys?: boolean;
    /**
     * Determines the selection behaviour of master rows with respect to their detail cells.
     *
     * When set to `'self'`, selecting the master row has no effect on the selection state of the detail row.
     * When set to `'detail'`, selecting the master row behaves the same as the header checkbox of the detail grid.
     *
     * @default 'self'
     */
    masterSelects?: 'self' | 'detail';
}
/**
 * Determines selection behaviour when only a single row can be selected at a time
 */
export interface SingleRowSelectionOptions<TData = any, TValue = any, TContext = any> extends CommonRowSelectionOptions<TData, TValue, TContext> {
    mode: 'singleRow';
}
/**
 * Determines selection behaviour when multiple rows can be selected at once.
 */
export interface MultiRowSelectionOptions<TData = any, TValue = any, TContext = any> extends CommonRowSelectionOptions<TData, TValue, TContext> {
    mode: 'multiRow';
    /**
     * Determine group selection behaviour
     * @default 'self'
     */
    groupSelects?: GroupSelectionMode;
    /**
     * Determines how "select all" behaviour works. This controls header checkbox selection.
     * @default 'all'
     */
    selectAll?: SelectAllMode;
    /**
     * If `true` a 'select all' checkbox will be put into the header.
     * @default true
     */
    headerCheckbox?: boolean;
    /**
     * If `true`, using CTRL+A will select all rows when [Cell Selection](./cell-selection) is enabled
     * @default false
     */
    ctrlASelectsRows?: boolean;
}
/** Subset of ColDef allowing for customisation of the Selection column, currently used for checkbox selection */
export type SelectionColumnDef = Pick<ColDef, 'icons' | 'suppressNavigable' | 'suppressKeyboardEvent' | 'contextMenuItems' | 'context' | 'comparator' | 'onCellClicked' | 'onCellContextMenu' | 'onCellDoubleClicked' | 'onCellValueChanged' | 'headerTooltip' | 'headerTooltipValueGetter' | 'headerStyle' | 'headerClass' | 'headerComponent' | 'headerComponentParams' | 'headerName' | 'headerValueGetter' | 'mainMenuItems' | 'suppressHeaderContextMenu' | 'suppressHeaderMenuButton' | 'suppressHeaderKeyboardEvent' | 'pinned' | 'lockPinned' | 'lockPosition' | 'initialPinned' | 'cellAriaRole' | 'cellStyle' | 'cellClass' | 'cellClassRules' | 'cellRenderer' | 'cellRendererParams' | 'cellRendererSelector' | 'rowDrag' | 'rowDragText' | 'dndSource' | 'dndSourceOnRowDrag' | 'sortable' | 'sort' | 'initialSort' | 'sortIndex' | 'initialSortIndex' | 'sortingOrder' | 'unSortIcon' | 'tooltipField' | 'tooltipValueGetter' | 'tooltipComponent' | 'tooltipComponentParams' | 'tooltipComponentSelector' | 'width' | 'initialWidth' | 'maxWidth' | 'minWidth' | 'flex' | 'initialFlex' | 'resizable' | 'suppressSizeToFit' | 'suppressAutoSize' | 'suppressMovable'>;
/**
 * Determines the behaviour when selecting a group row.
 *
 * - When `'self'`, selects only the group row itself.
 * - When `'descendants'`, selecting a group row selects all its child rows.
 * - When `'filteredDescendants'`, selecting a group row selects all child rows that satisfy the currently active filter.
 */
export type GroupSelectionMode = 'self' | 'descendants' | 'filteredDescendants';
/**
 * Determines how "select all" behaviour works.
 *
 * - When `'all'`, selects all rows, regardless of filter and pagination settings.
 * - When `'filtered'`, selects all rows that satisfy the currently active filter.
 * - When `'currentPage'`, selects all rows that satisfy the currently active filter on the current page.
 */
export type SelectAllMode = 'all' | 'filtered' | 'currentPage';
export type RowSelectionMode = RowSelectionOptions['mode'];
export type CheckboxLocation = 'selectionColumn' | 'autoGroupColumn';
export type MasterSelectionMode = NonNullable<CommonRowSelectionOptions['masterSelects']>;
export type AgPublicEventHandlerType = `on${Capitalize<AgPublicEventType>}` & keyof GridOptions;
export {};
