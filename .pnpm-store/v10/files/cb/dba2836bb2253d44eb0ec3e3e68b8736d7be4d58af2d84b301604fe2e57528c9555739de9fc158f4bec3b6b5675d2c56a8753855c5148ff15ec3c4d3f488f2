export type FilterSpec = {
    source: 'filter-toolpanel';
    colLabel?: string | null;
} | {
    source: 'column-filter';
    colId?: string | null;
} | {
    source: 'floating-filter';
    colId?: string | null;
};
export declare const agTestIdFor: {
    grid(gridId: string): string;
    /** Headers */
    headerGroupCell(colId: string | null): string;
    headerCell(colId: string | null): string;
    headerCheckbox(colId: string | null): string;
    headerFilterButton(colId: string | null): string;
    floatingFilter(colId: string | null): string;
    floatingFilterButton(colId: string | null): string;
    headerCellMenuButton(colId: string | null): string;
    headerResizeHandle(colId?: string | null): string;
    /** Column Filters */
    filterInstancePickerDisplay(spec: FilterSpec): string;
    numberFilterInstanceInput(spec: FilterSpec): string;
    textFilterInstanceInput(spec: FilterSpec): string;
    dateFilterInstanceInput(spec: FilterSpec): string;
    setFilterInstanceMiniFilterInput(spec: FilterSpec): string;
    setFilterInstanceItem(spec: FilterSpec, itemLabel?: string | null): string;
    setFilterApplyPanelButton(spec: FilterSpec, buttonLabel?: string | null): string;
    filterConditionRadioButton(spec: FilterSpec, buttonLabel?: string | null): string;
    /** Advanced Filter */
    advancedFilterInput(): string;
    advancedFilterButton(label?: string | null): string;
    advancedFilterBuilderButton(): string;
    advancedFilterPanelMaximiseButton(): string;
    advancedFilterPanelCloseButton(): string;
    advancedFilterPill(label?: string | null): string;
    advancedFilterBuilderAddItemButton(): string;
    /** Rows */
    rowNode(rowId: string | null): string;
    /** Cells */
    cell(rowId: string | null, colId: string | null): string;
    autoGroupCell(rowId: string | null): string;
    checkbox(rowId: string | null, colId: string | null): string;
    selectionColumnCheckbox(rowId: string | null): string;
    autoGroupColumnCheckbox(rowId: string | null): string;
    dragHandle(rowId: string | null, colId: string | null): string;
    groupContracted(rowId: string | null, colId: string | null): string;
    groupExpanded(rowId: string | null, colId: string | null): string;
    autoGroupContracted(rowId: string | null): string;
    autoGroupExpanded(rowId: string | null): string;
    rowNumber(rowId: string | null): string;
    /** Menu */
    menu(): string;
    menuOption(option?: string | null): string;
    /** SideBar */
    sideBar(): string;
    sideBarButton(label?: string | null): string;
    /** Column Tool Panel */
    columnToolPanel(): string;
    pivotModeSelect(): string;
    columnPanelSelectHeaderCheckbox(): string;
    columnPanelSelectHeaderFilter(): string;
    columnSelectListItemGroupClosedIcon(label?: string | null): string;
    columnSelectListItemCheckbox(label?: string | null): string;
    columnSelectListItemDragHandle(label?: string | null): string;
    columnDropCellDragHandle(source: 'panel' | 'toolbar', area?: string | null, label?: string | null): string;
    columnDropCellCancelButton(source: 'panel' | 'toolbar', area?: string | null, label?: string | null): string;
    columnDropArea(source: 'panel' | 'toolbar', name?: string | null): string;
    /** Filter Tool Panel (New) */
    filterToolPanel(): string;
    filterToolPanelAddFilterButton(): string;
    filterToolPanelFilterTypeSelector(colLabel?: string | null): string;
    /** Filter Tool Panel (Old) */
    filterToolPanelSearchInput(): string;
    filterToolPanelGroup(title?: string | null): string;
    filterToolPanelGroupCollapsedIcon(title?: string | null): string;
    /** Status Bar */
    statusBarTotalAndFilteredRowCount(): string;
    statusBarTotalRowCount(): string;
    statusBarFilteredRowCount(): string;
    statusBarSelectedRowCount(): string;
    statusBarAggregations(): string;
    /** Pagination */
    paginationPanelSizePickerDisplay(value?: string | null): string;
    paginationPanelFirstRowOnPage(value?: string | null): string;
    paginationPanelLastRowOnPage(value?: string | null): string;
    paginationPanelRecordCount(value?: string | null): string;
    paginationSummaryPanelButton(label?: string | null): string;
    paginationSummaryPanelCurrentPage(value?: string | null): string;
    paginationSummaryPanelTotalPage(value?: string | null): string;
    /** Fill Handle */
    fillHandle(): string;
    /** Column Chooser */
    columnChooserCloseButton(): string;
    columnChooserSearchBarCheckbox(): string;
    columnChooserSearchBarFilter(): string;
    columnChooserListItemGroupClosedIcon(label: string | null): string;
    columnChooserListItemCheckbox(label: string | null): string;
    columnChooserListItemDragHandle(label: string | null): string;
    /** Overlay */
    overlay(): string;
};
type AgTestIds = typeof agTestIdFor;
type Locators<TLocator> = {
    [P in keyof AgTestIds]: (...args: Parameters<AgTestIds[P]>) => TLocator;
};
/**
 * Utility function to wrap the agTestIdFor functions to a specific testing framework to reduce code duplication and improve readability.
 *
 * @param fn - A function that takes a string and returns a locator for that string.
 * @returns Same functions as agTestIdFor, but returning a locator instead of a string.
 *
 * @example
 * // Playwright
 * // Before
 * await expect(page.getByTestId(agTestIdFor.rowNode('0'))).toBeVisible();
 * await expect(page.getByTestId(agTestIdFor.cell('0', 'color'))).toBeVisible();
 *
 * // After
 * const agIdFor = wrapAgTestIdFor((testId) => page.getByTestId(testId));
 *
 * await expect(agIdFor.rowNode('0')).toBeVisible();
 * await expect(agIdFor.cell('0', 'color')).toBeVisible();
 */
export declare const wrapAgTestIdFor: <TLocator>(fn: (str: string) => TLocator) => Locators<TLocator>;
export {};
