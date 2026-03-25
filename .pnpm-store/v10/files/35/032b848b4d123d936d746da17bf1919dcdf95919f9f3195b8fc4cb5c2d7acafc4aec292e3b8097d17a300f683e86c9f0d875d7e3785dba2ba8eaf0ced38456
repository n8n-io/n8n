import type { Table, TableProps } from './defaults';
import type { Store } from '../store';
import type TableLayout from '../table-layout';
declare function useStyle<T>(props: TableProps<T>, layout: TableLayout<T>, store: Store<T>, table: Table<T>): {
    isHidden: import("vue").Ref<boolean>;
    renderExpanded: import("vue").Ref<null>;
    setDragVisible: (visible: boolean) => void;
    isGroup: import("vue").Ref<boolean>;
    handleMouseLeave: () => void;
    handleHeaderFooterMousewheel: (event: any, data: any) => void;
    tableSize: import("vue").ComputedRef<"" | "default" | "small" | "large">;
    emptyBlockStyle: import("vue").ComputedRef<{
        width: string;
        height: string;
    } | null>;
    handleFixedMousewheel: (event: any, data: any) => void;
    resizeProxyVisible: import("vue").Ref<boolean>;
    bodyWidth: import("vue").ComputedRef<string>;
    resizeState: import("vue").Ref<{
        width: null | number;
        height: null | number;
        headerHeight: null | number;
    }>;
    doLayout: () => void;
    tableBodyStyles: import("vue").ComputedRef<{
        width: string;
    }>;
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
};
export default useStyle;
