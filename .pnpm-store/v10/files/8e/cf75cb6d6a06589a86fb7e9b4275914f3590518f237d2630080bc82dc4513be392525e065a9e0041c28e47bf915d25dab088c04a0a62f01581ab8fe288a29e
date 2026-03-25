import type { CSSProperties, ExtractPropTypes } from 'vue';
import type { SortOrder } from './constants';
import type { Column, ColumnCommonParams, DataGetter, KeyType, RowCommonParams, SortBy, SortState } from './types';
/**
 * Param types
 */
export declare type ColumnSortParams<T> = {
    column: Column<T>;
    key: KeyType;
    order: SortOrder;
};
/**
 * Renderer/Getter types
 */
export declare type ExtraCellPropGetter<T> = (params: ColumnCommonParams<T> & RowCommonParams & {
    cellData: T;
    rowData: any;
}) => any;
export declare type ExtractHeaderPropGetter<T> = (params: {
    columns: Column<T>[];
    headerIndex: number;
}) => any;
export declare type ExtractHeaderCellPropGetter<T> = (params: ColumnCommonParams<T> & {
    headerIndex: number;
}) => any;
export declare type ExtractRowPropGetter<T> = (params: {
    columns: Column<T>[];
} & RowCommonParams) => any;
export declare type HeaderClassNameGetter<T> = (params: {
    columns: Column<T>[];
    headerIndex: number;
}) => string;
export declare type RowClassNameGetter<T> = (params: {
    columns: Column<T>[];
} & RowCommonParams) => string;
/**
 * Handler types
 */
export declare type ColumnSortHandler<T> = (params: ColumnSortParams<T>) => void;
export declare type ColumnResizeHandler<T> = (column: Column<T>, width: number) => void;
export declare type ExpandedRowsChangeHandler = (expandedRowKeys: KeyType[]) => void;
export declare const tableV2Props: {
    readonly cache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly estimatedRowHeight: {
        readonly default: undefined;
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        readonly __epPropKey: true;
    };
    readonly rowKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => KeyType & {}) | (() => KeyType) | ((new (...args: any[]) => KeyType & {}) | (() => KeyType))[], unknown, unknown, "id", boolean>;
    readonly headerClass: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HeaderClassNameGetter<any>) & {}) | (() => string | HeaderClassNameGetter<any>) | ((new (...args: any[]) => (string | HeaderClassNameGetter<any>) & {}) | (() => string | HeaderClassNameGetter<any>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly headerProps: {
        readonly type: import("vue").PropType<any>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly headerCellProps: {
        readonly type: import("vue").PropType<any>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly headerHeight: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]) | ((new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]))[], unknown, unknown, 50, boolean>;
    readonly footerHeight: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly rowClass: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | RowClassNameGetter<any>) & {}) | (() => string | RowClassNameGetter<any>) | ((new (...args: any[]) => (string | RowClassNameGetter<any>) & {}) | (() => string | RowClassNameGetter<any>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowProps: {
        readonly type: import("vue").PropType<any>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowHeight: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 50, boolean>;
    readonly cellProps: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Record<string, any> | ExtraCellPropGetter<any>) | (() => Record<string, any> | ExtraCellPropGetter<any>) | ((new (...args: any[]) => Record<string, any> | ExtraCellPropGetter<any>) | (() => Record<string, any> | ExtraCellPropGetter<any>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly columns: {
        readonly type: import("vue").PropType<import("./common").AnyColumn[]>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly data: {
        readonly type: import("vue").PropType<any[]>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly dataGetter: {
        readonly type: import("vue").PropType<DataGetter<any>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly fixedData: {
        readonly type: import("vue").PropType<any[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly expandColumnKey: StringConstructor;
    readonly expandedRowKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => KeyType[]) | (() => KeyType[]) | ((new (...args: any[]) => KeyType[]) | (() => KeyType[]))[], unknown, unknown, () => never[], boolean>;
    readonly defaultExpandedRowKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => KeyType[]) | (() => KeyType[]) | ((new (...args: any[]) => KeyType[]) | (() => KeyType[]))[], unknown, unknown, () => never[], boolean>;
    readonly class: StringConstructor;
    readonly fixed: BooleanConstructor;
    readonly style: {
        readonly type: import("vue").PropType<CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly width: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly height: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly maxHeight: NumberConstructor;
    readonly useIsScrolling: BooleanConstructor;
    readonly indentSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
    readonly iconSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
    readonly hScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly vScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly scrollbarAlwaysOn: BooleanConstructor;
    readonly sortBy: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => SortBy) | (() => SortBy) | ((new (...args: any[]) => SortBy) | (() => SortBy))[], unknown, unknown, () => {
        key: KeyType;
        order: SortOrder;
    }, boolean>;
    readonly sortState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => SortState) | (() => SortState) | ((new (...args: any[]) => SortState) | (() => SortState))[], unknown, unknown, undefined, boolean>;
    readonly onColumnSort: {
        readonly type: import("vue").PropType<ColumnSortHandler<any>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onExpandedRowsChange: {
        readonly type: import("vue").PropType<ExpandedRowsChangeHandler>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onEndReached: {
        readonly type: import("vue").PropType<(distance: number) => void>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onRowExpand: {
        readonly type: import("vue").PropType<import("./row").RowExpandHandler>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onScroll: {
        readonly type: import("vue").PropType<(...args: any[]) => void>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onRowsRendered: {
        readonly type: import("vue").PropType<(params: import("./grid").onRowRenderedParams) => void>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowEventHandlers: {
        readonly type: import("vue").PropType<import("./row").RowEventHandlers>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare type TableV2Props = ExtractPropTypes<typeof tableV2Props>;
