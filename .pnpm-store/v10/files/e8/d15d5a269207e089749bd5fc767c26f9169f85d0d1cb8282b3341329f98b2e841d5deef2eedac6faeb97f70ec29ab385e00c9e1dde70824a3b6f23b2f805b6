import type { ComputedRef } from 'vue';
import type { TableColumnCtx } from './defaults';
declare function useRender<T>(props: TableColumnCtx<T>, slots: any, owner: ComputedRef<any>): {
    columnId: import("vue").Ref<string>;
    realAlign: import("vue").Ref<string | undefined>;
    isSubColumn: import("vue").Ref<boolean>;
    realHeaderAlign: import("vue").Ref<string | undefined>;
    columnOrTableParent: ComputedRef<any>;
    setColumnWidth: (column: TableColumnCtx<T>) => TableColumnCtx<T>;
    setColumnForcedProps: (column: TableColumnCtx<T>) => TableColumnCtx<T>;
    setColumnRenders: (column: TableColumnCtx<T>) => TableColumnCtx<T>;
    getPropsData: (...propsKey: unknown[]) => unknown;
    getColumnElIndex: (children: any, child: any) => number;
    updateColumnOrder: () => void;
};
export default useRender;
