import type { AlignedGrid, CellPosition, CellSelectionOptions, ChartRefParams, ChartToolPanelsDef, ColDef, ColGroupDef, ColTypeDef, Column, CreateFilterHandlerFunc, CsvExportParams, DataTypeDefinition, DefaultChartMenuItem, DomLayoutType, EditStrategyType, EditValidationCommitType, ExcelExportParams, ExcelStyle, FillOperationParams, FindOptions, FocusGridInnerElementParams, GetChartMenuItems, GetChartToolbarItems, GetContextMenuItems, GetDataPath, GetFullRowEditValidationErrors, GetGroupRowAggParams, GetLocaleTextParams, GetMainMenuItems, GetRowIdFunc, GetServerSideGroupKey, GetServerSideGroupLevelParamsParams, GridState, HeaderPosition, IAdvancedFilterBuilderParams, IAdvancedFilterParams, IAggFunc, IDatasource, IRowDragItem, IRowNode, IServerSideDatasource, IViewportDatasource, InitialGroupOrderComparatorParams, IsApplyServerSideTransaction, IsExternalFilterPresentParams, IsFullWidthRowParams, IsGroupOpenByDefaultParams, IsRowFilterable, IsRowMaster, IsRowPinnable, IsRowPinned, IsRowSelectable, IsRowValidDropPositionCallback, IsServerSideGroup, IsServerSideGroupOpenByDefaultParams, LoadingCellRendererSelectorFunc, MenuItemDef, NavigateToNextCellParams, NavigateToNextHeaderParams, PaginationNumberFormatterParams, PostProcessPopupParams, PostSortRowsParams, ProcessCellForExportParams, ProcessDataFromClipboardParams, ProcessGroupHeaderForExportParams, ProcessHeaderForExportParams, ProcessRowParams, ProcessUnpinnedColumnsParams, RowClassParams, RowClassRules, RowGroupingDisplayType, RowHeightParams, RowModelType, RowNumbersOptions, RowSelectionOptions, RowStyle, SelectionColumnDef, SendToClipboardParams, ServerSideGroupLevelParams, SideBarDef, SizeColumnsToContentStrategy, SizeColumnsToFitGridStrategy, SizeColumnsToFitProvidedWidthStrategy, SortDirection, StatusPanelDef, TabToNextCellParams, TabToNextHeaderParams, Theme, TreeDataDisplayType, UseGroupTotalRow } from 'ag-grid-community';
import type { AdvancedFilterBuilderVisibleChangedEvent, AsyncTransactionsFlushedEvent, BatchEditingStartedEvent, BatchEditingStoppedEvent, BodyScrollEndEvent, BodyScrollEvent, BulkEditingStartedEvent, BulkEditingStoppedEvent, CellClickedEvent, CellContextMenuEvent, CellDoubleClickedEvent, CellEditRequestEvent, CellEditingStartedEvent, CellEditingStoppedEvent, CellFocusedEvent, CellKeyDownEvent, CellMouseDownEvent, CellMouseOutEvent, CellMouseOverEvent, CellSelectionChangedEvent, CellSelectionDeleteEndEvent, CellSelectionDeleteStartEvent, CellValueChangedEvent, ChartCreatedEvent, ChartDestroyedEvent, ChartOptionsChangedEvent, ChartRangeSelectionChangedEvent, ColumnEverythingChangedEvent, ColumnGroupOpenedEvent, ColumnHeaderClickedEvent, ColumnHeaderContextMenuEvent, ColumnHeaderMouseLeaveEvent, ColumnHeaderMouseOverEvent, ColumnMenuVisibleChangedEvent, ColumnMovedEvent, ColumnPinnedEvent, ColumnPivotChangedEvent, ColumnPivotModeChangedEvent, ColumnResizedEvent, ColumnRowGroupChangedEvent, ColumnValueChangedEvent, ColumnVisibleEvent, ColumnsResetEvent, ComponentStateChangedEvent, ContextMenuVisibleChangedEvent, CutEndEvent, CutStartEvent, DisplayedColumnsChangedEvent, DragCancelledEvent, DragStartedEvent, DragStoppedEvent, ExpandOrCollapseAllEvent, FillEndEvent, FillStartEvent, FilterChangedEvent, FilterModifiedEvent, FilterOpenedEvent, FilterUiChangedEvent, FindChangedEvent, FirstDataRenderedEvent, FloatingFilterUiChangedEvent, FullWidthCellKeyDownEvent, GridColumnsChangedEvent, GridPreDestroyedEvent, GridReadyEvent, GridSizeChangedEvent, HeaderFocusedEvent, ModelUpdatedEvent, NewColumnsLoadedEvent, PaginationChangedEvent, PasteEndEvent, PasteStartEvent, PinnedRowDataChangedEvent, PinnedRowsChangedEvent, PivotMaxColumnsExceededEvent, RangeDeleteEndEvent, RangeDeleteStartEvent, RangeSelectionChangedEvent, RedoEndedEvent, RedoStartedEvent, RowClickedEvent, RowDataUpdatedEvent, RowDoubleClickedEvent, RowDragCancelEvent, RowDragEndEvent, RowDragEnterEvent, RowDragLeaveEvent, RowDragMoveEvent, RowEditingStartedEvent, RowEditingStoppedEvent, RowGroupOpenedEvent, RowResizeEndedEvent, RowResizeStartedEvent, RowSelectedEvent, RowValueChangedEvent, SelectionChangedEvent, SortChangedEvent, StateUpdatedEvent, StoreRefreshedEvent, ToolPanelSizeChangedEvent, ToolPanelVisibleChangedEvent, TooltipHideEvent, TooltipShowEvent, UndoEndedEvent, UndoStartedEvent, ViewportChangedEvent, VirtualColumnsChangedEvent, VirtualRowRemovedEvent } from 'ag-grid-community';
import type { GridOptions, Module } from 'ag-grid-community';
import type { AgChartTheme, AgChartThemeOverrides } from 'ag-charts-types';
export interface Properties {
    [propertyName: string]: any;
}
export interface Props<TData> {
    /** Provided an initial gridOptions configuration to the component. If a property is specified in both gridOptions and via component binding the component binding takes precedence.  */
    gridOptions?: GridOptions<TData> | undefined;
    /**
     * Used to register AG Grid Modules directly with this instance of the grid.
     * See [Providing Modules To Individual Grids](https://www.ag-grid.com/vue-data-grid/modules/#providing-modules-to-individual-grids) for more information.
     */
    modules?: Module[] | undefined;
    /** Specifies the status bar components to use in the status bar.
         * @agModule `StatusBarModule`
         */
    statusBar?: {
        statusPanels: StatusPanelDef[];
    } | undefined;
    /** Specifies the side bar components.
         * @agModule `SideBarModule`
         */
    sideBar?: SideBarDef | string | string[] | boolean | null | undefined;
    /** Set to `true` to not show the context menu. Use if you don't want to use the default 'right click' context menu.
         * @default false
         */
    suppressContextMenu?: boolean | undefined;
    /** When using `suppressContextMenu`, you can use the `onCellContextMenu` function to provide your own code to handle cell `contextmenu` events.
         * This flag is useful to prevent the browser from showing its default context menu.
         * @default false
         */
    preventDefaultOnContextMenu?: boolean | undefined;
    /** Allows context menu to show, even when `Ctrl` key is held down.
         * @default false
         * @agModule `ContextMenuModule`
         */
    allowContextMenuWithControlKey?: boolean | undefined;
    /** Changes the display type of the column menu.
         * `'new'` just displays the main list of menu items. `'legacy'` displays a tabbed menu.
         * @default 'new'
         * @initial
         */
    columnMenu?: 'legacy' | 'new' | undefined;
    /** Only recommended for use if `columnMenu = 'legacy'`.
         * When `true`, the column menu button will always be shown.
         * When `false`, the column menu button will only show when the mouse is over the column header.
         * When using `columnMenu = 'legacy'`, this will default to `false` instead of `true`.
         * @default true
         */
    suppressMenuHide?: boolean | undefined;
    /** Set to `true` to use the browser's default tooltip instead of using the grid's Tooltip Component.
         * @default false
         * @initial
         * @agModule `TooltipModule`
         */
    enableBrowserTooltips?: boolean | undefined;
    /** The trigger that will cause tooltips to show and hide.
         *  - `hover` - The tooltip will show/hide when a cell/header is hovered.
         *  - `focus` - The tooltip will show/hide when a cell/header is focused.
         * @default 'hover'
         * @initial
         * @agModule `TooltipModule`
         */
    tooltipTrigger?: 'hover' | 'focus' | undefined;
    /** The delay in milliseconds that it takes for tooltips to show up once an element is hovered over.
         *     **Note:** This property does not work if `enableBrowserTooltips` is `true`.
         * @default 2000
         * @agModule `TooltipModule`
         */
    tooltipShowDelay?: number | undefined;
    /** The delay in milliseconds that it takes for tooltips to hide once they have been displayed.
         *     **Note:** This property does not work if `enableBrowserTooltips` is `true` and `tooltipHideTriggers` includes `timeout`.
         * @default 10000
         * @agModule `TooltipModule`
         */
    tooltipHideDelay?: number | undefined;
    /** Set to `true` to have tooltips follow the cursor once they are displayed.
         * @default false
         * @initial
         * @agModule `TooltipModule`
         */
    tooltipMouseTrack?: boolean | undefined;
    /** This defines when tooltip will show up for Cells, Headers and SetFilter Items.
         *  - `standard` - The tooltip always shows up when the items configured with Tooltips are hovered.
         * - `whenTruncated` - The tooltip will only be displayed when the items hovered have truncated (showing ellipsis) values. This property does not work when `enableBrowserTooltips={true}`.
         * @default `standard`
         * @agModule `TooltipModule`
         */
    tooltipShowMode?: 'standard' | 'whenTruncated' | undefined;
    /** Set to `true` to enable tooltip interaction. When this option is enabled, the tooltip will not hide while the
         * tooltip itself it being hovered or has focus.
         * @default false
         * @initial
         * @agModule `TooltipModule`
         */
    tooltipInteraction?: boolean | undefined;
    /** DOM element to use as the popup parent for grid popups (context menu, column menu etc).
         */
    popupParent?: HTMLElement | null | undefined;
    /** Set to `true` to also include headers when copying to clipboard using `Ctrl + C` clipboard.
         * @default false
         * @agModule `ClipboardModule`
         */
    copyHeadersToClipboard?: boolean | undefined;
    /** Set to `true` to also include group headers when copying to clipboard using `Ctrl + C` clipboard.
         * @default false
         * @agModule `ClipboardModule`
         */
    copyGroupHeadersToClipboard?: boolean | undefined;
    /** Specify the delimiter to use when copying to clipboard.
         * @default '\t'
         * @agModule `ClipboardModule`
         */
    clipboardDelimiter?: string | undefined;
    /** Set to `true` to copy the cell range or focused cell to the clipboard and never the selected rows.
         * @default false
         * @deprecated v32.2 Use `rowSelection.copySelectedRows` instead.
         */
    suppressCopyRowsToClipboard?: boolean | undefined;
    /** Set to `true` to copy rows instead of ranges when a range with only a single cell is selected.
         * @default false
         * @deprecated v32.2 Use `rowSelection.copySelectedRows` instead.
         */
    suppressCopySingleCellRanges?: boolean | undefined;
    /** Set to `true` to work around a bug with Excel (Windows) that adds an extra empty line at the end of ranges copied to the clipboard.
         * @default false
         * @agModule `ClipboardModule`
         */
    suppressLastEmptyLineOnPaste?: boolean | undefined;
    /** Set to `true` to turn off paste operations within the grid.
         * @default false
         * @agModule `ClipboardModule`
         */
    suppressClipboardPaste?: boolean | undefined;
    /** Set to `true` to stop the grid trying to use the Clipboard API, if it is blocked, and immediately fallback to the workaround.
         * @default false
         * @agModule `ClipboardModule`
         */
    suppressClipboardApi?: boolean | undefined;
    /** Set to `true` to block     **cut** operations within the grid.
         * @default false
         * @agModule `ClipboardModule`
         */
    suppressCutToClipboard?: boolean | undefined;
    /** Array of Column / Column Group definitions.
         */
    columnDefs?: (ColDef | ColGroupDef<TData>)[] | null | undefined;
    /** A default column definition. Items defined in the actual column definitions get precedence.
         */
    defaultColDef?: ColDef | undefined;
    /** A default column group definition. All column group definitions will use these properties. Items defined in the actual column group definition get precedence.
         * @initial
         */
    defaultColGroupDef?: Partial<ColGroupDef<TData>> | undefined;
    /** An object map of custom column types which contain groups of properties that column definitions can reuse by referencing in their `type` property.
         */
    columnTypes?: {
        [key: string]: ColTypeDef<TData>;
    } | undefined;
    /** An object map of cell data types to their definitions.
         * Cell data types can either override/update the pre-defined data types
         * (`'text'`, `'number'`, `'boolean'`, `'date'`, `'dateString'`, `'dateTime'`, `'dateTimeString'` or `'object'`),
         * or can be custom data types.
         */
    dataTypeDefinitions?: {
        [cellDataType: string]: DataTypeDefinition<TData>;
    } | undefined;
    /** Keeps the order of Columns maintained after new Column Definitions are updated.
         *
         * @default false
         */
    maintainColumnOrder?: boolean | undefined;
    /** Resets pivot column order when impacted by filters, data or configuration changes
         *
         * @default false
         * @agModule `PivotModule`
         */
    enableStrictPivotColumnOrder?: boolean | undefined;
    /** If `true`, then dots in field names (e.g. `'address.firstLine'`) are not treated as deep references. Allows you to use dots in your field name if you prefer.
         * @default false
         */
    suppressFieldDotNotation?: boolean | undefined;
    /** The height in pixels for the row containing the column label header. If not specified, it uses the theme value of `header-height`.
         */
    headerHeight?: number | undefined;
    /** The height in pixels for the rows containing header column groups. If not specified, it uses `headerHeight`.
         */
    groupHeaderHeight?: number | undefined;
    /** The height in pixels for the row containing the floating filters. If not specified, it uses the theme value of `header-height`.
         */
    floatingFiltersHeight?: number | undefined;
    /** The height in pixels for the row containing the columns when in pivot mode. If not specified, it uses `headerHeight`.
         */
    pivotHeaderHeight?: number | undefined;
    /** The height in pixels for the row containing header column groups when in pivot mode. If not specified, it uses `groupHeaderHeight`.
         */
    pivotGroupHeaderHeight?: number | undefined;
    /** Hide any column header rows that would only contain padded groups.
         */
    hidePaddedHeaderRows?: boolean | undefined;
    /** Allow reordering and pinning columns by dragging columns from the Columns Tool Panel to the grid.
         * @default false
         * @agModule `ColumnsToolPanelModule`
         */
    allowDragFromColumnsToolPanel?: boolean | undefined;
    /** Set to `true` to suppress column moving, i.e. to make the columns fixed position.
         * @default false
         */
    suppressMovableColumns?: boolean | undefined;
    /** If `true`, the `ag-column-moving` class is not added to the grid while columns are moving. In the default themes, this results in no animation when moving columns.
         * @default false
         */
    suppressColumnMoveAnimation?: boolean | undefined;
    /** Set to `true` to suppress moving columns while dragging the Column Header. This option highlights the position where the column will be placed and it will only move it on mouse up.
         * @default false
         */
    suppressMoveWhenColumnDragging?: boolean | undefined;
    /** If `true`, when you drag a column out of the grid (e.g. to the group zone) the column is not hidden.
         * @default false
         */
    suppressDragLeaveHidesColumns?: boolean | undefined;
    /** Enable to prevent column visibility changing when grouped columns are changed.
         * @default false
         */
    suppressGroupChangesColumnVisibility?: boolean | 'suppressHideOnGroup' | 'suppressShowOnUngroup' | undefined;
    /** By default, when a column is un-grouped, i.e. using the Row Group Panel, it is made visible in the grid. This property stops the column becoming visible again when un-grouping.
         * @default false
         * @deprecated v33.0.0 - Use `suppressGroupChangesColumnVisibility: 'suppressShowOnUngroup'` instead.
         */
    suppressMakeColumnVisibleAfterUnGroup?: boolean | undefined;
    /** If `true`, when you drag a column into a row group panel the column is not hidden.
         * @default false
         * @deprecated v33.0.0 - Use `suppressGroupChangesColumnVisibility: 'suppressHideOnGroup'` instead.
         */
    suppressRowGroupHidesColumns?: boolean | undefined;
    /** Set to `'shift'` to have shift-resize as the default resize operation (same as user holding down `Shift` while resizing).
         */
    colResizeDefault?: 'shift' | undefined;
    /** Suppresses auto-sizing columns for columns. In other words, double clicking a column's header's edge will not auto-size.
         * @default false
         * @initial
         */
    suppressAutoSize?: boolean | undefined;
    /** Number of pixels to add to a column width after the [auto-sizing](./column-sizing/#auto-size-columns-to-fit-cell-contents) calculation.
         * Set this if you want to add extra room to accommodate (for example) sort icons, or some other dynamic nature of the header.
         * @default 20
         */
    autoSizePadding?: number | undefined;
    /** Set this to `true` to skip the `headerName` when `autoSize` is called by default.
         * @default false
         * @initial
         * @agModule `ColumnAutoSizeModule`
         */
    skipHeaderOnAutoSize?: boolean | undefined;
    /** Auto-size the columns when the grid is loaded. Can size to fit the grid width, fit a provided width, or fit the cell contents.
         * @initial
         * @agModule `ColumnAutoSizeModule`
         */
    autoSizeStrategy?: SizeColumnsToFitGridStrategy | SizeColumnsToFitProvidedWidthStrategy | SizeColumnsToContentStrategy | undefined;
    /** A map of component names to components.
         * @initial
         */
    components?: {
        [p: string]: any;
    } | undefined;
    /** Set to `'fullRow'` to enable Full Row Editing. Otherwise leave blank to edit one cell at a time.
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    editType?: EditStrategyType | undefined;
    /** Determine the behavior when navigating to the next/previous editable cell. Default is to begin editing the cell.
         */
    suppressStartEditOnTab?: boolean | undefined;
    /** Validates the Full Row Edit. Only relevant when `editType="fullRow"`.
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    getFullRowEditValidationErrors?: GetFullRowEditValidationErrors | undefined;
    /** Set to `block` to block the commit of invalid cell edits, keeping editors open.
         */
    invalidEditValueMode?: EditValidationCommitType | undefined;
    /** Set to `true` to enable Single Click Editing for cells, to start editing with a single click.
         * @default false
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    singleClickEdit?: boolean | undefined;
    /** Set to `true` so that neither single nor double click starts editing.
         * @default false
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    suppressClickEdit?: boolean | undefined;
    /** Set to `true` to stop the grid updating data after `Edit`, `Clipboard` and `Fill Handle` operations. When this is set, it is intended the application will update the data, eg in an external immutable store, and then pass the new dataset to the grid. <br />**Note:** `rowNode.setDataValue()` does not update the value of the cell when this is `True`, it fires `onCellEditRequest` instead.
         * @default false
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    readOnlyEdit?: boolean | undefined;
    /** Set this to `true` to stop cell editing when grid loses focus.
         * The default is that the grid stays editing until focus goes onto another cell.
         * @default false
         * @initial
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    stopEditingWhenCellsLoseFocus?: boolean | undefined;
    /** Set to `true` along with `enterNavigatesVerticallyAfterEdit` to have Excel-style behaviour for the `Enter` key.
         * i.e. pressing the `Enter` key will move down to the cell beneath and `Shift+Enter` will move up to the cell above.
         * @default false
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    enterNavigatesVertically?: boolean | undefined;
    /** Set to `true` along with `enterNavigatesVertically` to have Excel-style behaviour for the 'Enter' key.
         * i.e. pressing the Enter key will move down to the cell beneath and Shift+Enter key will move up to the cell above.
         * @default false
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    enterNavigatesVerticallyAfterEdit?: boolean | undefined;
    /** Forces Cell Editing to start when backspace is pressed. This is only relevant for MacOS users.
         * @agModule `TextEditorModule` / `LargeTextEditorModule` / `NumberEditorModule` / `DateEditorModule` / `CheckboxEditorModule` / `CustomEditorModule` / `SelectEditorModule` / `RichSelectModule`
         */
    enableCellEditingOnBackspace?: boolean | undefined;
    /** Set to `true` to enable Undo / Redo while editing.
         * @initial
         * @agModule `UndoRedoEditModule`
         */
    undoRedoCellEditing?: boolean | undefined;
    /** Set the size of the undo / redo stack.
         * @default 10
         * @initial
         * @agModule `UndoRedoEditModule`
         */
    undoRedoCellEditingLimit?: number | undefined;
    /** A default configuration object used to export to CSV.
         * @agModule `CsvExportModule`
         */
    defaultCsvExportParams?: CsvExportParams | undefined;
    /** Prevents the user from exporting the grid to CSV.
         * @default false
         */
    suppressCsvExport?: boolean | undefined;
    /** A default configuration object used to export to Excel.
         * @agModule `ExcelExportModule`
         */
    defaultExcelExportParams?: ExcelExportParams | undefined;
    /** Prevents the user from exporting the grid to Excel.
         * @default false
         */
    suppressExcelExport?: boolean | undefined;
    /** A list (array) of Excel styles to be used when exporting to Excel with styles.
         * @initial
         * @agModule `ExcelExportModule`
         */
    excelStyles?: ExcelStyle[] | undefined;
    /** Text to find within the grid.
         * @agModule `FindModule`
         */
    findSearchValue?: string | undefined;
    /** Options for the Find feature.
         * @agModule `FindModule`
         */
    findOptions?: FindOptions | undefined;
    /** Rows are filtered using this text as a Quick Filter.
         * Only supported for Client-Side Row Model.
         * @agModule `QuickFilterModule`
         */
    quickFilterText?: string | undefined;
    /** Set to `true` to turn on the Quick Filter cache, used to improve performance when using the Quick Filter.
         * @default false
         * @initial
         * @agModule `QuickFilterModule`
         */
    cacheQuickFilter?: boolean | undefined;
    /** Hidden columns are excluded from the Quick Filter by default.
         * To include hidden columns, set to `true`.
         * @default false
         * @agModule `QuickFilterModule`
         */
    includeHiddenColumnsInQuickFilter?: boolean | undefined;
    /** Changes how the Quick Filter splits the Quick Filter text into search terms.
         * @agModule `QuickFilterModule`
         */
    quickFilterParser?: ((quickFilter: string) => string[]) | undefined;
    /** Changes the matching logic for whether a row passes the Quick Filter.
         * @agModule `QuickFilterModule`
         */
    quickFilterMatcher?: ((quickFilterParts: string[], rowQuickFilterAggregateText: string) => boolean) | undefined;
    /** When pivoting, Quick Filter is only applied on the pivoted data
         * (or aggregated data if `groupAggFiltering = true`).
         * Set to `true` to apply Quick Filter before pivoting (/aggregating) instead.
         * @default false
         * @agModule `QuickFilterModule`
         */
    applyQuickFilterBeforePivotOrAgg?: boolean | undefined;
    /** Set to `true` to override the default tree data filtering behaviour to instead exclude child nodes from filter results.
         * @default false
         * @agModule `TreeDataModule`
         */
    excludeChildrenWhenTreeDataFiltering?: boolean | undefined;
    /** Set to true to enable the Advanced Filter.
         * @default false
         * @agModule `AdvancedFilterModule`
         */
    enableAdvancedFilter?: boolean | undefined;
    /** Allows rows to always be displayed, even if they don't match the applied filtering.
         * Return `true` for the provided row to always be displayed.
         * Only works with the Client-Side Row Model.
         * @agModule `TextFilterModule` / `NumberFilterModule` / `DateFilterModule` / `SetFilterModule` / `MultiFilterModule` / `CustomFilterModule` / `QuickFilterModule` / `ExternalFilterModule` / `AdvancedFilterModule`
         */
    alwaysPassFilter?: ((rowNode: IRowNode<TData>) => boolean) | undefined;
    /** Hidden columns are excluded from the Advanced Filter by default.
         * To include hidden columns, set to `true`.
         * @default false
         * @agModule `AdvancedFilterModule`
         */
    includeHiddenColumnsInAdvancedFilter?: boolean | undefined;
    /** DOM element to use as the parent for the Advanced Filter to allow it to appear outside of the grid.
         * Set to `null` or `undefined` to appear inside the grid.
         * @agModule `AdvancedFilterModule`
         */
    advancedFilterParent?: HTMLElement | null | undefined;
    /** Customise the parameters passed to the Advanced Filter Builder.
         * @agModule `AdvancedFilterModule`
         */
    advancedFilterBuilderParams?: IAdvancedFilterBuilderParams | undefined;
    /** Customise the parameters passed to the Advanced Filter
         * @agModule `AdvancedFilterModule`
         */
    advancedFilterParams?: IAdvancedFilterParams | undefined;
    /** @deprecated As of v34, advanced filter no longer uses function evaluation, so this option has no effect.
         * @default true
         * @agModule `AdvancedFilterModule`
         */
    suppressAdvancedFilterEval?: boolean | undefined;
    /** When using AG Grid Enterprise, the Set Filter is used by default when `filter: true` is set on column definitions.
         * Set to `true` to prevent this and instead use the Text Filter, Number Filter or Date Filter based on the cell data type,
         * the same as when using AG Grid Community.
         * @default false
         * @initial
         * @agModule TextFilterModule / NumberFilterModule / DateFilterModule / MultiFilterModule / CustomFilterModule
         */
    suppressSetFilterByDefault?: boolean | undefined;
    /** Enable filter handlers for custom filter components.
         * Requires all custom filters to be implemented using handlers.
         *
         * Note that grid-provided filters (except for the Multi Filter) always use filter handlers.
         * The Multi Filter will also use a filter handler if this is enabled.
         * @initial
         */
    enableFilterHandlers?: boolean | undefined;
    /** A map of filter handler key to filter handler function.
         * Allows for filter handler keys to be used in `colDef.filter.handler`.
         * @initial
         */
    filterHandlers?: {
        [key: string]: CreateFilterHandlerFunc<TData>;
    } | undefined;
    /** Set to `true` to Enable Charts.
         * @default false
         * @agModule `IntegratedChartsModule`
         */
    enableCharts?: boolean | undefined;
    /** The list of chart themes that a user can choose from in the chart panel.
         * @default ['ag-default', 'ag-material', 'ag-sheets', 'ag-polychroma', 'ag-vivid'];
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    chartThemes?: string[] | undefined;
    /** A map containing custom chart themes.
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    customChartThemes?: {
        [name: string]: AgChartTheme;
    } | undefined;
    /** Chart theme overrides applied to all themes.
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    chartThemeOverrides?: AgChartThemeOverrides | undefined;
    /** Allows customisation of the Chart Tool Panels, such as changing the tool panels visibility and order, as well as choosing which charts should be displayed in the chart panel.
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    chartToolPanelsDef?: ChartToolPanelsDef | undefined;
    /** Get chart menu items. Only applies when using AG Charts Enterprise.
         * @agModule `IntegratedChartsModule`
         */
    chartMenuItems?: (DefaultChartMenuItem | MenuItemDef<TData>)[] | GetChartMenuItems<TData> | undefined;
    /** Provide your own loading cell renderer to use when data is loading via a DataSource or when a cell renderer is deferred.
         * See [Loading Cell Renderer](https://www.ag-grid.com/javascript-data-grid/component-loading-cell-renderer/) for framework specific implementation details.
         */
    loadingCellRenderer?: any;
    /** Params to be passed to the `loadingCellRenderer` component.
         */
    loadingCellRendererParams?: any;
    /** Callback to select which loading cell renderer to be used when data is loading via a DataSource or when a cell renderer is deferred.
         * @initial
         */
    loadingCellRendererSelector?: LoadingCellRendererSelectorFunc<TData> | undefined;
    /** A map of key->value pairs for localising text within the grid.
         * @initial
         * @agModule `LocaleModule`
         */
    localeText?: {
        [key: string]: string;
    } | undefined;
    /** Set to `true` to enable Master Detail.
         * @default false
         * @agModule `MasterDetailModule`
         */
    masterDetail?: boolean | undefined;
    /** Set to `true` to keep detail rows for when they are displayed again.
         * @default false
         * @initial
         * @agModule `MasterDetailModule`
         */
    keepDetailRows?: boolean | undefined;
    /** Sets the number of details rows to keep.
         * @default 10
         * @initial
         * @agModule `MasterDetailModule`
         */
    keepDetailRowsCount?: number | undefined;
    /** Provide a custom `detailCellRenderer` to use when a master row is expanded.
         * See [Detail Cell Renderer](https://www.ag-grid.com/javascript-data-grid/master-detail-custom-detail/) for framework specific implementation details.
         * @agModule `MasterDetailModule`
         */
    detailCellRenderer?: any;
    /** Specifies the params to be used by the Detail Cell Renderer. Can also be a function that provides the params to enable dynamic definitions of the params.
         * @agModule `MasterDetailModule`
         */
    detailCellRendererParams?: any;
    /** Set fixed height in pixels for each detail row.
         * @initial
         * @agModule `MasterDetailModule`
         */
    detailRowHeight?: number | undefined;
    /** Set to `true` to have the detail grid dynamically change it's height to fit it's rows.
         * @initial
         * @agModule `MasterDetailModule`
         */
    detailRowAutoHeight?: boolean | undefined;
    /** Provides a context object that is provided to different callbacks the grid uses. Used for passing additional information to the callbacks used by your application.
         * @initial
         */
    context?: any;
    /**
         * A list of grids to treat as Aligned Grids.
         * Provide a list if the grids / apis already exist or return via a callback to allow the aligned grids to be retrieved asynchronously.
         * If grids are aligned then the columns and horizontal scrolling will be kept in sync.
         * @agModule `AlignedGridsModule`
         */
    alignedGrids?: (AlignedGrid[] | (() => AlignedGrid[])) | undefined;
    /** Change this value to set the tabIndex order of the Grid within your application.
         * @default 0
         * @initial
         */
    tabIndex?: number | undefined;
    /** The number of rows rendered outside the viewable area the grid renders.
         * Having a buffer means the grid will have rows ready to show as the user slowly scrolls vertically.
         * @default 10
         */
    rowBuffer?: number | undefined;
    /** Set to `true` to turn on the value cache.
         * @default false
         * @initial
         * @agModule `ValueCacheModule`
         */
    valueCache?: boolean | undefined;
    /** Set to `true` to configure the value cache to not expire after data updates.
         * @default false
         * @initial
         * @agModule `ValueCacheModule`
         */
    valueCacheNeverExpires?: boolean | undefined;
    /** Set to `true` to allow cell expressions.
         * @default false
         * @initial
         */
    enableCellExpressions?: boolean | undefined;
    /** Disables touch support (but does not remove the browser's efforts to simulate mouse events on touch).
         * @default false
         * @initial
         */
    suppressTouch?: boolean | undefined;
    /** Set to `true` to not set focus back on the grid after a refresh. This can avoid issues where you want to keep the focus on another part of the browser.
         * @default false
         */
    suppressFocusAfterRefresh?: boolean | undefined;
    /** @deprecated As of v32.2 the grid always uses the browser's ResizeObserver, this grid option has no effect
         * @default false
         * @initial
         */
    suppressBrowserResizeObserver?: boolean | undefined;
    /** @deprecated As of v33 `gridOptions` and `columnDefs` both have a `context` property that should be used for arbitrary user data. This means that column definitions and gridOptions should only contain valid properties making this property redundant.
         * @default false
         * @initial
         */
    suppressPropertyNamesCheck?: boolean | undefined;
    /** Disables change detection.
         * @default false
         */
    suppressChangeDetection?: boolean | undefined;
    /** Set this to `true` to enable debug information from the grid and related components. Will result in additional logging being output, but very useful when investigating problems.
         * It is also recommended to register the `ValidationModule` to identify any misconfigurations.
         * @default false
         * @initial
         */
    debug?: boolean | undefined;
    /** Show or hide the loading overlay.
         */
    loading?: boolean | undefined;
    /** Provide a HTML string to override the default loading overlay. Supports non-empty plain text or HTML with a single root element.
         */
    overlayLoadingTemplate?: string | undefined;
    /** Provide a custom loading overlay component.
         * @initial
         */
    loadingOverlayComponent?: any;
    /** Customise the parameters provided to the loading overlay component.
         */
    loadingOverlayComponentParams?: any;
    /** Disables the 'loading' overlay.
         * @deprecated v32 - Deprecated. Use `loading=false` instead.
         * @default false
         * @initial
         */
    suppressLoadingOverlay?: boolean | undefined;
    /** Provide a HTML string to override the default no-rows overlay. Supports non-empty plain text or HTML with a single root element.
         */
    overlayNoRowsTemplate?: string | undefined;
    /** Provide a custom no-rows overlay component.
         * @initial
         */
    noRowsOverlayComponent?: any;
    /** Customise the parameters provided to the no-rows overlay component.
         */
    noRowsOverlayComponentParams?: any;
    /** Set to `true` to prevent the no-rows overlay being shown when there is no row data.
         * @default false
         * @initial
         */
    suppressNoRowsOverlay?: boolean | undefined;
    /** Set whether pagination is enabled.
         * @default false
         * @agModule `PaginationModule`
         */
    pagination?: boolean | undefined;
    /** How many rows to load per page. If `paginationAutoPageSize` is specified, this property is ignored.
         * @default 100
         * @agModule `PaginationModule`
         */
    paginationPageSize?: number | undefined;
    /** Determines if the page size selector is shown in the pagination panel or not.
         * Set to an array of values to show the page size selector with custom list of possible page sizes.
         * Set to `true` to show the page size selector with the default page sizes `[20, 50, 100]`.
         * Set to `false` to hide the page size selector.
         * @default true
         * @initial
         * @agModule `PaginationModule`
         */
    paginationPageSizeSelector?: number[] | boolean | undefined;
    /** Set to `true` so that the number of rows to load per page is automatically adjusted by the grid so each page shows enough rows to just fill the area designated for the grid. If `false`, `paginationPageSize` is used.
         * @default false
         * @agModule `PaginationModule`
         */
    paginationAutoPageSize?: boolean | undefined;
    /** Set to `true` to have pages split children of groups when using Row Grouping or detail rows with Master Detail.
         * @default false
         * @initial
         * @agModule `PaginationModule`
         */
    paginateChildRows?: boolean | undefined;
    /** If `true`, the default grid controls for navigation are hidden.
         * This is useful if `pagination=true` and you want to provide your own pagination controls.
         * Otherwise, when `pagination=true` the grid automatically shows the necessary controls at the bottom so that the user can navigate through the different pages.
         * @default false
         * @agModule `PaginationModule`
         */
    suppressPaginationPanel?: boolean | undefined;
    /** Set to `true` to enable pivot mode.
         * @default false
         * @agModule `PivotModule`
         */
    pivotMode?: boolean | undefined;
    /** When to show the 'pivot panel' (where you drag rows to pivot) at the top. Note that the pivot panel will never show if `pivotMode` is off.
         * @default 'never'
         * @initial
         * @agModule `RowGroupingPanelModule`
         */
    pivotPanelShow?: 'always' | 'onlyWhenPivoting' | 'never' | undefined;
    /** The maximum number of generated columns before the grid halts execution. Upon reaching this number, the grid halts generation of columns
         * and triggers a `pivotMaxColumnsExceeded` event. `-1` for no limit.
         * @default -1
         * @agModule `PivotModule`
         */
    pivotMaxGeneratedColumns?: number | undefined;
    /** If pivoting, set to the number of column group levels to expand by default, e.g. `0` for none, `1` for first level only, etc. Set to `-1` to expand everything.
         * @default 0
         * @agModule `PivotModule`
         */
    pivotDefaultExpanded?: number | undefined;
    /** When set and the grid is in pivot mode, automatically calculated totals will appear within the Pivot Column Groups, in the position specified.
         * @agModule `PivotModule`
         */
    pivotColumnGroupTotals?: 'before' | 'after' | undefined;
    /** When set and the grid is in pivot mode, automatically calculated totals will appear for each value column in the position specified.
         * @agModule `PivotModule`
         */
    pivotRowTotals?: 'before' | 'after' | undefined;
    /** If `true`, the grid will not swap in the grouping column when pivoting. Useful if pivoting using Server Side Row Model or Viewport Row Model and you want full control of all columns including the group column.
         * @default false
         * @initial
         * @agModule `PivotModule`
         */
    pivotSuppressAutoColumn?: boolean | undefined;
    /** When enabled, pivot column groups will appear 'fixed', without the ability to expand and collapse the column groups.
         * @default false
         * @initial
         * @agModule `PivotModule`
         */
    suppressExpandablePivotGroups?: boolean | undefined;
    /** If `true`, then row group, pivot and value aggregation will be read-only from the GUI. The grid will display what values are used for each, but will not allow the user to change the selection.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    functionsReadOnly?: boolean | undefined;
    /** A map of 'function name' to 'function' for custom aggregation functions.
         * @initial
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    aggFuncs?: {
        [key: string]: IAggFunc<TData>;
    } | undefined;
    /** When `true`, column headers won't include the `aggFunc` name, e.g. `'sum(Bank Balance)`' will just be `'Bank Balance'`.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    suppressAggFuncInHeader?: boolean | undefined;
    /** When using aggregations, the grid will always calculate the root level aggregation value.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    alwaysAggregateAtRootLevel?: boolean | undefined;
    /** When using change detection, only the updated column will be re-aggregated.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    aggregateOnlyChangedColumns?: boolean | undefined;
    /** Set to `true` so that aggregations are not impacted by filtering.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    suppressAggFilteredOnly?: boolean | undefined;
    /** Set to `true` to omit the value Column header when there is only a single value column.
         * @default false
         * @agModule `PivotModule`
         */
    removePivotHeaderRowWhenSingleValueColumn?: boolean | undefined;
    /** Set to `false` to disable Row Animation which is enabled by default.
         * @default true
         */
    animateRows?: boolean | undefined;
    /** Sets the duration in milliseconds of how long a cell should remain in its "flashed" state.
         * If `0`, the cell will not flash.
         * @default 500
         */
    cellFlashDuration?: number | undefined;
    /** Sets the duration in milliseconds of how long the "flashed" state animation takes to fade away after the timer set by `cellFlashDuration` has completed.
         * @default 1000
         */
    cellFadeDuration?: number | undefined;
    /** Set to `true` to have cells flash after data changes even when the change is due to filtering.
         * @default false
         * @initial
         */
    allowShowChangeAfterFilter?: boolean | undefined;
    /** Switch between layout options: `normal`, `autoHeight`, `print`.
         * @default 'normal'
         */
    domLayout?: DomLayoutType | undefined;
    /** When `true`, the order of rows and columns in the DOM are consistent with what is on screen.
         * Disables row animations.
         * @default false
         * @initial
         */
    ensureDomOrder?: boolean | undefined;
    /** When `true`, enables the cell span feature allowing for the use of the `colDef.spanRows` property.
         * @default false
         * @initial
         * @agModule `CellSpanModule`
         */
    enableCellSpan?: boolean | undefined;
    /** Set to `true` to operate the grid in RTL (Right to Left) mode.
         * @default false
         * @initial
         */
    enableRtl?: boolean | undefined;
    /** Set to `true` so that the grid doesn't virtualise the columns. For example, if you have 100 columns, but only 10 visible due to scrolling, all 100 will always be rendered.
         *     **It is not recommended to set this to `true` as it may cause performance issues.**
         * @default false
         * @initial
         */
    suppressColumnVirtualisation?: boolean | undefined;
    /** By default the grid has a limit of rendering a maximum of 500 rows at once (remember the grid only renders rows you can see, so unless your display shows more than 500 rows without vertically scrolling this will never be an issue).
         * <br />**This is only relevant if you are manually setting `rowBuffer` to a high value (rendering more rows than can be seen), or `suppressRowVirtualisation` is true, or if your grid height is able to display more than 500 rows at once.**
         * @default false
         * @initial
         */
    suppressMaxRenderedRowRestriction?: boolean | undefined;
    /** Set to `true` so that the grid doesn't virtualise the rows. For example, if you have 100 rows, but only 10 visible due to scrolling, all 100 will always be rendered.
         *     **It is not recommended to set this to `true` as it may cause performance issues.**
         * @default false
         * @initial
         */
    suppressRowVirtualisation?: boolean | undefined;
    /** Set to `true` to enable Managed Row Dragging.
         * @default false
         * @agModule `RowDragModule`
         */
    rowDragManaged?: boolean | undefined;
    /** Used if rowDragManaged is enabled and treeData is enabled,
         * - If the row is already a group, but is not expanded, it will be expanded after rowDragInsertDelay milliseconds of dragging over it.
         * - If the row is a leaf (no children), it will be converted to a group and the row inserted into it after rowDragInsertDelay milliseconds of dragging over it.
         * @default 500
         * @agModule `RowDragModule`
         */
    rowDragInsertDelay?: number | undefined;
    /** Set to `true` to suppress row dragging.
         * @default false
         */
    suppressRowDrag?: boolean | undefined;
    /** Set to `true` to suppress moving rows while dragging the `rowDrag` waffle. This option highlights the position where the row will be placed and it will only move the row on mouse up.
         * @default false
         * @agModule `RowDragModule`
         */
    suppressMoveWhenRowDragging?: boolean | undefined;
    /** Set to `true` to enable clicking and dragging anywhere on the row without the need for a drag handle.
         * @default false
         * @agModule `RowDragModule`
         */
    rowDragEntireRow?: boolean | undefined;
    /** Set to `true` to enable dragging multiple rows at the same time.
         * @default false
         * @agModule `RowDragModule`
         */
    rowDragMultiRow?: boolean | undefined;
    /** A callback that should return a string to be displayed by the `rowDragComp` while dragging a row.
         * If this callback is not set, the current cell value will be used.
         * If the `rowDragText` callback is set in the ColDef it will take precedence over this, except when
         * `rowDragEntireRow=true`.
         * @initial
         * @agModule `RowDragModule`
         */
    rowDragText?: ((params: IRowDragItem, dragItemCount: number) => string) | undefined;
    /** Provide a custom drag and drop image component.
         * @initial
         * @agModule `RowDragModule`
         */
    dragAndDropImageComponent?: any;
    /** Customise the parameters provided to the Drag and Drop Image Component.
         * @agModule `RowDragModule`
         */
    dragAndDropImageComponentParams?: any;
    /** Provide your own cell renderer component to use for full width rows.
         * See [Full Width Rows](https://www.ag-grid.com/javascript-data-grid/full-width-rows/) for framework specific implementation details.
         */
    fullWidthCellRenderer?: any;
    /** Customise the parameters provided to the `fullWidthCellRenderer` component.
         */
    fullWidthCellRendererParams?: any;
    /** Set to `true` to have the Full Width Rows embedded in grid's main container so they can be scrolled horizontally.
         */
    embedFullWidthRows?: boolean | undefined;
    /** Specifies how the results of row grouping should be displayed.
         *
         *  The options are:
         *
         * - `'singleColumn'`: single group column automatically added by the grid.
         * - `'multipleColumns'`: a group column per row group is added automatically.
         * - `'groupRows'`: group rows are automatically added instead of group columns.
         * - `'custom'`: informs the grid that group columns will be provided.
         * @agModule `RowGroupingModule`
         */
    groupDisplayType?: RowGroupingDisplayType | undefined;
    /** If grouping, set to the number of levels to expand by default, e.g. `0` for none, `1` for first level only, etc. Set to `-1` to expand everything.
         * @default 0
         * @agModule `RowGroupingModule` / `TreeDataModule`
         */
    groupDefaultExpanded?: number | undefined;
    /** Allows specifying the group 'auto column' if you are not happy with the default. If grouping, this column definition is included as the first column in the grid. If not grouping, this column is not included.
         * @agModule `RowGroupingModule` / `TreeDataModule`
         */
    autoGroupColumnDef?: ColDef<TData> | undefined;
    /** When `true`, preserves the current group order when sorting on non-group columns.
         * @default false
         * @agModule `RowGroupingModule`
         */
    groupMaintainOrder?: boolean | undefined;
    /** When `true`, if you select a group, the children of the group will also be selected.
         * @default false
         * @deprecated v32.2 Use `rowSelection.groupSelects` instead
         */
    groupSelectsChildren?: boolean | undefined;
    /** If grouping, locks the group settings of a number of columns, e.g. `0` for no group locking. `1` for first group column locked, `-1` for all group columns locked.
         * @default 0
         * @initial
         * @agModule `RowGroupingModule`
         */
    groupLockGroupColumns?: number | undefined;
    /** Set to determine whether filters should be applied on aggregated group values.
         * @default false
         * @agModule `RowGroupingModule`
         */
    groupAggFiltering?: boolean | IsRowFilterable<TData> | undefined;
    /** When provided, an extra row group total row will be inserted into row groups at the specified position, to display
         * when the group is expanded. This row will contain the aggregate values for the group. If a callback function is
         * provided, it can be used to selectively determine which groups will have a total row added.
         * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
         */
    groupTotalRow?: 'top' | 'bottom' | UseGroupTotalRow<TData> | undefined;
    /** When provided, an extra grand total row will be inserted into the grid at the specified position.
         * This row displays the aggregate totals of all rows in the grid.
         * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
         */
    grandTotalRow?: 'top' | 'bottom' | 'pinnedTop' | 'pinnedBottom' | undefined;
    /** Suppress the sticky behaviour of the total rows, can be suppressed individually by passing `'grand'` or `'group'`.
         * @agModule `RowGroupingModule` / `ServerSideRowModelModule`
         */
    suppressStickyTotalRow?: boolean | 'grand' | 'group' | undefined;
    /** If `true`, and showing footer, aggregate data will always be displayed at both the header and footer levels. This stops the possibly undesirable behaviour of the header details 'jumping' to the footer on expand.
         * @default false
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    groupSuppressBlankHeader?: boolean | undefined;
    /** If using `groupSelectsChildren`, then only the children that pass the current filter will get selected.
         * @default false
         * @deprecated v32.2 Use `rowSelection.groupSelects` instead
         */
    groupSelectsFiltered?: boolean | undefined;
    /** Shows the open group in the group column for non-group rows.
         * @default false
         * @agModule `RowGroupingModule`
         */
    showOpenedGroup?: boolean | undefined;
    /** Enable to display the child row in place of the group row when the group only has a single child.
         * @default false
         * @agModule `RowGroupingModule`
         */
    groupHideParentOfSingleChild?: boolean | 'leafGroupsOnly' | undefined;
    /** Set to `true` to collapse groups that only have one child.
         * @default false
         * @deprecated v33.0.0 - use `groupHideParentOfSingleChild` instead.
         */
    groupRemoveSingleChildren?: boolean | undefined;
    /** Set to `true` to collapse lowest level groups that only have one child.
         * @default false
         * @deprecated v33.0.0 - use `groupHideParentOfSingleChild: 'leafGroupsOnly'` instead.
         */
    groupRemoveLowestSingleChildren?: boolean | undefined;
    /** Set to `true` to hide parents that are open. When used with multiple columns for showing groups, it can give a more pleasing user experience.
         * @default false
         * @agModule `RowGroupingModule`
         */
    groupHideOpenParents?: boolean | undefined;
    /** Set to `true` to prevent the grid from creating a '(Blanks)' group for nodes which do not belong to a group, and display the unbalanced nodes alongside group nodes.
         * @default false
         * @agModule `RowGroupingModule`
         */
    groupAllowUnbalanced?: boolean | undefined;
    /** When to show the 'row group panel' (where you drag rows to group) at the top.
         * @default 'never'
         * @agModule `RowGroupingPanelModule`
         */
    rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never' | undefined;
    /** Provide the Cell Renderer to use when `groupDisplayType = 'groupRows'`.
         * See [Group Row Cell Renderer](https://www.ag-grid.com/javascript-data-grid/grouping-group-rows/#providing-cell-renderer) for framework specific implementation details.
         * @agModule `RowGroupingModule`
         */
    groupRowRenderer?: any;
    /** Customise the parameters provided to the `groupRowRenderer` component.
         * @agModule `RowGroupingModule`
         */
    groupRowRendererParams?: any;
    /** Set to `true` to enable the Grid to work with Tree Data.
         * You must also implement the `getDataPath(data)` callback.
         * @default false
         * @agModule `TreeDataModule`
         */
    treeData?: boolean | undefined;
    /** The name of the field to use in a data item to retrieve the array of children nodes of a node when while using treeData=true.
         * It supports accessing nested fields using the dot notation.
         * @agModule `TreeDataModule`
         */
    treeDataChildrenField?: string | undefined;
    /** The name of the field to use in a data item to find the parent node of a node when using treeData=true.
         * The tree will be constructed via relationships between nodes using this field.
         * getRowId callback need to be provided as well for this to work.
         * It supports accessing nested fields using the dot notation.
         * @agModule `TreeDataModule`
         */
    treeDataParentIdField?: string | undefined;
    /** Set to `true` to suppress sort indicators and actions from the row group panel.
         * @default false
         * @agModule `RowGroupingPanelModule`
         */
    rowGroupPanelSuppressSort?: boolean | undefined;
    /** Set to `true` prevent Group Rows from sticking to the top of the grid.
         * @default false
         * @initial
         * @agModule `RowGroupingModule` / `TreeDataModule`
         */
    suppressGroupRowsSticky?: boolean | undefined;
    /** Data to be displayed as pinned top rows in the grid.
         * @agModule `PinnedRowModule`
         */
    pinnedTopRowData?: any[] | undefined;
    /** Data to be displayed as pinned bottom rows in the grid.
         * @agModule `PinnedRowModule`
         */
    pinnedBottomRowData?: any[] | undefined;
    /** Determines whether manual row pinning is enabled via the row context menu.
         *
         * Set to `true` to allow pinning rows to top or bottom.
         * Set to `'top'` to allow pinning rows to the top only.
         * Set to `'bottom'` to allow pinning rows to the bottom only.
         * @agModule `PinnedRowModule`
         */
    enableRowPinning?: boolean | 'top' | 'bottom' | undefined;
    /** Return `true` if the grid should allow the row to be manually pinned.
         * Return `false` if the grid should prevent the row from being pinned
         *
         * When not defined, all rows default to pinnable.
         * @agModule `PinnedRowModule`
         */
    isRowPinnable?: IsRowPinnable<TData> | undefined;
    /** Called for every row in the grid.
         *
         * Return "top", "bottom" if the row should be initially pinned to the top or bottom respectively.
         * Return `null` or `undefined` otherwise.
         * User interactions can subsequently still change the pinned state of a row.
         * @agModule `PinnedRowModule`
         */
    isRowPinned?: IsRowPinned<TData> | undefined;
    /** Sets the row model type.
         * @default 'clientSide'
         * @initial
         * @agModule `ClientSideRowModelModule` / `InfiniteRowModelModule` / `ServerSideRowModelModule` / `ViewportRowModelModule`
         */
    rowModelType?: RowModelType | undefined;
    /** Set the data to be displayed as rows in the grid.
         * @agModule `ClientSideRowModelModule`
         */
    rowData?: TData[] | null | undefined;
    /** How many milliseconds to wait before executing a batch of async transactions.
         */
    asyncTransactionWaitMillis?: number | undefined;
    /** Prevents Transactions changing sort, filter, group or pivot state when transaction only contains updates.
         * @default false
         */
    suppressModelUpdateAfterUpdateTransaction?: boolean | undefined;
    /** Provide the datasource for infinite scrolling.
         * @agModule `InfiniteRowModelModule`
         */
    datasource?: IDatasource | undefined;
    /** How many extra blank rows to display to the user at the end of the dataset, which sets the vertical scroll and then allows the grid to request viewing more rows of data.
         * @default 1
         * @initial
         * @agModule `InfiniteRowModelModule`
         */
    cacheOverflowSize?: number | undefined;
    /** How many extra blank rows to display to the user at the end of the dataset, which sets the vertical scroll and then allows the grid to request viewing more rows of data.
         * @default 1
         * @initial
         * @agModule `InfiniteRowModelModule`
         */
    infiniteInitialRowCount?: number | undefined;
    /** Set how many loading rows to display to the user for the root level group.
         * @default 1
         * @initial
         * @agModule `ServerSideRowModelModule`
         */
    serverSideInitialRowCount?: number | undefined;
    /** When `true`, the Server-side Row Model will not use a full width loading renderer, instead using the colDef `loadingCellRenderer` if present.
         * @agModule `ServerSideRowModelModule`
         */
    suppressServerSideFullWidthLoadingRow?: boolean | undefined;
    /** How many rows for each block in the store, i.e. how many rows returned from the server at a time.
         * @default 100
         * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
         */
    cacheBlockSize?: number | undefined;
    /** How many blocks to keep in the store. Default is no limit, so every requested block is kept. Use this if you have memory concerns, and blocks that were least recently viewed will be purged when the limit is hit. The grid will additionally make sure it has all the blocks needed to display what is currently visible, in case this property is set to a low value.
         * @initial
         * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
         */
    maxBlocksInCache?: number | undefined;
    /** How many requests to hit the server with concurrently. If the max is reached, requests are queued.
         * Set to `-1` for no maximum restriction on requests.
         * @default 2
         * @initial
         * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
         */
    maxConcurrentDatasourceRequests?: number | undefined;
    /** How many milliseconds to wait before loading a block. Useful when scrolling over many blocks, as it prevents blocks loading until scrolling has settled.
         * @initial
         * @agModule `ServerSideRowModelModule` / `InfiniteRowModelModule`
         */
    blockLoadDebounceMillis?: number | undefined;
    /** When enabled, closing group rows will remove children of that row. Next time the row is opened, child rows will be read from the datasource again. This property only applies when there is Row Grouping or Tree Data.
         * @default false
         * @agModule `ServerSideRowModelModule`
         */
    purgeClosedRowNodes?: boolean | undefined;
    /** Provide the `serverSideDatasource` for server side row model.
         * @agModule `ServerSideRowModelModule`
         */
    serverSideDatasource?: IServerSideDatasource | undefined;
    /** When enabled, always refreshes top level groups regardless of which column was sorted. This property only applies when there is Row Grouping & sorting is handled on the server.
         * @default false
         * @agModule `ServerSideRowModelModule`
         */
    serverSideSortAllLevels?: boolean | undefined;
    /** When enabled, sorts fully loaded groups in the browser instead of requesting from the server.
         * @default false
         * @agModule `ServerSideRowModelModule`
         */
    serverSideEnableClientSideSort?: boolean | undefined;
    /** When enabled, only refresh groups directly impacted by a filter. This property only applies when there is Row Grouping & filtering is handled on the server.
         * @default false
         * @initial
         * @agModule `ServerSideRowModelModule`
         */
    serverSideOnlyRefreshFilteredGroups?: boolean | undefined;
    /** Used to split pivot field strings for generating pivot result columns when `pivotResultFields` is provided as part of a `getRows` success.
         * @default '_'
         * @initial
         * @agModule `ServerSideRowModelModule`
         */
    serverSidePivotResultFieldSeparator?: string | undefined;
    /** To use the viewport row model you need to provide the grid with a `viewportDatasource`.
         * @agModule `ViewportRowModelModule`
         */
    viewportDatasource?: IViewportDatasource | undefined;
    /** When using viewport row model, sets the page size for the viewport.
         * @initial
         * @agModule `ViewportRowModelModule`
         */
    viewportRowModelPageSize?: number | undefined;
    /** When using viewport row model, sets the buffer size for the viewport.
         * @initial
         * @agModule `ViewportRowModelModule`
         */
    viewportRowModelBufferSize?: number | undefined;
    /** Set to `true` to always show the horizontal scrollbar.
         * @default false
         */
    alwaysShowHorizontalScroll?: boolean | undefined;
    /** Set to `true` to always show the vertical scrollbar.
         * @default false
         */
    alwaysShowVerticalScroll?: boolean | undefined;
    /** Set to `true` to debounce the vertical scrollbar. Can provide smoother scrolling on slow machines.
         * @default false
         * @initial
         */
    debounceVerticalScrollbar?: boolean | undefined;
    /** Set to `true` to never show the horizontal scroll. This is useful if the grid is aligned with another grid and will scroll when the other grid scrolls. (Should not be used in combination with `alwaysShowHorizontalScroll`.)
         * @default false
         */
    suppressHorizontalScroll?: boolean | undefined;
    /** When `true`, the grid will not scroll to the top when new row data is provided. Use this if you don't want the default behaviour of scrolling to the top every time you load new data.
         * @default false
         */
    suppressScrollOnNewData?: boolean | undefined;
    /** When `true`, the grid will not allow mousewheel / touchpad scroll when popup elements are present.
         * @default false
         */
    suppressScrollWhenPopupsAreOpen?: boolean | undefined;
    /** When `true`, the grid will not use animation frames when drawing rows while scrolling. Use this if and only if the grid is working fast enough on all users machines and you want to avoid the temporarily empty rows.
         *     **Note:** It is not recommended to set suppressAnimationFrame to `true` in most use cases as this can seriously degrade the user experience as all cells are rendered synchronously blocking the UI thread from scrolling.
         * @default false
         * @initial
         */
    suppressAnimationFrame?: boolean | undefined;
    /** If `true`, middle clicks will result in `click` events for cells and rows. Otherwise the browser will use middle click to scroll the grid.<br />**Note:** Not all browsers fire `click` events with the middle button. Most will fire only `mousedown` and `mouseup` events, which can be used to focus a cell, but will not work to call the `onCellClicked` function.
         * @default false
         */
    suppressMiddleClickScrolls?: boolean | undefined;
    /** If `true`, mouse wheel events will be passed to the browser. Useful if your grid has no vertical scrolls and you want the mouse to scroll the browser page.
         * @default false
         * @initial
         */
    suppressPreventDefaultOnMouseWheel?: boolean | undefined;
    /** Tell the grid how wide in pixels the scrollbar is, which is used in grid width calculations. Set only if using non-standard browser-provided scrollbars, so the grid can use the non-standard size in its calculations.
         * @initial
         */
    scrollbarWidth?: number | undefined;
    /** Use the `RowSelectionOptions` object to configure row selection. The string values `'single'` and `'multiple'` are deprecated.
         * @agModule `RowSelectionModule`
         */
    rowSelection?: RowSelectionOptions<TData> | 'single' | 'multiple' | undefined;
    /** Configure cell selection.
         * @agModule `CellSelectionModule`
         */
    cellSelection?: boolean | CellSelectionOptions<TData> | undefined;
    /** Set to `true` to allow multiple rows to be selected using single click.
         * @default false
         * @deprecated v32.2 Use `rowSelection.enableSelectionWithoutKeys` instead
         */
    rowMultiSelectWithClick?: boolean | undefined;
    /** If `true`, rows will not be deselected if you hold down `Ctrl` and click the row or press `Space`.
         * @default false
         * @deprecated v32.2 Use `rowSelection.enableClickSelection` instead
         */
    suppressRowDeselection?: boolean | undefined;
    /** If `true`, row selection won't happen when rows are clicked. Use when you only want checkbox selection.
         * @default false
         * @deprecated v32.2 Use `rowSelection.enableClickSelection` instead
         */
    suppressRowClickSelection?: boolean | undefined;
    /** If `true`, cells won't be focusable. This means keyboard navigation will be disabled for grid cells, but remain enabled in other elements of the grid such as column headers, floating filters, tool panels.
         * @default false
         */
    suppressCellFocus?: boolean | undefined;
    /** If `true`, header cells won't be focusable. This means keyboard navigation will be disabled for grid header cells, but remain enabled in other elements of the grid such as grid cells and tool panels.
         * @default false
         */
    suppressHeaderFocus?: boolean | undefined;
    /** Configure the selection column, used for displaying checkboxes.
         *
         * Note that due to the nature of this column, this type is a subset of `ColDef`, which does not support several normal column features such as editing, pivoting and grouping.
         */
    selectionColumnDef?: SelectionColumnDef | undefined;
    /** Configure the Row Numbers Feature.
         * @default false
         * @agModule `RowNumbersModule`
         */
    rowNumbers?: boolean | RowNumbersOptions | undefined;
    /** If `true`, only a single range can be selected.
         * @default false
         * @deprecated v32.2 Use `cellSelection.suppressMultiRanges` instead
         */
    suppressMultiRangeSelection?: boolean | undefined;
    /** Set to `true` to be able to select the text within cells.
         *
         *     **Note:** When this is set to `true`, the clipboard service is disabled and only selected text is copied.
         * @default false
         */
    enableCellTextSelection?: boolean | undefined;
    /** Set to `true` to enable Range Selection.
         * @default false
         * @deprecated v32.2 Use `cellSelection = true` instead
         * @agModule `CellSelectionModule`
         */
    enableRangeSelection?: boolean | undefined;
    /** Set to `true` to enable the Range Handle.
         * @default false
         * @deprecated v32.2 Use `cellSelection.handle` instead
         */
    enableRangeHandle?: boolean | undefined;
    /** Set to `true` to enable the Fill Handle.
         * @default false
         * @deprecated v32.2 Use `cellSelection.handle` instead
         */
    enableFillHandle?: boolean | undefined;
    /** Set to `'x'` to force the fill handle direction to horizontal, or set to `'y'` to force the fill handle direction to vertical.
         * @default 'xy'
         * @deprecated v32.2 Use `cellSelection.handle.direction` instead
         */
    fillHandleDirection?: 'x' | 'y' | 'xy' | undefined;
    /** Set this to `true` to prevent cell values from being cleared when the Range Selection is reduced by the Fill Handle.
         * @default false
         * @deprecated v32.2 Use `cellSelection.suppressClearOnFillReduction` instead
         */
    suppressClearOnFillReduction?: boolean | undefined;
    /** Array defining the order in which sorting occurs (if sorting is enabled). Values can be `'asc'`, `'desc'` or `null`. For example: `sortingOrder: ['asc', 'desc']`.
         * @default [null, 'asc', 'desc']
         * @deprecated v33 Use `defaultColDef.sortingOrder` instead
         */
    sortingOrder?: SortDirection[] | undefined;
    /** Set to `true` to specify that the sort should take accented characters into account. If this feature is turned on the sort will be slower.
         * @default false
         */
    accentedSort?: boolean | undefined;
    /** Set to `true` to show the 'no sort' icon.
         * @default false
         * @deprecated v33 Use `defaultColDef.unSortIcon` instead
         */
    unSortIcon?: boolean | undefined;
    /** Set to `true` to suppress multi-sort when the user shift-clicks a column header.
         * @default false
         */
    suppressMultiSort?: boolean | undefined;
    /** Set to `true` to always multi-sort when the user clicks a column header, regardless of key presses.
         * @default false
         */
    alwaysMultiSort?: boolean | undefined;
    /** Set to `'ctrl'` to have multi sorting by clicking work using the `Ctrl` (or `Command ⌘` for Mac) key.
         */
    multiSortKey?: 'ctrl' | undefined;
    /** Set to `true` to suppress sorting of un-sorted data to match original row data.
         * @default false
         */
    suppressMaintainUnsortedOrder?: boolean | undefined;
    /** Icons to use inside the grid instead of the grid's default icons.
         * @initial
         */
    icons?: ({
        [key: string]: ((...args: any[]) => any) | string;
    }) | undefined;
    /** Default row height in pixels.
         * @default 25
         */
    rowHeight?: number | undefined;
    /** The style properties to apply to all rows. Set to an object of key (style names) and values (style values).
         * @agModule `RowStyleModule`
         */
    rowStyle?: RowStyle | undefined;
    /** CSS class(es) for all rows. Provide either a string (class name) or array of strings (array of class names).
         * @agModule `RowStyleModule`
         */
    rowClass?: string | string[] | undefined;
    /** Rules which can be applied to include certain CSS classes.
         * @agModule `RowStyleModule`
         */
    rowClassRules?: RowClassRules<TData> | undefined;
    /** Set to `true` to not highlight rows by adding the `ag-row-hover` CSS class.
         * @default false
         */
    suppressRowHoverHighlight?: boolean | undefined;
    /** Uses CSS `top` instead of CSS `transform` for positioning rows. Useful if the transform function is causing issues such as used in row spanning.
         * @default false
         * @initial
         */
    suppressRowTransform?: boolean | undefined;
    /** Set to `true` to highlight columns by adding the `ag-column-hover` CSS class.
         * @default false
         * @agModule `ColumnHoverModule`
         */
    columnHoverHighlight?: boolean | undefined;
    /** Provide a custom `gridId` for this instance of the grid. Value will be set on the root DOM node using the attribute `grid-id` as well as being accessible via the `gridApi.getGridId()` method.
         * @initial
         */
    gridId?: string | undefined;
    /** When enabled, sorts only the rows added/updated by a transaction.
         * @default false
         */
    deltaSort?: boolean | undefined;
    treeDataDisplayType?: TreeDataDisplayType | undefined;
    /** @initial
         */
    enableGroupEdit?: boolean | undefined;
    /** Initial state for the grid. Only read once on initialization. Can be used in conjunction with `api.getState()` to save and restore grid state.
         * @initial
         * @agModule `GridStateModule`
         */
    initialState?: GridState | undefined;
    /** Theme to apply to the grid, or the string "legacy" to opt back into the
         * v32 style of theming where themes were imported as CSS files and applied
         * by setting a class name on the parent element.
         *
         * @default themeQuartz
         */
    theme?: Theme | 'legacy' | undefined;
    /** If your theme uses a font that is available on Google Fonts, pass true to load it from Google's CDN.
         */
    loadThemeGoogleFonts?: boolean | undefined;
    /** The CSS layer that this theme should be rendered onto. If your
         * application loads its styles into a CSS layer, use this to load the grid
         * styles into a previous layer so that application styles can override grid
         * styles.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
         */
    themeCssLayer?: string | undefined;
    /** The nonce attribute to set on style elements added to the document by
         * themes. If "foo" is passed to this property, the grid can use the Content
         * Security Policy `style-src 'nonce-foo'`, instead of the less secure
         * `style-src 'unsafe-inline'`.
         *
         * Note: CSP nonces are global to a page, where a page has multiple grids,
         * every one must have the same styleNonce set.
         */
    styleNonce?: string | undefined;
    /** An element to insert style elements into when injecting styles into the
         * grid. If undefined, styles will be added to the document head for grids
         * rendered in the main document fragment, or to the grid wrapper element
         * for other grids (e.g. those rendered in a shadow DOM or detached from the
         * document).
         *
         * @initial
         */
    themeStyleContainer?: HTMLElement | undefined;
    /** For customising the context menu.
         * @agModule `ContextMenuModule`
         */
    getContextMenuItems?: GetContextMenuItems<TData> | undefined;
    /** For customising the main 'column header' menu.
         * @initial
         * @agModule `ColumnMenuModule`
         */
    getMainMenuItems?: GetMainMenuItems<TData> | undefined;
    /** Allows user to process popups after they are created. Applications can use this if they want to, for example, reposition the popup.
         */
    postProcessPopup?: ((params: PostProcessPopupParams<TData>) => void) | undefined;
    /** Allows the user to process the columns being removed from the pinned section because the viewport is too small to accommodate them.
         * Returns an array of columns to be removed from the pinned areas.
         * @initial
         */
    processUnpinnedColumns?: ((params: ProcessUnpinnedColumnsParams<TData>) => Column[]) | undefined;
    /** Allows you to process cells for the clipboard. Handy if for example you have `Date` objects that need to have a particular format if importing into Excel.
         * @agModule `ClipboardModule`
         */
    processCellForClipboard?: ((params: ProcessCellForExportParams<TData>) => any) | undefined;
    /** Allows you to process header values for the clipboard.
         * @agModule `ClipboardModule`
         */
    processHeaderForClipboard?: ((params: ProcessHeaderForExportParams<TData>) => any) | undefined;
    /** Allows you to process group header values for the clipboard.
         * @agModule `ClipboardModule`
         */
    processGroupHeaderForClipboard?: ((params: ProcessGroupHeaderForExportParams<TData>) => any) | undefined;
    /** Allows you to process cells from the clipboard. Handy if for example you have number fields and want to block non-numbers from getting into the grid.
         * @agModule `ClipboardModule`
         */
    processCellFromClipboard?: ((params: ProcessCellForExportParams<TData>) => any) | undefined;
    /** Allows you to get the data that would otherwise go to the clipboard. To be used when you want to control the 'copy to clipboard' operation yourself.
         * @agModule `ClipboardModule`
         */
    sendToClipboard?: ((params: SendToClipboardParams<TData>) => void) | undefined;
    /** Allows complete control of the paste operation, including cancelling the operation (so nothing happens) or replacing the data with other data.
         * @agModule `ClipboardModule`
         */
    processDataFromClipboard?: ((params: ProcessDataFromClipboardParams<TData>) => string[][] | null) | undefined;
    /** Grid calls this method to know if an external filter is present.
         * @agModule `ExternalFilterModule`
         */
    isExternalFilterPresent?: ((params: IsExternalFilterPresentParams<TData>) => boolean) | undefined;
    /** Should return `true` if external filter passes, otherwise `false`.
         * @agModule `ExternalFilterModule`
         */
    doesExternalFilterPass?: ((node: IRowNode<TData>) => boolean) | undefined;
    /** Callback to be used to customise the chart toolbar items.
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    getChartToolbarItems?: GetChartToolbarItems<TData> | undefined;
    /** Callback to enable displaying the chart in an alternative chart container.
         * @initial
         * @agModule `IntegratedChartsModule`
         */
    createChartContainer?: ((params: ChartRefParams<TData>) => void) | undefined;
    /** Allows overriding the element that will be focused when the grid receives focus from outside elements (tabbing into the grid).
         * @returns `True` if this function should override the grid's default behavior, `False` to allow the grid's default behavior.
         */
    focusGridInnerElement?: ((params: FocusGridInnerElementParams<TData>) => boolean) | undefined;
    /** Allows overriding the default behaviour for when user hits navigation (arrow) key when a header is focused. Return the next Header position to navigate to or `null` to stay on current header.
         */
    navigateToNextHeader?: ((params: NavigateToNextHeaderParams<TData>) => HeaderPosition | null) | undefined;
    /** Allows overriding the default behaviour for when user hits `Tab` key when a header is focused.
         * Return the next header position to navigate to, `true` to stay on the current header,
         * or `false` to let the browser handle the tab behaviour.
         */
    tabToNextHeader?: ((params: TabToNextHeaderParams<TData>) => HeaderPosition | boolean) | undefined;
    /** Allows overriding the default behaviour for when user hits navigation (arrow) key when a cell is focused. Return the next Cell position to navigate to or `null` to stay on current cell.
         */
    navigateToNextCell?: ((params: NavigateToNextCellParams<TData>) => CellPosition | null) | undefined;
    /** Allows overriding the default behaviour for when user hits `Tab` key when a cell is focused.
         * Return the next cell position to navigate to, `true` to stay on the current cell,
         * or `false` to let the browser handle the tab behaviour.
         */
    tabToNextCell?: ((params: TabToNextCellParams<TData>) => CellPosition | boolean) | undefined;
    /** A callback for localising text within the grid.
         * @initial
         * @agModule `LocaleModule`
         */
    getLocaleText?: ((params: GetLocaleTextParams<TData>) => string) | undefined;
    /** Allows overriding what `document` is used. Currently used by Drag and Drop (may extend to other places in the future). Use this when you want the grid to use a different `document` than the one available on the global scope. This can happen if docking out components (something which Electron supports)
         */
    getDocument?: (() => Document) | undefined;
    /** Allows user to format the numbers in the pagination panel, i.e. 'row count' and 'page number' labels. This is for pagination panel only, to format numbers inside the grid's cells (i.e. your data), then use `valueFormatter` in the column definitions.
         * @initial
         * @agModule `PaginationModule`
         */
    paginationNumberFormatter?: ((params: PaginationNumberFormatterParams<TData>) => string) | undefined;
    /** Callback to use when you need access to more then the current column for aggregation.
         * @agModule `RowGroupingModule` / `PivotModule` / `TreeDataModule` / `ServerSideRowModelModule`
         */
    getGroupRowAgg?: ((params: GetGroupRowAggParams<TData>) => any) | undefined;
    /** (Client-side Row Model only) Allows groups to be open by default.
         * @agModule `RowGroupingModule` / `TreeDataModule`
         */
    isGroupOpenByDefault?: ((params: IsGroupOpenByDefaultParams<TData>) => boolean) | undefined;
    /** Allows default sorting of groups.
         * @agModule `RowGroupingModule`
         */
    initialGroupOrderComparator?: ((params: InitialGroupOrderComparatorParams<TData>) => number) | undefined;
    /** Callback for the mutation of the generated pivot result column definitions
         * @agModule `PivotModule`
         */
    processPivotResultColDef?: ((colDef: ColDef<TData>) => void) | undefined;
    /** Callback for the mutation of the generated pivot result column group definitions
         * @agModule `PivotModule`
         */
    processPivotResultColGroupDef?: ((colGroupDef: ColGroupDef<TData>) => void) | undefined;
    /** Callback to be used when working with Tree Data when `treeData = true`.
         * @initial
         * @agModule `TreeDataModule`
         */
    getDataPath?: GetDataPath<TData> | undefined;
    /** Allows setting the child count for a group row.
         * @initial
         * @agModule `ServerSideRowModelModule`
         */
    getChildCount?: ((dataItem: any) => number) | undefined;
    /** Allows providing different params for different levels of grouping.
         * @initial
         * @agModule `ServerSideRowModelModule`
         */
    getServerSideGroupLevelParams?: ((params: GetServerSideGroupLevelParamsParams<TData>) => ServerSideGroupLevelParams) | undefined;
    /** Allows groups to be open by default.
         * @agModule `ServerSideRowModelModule`
         */
    isServerSideGroupOpenByDefault?: ((params: IsServerSideGroupOpenByDefaultParams<TData>) => boolean) | undefined;
    /** Allows cancelling transactions.
         * @agModule `ServerSideRowModelModule`
         */
    isApplyServerSideTransaction?: IsApplyServerSideTransaction<TData> | undefined;
    /** SSRM Tree Data: Allows specifying which rows are expandable.
         * @agModule `ServerSideRowModelModule`
         */
    isServerSideGroup?: IsServerSideGroup | undefined;
    /** SSRM Tree Data: Allows specifying group keys.
         * @agModule `ServerSideRowModelModule`
         */
    getServerSideGroupKey?: GetServerSideGroupKey | undefined;
    /** Return a business key for the node. If implemented, each row in the DOM will have an attribute `row-business-key='abc'` where `abc` is what you return as the business key.
         * This is useful for automated testing, as it provides a way for your tool to identify rows based on unique business keys.
         */
    getBusinessKeyForNode?: ((node: IRowNode<TData>) => string) | undefined;
    /** Provide a pure function that returns a string ID to uniquely identify a given row. This enables the grid to work optimally with data changes and updates.
         * @initial
         */
    getRowId?: GetRowIdFunc<TData> | undefined;
    /** When enabled, getRowId() callback is implemented and new Row Data is set, the grid will disregard all previous rows and treat the new Row Data as new data. As a consequence, all Row State (eg selection, rendered rows) will be reset.
         * @default false
         * @agModule `ClientSideRowModelModule`
         */
    resetRowDataOnUpdate?: boolean | undefined;
    /** Callback fired after the row is rendered into the DOM. Should not be used to initiate side effects.
         */
    processRowPostCreate?: ((params: ProcessRowParams<TData>) => void) | undefined;
    /** Callback to be used to determine which rows are selectable. By default rows are selectable, so return `false` to make a row un-selectable.
         * @deprecated v32.2 Use `rowSelection.isRowSelectable` instead
         */
    isRowSelectable?: IsRowSelectable<TData> | undefined;
    /** Callback to be used with Master Detail to determine if a row should be a master row. If `false` is returned no detail row will exist for this row.
         * @agModule `MasterDetailModule`
         */
    isRowMaster?: IsRowMaster<TData> | undefined;
    /** Callback to fill values instead of simply copying values or increasing number values using linear progression.
         * @deprecated v32.2 Use `cellSelection.handle.setFillValue` instead
         */
    fillOperation?: ((params: FillOperationParams<TData>) => any) | undefined;
    /** Callback to perform additional sorting after the grid has sorted the rows.
         */
    postSortRows?: ((params: PostSortRowsParams<TData>) => void) | undefined;
    /** Callback version of property `rowStyle` to set style for each row individually. Function should return an object of CSS values or undefined for no styles.
         * @agModule `RowStyleModule`
         */
    getRowStyle?: ((params: RowClassParams<TData>) => RowStyle | undefined) | undefined;
    /** Callback version of property `rowClass` to set class(es) for each row individually. Function should return either a string (class name), array of strings (array of class names) or undefined for no class.
         * @agModule `RowStyleModule`
         */
    getRowClass?: ((params: RowClassParams<TData>) => string | string[] | undefined) | undefined;
    /** Callback version of property `rowHeight` to set height for each row individually. Function should return a positive number of pixels, or return `null`/`undefined` to use the default row height.
         */
    getRowHeight?: ((params: RowHeightParams<TData>) => number | undefined | null) | undefined;
    /** Tells the grid if this row should be rendered as full width.
         */
    isFullWidthRow?: ((params: IsFullWidthRowParams<TData>) => boolean) | undefined;
    /** Called by managed drag and drop when rows are dropped on another row.
         * The user can cancel the drop by returning `false` or customize the operation by returning a `IsRowValidDropPositionResult`.
         * @agModule `RowDragModule`
         */
    isRowValidDropPosition?: IsRowValidDropPositionCallback<TData> | undefined;
    'onTool-panel-visible-changed'?: ToolPanelVisibleChangedEvent<TData>;
    'onTool-panel-size-changed'?: ToolPanelSizeChangedEvent<TData>;
    'onColumn-menu-visible-changed'?: ColumnMenuVisibleChangedEvent<TData>;
    'onContext-menu-visible-changed'?: ContextMenuVisibleChangedEvent<TData>;
    'onCut-start'?: CutStartEvent<TData>;
    'onCut-end'?: CutEndEvent<TData>;
    'onPaste-start'?: PasteStartEvent<TData>;
    'onPaste-end'?: PasteEndEvent<TData>;
    'onColumn-visible'?: ColumnVisibleEvent<TData>;
    'onColumn-pinned'?: ColumnPinnedEvent<TData>;
    'onColumn-resized'?: ColumnResizedEvent<TData>;
    'onColumn-moved'?: ColumnMovedEvent<TData>;
    'onColumn-value-changed'?: ColumnValueChangedEvent<TData>;
    'onColumn-pivot-mode-changed'?: ColumnPivotModeChangedEvent<TData>;
    'onColumn-pivot-changed'?: ColumnPivotChangedEvent<TData>;
    'onColumn-group-opened'?: ColumnGroupOpenedEvent<TData>;
    'onNew-columns-loaded'?: NewColumnsLoadedEvent<TData>;
    'onGrid-columns-changed'?: GridColumnsChangedEvent<TData>;
    'onDisplayed-columns-changed'?: DisplayedColumnsChangedEvent<TData>;
    'onVirtual-columns-changed'?: VirtualColumnsChangedEvent<TData>;
    'onColumn-everything-changed'?: ColumnEverythingChangedEvent<TData>;
    'onColumns-reset'?: ColumnsResetEvent<TData>;
    'onColumn-header-mouse-over'?: ColumnHeaderMouseOverEvent<TData>;
    'onColumn-header-mouse-leave'?: ColumnHeaderMouseLeaveEvent<TData>;
    'onColumn-header-clicked'?: ColumnHeaderClickedEvent<TData>;
    'onColumn-header-context-menu'?: ColumnHeaderContextMenuEvent<TData>;
    'onComponent-state-changed'?: ComponentStateChangedEvent<TData>;
    'onCell-value-changed'?: CellValueChangedEvent<TData>;
    'onCell-edit-request'?: CellEditRequestEvent<TData>;
    'onRow-value-changed'?: RowValueChangedEvent<TData>;
    'onCell-editing-started'?: CellEditingStartedEvent<TData>;
    'onCell-editing-stopped'?: CellEditingStoppedEvent<TData>;
    'onRow-editing-started'?: RowEditingStartedEvent<TData>;
    'onRow-editing-stopped'?: RowEditingStoppedEvent<TData>;
    'onBulk-editing-started'?: BulkEditingStartedEvent<TData>;
    'onBulk-editing-stopped'?: BulkEditingStoppedEvent<TData>;
    'onBatch-editing-started'?: BatchEditingStartedEvent<TData>;
    'onBatch-editing-stopped'?: BatchEditingStoppedEvent<TData>;
    'onUndo-started'?: UndoStartedEvent<TData>;
    'onUndo-ended'?: UndoEndedEvent<TData>;
    'onRedo-started'?: RedoStartedEvent<TData>;
    'onRedo-ended'?: RedoEndedEvent<TData>;
    'onCell-selection-delete-start'?: CellSelectionDeleteStartEvent<TData>;
    'onCell-selection-delete-end'?: CellSelectionDeleteEndEvent<TData>;
    'onRange-delete-start'?: RangeDeleteStartEvent<TData>;
    'onRange-delete-end'?: RangeDeleteEndEvent<TData>;
    'onFill-start'?: FillStartEvent<TData>;
    'onFill-end'?: FillEndEvent<TData>;
    'onFilter-opened'?: FilterOpenedEvent<TData>;
    'onFilter-changed'?: FilterChangedEvent<TData>;
    'onFilter-modified'?: FilterModifiedEvent<TData>;
    'onFilter-ui-changed'?: FilterUiChangedEvent<TData>;
    'onFloating-filter-ui-changed'?: FloatingFilterUiChangedEvent<TData>;
    'onAdvanced-filter-builder-visible-changed'?: AdvancedFilterBuilderVisibleChangedEvent<TData>;
    'onFind-changed'?: FindChangedEvent<TData>;
    'onChart-created'?: ChartCreatedEvent<TData>;
    'onChart-range-selection-changed'?: ChartRangeSelectionChangedEvent<TData>;
    'onChart-options-changed'?: ChartOptionsChangedEvent<TData>;
    'onChart-destroyed'?: ChartDestroyedEvent<TData>;
    'onCell-key-down'?: CellKeyDownEvent<TData> | FullWidthCellKeyDownEvent<TData>;
    'onGrid-ready'?: GridReadyEvent<TData>;
    'onGrid-pre-destroyed'?: GridPreDestroyedEvent<TData>;
    'onFirst-data-rendered'?: FirstDataRenderedEvent<TData>;
    'onGrid-size-changed'?: GridSizeChangedEvent<TData>;
    'onModel-updated'?: ModelUpdatedEvent<TData>;
    'onVirtual-row-removed'?: VirtualRowRemovedEvent<TData>;
    'onViewport-changed'?: ViewportChangedEvent<TData>;
    'onBody-scroll'?: BodyScrollEvent<TData>;
    'onBody-scroll-end'?: BodyScrollEndEvent<TData>;
    'onDrag-started'?: DragStartedEvent<TData>;
    'onDrag-stopped'?: DragStoppedEvent<TData>;
    'onDrag-cancelled'?: DragCancelledEvent<TData>;
    'onState-updated'?: StateUpdatedEvent<TData>;
    'onPagination-changed'?: PaginationChangedEvent<TData>;
    'onRow-drag-enter'?: RowDragEnterEvent<TData>;
    'onRow-drag-move'?: RowDragMoveEvent<TData>;
    'onRow-drag-leave'?: RowDragLeaveEvent<TData>;
    'onRow-drag-end'?: RowDragEndEvent<TData>;
    'onRow-drag-cancel'?: RowDragCancelEvent<TData>;
    'onRow-resize-started'?: RowResizeStartedEvent<TData>;
    'onRow-resize-ended'?: RowResizeEndedEvent<TData>;
    'onColumn-row-group-changed'?: ColumnRowGroupChangedEvent<TData>;
    'onRow-group-opened'?: RowGroupOpenedEvent<TData>;
    'onExpand-or-collapse-all'?: ExpandOrCollapseAllEvent<TData>;
    'onPivot-max-columns-exceeded'?: PivotMaxColumnsExceededEvent<TData>;
    'onPinned-row-data-changed'?: PinnedRowDataChangedEvent<TData>;
    'onPinned-rows-changed'?: PinnedRowsChangedEvent<TData>;
    'onRow-data-updated'?: RowDataUpdatedEvent<TData>;
    'onAsync-transactions-flushed'?: AsyncTransactionsFlushedEvent<TData>;
    'onStore-refreshed'?: StoreRefreshedEvent<TData>;
    'onHeader-focused'?: HeaderFocusedEvent<TData>;
    'onCell-clicked'?: CellClickedEvent<TData>;
    'onCell-double-clicked'?: CellDoubleClickedEvent<TData>;
    'onCell-focused'?: CellFocusedEvent<TData>;
    'onCell-mouse-over'?: CellMouseOverEvent<TData>;
    'onCell-mouse-out'?: CellMouseOutEvent<TData>;
    'onCell-mouse-down'?: CellMouseDownEvent<TData>;
    'onRow-clicked'?: RowClickedEvent<TData>;
    'onRow-double-clicked'?: RowDoubleClickedEvent<TData>;
    'onRow-selected'?: RowSelectedEvent<TData>;
    'onSelection-changed'?: SelectionChangedEvent<TData>;
    'onCell-context-menu'?: CellContextMenuEvent<TData>;
    'onRange-selection-changed'?: RangeSelectionChangedEvent<TData>;
    'onCell-selection-changed'?: CellSelectionChangedEvent<TData>;
    'onTooltip-show'?: TooltipShowEvent<TData>;
    'onTooltip-hide'?: TooltipHideEvent<TData>;
    'onSort-changed'?: SortChangedEvent<TData>;
}
export declare function getProps(): {
    gridOptions: any;
    modules: any;
    statusBar: undefined;
    sideBar: undefined;
    suppressContextMenu: undefined;
    preventDefaultOnContextMenu: undefined;
    allowContextMenuWithControlKey: undefined;
    columnMenu: undefined;
    suppressMenuHide: undefined;
    enableBrowserTooltips: undefined;
    tooltipTrigger: undefined;
    tooltipShowDelay: undefined;
    tooltipHideDelay: undefined;
    tooltipMouseTrack: undefined;
    tooltipShowMode: undefined;
    tooltipInteraction: undefined;
    popupParent: undefined;
    copyHeadersToClipboard: undefined;
    copyGroupHeadersToClipboard: undefined;
    clipboardDelimiter: undefined;
    suppressCopyRowsToClipboard: undefined;
    suppressCopySingleCellRanges: undefined;
    suppressLastEmptyLineOnPaste: undefined;
    suppressClipboardPaste: undefined;
    suppressClipboardApi: undefined;
    suppressCutToClipboard: undefined;
    columnDefs: undefined;
    defaultColDef: undefined;
    defaultColGroupDef: undefined;
    columnTypes: undefined;
    dataTypeDefinitions: undefined;
    maintainColumnOrder: undefined;
    enableStrictPivotColumnOrder: undefined;
    suppressFieldDotNotation: undefined;
    headerHeight: undefined;
    groupHeaderHeight: undefined;
    floatingFiltersHeight: undefined;
    pivotHeaderHeight: undefined;
    pivotGroupHeaderHeight: undefined;
    hidePaddedHeaderRows: undefined;
    allowDragFromColumnsToolPanel: undefined;
    suppressMovableColumns: undefined;
    suppressColumnMoveAnimation: undefined;
    suppressMoveWhenColumnDragging: undefined;
    suppressDragLeaveHidesColumns: undefined;
    suppressGroupChangesColumnVisibility: undefined;
    suppressMakeColumnVisibleAfterUnGroup: undefined;
    suppressRowGroupHidesColumns: undefined;
    colResizeDefault: undefined;
    suppressAutoSize: undefined;
    autoSizePadding: undefined;
    skipHeaderOnAutoSize: undefined;
    autoSizeStrategy: undefined;
    components: undefined;
    editType: undefined;
    suppressStartEditOnTab: undefined;
    getFullRowEditValidationErrors: undefined;
    invalidEditValueMode: undefined;
    singleClickEdit: undefined;
    suppressClickEdit: undefined;
    readOnlyEdit: undefined;
    stopEditingWhenCellsLoseFocus: undefined;
    enterNavigatesVertically: undefined;
    enterNavigatesVerticallyAfterEdit: undefined;
    enableCellEditingOnBackspace: undefined;
    undoRedoCellEditing: undefined;
    undoRedoCellEditingLimit: undefined;
    defaultCsvExportParams: undefined;
    suppressCsvExport: undefined;
    defaultExcelExportParams: undefined;
    suppressExcelExport: undefined;
    excelStyles: undefined;
    findSearchValue: undefined;
    findOptions: undefined;
    quickFilterText: undefined;
    cacheQuickFilter: undefined;
    includeHiddenColumnsInQuickFilter: undefined;
    quickFilterParser: undefined;
    quickFilterMatcher: undefined;
    applyQuickFilterBeforePivotOrAgg: undefined;
    excludeChildrenWhenTreeDataFiltering: undefined;
    enableAdvancedFilter: undefined;
    alwaysPassFilter: undefined;
    includeHiddenColumnsInAdvancedFilter: undefined;
    advancedFilterParent: undefined;
    advancedFilterBuilderParams: undefined;
    advancedFilterParams: undefined;
    suppressAdvancedFilterEval: undefined;
    suppressSetFilterByDefault: undefined;
    enableFilterHandlers: undefined;
    filterHandlers: undefined;
    enableCharts: undefined;
    chartThemes: undefined;
    customChartThemes: undefined;
    chartThemeOverrides: undefined;
    chartToolPanelsDef: undefined;
    chartMenuItems: undefined;
    loadingCellRenderer: undefined;
    loadingCellRendererParams: undefined;
    loadingCellRendererSelector: undefined;
    localeText: undefined;
    masterDetail: undefined;
    keepDetailRows: undefined;
    keepDetailRowsCount: undefined;
    detailCellRenderer: undefined;
    detailCellRendererParams: undefined;
    detailRowHeight: undefined;
    detailRowAutoHeight: undefined;
    context: undefined;
    alignedGrids: undefined;
    tabIndex: undefined;
    rowBuffer: undefined;
    valueCache: undefined;
    valueCacheNeverExpires: undefined;
    enableCellExpressions: undefined;
    suppressTouch: undefined;
    suppressFocusAfterRefresh: undefined;
    suppressBrowserResizeObserver: undefined;
    suppressPropertyNamesCheck: undefined;
    suppressChangeDetection: undefined;
    debug: undefined;
    loading: undefined;
    overlayLoadingTemplate: undefined;
    loadingOverlayComponent: undefined;
    loadingOverlayComponentParams: undefined;
    suppressLoadingOverlay: undefined;
    overlayNoRowsTemplate: undefined;
    noRowsOverlayComponent: undefined;
    noRowsOverlayComponentParams: undefined;
    suppressNoRowsOverlay: undefined;
    pagination: undefined;
    paginationPageSize: undefined;
    paginationPageSizeSelector: undefined;
    paginationAutoPageSize: undefined;
    paginateChildRows: undefined;
    suppressPaginationPanel: undefined;
    pivotMode: undefined;
    pivotPanelShow: undefined;
    pivotMaxGeneratedColumns: undefined;
    pivotDefaultExpanded: undefined;
    pivotColumnGroupTotals: undefined;
    pivotRowTotals: undefined;
    pivotSuppressAutoColumn: undefined;
    suppressExpandablePivotGroups: undefined;
    functionsReadOnly: undefined;
    aggFuncs: undefined;
    suppressAggFuncInHeader: undefined;
    alwaysAggregateAtRootLevel: undefined;
    aggregateOnlyChangedColumns: undefined;
    suppressAggFilteredOnly: undefined;
    removePivotHeaderRowWhenSingleValueColumn: undefined;
    animateRows: undefined;
    cellFlashDuration: undefined;
    cellFadeDuration: undefined;
    allowShowChangeAfterFilter: undefined;
    domLayout: undefined;
    ensureDomOrder: undefined;
    enableCellSpan: undefined;
    enableRtl: undefined;
    suppressColumnVirtualisation: undefined;
    suppressMaxRenderedRowRestriction: undefined;
    suppressRowVirtualisation: undefined;
    rowDragManaged: undefined;
    rowDragInsertDelay: undefined;
    suppressRowDrag: undefined;
    suppressMoveWhenRowDragging: undefined;
    rowDragEntireRow: undefined;
    rowDragMultiRow: undefined;
    rowDragText: undefined;
    dragAndDropImageComponent: undefined;
    dragAndDropImageComponentParams: undefined;
    fullWidthCellRenderer: undefined;
    fullWidthCellRendererParams: undefined;
    embedFullWidthRows: undefined;
    groupDisplayType: undefined;
    groupDefaultExpanded: undefined;
    autoGroupColumnDef: undefined;
    groupMaintainOrder: undefined;
    groupSelectsChildren: undefined;
    groupLockGroupColumns: undefined;
    groupAggFiltering: undefined;
    groupTotalRow: undefined;
    grandTotalRow: undefined;
    suppressStickyTotalRow: undefined;
    groupSuppressBlankHeader: undefined;
    groupSelectsFiltered: undefined;
    showOpenedGroup: undefined;
    groupHideParentOfSingleChild: undefined;
    groupRemoveSingleChildren: undefined;
    groupRemoveLowestSingleChildren: undefined;
    groupHideOpenParents: undefined;
    groupAllowUnbalanced: undefined;
    rowGroupPanelShow: undefined;
    groupRowRenderer: undefined;
    groupRowRendererParams: undefined;
    treeData: undefined;
    treeDataChildrenField: undefined;
    treeDataParentIdField: undefined;
    rowGroupPanelSuppressSort: undefined;
    suppressGroupRowsSticky: undefined;
    pinnedTopRowData: undefined;
    pinnedBottomRowData: undefined;
    enableRowPinning: undefined;
    isRowPinnable: undefined;
    isRowPinned: undefined;
    rowModelType: undefined;
    rowData: undefined;
    asyncTransactionWaitMillis: undefined;
    suppressModelUpdateAfterUpdateTransaction: undefined;
    datasource: undefined;
    cacheOverflowSize: undefined;
    infiniteInitialRowCount: undefined;
    serverSideInitialRowCount: undefined;
    suppressServerSideFullWidthLoadingRow: undefined;
    cacheBlockSize: undefined;
    maxBlocksInCache: undefined;
    maxConcurrentDatasourceRequests: undefined;
    blockLoadDebounceMillis: undefined;
    purgeClosedRowNodes: undefined;
    serverSideDatasource: undefined;
    serverSideSortAllLevels: undefined;
    serverSideEnableClientSideSort: undefined;
    serverSideOnlyRefreshFilteredGroups: undefined;
    serverSidePivotResultFieldSeparator: undefined;
    viewportDatasource: undefined;
    viewportRowModelPageSize: undefined;
    viewportRowModelBufferSize: undefined;
    alwaysShowHorizontalScroll: undefined;
    alwaysShowVerticalScroll: undefined;
    debounceVerticalScrollbar: undefined;
    suppressHorizontalScroll: undefined;
    suppressScrollOnNewData: undefined;
    suppressScrollWhenPopupsAreOpen: undefined;
    suppressAnimationFrame: undefined;
    suppressMiddleClickScrolls: undefined;
    suppressPreventDefaultOnMouseWheel: undefined;
    scrollbarWidth: undefined;
    rowSelection: undefined;
    cellSelection: undefined;
    rowMultiSelectWithClick: undefined;
    suppressRowDeselection: undefined;
    suppressRowClickSelection: undefined;
    suppressCellFocus: undefined;
    suppressHeaderFocus: undefined;
    selectionColumnDef: undefined;
    rowNumbers: undefined;
    suppressMultiRangeSelection: undefined;
    enableCellTextSelection: undefined;
    enableRangeSelection: undefined;
    enableRangeHandle: undefined;
    enableFillHandle: undefined;
    fillHandleDirection: undefined;
    suppressClearOnFillReduction: undefined;
    sortingOrder: undefined;
    accentedSort: undefined;
    unSortIcon: undefined;
    suppressMultiSort: undefined;
    alwaysMultiSort: undefined;
    multiSortKey: undefined;
    suppressMaintainUnsortedOrder: undefined;
    icons: undefined;
    rowHeight: undefined;
    rowStyle: undefined;
    rowClass: undefined;
    rowClassRules: undefined;
    suppressRowHoverHighlight: undefined;
    suppressRowTransform: undefined;
    columnHoverHighlight: undefined;
    gridId: undefined;
    deltaSort: undefined;
    treeDataDisplayType: undefined;
    enableGroupEdit: undefined;
    initialState: undefined;
    theme: undefined;
    loadThemeGoogleFonts: undefined;
    themeCssLayer: undefined;
    styleNonce: undefined;
    themeStyleContainer: undefined;
    getContextMenuItems: undefined;
    getMainMenuItems: undefined;
    postProcessPopup: undefined;
    processUnpinnedColumns: undefined;
    processCellForClipboard: undefined;
    processHeaderForClipboard: undefined;
    processGroupHeaderForClipboard: undefined;
    processCellFromClipboard: undefined;
    sendToClipboard: undefined;
    processDataFromClipboard: undefined;
    isExternalFilterPresent: undefined;
    doesExternalFilterPass: undefined;
    getChartToolbarItems: undefined;
    createChartContainer: undefined;
    focusGridInnerElement: undefined;
    navigateToNextHeader: undefined;
    tabToNextHeader: undefined;
    navigateToNextCell: undefined;
    tabToNextCell: undefined;
    getLocaleText: undefined;
    getDocument: undefined;
    paginationNumberFormatter: undefined;
    getGroupRowAgg: undefined;
    isGroupOpenByDefault: undefined;
    initialGroupOrderComparator: undefined;
    processPivotResultColDef: undefined;
    processPivotResultColGroupDef: undefined;
    getDataPath: undefined;
    getChildCount: undefined;
    getServerSideGroupLevelParams: undefined;
    isServerSideGroupOpenByDefault: undefined;
    isApplyServerSideTransaction: undefined;
    isServerSideGroup: undefined;
    getServerSideGroupKey: undefined;
    getBusinessKeyForNode: undefined;
    getRowId: undefined;
    resetRowDataOnUpdate: undefined;
    processRowPostCreate: undefined;
    isRowSelectable: undefined;
    isRowMaster: undefined;
    fillOperation: undefined;
    postSortRows: undefined;
    getRowStyle: undefined;
    getRowClass: undefined;
    getRowHeight: undefined;
    isFullWidthRow: undefined;
    isRowValidDropPosition: undefined;
    'onColumn-everything-changed': undefined;
    'onNew-columns-loaded': undefined;
    'onColumn-pivot-mode-changed': undefined;
    'onPivot-max-columns-exceeded': undefined;
    'onColumn-row-group-changed': undefined;
    'onExpand-or-collapse-all': undefined;
    'onColumn-pivot-changed': undefined;
    'onGrid-columns-changed': undefined;
    'onColumn-value-changed': undefined;
    'onColumn-moved': undefined;
    'onColumn-visible': undefined;
    'onColumn-pinned': undefined;
    'onColumn-group-opened': undefined;
    'onColumn-resized': undefined;
    'onDisplayed-columns-changed': undefined;
    'onVirtual-columns-changed': undefined;
    'onColumn-header-mouse-over': undefined;
    'onColumn-header-mouse-leave': undefined;
    'onColumn-header-clicked': undefined;
    'onColumn-header-context-menu': undefined;
    'onAsync-transactions-flushed': undefined;
    'onRow-group-opened': undefined;
    'onRow-data-updated': undefined;
    'onPinned-row-data-changed': undefined;
    'onPinned-rows-changed': undefined;
    'onRange-selection-changed': undefined;
    'onCell-selection-changed': undefined;
    'onChart-created': undefined;
    'onChart-range-selection-changed': undefined;
    'onChart-options-changed': undefined;
    'onChart-destroyed': undefined;
    'onTool-panel-visible-changed': undefined;
    'onTool-panel-size-changed': undefined;
    'onModel-updated': undefined;
    'onCut-start': undefined;
    'onCut-end': undefined;
    'onPaste-start': undefined;
    'onPaste-end': undefined;
    'onFill-start': undefined;
    'onFill-end': undefined;
    'onCell-selection-delete-start': undefined;
    'onCell-selection-delete-end': undefined;
    'onRange-delete-start': undefined;
    'onRange-delete-end': undefined;
    'onUndo-started': undefined;
    'onUndo-ended': undefined;
    'onRedo-started': undefined;
    'onRedo-ended': undefined;
    'onCell-clicked': undefined;
    'onCell-double-clicked': undefined;
    'onCell-mouse-down': undefined;
    'onCell-context-menu': undefined;
    'onCell-value-changed': undefined;
    'onCell-edit-request': undefined;
    'onRow-value-changed': undefined;
    'onHeader-focused': undefined;
    'onCell-focused': undefined;
    'onRow-selected': undefined;
    'onSelection-changed': undefined;
    'onTooltip-show': undefined;
    'onTooltip-hide': undefined;
    'onCell-key-down': undefined;
    'onCell-mouse-over': undefined;
    'onCell-mouse-out': undefined;
    'onFilter-changed': undefined;
    'onFilter-modified': undefined;
    'onFilter-ui-changed': undefined;
    'onFilter-opened': undefined;
    'onFloating-filter-ui-changed': undefined;
    'onAdvanced-filter-builder-visible-changed': undefined;
    'onSort-changed': undefined;
    'onVirtual-row-removed': undefined;
    'onRow-clicked': undefined;
    'onRow-double-clicked': undefined;
    'onGrid-ready': undefined;
    'onGrid-pre-destroyed': undefined;
    'onGrid-size-changed': undefined;
    'onViewport-changed': undefined;
    'onFirst-data-rendered': undefined;
    'onDrag-started': undefined;
    'onDrag-stopped': undefined;
    'onDrag-cancelled': undefined;
    'onRow-editing-started': undefined;
    'onRow-editing-stopped': undefined;
    'onCell-editing-started': undefined;
    'onCell-editing-stopped': undefined;
    'onBody-scroll': undefined;
    'onBody-scroll-end': undefined;
    'onPagination-changed': undefined;
    'onComponent-state-changed': undefined;
    'onStore-refreshed': undefined;
    'onState-updated': undefined;
    'onColumn-menu-visible-changed': undefined;
    'onContext-menu-visible-changed': undefined;
    'onRow-drag-enter': undefined;
    'onRow-drag-move': undefined;
    'onRow-drag-leave': undefined;
    'onRow-drag-end': undefined;
    'onRow-drag-cancel': undefined;
    'onFind-changed': undefined;
    'onRow-resize-started': undefined;
    'onRow-resize-ended': undefined;
    'onColumns-reset': undefined;
    'onBulk-editing-started': undefined;
    'onBulk-editing-stopped': undefined;
    'onBatch-editing-started': undefined;
    'onBatch-editing-stopped': undefined;
};
export declare const debounce: (func: () => void, delay: number) => () => void;
export declare function deepToRaw<T extends Record<string, any>>(sourceObj: T): T;
