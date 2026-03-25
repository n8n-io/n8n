import type { Column } from '../interfaces/iColumn';
import type { ExportFileNameGetter, ExportParams } from './exportParams';
import type { AgGridCommon } from './iCommon';
import type { IRowNode } from './iRowNode';
import type { XmlElement } from './iXmlFactory';
export interface ExcelStyle {
    /** The id of the Excel Style, this should match a CSS cell class. */
    id: string;
    /** Use this property to customise cell alignment properties. */
    alignment?: ExcelAlignment;
    /** Use this property to customise cell borders. */
    borders?: ExcelBorders;
    /** Use this property to specify the type of data being exported. */
    dataType?: ExcelDataType;
    /** Use this property to customise the font used in the cell. */
    font?: ExcelFont;
    /** Use this property to customise the cell background. */
    interior?: ExcelInterior;
    /** Use this property to customise the cell value as a formatted number. */
    numberFormat?: ExcelNumberFormat;
    /** Use this property to setup cell protection. */
    protection?: ExcelProtection;
}
export interface ExcelAlignment {
    /**
     * Use this property to change the cell horizontal alignment.
     * @default 'Automatic'
     */
    horizontal?: 'Automatic' | 'Left' | 'Center' | 'Right' | 'Fill' | 'Justify' | 'CenterAcrossSelection' | 'Distributed' | 'JustifyDistributed';
    /**
     * Use this property to change the level of indentation in the cell.
     * @default 0
     */
    indent?: number;
    /**
     * Use this property to change the cell reading order.
     * @default 'LeftToRight'
     */
    readingOrder?: 'RightToLeft' | 'LeftToRight' | 'Context';
    /**
     * The number of degrees between 0 and 359 to rotate the text.
     * @default 0
     */
    rotate?: number;
    /**
     * If set to `true`, the font size of the cell will automatically change to force the text to fit within the cell.
     * @default false
     */
    shrinkToFit?: boolean;
    /**
     * Use this property to change the cell vertical alignment.
     * @default 'Automatic'
     */
    vertical?: 'Automatic' | 'Top' | 'Bottom' | 'Center' | 'Justify' | 'Distributed' | 'JustifyDistributed';
    /**
     * If set to `true`, multiline text will be displayed as multiline by Excel.
     * @default false
     */
    wrapText?: boolean;
}
export interface ExcelBorders {
    /** Use to set the cell's bottom border. */
    borderBottom?: ExcelBorder;
    /** Use to set the cell's left border. */
    borderLeft?: ExcelBorder;
    /** Use to set the cell's right border. */
    borderRight?: ExcelBorder;
    /** Use to set the cell's top border. */
    borderTop?: ExcelBorder;
}
export interface ExcelBorder {
    /**
     * The color or the border.
     * @default 'black'
     */
    color?: string;
    /**
     * The style of the border.
     * @default 'None'
     */
    lineStyle?: 'None' | 'Continuous' | 'Dash' | 'Dot' | 'DashDot' | 'DashDotDot' | 'SlantDashDot' | 'Double';
    /**
     * The thickness of the border from 0 (thin) to 3 (thick).
     * @default 0
     */
    weight?: 0 | 1 | 2 | 3;
}
export interface ExcelFont {
    /**
     * Set to `true` to set the cell text to bold.
     * @default false
     */
    bold?: boolean;
    /**
     * The color of the cell font.
     * @default '#000000'
     */
    color?: string;
    /**
     * The family of the font to used in the cell.
     * Options: `Automatic`,`Roman`,`Swiss`,`Modern`,`Script`,`Decorative`,
     * @default 'Automatic'
     */
    family?: string;
    /**
     * The name of the font to be used in the cell.
     * @default 'Calibri'
     */
    fontName?: string;
    /**
     * Set to `true` to display the cell font as italic.
     * @default false
     */
    italic?: boolean;
    /**
     * Set to `true` to add a text outline.
     * @default false
     */
    outline?: boolean;
    /**
     * Set to `true` to add text shadow.
     * @default false
     */
    shadow?: boolean;
    /**
     * Set this property to used a different font size other than the default.
     */
    size?: number;
    /**
     * Set to `true` to add a strikeThrough line.
     * @default false
     */
    strikeThrough?: boolean;
    /**
     * Use this property to underline the cell text.
     */
    underline?: 'Single' | 'Double';
    /** Use this property to change the default font alignment. Note: This is different than setting cell vertical alignment. */
    verticalAlign?: 'Superscript' | 'Subscript';
}
export interface ExcelInterior {
    /** Use this property to set background color patterns. */
    pattern: 'None' | 'Solid' | 'Gray75' | 'Gray50' | 'Gray25' | 'Gray125' | 'Gray0625' | 'HorzStripe' | 'VertStripe' | 'ReverseDiagStripe' | 'DiagStripe' | 'DiagCross' | 'ThickDiagCross' | 'ThinHorzStripe' | 'ThinVertStripe' | 'ThinReverseDiagStripe' | 'ThinDiagStripe' | 'ThinHorzCross' | 'ThinDiagCross';
    /** The colour to be used as a secondary colour combined with patterns. */
    color?: string;
    /** The pattern color. */
    patternColor?: string;
}
export interface ExcelNumberFormat {
    /** Use this property to provide a pattern to format a number. (eg. 10000 could become $10,000.00). */
    format: string;
}
export interface ExcelProtection {
    /**
     * Set to `false` to disable cell protection (locking)
     * @default true
     */
    protected: boolean;
    /**
     * Set to `true` to hide formulas within protected cells.
     * @default false
     */
    hideFormula: boolean;
}
export interface ExcelWorksheet {
    name: string;
    table: ExcelTable;
}
export interface ExcelTable {
    columns: ExcelColumn[];
    rows: ExcelRow[];
}
export interface ExcelColumn {
    min?: number;
    max?: number;
    outlineLevel?: number;
    width?: number;
    s?: number;
    hidden?: boolean;
    bestFit?: boolean;
    displayName?: string;
    filterAllowed?: boolean;
}
export interface ExcelRow {
    /** Collapsed state. */
    collapsed?: boolean;
    /** Hidden state. */
    hidden?: boolean;
    /** The height of the row. */
    height?: number;
    /** The indentation level if the current row is part of a row group. */
    outlineLevel?: number;
    /** An array of ExcelCells. */
    cells: ExcelCell[];
}
export interface ExcelCell {
    /** The data that will be added to the cell. */
    data?: ExcelData;
    /** Cell reference. */
    ref?: string;
    /** Collapsible ranges. */
    collapsibleRanges?: number[][];
    /** The ExcelStyle id to be associated with the cell. */
    styleId?: string | string[];
    /**
     * The number of cells to span across (1 means span 2 columns).
     * @default 0
     */
    mergeAcross?: number;
}
export interface ExcelImagePosition {
    /** The row containing this image. This property is set automatically, don't change it unless you know what you are doing. */
    row?: number;
    /**
     * The amount of rows this image will cover.
     * @default 1
     *  */
    rowSpan?: number;
    /** The column containing this image. This property is set automatically, don't change it unless you know what you are doing. */
    column?: number;
    /**
     * The amount of columns this image will cover.
     * @default 1
     */
    colSpan?: number;
    /**
     * The amount in pixels the image should be offset horizontally.
     * @default 0
     */
    offsetX?: number;
    /**
     * The amount in pixels the image should be offset vertically.
     * @default 0
     */
    offsetY?: number;
}
interface BaseImage {
    /**
     * The image `id`. This field is required so the same image doesn't get imported multiple times.
     */
    id: string;
    /**
     * A base64 string that represents the image being imported.
     */
    base64: string;
    /** The type of image being exported. */
    imageType: 'jpg' | 'png' | 'gif';
    /** Alt Text for the image. */
    altText?: string;
}
export interface ExcelHeaderFooterImage extends BaseImage {
    /** Set this property to select a preset that changes the appearance of the image. */
    recolor?: 'Grayscale' | 'Black & White' | 'Washout';
    /** The width of the image in pixels. */
    width: number;
    /** The height of the image in pixels. */
    height: number;
    /** The brightness of the image between 0 and 100 (if `recolor` is used, this value will only be applied for `Grayscale`). Default 50 */
    brightness: number;
    /** The contrast of the image between 0 and 100. (If `recolor` is used, this value will only be applied for `Grayscale`.). Default 50 */
    contrast: number;
}
export interface ExcelImage extends BaseImage {
    /**
     * If set to `true`, the image will cover the whole cell that is being imported to.
     * This property does not apply to images in the Header/Footer
     * @default false
     */
    fitCell?: boolean;
    /**
     * Set a value between 0 - 100 that will indicate the percentage of transparency of the image.
     * @default 0
     */
    transparency?: number;
    /**
     * Set a value between 0 - 359 that will indicate the number of degrees to rotate the image clockwise.
     * @default 0
     */
    rotation?: number;
    /** Set this property to select a preset that changes the appearance of the image. */
    recolor?: 'Grayscale' | 'Sepia' | 'Washout';
    /** The width of the image in pixels. If this value is not selected, `fitCell` will be automatically set to true. */
    width?: number;
    /** The height of the image in pixels. If this value is not selected, `fitCell` will be automatically set to true. */
    height?: number;
    /** Position of the image. */
    position?: ExcelImagePosition;
}
export type ExcelDataType = 'String' | 'Formula' | 'Number' | 'Boolean' | 'DateTime' | 'Error';
export type ExcelOOXMLDataType = 'str' | 's' | 'f' | 'inlineStr' | 'n' | 'b' | 'd' | 'e' | 'empty';
export interface ExcelData {
    /** The type of data being in the cell. */
    type: ExcelDataType | ExcelOOXMLDataType;
    /** The value of the cell. */
    value: string | null;
}
export interface ExcelRelationship {
    Id: string;
    Type: string;
    Target: string;
}
export interface ExcelContentType {
    name: 'Default' | 'Override';
    ContentType: string;
    Extension?: string;
    PartName?: string;
}
export interface ExcelOOXMLTemplate {
    getTemplate(config?: any, idx?: number, currentSheet?: number): XmlElement;
    convertType?(type: string): string;
}
export type ExcelFactoryMode = 'SINGLE_SHEET' | 'MULTI_SHEET';
export interface ExcelSheetNameGetterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
}
export type ExcelSheetNameGetter = (params?: ExcelSheetNameGetterParams) => string;
export interface ExcelFreezeRowsGetterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** Row node. */
    node?: IRowNode<TData>;
}
export interface ExcelFreezeColumnsGetterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    column: Column;
}
export type ExcelFreezeRowsGetter = (params: ExcelFreezeRowsGetterParams) => boolean;
export type ExcelFreezeColumnsGetter = (params: ExcelFreezeColumnsGetterParams) => boolean;
export interface ColumnWidthCallbackParams {
    column: Column | null;
    index: number;
}
export interface RowHeightCallbackParams {
    rowIndex: number;
}
export interface ExcelWorksheetConfigParams {
    /**
     * If set to `true`, this will try to convert any cell that starts with `=` to a formula, instead of setting the cell value as regular string that starts with `=`.
     * @default false
     */
    autoConvertFormulas?: boolean;
    /**
     * Defines the default column width. If no value is present, each column will have value currently set in the application with a min value of 75px. This property can also be supplied a callback function that returns a number.
     */
    columnWidth?: number | ((params: ColumnWidthCallbackParams) => number);
    /**
     * The height in pixels of header rows. Defaults to Excel default value. This property can also be supplied a callback function that returns a number.
     */
    headerRowHeight?: number | ((params: RowHeightCallbackParams) => number);
    /**
     * The height in pixels of all rows. Defaults to Excel default value. This property can also be supplied a callback function that returns a number.
     */
    rowHeight?: number | ((params: RowHeightCallbackParams) => number);
    /**
     * The name of the sheet in Excel where the grid will be exported. Either a string or a function that returns a
     * string can be used. If a function is used, it will be called once before the export starts.
     * There is a max limit of 31 characters per sheet name.
     * @default 'ag-grid'
     */
    sheetName?: string | ExcelSheetNameGetter;
    /**
     * The configuration for header and footers.
     */
    headerFooterConfig?: ExcelHeaderFooterConfig;
    /**
     * The Excel document page margins. Relevant for printing.
     */
    margins?: ExcelSheetMargin;
    /**
     * Allows you to setup the page orientation and size.
     */
    pageSetup?: ExcelSheetPageSetup;
    /**
     * Used to add an Excel table to the spreadsheet.
     * Set to `true` to use default export table config, or provide a config object.
     *
     * @default false
     **/
    exportAsExcelTable?: boolean | ExcelTableConfig;
    /**
     * The expand/collapse state of each row group in the Excel Document.
     *  - expanded: All row groups will be expanded by default.
     *  - collapsed: All row groups will be collapsed by default.
     *  - match: The row groups will match their current state in the Grid.
     * @default 'expanded'
     */
    rowGroupExpandState?: 'expanded' | 'collapsed' | 'match';
    /**
     * If `true`, the outline (controls to expand and collapse) for Row Groups will not be added automatically to the Excel Document.
     * @default false.
     */
    suppressRowOutline?: boolean;
    /**
     * If `true`, the outline (controls to expand and collapse) for Group Columns will not be added automatically to the Excel Document.
     * @default false.
     */
    suppressColumnOutline?: boolean;
    /**
     * Use this property to select to freeze rows at the top of the exported sheet.
     * - `headers`  - Freeze all grid headers at the top.
     * - `headersAndPinnedRows` - Freeze all headers and pinned top rows.
     * - A callback function that will freeze rows until a value other than `true` is returned, after that, this callback will no longer be executed. Note that using a callback will automatically freeze all header rows.
     */
    freezeRows?: 'headers' | 'headersAndPinnedRows' | ExcelFreezeRowsGetter;
    /**
     * Use this property to select to freeze columns at the start of the grid (this will be the columns at the right for RTL).
     * - `pinned`  - Freeze all pinned left (right for RTL grids) columns.
     * - A callback function that will freeze columns until a value other than `true` is returned. After that, this callback will no longer be executed.
     */
    freezeColumns?: 'pinned' | ExcelFreezeColumnsGetter;
    /**
     * Use to set the direction for the worksheet.
     * - `true`: Sets the direction to right-to-left (RTL).
     * - `false`:  Sets the direction to left-to-right (LTR).
     * - `undefined`: Exports the worksheet according to the current direction of the grid as set by `gridOptions.enableRtl`.
     * @default undefined
     */
    rightToLeft?: boolean;
    /**
     * Use to export an image for the gridCell in question.
     */
    addImageToCell?: (rowIndex: number, column: Column, value: string) => {
        image: ExcelImage;
        value?: string;
    } | undefined;
}
interface ExcelFileParams {
    /**
     * String to use as the file name or a function that returns a string.
     * @default 'export.xlsx'
     */
    fileName?: string | ExportFileNameGetter;
    /**
     * The author of the exported file.
     * @default "AG Grid"
     * */
    author?: string;
    /**
     * The default value for the font size of the Excel document.
     * @default 11
     */
    fontSize?: number;
    /**
     * The mimeType of the Excel file.
     * @default 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
     */
    mimeType?: string;
}
export interface ExcelExportParams extends ExcelFileParams, ExcelWorksheetConfigParams, ExportParams<ExcelRow[]> {
}
export interface ExcelExportMultipleSheetParams extends ExcelFileParams {
    /**
     * Array of strings containing the raw data for Excel workbook sheets.
     * This property is only used when exporting to multiple sheets using `api.exportMultipleSheetsAsExcel()` and the data for each sheet is obtained by calling `api.getSheetDataForExcel()`.
     */
    data: string[];
    /**
     * The index of the sheet to be marked as active by default.
     * @default 0
     */
    activeSheetIndex?: number;
}
export interface ExcelHeaderFooterConfig {
    /** The configuration for header and footer on every page. */
    all?: ExcelHeaderFooter;
    /** The configuration for header and footer on the first page only. */
    first?: ExcelHeaderFooter;
    /** The configuration for header and footer on even numbered pages only. */
    even?: ExcelHeaderFooter;
}
type ExcelHeader = {
    /** An array of maximum 3 items (`Left`, `Center`, `Right`), containing header configurations. */
    header: ExcelHeaderFooterContent[];
};
type ExcelFooter = {
    /** An array of maximum 3 items (`Left`, `Center`, `Right`), containing footer configurations. */
    footer: ExcelHeaderFooterContent[];
};
export type ExcelHeaderFooter = ExcelFooter | ExcelHeader | (ExcelFooter & ExcelHeader);
export interface ExcelHeaderFooterContent {
    /** The value of the text to be included in the header. */
    value: string;
    /**
     * When value is `&[Picture]`, this should be used as the referenced image.
     */
    image?: ExcelHeaderFooterImage;
    /**
     * Configures where the text should be added: `Left`, `Center` or `Right`.
     * @default 'Left'
     */
    position?: 'Left' | 'Center' | 'Right';
    /** The font style of the header/footer value. */
    font?: ExcelFont;
}
export interface IExcelCreator {
    getDataAsExcel(params?: ExcelExportParams): Blob | string | undefined;
    getSheetDataForExcel(params?: ExcelExportParams): string;
    getMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams): Blob | undefined;
    exportDataAsExcel(params?: ExcelExportParams): void;
    exportMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams): void;
    /** private methods */
    setFactoryMode(factoryMode: ExcelFactoryMode): void;
    getFactoryMode(): ExcelFactoryMode;
}
export interface ExcelSheetMargin {
    /**
     * The sheet top margin.
     * @default 0.75
     */
    top?: number;
    /**
     * The sheet right margin.
     * @default 0.7
     */
    right?: number;
    /**
     * The sheet bottom margin.
     * @default 0.75
     */
    bottom?: number;
    /**
     * The sheet left margin.
     * @default 0.7
     */
    left?: number;
    /**
     * The sheet header margin.
     * @default 0.3
     */
    header?: number;
    /**
     * The sheet footer margin.
     * @default 0.3
     */
    footer?: number;
}
export interface ExcelSheetPageSetup {
    /**
     * Use this property to change the print orientation.
     * @default 'Portrait'
     */
    orientation?: 'Portrait' | 'Landscape';
    /**
     * Use this property to set the sheet size.
     * @default 'Letter'
     */
    pageSize?: 'Letter' | 'Letter Small' | 'Tabloid' | 'Ledger' | 'Legal' | 'Statement' | 'Executive' | 'A3' | 'A4' | 'A4 Small' | 'A5' | 'A6' | 'B4' | 'B5' | 'Folio' | 'Envelope' | 'Envelope DL' | 'Envelope C5' | 'Envelope B5' | 'Envelope C3' | 'Envelope C4' | 'Envelope C6' | 'Envelope Monarch' | 'Japanese Postcard' | 'Japanese Double Postcard';
}
export interface ExcelTableConfig {
    /**
     * This property is used to set the table name. It should be an alphanumeric string with no special characters.
     * @default 'AG-GRID-TABLE'
     */
    name?: string;
    /**
     * Set this property to `false` to disable the filter button at the exported Excel table header.
     * Set it to `true` to show the filter button on all columns.
     * Set it to `match` to show the filter button only if the column has a filter allowed.
     *
     * @default match
     */
    showFilterButton?: boolean | 'match';
    /**
     * Set this property to `false` to hide the row stripes.
     *
     * @default true
     */
    showRowStripes?: boolean;
    /**
     * Set this property to `true` to show column stripes.
     *
     * @default false
     */
    showColumnStripes?: boolean;
    /**
     * Set this property to `true` to show the first column in bold/highlighted style.
     *
     * @default false
     */
    highlightFirstColumn?: boolean;
    /**
     * Set this property to `true` to show the last column in bold/highlighted style.
     *
     * @default false
     */
    highlightLastColumn?: boolean;
}
export {};
