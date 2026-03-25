import type { ColDef } from '../../entities/colDef';
import type { GetCellsParams } from '../../interfaces/iCellsParams';
import type { Column } from '../../interfaces/iColumn';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { IComponent } from '../../interfaces/iComponent';
import type { IRowNode } from '../../interfaces/iRowNode';
export interface ICellRendererParams<TData = any, TValue = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** Value to be rendered. */
    value: TValue | null | undefined;
    /** Formatted value to be rendered. */
    valueFormatted: string | null | undefined;
    /** True if this is a full width row. */
    fullWidth?: boolean;
    /** Pinned state of the cell. */
    pinned?: 'left' | 'right' | null;
    /** The row's data. Data property can be `undefined` when row grouping or loading infinite row models. */
    data: TData | undefined;
    /** The row node. */
    node: IRowNode<TData>;
    /** The cell's column definition. */
    colDef?: ColDef<TData, TValue>;
    /** The cell's column. */
    column?: Column<TValue>;
    /** The grid's cell, a DOM div element. */
    eGridCell: HTMLElement;
    /** The parent DOM item for the cell renderer, same as eGridCell unless using checkbox selection. */
    eParentOfValue: HTMLElement;
    /** Convenience function to get most recent up to data value. */
    getValue?: () => TValue | null | undefined;
    /** Convenience function to set the value. */
    setValue?: (value: TValue | null | undefined) => void;
    /** Convenience function to format a value using the column's formatter. */
    formatValue?: (value: TValue | null | undefined) => string;
    /** Convenience function to refresh the cell. */
    refreshCell?: () => void;
    /**
     * registerRowDragger:
     * @param rowDraggerElement The HTMLElement to be used as Row Dragger
     * @param dragStartPixels The amount of pixels required to start the drag (Default: 4)
     * @param value The value to be displayed while dragging. Note: Only relevant with Full Width Rows.
     * @param suppressVisibilityChange Set to `true` to prevent the Grid from hiding the Row Dragger when it is disabled.
     */
    registerRowDragger: (rowDraggerElement: HTMLElement, dragStartPixels?: number, value?: string, suppressVisibilityChange?: boolean) => void;
    /**
     * Sets a tooltip to the main element of this component.
     * @param value The value to be displayed by the tooltip
     * @param shouldDisplayTooltip A function returning a boolean that allows the tooltip to be displayed conditionally. This option does not work when `enableBrowserTooltips={true}`.
     */
    setTooltip: (value: string, shouldDisplayTooltip?: () => boolean) => void;
}
export interface ISetFilterCellRendererParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    value: any;
    valueFormatted: string | null | undefined;
    /** The cell's column definition. */
    colDef?: ColDef;
    /** The cell's column. */
    column?: Column;
    /**
     * Sets a tooltip to the main element of this component.
     * @param value The value to be displayed by the tooltip
     * @param shouldDisplayTooltip A function returning a boolean that allows the tooltip to be displayed conditionally. This option does not work when `enableBrowserTooltips={true}`.
     */
    setTooltip: (value: string, shouldDisplayTooltip?: () => boolean) => void;
}
export interface ICellRenderer<TData = any> {
    /**
     * Get the cell to refresh. Return true if successful. Return false if not (or you don't have refresh logic),
     * then the grid will refresh the cell for you.
     */
    refresh(params: ICellRendererParams<TData>): boolean;
}
export interface ICellRendererComp<TData = any> extends IComponent<ICellRendererParams<TData>>, ICellRenderer<TData> {
}
export interface ICellRendererFunc<TData = any> {
    (params: ICellRendererParams<TData>): HTMLElement | string;
}
export interface GetCellRendererInstancesParams<TData = any> extends GetCellsParams<TData> {
}
