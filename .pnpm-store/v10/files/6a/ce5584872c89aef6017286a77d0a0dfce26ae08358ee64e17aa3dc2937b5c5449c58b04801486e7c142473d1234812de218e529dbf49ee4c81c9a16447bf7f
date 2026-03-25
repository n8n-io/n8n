import TableLayout from './table-layout';
import type { Table } from './table/defaults';
declare const _default: import("vue").DefineComponent<{
    data: {
        type: import("vue").PropType<any[]>;
        default: () => never[];
    };
    size: {
        readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
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
    rowKey: import("vue").PropType<string | ((row: any) => string) | undefined>;
    showHeader: {
        type: BooleanConstructor;
        default: boolean;
    };
    showSummary: BooleanConstructor;
    sumText: StringConstructor;
    summaryMethod: import("vue").PropType<import("./table/defaults").SummaryMethod<any> | undefined>;
    rowClassName: import("vue").PropType<import("./table/defaults").ColumnCls<any> | undefined>;
    rowStyle: import("vue").PropType<import("./table/defaults").ColumnStyle<any> | undefined>;
    cellClassName: import("vue").PropType<import("./table/defaults").CellCls<any> | undefined>;
    cellStyle: import("vue").PropType<import("./table/defaults").CellStyle<any> | undefined>;
    headerRowClassName: import("vue").PropType<import("./table/defaults").ColumnCls<any> | undefined>;
    headerRowStyle: import("vue").PropType<import("./table/defaults").ColumnStyle<any> | undefined>;
    headerCellClassName: import("vue").PropType<import("./table/defaults").CellCls<any> | undefined>;
    headerCellStyle: import("vue").PropType<import("./table/defaults").CellStyle<any> | undefined>;
    highlightCurrentRow: BooleanConstructor;
    currentRowKey: (NumberConstructor | StringConstructor)[];
    emptyText: StringConstructor;
    expandRowKeys: import("vue").PropType<any[] | undefined>;
    defaultExpandAll: BooleanConstructor;
    defaultSort: import("vue").PropType<import("./table/defaults").Sort | undefined>;
    tooltipEffect: StringConstructor;
    tooltipOptions: import("vue").PropType<Partial<Pick<import("../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
    spanMethod: import("vue").PropType<((data: {
        row: any;
        rowIndex: number;
        column: import("./table-column/defaults").TableColumnCtx<any>;
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
        type: import("vue").PropType<{
            hasChildren?: string | undefined;
            children?: string | undefined;
        } | undefined>;
        default: () => {
            hasChildren: string;
            children: string;
        };
    };
    lazy: BooleanConstructor;
    load: import("vue").PropType<((row: any, treeNode: import("./table/defaults").TreeNode, resolve: (data: any[]) => void) => void) | undefined>;
    style: {
        type: import("vue").PropType<import("vue").CSSProperties>;
        default: () => {};
    };
    className: {
        type: StringConstructor;
        default: string;
    };
    tableLayout: {
        type: import("vue").PropType<"auto" | "fixed">;
        default: string;
    };
    scrollbarAlwaysOn: {
        type: BooleanConstructor;
        default: boolean;
    };
    flexible: BooleanConstructor;
    showOverflowTooltip: import("vue").PropType<boolean | Partial<Pick<import("../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
}, {
    ns: {
        namespace: import("vue").ComputedRef<string>;
        b: (blockSuffix?: string) => string;
        e: (element?: string | undefined) => string;
        m: (modifier?: string | undefined) => string;
        be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
        em: (element?: string | undefined, modifier?: string | undefined) => string;
        bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
        bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
        is: {
            (name: string, state: boolean | undefined): string;
            (name: string): string;
        };
        cssVar: (object: Record<string, string>) => Record<string, string>;
        cssVarName: (name: string) => string;
        cssVarBlock: (object: Record<string, string>) => Record<string, string>;
        cssVarBlockName: (name: string) => string;
    };
    layout: TableLayout<any>;
    store: any;
    handleHeaderFooterMousewheel: (event: any, data: any) => void;
    handleMouseLeave: () => void;
    tableId: string;
    tableSize: import("vue").ComputedRef<"" | "default" | "small" | "large">;
    isHidden: import("vue").Ref<boolean>;
    isEmpty: import("vue").ComputedRef<boolean>;
    renderExpanded: import("vue").Ref<null>;
    resizeProxyVisible: import("vue").Ref<boolean>;
    resizeState: import("vue").Ref<{
        width: number | null;
        height: number | null;
        headerHeight: number | null;
    }>;
    isGroup: import("vue").Ref<boolean>;
    bodyWidth: import("vue").ComputedRef<string>;
    tableBodyStyles: import("vue").ComputedRef<{
        width: string;
    }>;
    emptyBlockStyle: import("vue").ComputedRef<{
        width: string;
        height: string;
    } | null>;
    debouncedUpdateLayout: import("lodash").DebouncedFunc<() => void>;
    handleFixedMousewheel: (event: any, data: any) => void;
    setCurrentRow: (row: any) => void;
    getSelectionRows: () => any;
    toggleRowSelection: (row: any, selected: boolean) => void;
    clearSelection: () => void;
    clearFilter: (columnKeys?: string[] | undefined) => void;
    toggleAllSelection: () => void;
    toggleRowExpansion: (row: any, expanded?: boolean | undefined) => void;
    clearSort: () => void;
    doLayout: () => void;
    sort: (prop: string, order: string) => void;
    t: import("element-plus/es/hooks").Translator;
    setDragVisible: (visible: boolean) => void;
    context: Table<any>;
    computedSumText: import("vue").ComputedRef<string>;
    computedEmptyText: import("vue").ComputedRef<string>;
    tableLayout: import("vue").ComputedRef<("auto" | "fixed") | undefined>;
    scrollbarViewStyle: {
        display: string;
        verticalAlign: string;
    };
    tableInnerStyle: import("vue").ComputedRef<{
        height: string | number;
        maxHeight?: undefined;
    } | {
        maxHeight: string | number;
        height?: undefined;
    } | {
        height?: undefined;
        maxHeight?: undefined;
    }>;
    scrollbarStyle: import("vue").ComputedRef<{
        height: string;
        maxHeight?: undefined;
    } | {
        maxHeight: string;
        height?: undefined;
    } | {
        height?: undefined;
        maxHeight?: undefined;
    }>;
    scrollBarRef: import("vue").Ref<any>;
    scrollTo: (options: number | ScrollToOptions, yCoord?: number | undefined) => void;
    setScrollLeft: (left?: number | undefined) => void;
    setScrollTop: (top?: number | undefined) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("select" | "select-all" | "expand-change" | "current-change" | "selection-change" | "cell-mouse-enter" | "cell-mouse-leave" | "cell-contextmenu" | "cell-click" | "cell-dblclick" | "row-click" | "row-contextmenu" | "row-dblclick" | "header-click" | "header-contextmenu" | "sort-change" | "filter-change" | "header-dragend")[], "select" | "select-all" | "expand-change" | "current-change" | "selection-change" | "cell-mouse-enter" | "cell-mouse-leave" | "cell-contextmenu" | "cell-click" | "cell-dblclick" | "row-click" | "row-contextmenu" | "row-dblclick" | "header-click" | "header-contextmenu" | "sort-change" | "filter-change" | "header-dragend", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    data: {
        type: import("vue").PropType<any[]>;
        default: () => never[];
    };
    size: {
        readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
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
    rowKey: import("vue").PropType<string | ((row: any) => string) | undefined>;
    showHeader: {
        type: BooleanConstructor;
        default: boolean;
    };
    showSummary: BooleanConstructor;
    sumText: StringConstructor;
    summaryMethod: import("vue").PropType<import("./table/defaults").SummaryMethod<any> | undefined>;
    rowClassName: import("vue").PropType<import("./table/defaults").ColumnCls<any> | undefined>;
    rowStyle: import("vue").PropType<import("./table/defaults").ColumnStyle<any> | undefined>;
    cellClassName: import("vue").PropType<import("./table/defaults").CellCls<any> | undefined>;
    cellStyle: import("vue").PropType<import("./table/defaults").CellStyle<any> | undefined>;
    headerRowClassName: import("vue").PropType<import("./table/defaults").ColumnCls<any> | undefined>;
    headerRowStyle: import("vue").PropType<import("./table/defaults").ColumnStyle<any> | undefined>;
    headerCellClassName: import("vue").PropType<import("./table/defaults").CellCls<any> | undefined>;
    headerCellStyle: import("vue").PropType<import("./table/defaults").CellStyle<any> | undefined>;
    highlightCurrentRow: BooleanConstructor;
    currentRowKey: (NumberConstructor | StringConstructor)[];
    emptyText: StringConstructor;
    expandRowKeys: import("vue").PropType<any[] | undefined>;
    defaultExpandAll: BooleanConstructor;
    defaultSort: import("vue").PropType<import("./table/defaults").Sort | undefined>;
    tooltipEffect: StringConstructor;
    tooltipOptions: import("vue").PropType<Partial<Pick<import("../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
    spanMethod: import("vue").PropType<((data: {
        row: any;
        rowIndex: number;
        column: import("./table-column/defaults").TableColumnCtx<any>;
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
        type: import("vue").PropType<{
            hasChildren?: string | undefined;
            children?: string | undefined;
        } | undefined>;
        default: () => {
            hasChildren: string;
            children: string;
        };
    };
    lazy: BooleanConstructor;
    load: import("vue").PropType<((row: any, treeNode: import("./table/defaults").TreeNode, resolve: (data: any[]) => void) => void) | undefined>;
    style: {
        type: import("vue").PropType<import("vue").CSSProperties>;
        default: () => {};
    };
    className: {
        type: StringConstructor;
        default: string;
    };
    tableLayout: {
        type: import("vue").PropType<"auto" | "fixed">;
        default: string;
    };
    scrollbarAlwaysOn: {
        type: BooleanConstructor;
        default: boolean;
    };
    flexible: BooleanConstructor;
    showOverflowTooltip: import("vue").PropType<boolean | Partial<Pick<import("../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
}>> & {
    onSelect?: ((...args: any[]) => any) | undefined;
    "onExpand-change"?: ((...args: any[]) => any) | undefined;
    "onCurrent-change"?: ((...args: any[]) => any) | undefined;
    "onSelect-all"?: ((...args: any[]) => any) | undefined;
    "onSelection-change"?: ((...args: any[]) => any) | undefined;
    "onCell-mouse-enter"?: ((...args: any[]) => any) | undefined;
    "onCell-mouse-leave"?: ((...args: any[]) => any) | undefined;
    "onCell-contextmenu"?: ((...args: any[]) => any) | undefined;
    "onCell-click"?: ((...args: any[]) => any) | undefined;
    "onCell-dblclick"?: ((...args: any[]) => any) | undefined;
    "onRow-click"?: ((...args: any[]) => any) | undefined;
    "onRow-contextmenu"?: ((...args: any[]) => any) | undefined;
    "onRow-dblclick"?: ((...args: any[]) => any) | undefined;
    "onHeader-click"?: ((...args: any[]) => any) | undefined;
    "onHeader-contextmenu"?: ((...args: any[]) => any) | undefined;
    "onSort-change"?: ((...args: any[]) => any) | undefined;
    "onFilter-change"?: ((...args: any[]) => any) | undefined;
    "onHeader-dragend"?: ((...args: any[]) => any) | undefined;
}, {
    style: import("vue").CSSProperties;
    className: string;
    border: boolean;
    tableLayout: "auto" | "fixed";
    data: any[];
    fit: boolean;
    lazy: boolean;
    scrollbarAlwaysOn: boolean;
    stripe: boolean;
    treeProps: {
        hasChildren?: string | undefined;
        children?: string | undefined;
    } | undefined;
    showHeader: boolean;
    showSummary: boolean;
    highlightCurrentRow: boolean;
    defaultExpandAll: boolean;
    selectOnIndeterminate: boolean;
    indent: number;
    flexible: boolean;
}>;
export default _default;
