import type { SharedThemeParams } from '../../agStack/theming/shared/shared-css';
import type { BorderStyleValue, BorderValue, ColorValue, DurationValue, FontFamilyValue, FontWeightValue, LengthValue, ScaleValue, ShadowValue } from '../../agStack/theming/themeTypes';
/**
 * All possible theme param types - the actual params available will be a subset of this type depending on the parts in use by the theme.
 */
export type CoreParams = CoreThemeParams;
interface CoreThemeParams extends SharedThemeParams {
    /**
     * Color of the dividing line above the buttons in the advanced filter builder
     */
    advancedFilterBuilderButtonBarBorder: BorderValue;
    /**
     * Color of the column pills in the Advanced Filter Builder
     */
    advancedFilterBuilderColumnPillColor: ColorValue;
    /**
     * Amount that each level of the nesting in the advanced filter builder is indented by
     */
    advancedFilterBuilderIndentSize: LengthValue;
    /**
     * Color of the join operator pills in the Advanced Filter Builder
     */
    advancedFilterBuilderJoinPillColor: ColorValue;
    /**
     * Color of the filter option pills in the Advanced Filter Builder
     */
    advancedFilterBuilderOptionPillColor: ColorValue;
    /**
     * Color of the value pills in the Advanced Filter Builder
     */
    advancedFilterBuilderValuePillColor: ColorValue;
    /**
     * Padding at the start and end of grid cells and header cells.
     */
    cellHorizontalPadding: LengthValue;
    /**
     * Multiply the cell horizontal padding by a number, e.g. 1.5 to increase by 50%
     */
    cellHorizontalPaddingScale: ScaleValue;
    /**
     * Color of text in grid cells.
     */
    cellTextColor: ColorValue;
    /**
     * Horizontal spacing between widgets inside cells (e.g. row group expand buttons and row selection checkboxes).
     */
    cellWidgetSpacing: LengthValue;
    /**
     * Color of form field labels within the chart editing panel for integrated charts
     */
    chartMenuLabelColor: ColorValue;
    /**
     * Width of the chart editing panel for integrated charts
     */
    chartMenuPanelWidth: LengthValue;
    /**
     * Vertical borders between columns within the grid only, excluding headers.
     */
    columnBorder: BorderValue;
    /**
     * Background color of the pill shape representing columns in the column drop component
     */
    columnDropCellBackgroundColor: ColorValue;
    /**
     * Text color for the pill shape representing columns in the column drop component
     */
    columnDropCellTextColor: ColorValue;
    /**
     * Color of the drag grip icon in the pill shape representing columns in the column drop component
     */
    columnDropCellDragHandleColor: ColorValue;
    /**
     * Border for the pill shape representing columns in the column drop component
     */
    columnDropCellBorder: BorderValue;
    /**
     * Background color when hovering over columns in the grid. This is not visible unless enabled in the grid options.
     */
    columnHoverColor: ColorValue;
    /**
     * Amount of indentation for each level of children when selecting grouped columns in the column select widget.
     */
    columnSelectIndentSize: LengthValue;
    /**
     * Border color popup dialogs such as the integrated charts and the advanced filter builder.
     */
    dialogBorder: BorderValue;
    /**
     * Shadow for popup dialogs such as the integrated charts and the advanced filter builder.
     */
    dialogShadow: ShadowValue;
    /**
     * Border around cells being edited
     */
    cellEditingBorder: BorderValue;
    /**
     * Shadow for cells being edited
     */
    cellEditingShadow: ShadowValue;
    /**
     * Background color for a row with invalid editor status
     */
    fullRowEditInvalidBackgroundColor: ColorValue;
    /**
     * Color of the drag handle on draggable rows and column markers
     */
    dragHandleColor: ColorValue;
    /**
     * How much to indent child columns in the filters tool panel relative to their parent
     */
    filterToolPanelGroupIndent: LengthValue;
    /**
     * Color of new Filters Tool Panel apply button
     */
    filterPanelApplyButtonColor: ColorValue;
    /**
     * Background color of new Filters Tool Panel apply button
     */
    filterPanelApplyButtonBackgroundColor: ColorValue;
    /**
     * Color of text and UI elements that should stand out less than the default in new Filters Tool Panel
     */
    filterPanelCardSubtleColor: ColorValue;
    /**
     * Color of text and UI elements that should stand out less than the default in new Filters Tool Panel when hovered
     */
    filterPanelCardSubtleHoverColor: ColorValue;
    /**
     * Color of matches used in Find
     */
    findMatchColor: ColorValue;
    /**
     * Background color of matches used in Find
     */
    findMatchBackgroundColor: ColorValue;
    /**
     * Color of the active match used in Find
     */
    findActiveMatchColor: ColorValue;
    /**
     * Background color of the active match used in Find
     */
    findActiveMatchBackgroundColor: ColorValue;
    /**
     * Font size for data in grid rows
     */
    dataFontSize: LengthValue;
    /**
     * Horizontal borders above footer components like the pagination and status bars
     */
    footerRowBorder: BorderValue;
    /**
     * Background color for header and header-like.
     */
    headerBackgroundColor: ColorValue;
    /**
     * Duration in seconds of the background color transition if headerCellHoverBackgroundColor or headerCellMovingBackgroundColor is set.
     */
    headerCellBackgroundTransitionDuration: DurationValue;
    /**
     * Background color of a header cell when hovering over it, or `transparent` for no change.
     */
    headerCellHoverBackgroundColor: ColorValue;
    /**
     * Background color of a header cell when dragging to reposition it, or `transparent` for no change.
     */
    headerCellMovingBackgroundColor: ColorValue;
    /**
     * Vertical borders between columns within headers.
     */
    headerColumnBorder: BorderValue;
    /**
     * Height of the vertical border between column headers. Percentage values are relative to the header height.
     */
    headerColumnBorderHeight: LengthValue;
    /**
     * Color of the drag handle on resizable header columns. Set this to transparent to hide the resize handle.
     */
    headerColumnResizeHandleColor: ColorValue;
    /**
     * Height of the drag handle on resizable header columns. Percentage values are relative to the header height.
     */
    headerColumnResizeHandleHeight: LengthValue;
    /**
     * Width of the drag handle on resizable header columns.
     */
    headerColumnResizeHandleWidth: LengthValue;
    /**
     * Font family of text in the header
     */
    headerFontFamily: FontFamilyValue;
    /**
     * Font family of text in grid cells
     */
    cellFontFamily: FontFamilyValue;
    /**
     * Size of text in the header
     */
    headerFontSize: LengthValue;
    /**
     * Font weight of text in the header
     */
    headerFontWeight: FontWeightValue;
    /**
     * Height of header rows. NOTE: by default this value is calculated to leave enough room for text, icons and padding. Most applications should leave it as is and use rowVerticalPaddingScale to change padding.
     */
    headerHeight: LengthValue;
    /**
     * Borders between and below header rows.
     */
    headerRowBorder: BorderValue;
    /**
     * Color of text in the header
     */
    headerTextColor: ColorValue;
    /**
     * Multiply the header vertical padding by a number, e.g. 1.5 to increase by 50%
     */
    headerVerticalPaddingScale: ScaleValue;
    /**
     * Default color for clickable icons
     */
    iconButtonColor: ColorValue;
    /**
     * Default background color for clickable icons
     */
    iconButtonBackgroundColor: ColorValue;
    /**
     * The distance beyond the border of the clickable icons that the background extends to
     */
    iconButtonBackgroundSpread: LengthValue;
    /**
     * Corner radius of clickable icon background
     */
    iconButtonBorderRadius: LengthValue;
    /**
     * Color of clickable icons when hovered
     */
    iconButtonHoverColor: ColorValue;
    /**
     * Background color for clickable icons when hovered
     */
    iconButtonHoverBackgroundColor: ColorValue;
    /**
     * Color of clickable icon buttons when styled as active. This is used for the column filter button when a filter is applied to the column.
     */
    iconButtonActiveColor: ColorValue;
    /**
     * Background color of clickable icon buttons when styled as active. This is used for the column filter button when a filter is applied to the column.
     */
    iconButtonActiveBackgroundColor: ColorValue;
    /**
     * Color of the marker dot shown on icon buttons when styled as active. This is used for the column filter button when a filter is applied to the column.
     */
    iconButtonActiveIndicatorColor: ColorValue;
    /**
     * Background color for menus e.g. column menu and right-click context menu
     */
    menuBackgroundColor: ColorValue;
    /**
     * Border around menus e.g. column menu and right-click context menu
     */
    menuBorder: BorderValue;
    /**
     * Color of the dividing line between sections of menus e.g. column menu and right-click context menu
     */
    menuSeparatorColor: ColorValue;
    /**
     * Shadow for menus e.g. column menu and right-click context menu
     */
    menuShadow: ShadowValue;
    /**
     * Text color for menus e.g. column menu and right-click context menu
     */
    menuTextColor: ColorValue;
    /**
     * Background color of the overlay shown over the grid e.g. a data loading indicator.
     */
    modalOverlayBackgroundColor: ColorValue;
    /**
     * Background color applied to grid rows
     */
    dataBackgroundColor: ColorValue;
    /**
     * Alternative background colour applied to every other row to create a striped effect
     */
    oddRowBackgroundColor: ColorValue;
    /**
     * Background color for panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelBackgroundColor: ColorValue;
    /**
     * The height of the title bar of panels and dialogs such as the integrated charts panel and the advanced filter builder.
     */
    panelTitleBarHeight: LengthValue;
    /**
     * Background color for the title bar of panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelTitleBarBackgroundColor: ColorValue;
    /**
     * Text color for the title bar of panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelTitleBarTextColor: ColorValue;
    /**
     * Icon color for the title bar of panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelTitleBarIconColor: ColorValue;
    /**
     * Font weight for the title bar of panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelTitleBarFontWeight: FontWeightValue;
    /**
     * Border below the title bar of panels and dialogs such as the integrated charts and the advanced filter builder.
     */
    panelTitleBarBorder: BorderValue;
    /**
     * Vertical borders between columns that are pinned to the left or right and the rest of the grid
     */
    pinnedColumnBorder: BorderValue;
    /**
     * Horizontal borders between the grid and rows that are pinned to the top or bottom and the rest of the grid
     */
    pinnedRowBorder: BorderValue;
    /**
     * Font-weight for the rows that have been pinned to the top or bottom.
     */
    pinnedRowFontWeight: FontWeightValue;
    /**
     * Background color for the rows that have been pinned to the top or bottom.
     */
    pinnedRowBackgroundColor: ColorValue;
    /**
     * Text color for the rows that have been pinned to the top or bottom.
     */
    pinnedRowTextColor: ColorValue;
    /**
     * Text color for row in the main viewport that has been pinned to the top or bottom.
     */
    pinnedSourceRowTextColor: ColorValue;
    /**
     * Background color for the row in the main viewport that has been pinned to the top or bottom.
     */
    pinnedSourceRowBackgroundColor: ColorValue;
    /**
     * Font-weight for the row in the main viewport that has been pinned to the top or bottom.
     */
    pinnedSourceRowFontWeight: FontWeightValue;
    /**
     * Background color of selected cell ranges. Choosing a semi-transparent color ensure that multiple overlapping ranges look correct.
     */
    rangeSelectionBackgroundColor: ColorValue;
    /**
     * The color used for borders around range selections. The selection background defaults to a semi-transparent version of this color.
     */
    rangeSelectionBorderColor: ColorValue;
    /**
     * Border style around range selections.
     */
    rangeSelectionBorderStyle: BorderStyleValue;
    /**
     * Background color for cells that provide data to the current range chart
     */
    rangeSelectionChartBackgroundColor: ColorValue;
    /**
     * Background color for cells that provide categories to the current range chart
     */
    rangeSelectionChartCategoryBackgroundColor: ColorValue;
    /**
     * Background color to briefly apply to a cell range when the user copies from or pastes into it.
     */
    rangeSelectionHighlightColor: ColorValue;
    /**
     * Background color of the grid header when any cell of that header is part of a range. This is not visible unless enabled in the cell selection options.
     */
    rangeHeaderHighlightColor: ColorValue;
    /**
     * Background color of the Row Numbers cells when the range selects all cells for that row.
     */
    rowNumbersSelectedColor: ColorValue;
    /**
     * Horizontal borders between rows.
     */
    rowBorder: BorderValue;
    /**
     * The size of indentation applied to each level of row grouping - deep rows are indented by a multiple of this value.
     */
    rowGroupIndentSize: LengthValue;
    /**
     * Height of grid rows. NOTE: by default this value is calculated to leave enough room for text, icons and padding. Most applications should leave it as is and use rowVerticalPaddingScale to change padding.
     */
    rowHeight: LengthValue;
    /**
     * Height of the pagination panel at the bottom of the grid. Defaults to the higher of rowHeight or 22px.
     */
    paginationPanelHeight: LengthValue;
    /**
     * Background color when hovering over rows in the grid and in dropdown menus. Set to `transparent` to disable the hover effect. Note: if you want a hover effect on one but not the other, use CSS selectors instead of this property.
     */
    rowHoverColor: ColorValue;
    /**
     * Color of the skeleton loading effect used when loading row data with the Server-side Row Model
     */
    rowLoadingSkeletonEffectColor: ColorValue;
    /**
     * Multiply the row vertical padding by a number, e.g. 1.5 to increase by 50%. Has no effect if rowHeight is set.
     */
    rowVerticalPaddingScale: ScaleValue;
    /**
     * Background color for selected items within the multiple select widget
     */
    selectCellBackgroundColor: ColorValue;
    /**
     * Border for selected items within the multiple select widget
     */
    selectCellBorder: BorderValue;
    /**
     * Background color of selected rows in the grid and in dropdown menus.
     */
    selectedRowBackgroundColor: ColorValue;
    /**
     * Amount of indentation for each level of child items in the Set Filter list when filtering tree data.
     */
    setFilterIndentSize: LengthValue;
    /**
     * Background color of the sidebar that contains the columns and filters tool panels
     */
    sideBarBackgroundColor: ColorValue;
    /**
     * Background color of the row of tab buttons at the edge of the sidebar
     */
    sideButtonBarBackgroundColor: ColorValue;
    /**
     * Default width of the sidebar that contains the columns and filters tool panels
     */
    sideBarPanelWidth: LengthValue;
    /**
     * Borders between the grid and side panels including the column and filter tool bars, and chart settings
     */
    sidePanelBorder: BorderValue;
    /**
     * Spacing between the topmost side button and the top of the sidebar
     */
    sideButtonBarTopPadding: LengthValue;
    /**
     * Width of the underline below the selected tab in the sidebar
     */
    sideButtonSelectedUnderlineWidth: LengthValue;
    /**
     * Color of the underline below the selected tab in the sidebar, or 'transparent' to disable the underline effect
     */
    sideButtonSelectedUnderlineColor: ColorValue;
    /**
     * Duration of the transition effect for the underline below the selected tab in the sidebar
     */
    sideButtonSelectedUnderlineTransitionDuration: DurationValue;
    /**
     * Background color of the tab buttons in the sidebar
     */
    sideButtonBackgroundColor: ColorValue;
    /**
     * Text color of the tab buttons in the sidebar
     */
    sideButtonTextColor: ColorValue;
    /**
     * Background color of the tab buttons in the sidebar when hovered
     */
    sideButtonHoverBackgroundColor: ColorValue;
    /**
     * Text color of the tab buttons in the sidebar when hovered
     */
    sideButtonHoverTextColor: ColorValue;
    /**
     * Background color of the selected tab button in the sidebar
     */
    sideButtonSelectedBackgroundColor: ColorValue;
    /**
     * Text color of the selected tab button in the sidebar
     */
    sideButtonSelectedTextColor: ColorValue;
    /**
     * Border drawn above and below tab buttons in the sidebar
     */
    sideButtonBorder: BorderValue;
    /**
     * Border drawn above and below the selected tab button in the sidebar
     */
    sideButtonSelectedBorder: BorderValue;
    /**
     * Padding to the left of the text in tab buttons in the sidebar (this is always the padding on the inward facing side of the button, so in right-to-left layout it will be on the right)
     */
    sideButtonLeftPadding: LengthValue;
    /**
     * Padding to the right of the text in tab buttons in the sidebar (this is always the padding on the outward facing side of the button, so in right-to-left layout it will be on the left)
     */
    sideButtonRightPadding: LengthValue;
    /**
     * Padding above and below the text in tab buttons in the sidebar
     */
    sideButtonVerticalPadding: LengthValue;
    /**
     * The dividing line between sections of menus e.g. column menu and right-click context menu
     */
    toolPanelSeparatorBorder: BorderValue;
    /**
     * Color to temporarily apply to cell data when its value decreases in an agAnimateShowChangeCellRenderer cell
     */
    valueChangeDeltaDownColor: ColorValue;
    /**
     * Color to temporarily apply to cell data when its value increases in an agAnimateShowChangeCellRenderer cell
     */
    valueChangeDeltaUpColor: ColorValue;
    /**
     * Background color to apply when a cell value changes and enableCellChangeFlash is enabled
     */
    valueChangeValueHighlightBackgroundColor: ColorValue;
    /**
     * The horizontal padding of containers that contain stacked widgets, such as menus and tool panels
     */
    widgetContainerHorizontalPadding: LengthValue;
    /**
     * The vertical padding of containers that contain stacked widgets, such as menus and tool panels
     */
    widgetContainerVerticalPadding: LengthValue;
    /**
     * The spacing between widgets in containers arrange widgets horizontally
     */
    widgetHorizontalSpacing: LengthValue;
    /**
     * The spacing between widgets in containers arrange widgets vertically
     */
    widgetVerticalSpacing: LengthValue;
    /**
     * Borders around the outside of the grid
     */
    wrapperBorder: BorderValue;
    /**
     * Corner radius of the outermost container around the grid.
     */
    wrapperBorderRadius: LengthValue;
    /**
     * Text color for labels in the status bar component
     */
    statusBarLabelColor: ColorValue;
    /**
     * Font weight for labels in the status bar component
     */
    statusBarLabelFontWeight: FontWeightValue;
    /**
     * Text color for values in the status bar component
     */
    statusBarValueColor: ColorValue;
    /**
     * Font weight for values in the status bar component
     */
    statusBarValueFontWeight: FontWeightValue;
}
export declare const coreDefaults: Readonly<Omit<CoreThemeParams, keyof SharedThemeParams>>;
export {};
