import type { CSSProperties, ComponentInternalInstance, PropType, Ref, VNode } from 'vue';
import type { ComponentSize } from 'element-plus/es/constants';
import type { Nullable } from 'element-plus/es/utils';
import type { Store } from '../store';
import type { TableColumnCtx } from '../table-column/defaults';
import type TableLayout from '../table-layout';
import type { TableOverflowTooltipOptions } from '../util';
export declare type DefaultRow = any;
interface TableRefs {
    tableWrapper: HTMLElement;
    headerWrapper: HTMLElement;
    footerWrapper: HTMLElement;
    fixedBodyWrapper: HTMLElement;
    rightFixedBodyWrapper: HTMLElement;
    bodyWrapper: HTMLElement;
    appendWrapper: HTMLElement;
    [key: string]: any;
}
interface TableState {
    isGroup: Ref<boolean>;
    resizeState: Ref<{
        width: any;
        height: any;
    }>;
    doLayout: () => void;
    debouncedUpdateLayout: () => void;
}
declare type HoverState<T> = Nullable<{
    cell: HTMLElement;
    column: TableColumnCtx<T>;
    row: T;
}>;
declare type RIS<T> = {
    row: T;
    $index: number;
    store: Store<T>;
    expanded: boolean;
};
declare type RenderExpanded<T> = ({ row, $index, store, expanded: boolean, }: RIS<T>) => VNode;
declare type SummaryMethod<T> = (data: {
    columns: TableColumnCtx<T>[];
    data: T[];
}) => string[];
interface Table<T> extends ComponentInternalInstance {
    $ready: boolean;
    hoverState?: HoverState<T>;
    renderExpanded: RenderExpanded<T>;
    store: Store<T>;
    layout: TableLayout<T>;
    refs: TableRefs;
    tableId: string;
    state: TableState;
}
declare type ColumnCls<T> = string | ((data: {
    row: T;
    rowIndex: number;
}) => string);
declare type ColumnStyle<T> = CSSProperties | ((data: {
    row: T;
    rowIndex: number;
}) => CSSProperties);
declare type CellCls<T> = string | ((data: {
    row: T;
    rowIndex: number;
    column: TableColumnCtx<T>;
    columnIndex: number;
}) => string);
declare type CellStyle<T> = CSSProperties | ((data: {
    row: T;
    rowIndex: number;
    column: TableColumnCtx<T>;
    columnIndex: number;
}) => CSSProperties);
declare type Layout = 'fixed' | 'auto';
interface TableProps<T> {
    data: T[];
    size?: ComponentSize;
    width?: string | number;
    height?: string | number;
    maxHeight?: string | number;
    fit?: boolean;
    stripe?: boolean;
    border?: boolean;
    rowKey?: string | ((row: T) => string);
    context?: Table<T>;
    showHeader?: boolean;
    showSummary?: boolean;
    sumText?: string;
    summaryMethod?: SummaryMethod<T>;
    rowClassName?: ColumnCls<T>;
    rowStyle?: ColumnStyle<T>;
    cellClassName?: CellCls<T>;
    cellStyle?: CellStyle<T>;
    headerRowClassName?: ColumnCls<T>;
    headerRowStyle?: ColumnStyle<T>;
    headerCellClassName?: CellCls<T>;
    headerCellStyle?: CellStyle<T>;
    highlightCurrentRow?: boolean;
    currentRowKey?: string | number;
    emptyText?: string;
    expandRowKeys?: any[];
    defaultExpandAll?: boolean;
    defaultSort?: Sort;
    tooltipEffect?: string;
    tooltipOptions?: TableOverflowTooltipOptions;
    spanMethod?: (data: {
        row: T;
        rowIndex: number;
        column: TableColumnCtx<T>;
        columnIndex: number;
    }) => number[] | {
        rowspan: number;
        colspan: number;
    } | undefined;
    selectOnIndeterminate?: boolean;
    indent?: number;
    treeProps?: {
        hasChildren?: string;
        children?: string;
    };
    lazy?: boolean;
    load?: (row: T, treeNode: TreeNode, resolve: (data: T[]) => void) => void;
    className?: string;
    style?: CSSProperties;
    tableLayout?: Layout;
    scrollbarAlwaysOn?: boolean;
    flexible?: boolean;
    showOverflowTooltip?: boolean | TableOverflowTooltipOptions;
}
interface Sort {
    prop: string;
    order: 'ascending' | 'descending';
    init?: any;
    silent?: any;
}
interface Filter<T> {
    column: TableColumnCtx<T>;
    values: string[];
    silent: any;
}
interface TreeNode {
    expanded?: boolean;
    loading?: boolean;
    noLazyChildren?: boolean;
    indent?: number;
    level?: number;
    display?: boolean;
}
interface RenderRowData<T> {
    store: Store<T>;
    _self: Table<T>;
    column: TableColumnCtx<T>;
    row: T;
    $index: number;
    treeNode?: TreeNode;
    expanded: boolean;
}
declare const _default: {
    data: {
        type: PropType<any[]>;
        default: () => never[];
    };
    size: {
        readonly type: PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    width: (NumberConstructor | StringConstructor)[];
    height: (NumberConstructor | StringConstructor)[];
    maxHeight: (NumberConstructor | StringConstructor)[];
    fit: {
        type: BooleanConstructor;
        default: boolean;
    };
    stripe: BooleanConstructor;
    border: BooleanConstructor;
    rowKey: PropType<string | ((row: any) => string) | undefined>;
    showHeader: {
        type: BooleanConstructor;
        default: boolean;
    };
    showSummary: BooleanConstructor;
    sumText: StringConstructor;
    summaryMethod: PropType<SummaryMethod<any> | undefined>;
    rowClassName: PropType<ColumnCls<any> | undefined>;
    rowStyle: PropType<ColumnStyle<any> | undefined>;
    cellClassName: PropType<CellCls<any> | undefined>;
    cellStyle: PropType<CellStyle<any> | undefined>;
    headerRowClassName: PropType<ColumnCls<any> | undefined>;
    headerRowStyle: PropType<ColumnStyle<any> | undefined>;
    headerCellClassName: PropType<CellCls<any> | undefined>;
    headerCellStyle: PropType<CellStyle<any> | undefined>;
    highlightCurrentRow: BooleanConstructor;
    currentRowKey: (NumberConstructor | StringConstructor)[];
    emptyText: StringConstructor;
    expandRowKeys: PropType<any[] | undefined>;
    defaultExpandAll: BooleanConstructor;
    defaultSort: PropType<Sort | undefined>;
    tooltipEffect: StringConstructor;
    tooltipOptions: PropType<Partial<Pick<import("../../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
    spanMethod: PropType<((data: {
        row: any;
        rowIndex: number;
        column: TableColumnCtx<any>;
        columnIndex: number;
    }) => number[] | {
        rowspan: number;
        colspan: number;
    } | undefined) | undefined>;
    selectOnIndeterminate: {
        type: BooleanConstructor;
        default: boolean;
    };
    indent: {
        type: NumberConstructor;
        default: number;
    };
    treeProps: {
        type: PropType<{
            hasChildren?: string | undefined;
            children?: string | undefined;
        } | undefined>;
        default: () => {
            hasChildren: string;
            children: string;
        };
    };
    lazy: BooleanConstructor;
    load: PropType<((row: any, treeNode: TreeNode, resolve: (data: any[]) => void) => void) | undefined>;
    style: {
        type: PropType<CSSProperties>;
        default: () => {};
    };
    className: {
        type: StringConstructor;
        default: string;
    };
    tableLayout: {
        type: PropType<Layout>;
        default: string;
    };
    scrollbarAlwaysOn: {
        type: BooleanConstructor;
        default: boolean;
    };
    flexible: BooleanConstructor;
    showOverflowTooltip: PropType<boolean | Partial<Pick<import("../../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
};
export default _default;
export type { SummaryMethod, Table, TableProps, TableRefs, ColumnCls, ColumnStyle, CellCls, CellStyle, TreeNode, RenderRowData, Sort, Filter, TableColumnCtx, };
