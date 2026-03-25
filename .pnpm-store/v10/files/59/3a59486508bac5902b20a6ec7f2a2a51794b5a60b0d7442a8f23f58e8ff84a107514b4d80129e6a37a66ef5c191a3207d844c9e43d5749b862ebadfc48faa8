import type { DetailGridInfo, GridApi } from '../api/gridApi';
import type { Bean } from '../context/bean';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ICellRendererParams } from '../rendering/cellRenderers/iCellRenderer';
import type { RowCtrl } from '../rendering/row/rowCtrl';
import type { RefreshModelParams } from './iClientSideRowModel';
import type { FindDetailGridCellRendererParams } from './iFind';
import type { IRowNode } from './iRowNode';
export interface IDetailCellRenderer<TData = any> {
    toggleCss(cssClassName: string, on: boolean): void;
    toggleDetailGridCss(cssClassName: string, on: boolean): void;
    setDetailGrid(gridOptions: GridOptions<TData>): void;
    setRowData(rowData: TData[]): void;
    getGui(): HTMLElement;
}
export interface IDetailCellRendererParams<TData = any, TDetail = any> extends ICellRendererParams<TData>, FindDetailGridCellRendererParams<TData> {
    /**
     * Provide Grid Options to use for the Detail Grid.
     */
    detailGridOptions: GridOptions<TDetail>;
    /** A function that provides what rows to display in the Detail Grid. */
    getDetailRowData: GetDetailRowData<TData, TDetail>;
    /** Defines how to refresh the Detail Grids as data is changing in the Master Grid. */
    refreshStrategy: 'rows' | 'everything' | 'nothing';
    /** Allows changing the template used around the Detail Grid. */
    template: string | TemplateFunc<TData>;
    /** @deprecated v32.2 This property is no longer used */
    agGridReact: any;
    /** @deprecated v32.2 This property is no longer used */
    frameworkComponentWrapper: any;
    pinned: 'left' | 'right' | null | undefined;
}
export interface GetDetailRowData<TData = any, TDetail = any> {
    (params: GetDetailRowDataParams<TData, TDetail>): void;
}
export interface GetDetailRowDataParams<TData = any, TDetail = any> {
    /** Row node for the details request. */
    node: IRowNode<TData>;
    /** Data for the current row. */
    data: TData;
    /** Success callback: pass the rows back for the grid request.  */
    successCallback(rowData: TDetail[]): void;
}
interface TemplateFunc<TData = any> {
    (params: ICellRendererParams<TData>): string;
}
export interface IDetailCellRendererCtrl extends Bean {
    init(comp: IDetailCellRenderer, params: IDetailCellRendererParams): void;
    registerDetailWithMaster(api: GridApi): void;
    refresh(): boolean;
}
export interface IMasterDetailService {
    store: {
        [id: string]: DetailGridInfo | undefined;
    };
    setupDetailRowAutoHeight(rowCtrl: RowCtrl, eDetailGui: HTMLElement): void;
    /** Used by flatten stage to get or create a detail node from a master node */
    getDetail(masterNode: RowNode): RowNode | null;
    refreshModel(params: RefreshModelParams): void;
}
export {};
