import { RowData, Column, Header, HeaderGroup, Table, TableFeature } from '../types';
export interface CoreHeaderGroup<TData extends RowData> {
    depth: number;
    headers: Header<TData, unknown>[];
    id: string;
}
export interface HeaderContext<TData, TValue> {
    /**
     * An instance of a column.
     */
    column: Column<TData, TValue>;
    /**
     * An instance of a header.
     */
    header: Header<TData, TValue>;
    /**
     * The table instance.
     */
    table: Table<TData>;
}
export interface CoreHeader<TData extends RowData, TValue> {
    /**
     * The col-span for the header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#colspan)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    colSpan: number;
    /**
     * The header's associated column object.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#column)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    column: Column<TData, TValue>;
    /**
     * The depth of the header, zero-indexed based.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#depth)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    depth: number;
    /**
     * Returns the rendering context (or props) for column-based components like headers, footers and filters.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#getcontext)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getContext: () => HeaderContext<TData, TValue>;
    /**
     * Returns the leaf headers hierarchically nested under this header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#getleafheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeafHeaders: () => Header<TData, unknown>[];
    /**
     * The header's associated header group object.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#headergroup)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    headerGroup: HeaderGroup<TData>;
    /**
     * The unique identifier for the header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#id)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    id: string;
    /**
     * The index for the header within the header group.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#index)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    index: number;
    /**
     * A boolean denoting if the header is a placeholder header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#isplaceholder)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    isPlaceholder: boolean;
    /**
     * If the header is a placeholder header, this will be a unique header ID that does not conflict with any other headers across the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#placeholderid)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    placeholderId?: string;
    /**
     * The row-span for the header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#rowspan)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    rowSpan: number;
    /**
     * The header's hierarchical sub/child headers. Will be empty if the header's associated column is a leaf-column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/header#subheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    subHeaders: Header<TData, TValue>[];
}
export interface HeadersInstance<TData extends RowData> {
    /**
     * Returns all header groups for the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getheadergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getHeaderGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the header groups for the left pinned columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftheadergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeftHeaderGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the header groups for columns that are not pinned.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterheadergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getCenterHeaderGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the header groups for the right pinned columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightheadergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getRightHeaderGroups: () => HeaderGroup<TData>[];
    /**
     * Returns the footer groups for the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getfootergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getFooterGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the footer groups for the left pinned columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftfootergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeftFooterGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the footer groups for columns that are not pinned.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterfootergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getCenterFooterGroups: () => HeaderGroup<TData>[];
    /**
     * If pinning, returns the footer groups for the right pinned columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightfootergroups)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getRightFooterGroups: () => HeaderGroup<TData>[];
    /**
     * Returns headers for all columns in the table, including parent headers.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getflatheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getFlatHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all left pinned columns in the table, including parent headers.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftflatheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeftFlatHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all columns that are not pinned, including parent headers.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterflatheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getCenterFlatHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all right pinned columns in the table, including parent headers.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightflatheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getRightFlatHeaders: () => Header<TData, unknown>[];
    /**
     * Returns headers for all leaf columns in the table, (not including parent headers).
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleafheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeafHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all left pinned leaf columns in the table, (not including parent headers).
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getleftleafheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getLeftLeafHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all columns that are not pinned, (not including parent headers).
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getcenterleafheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getCenterLeafHeaders: () => Header<TData, unknown>[];
    /**
     * If pinning, returns headers for all right pinned leaf columns in the table, (not including parent headers).
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/headers#getrightleafheaders)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/headers)
     */
    getRightLeafHeaders: () => Header<TData, unknown>[];
}
export declare const Headers: TableFeature;
export declare function buildHeaderGroups<TData extends RowData>(allColumns: Column<TData, unknown>[], columnsToGroup: Column<TData, unknown>[], table: Table<TData>, headerFamily?: 'center' | 'left' | 'right'): HeaderGroup<TData>[];
