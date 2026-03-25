import type { IRowNode } from './iRowNode';
export interface IViewportDatasource {
    /** Gets called exactly once before viewPort is used. Passes methods to be used to tell viewPort of data loads / changes. */
    init(params: IViewportDatasourceParams): void;
    /** Tell the viewport what the scroll position of the grid is, so it knows what rows it has to get. */
    setViewportRange(firstRow: number, lastRow: number): void;
    /** Gets called once when viewPort is no longer used. If you need to do any cleanup, do it here. */
    destroy?(): void;
}
export interface IViewportDatasourceParams {
    /** Datasource calls this method when the total row count changes. This in turn sets the height of the grids vertical scroll. */
    setRowCount: (count: number, keepRenderedRows?: boolean) => void;
    /** Datasource calls this when new data arrives. The grid then updates the provided rows. The rows are mapped [rowIndex]=>rowData].*/
    setRowData: (rowData: {
        [key: number]: any;
    }) => void;
    /** Datasource calls this when it wants a row node - typically used when it wants to update the row node. */
    getRow: (rowIndex: number) => IRowNode;
}
