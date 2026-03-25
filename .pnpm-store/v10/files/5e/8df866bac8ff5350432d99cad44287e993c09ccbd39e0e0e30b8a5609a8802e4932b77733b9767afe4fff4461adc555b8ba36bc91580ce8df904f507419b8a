import type { ComponentInternalInstance, PropType, Ref } from 'vue';
import type { Sort } from '../table/defaults';
import type { Store } from '../store';
export interface TableHeader extends ComponentInternalInstance {
    state: {
        onColumnsChange: any;
        onScrollableChange: any;
    };
    filterPanels: Ref<unknown>;
}
export interface TableHeaderProps<T> {
    fixed: string;
    store: Store<T>;
    border: boolean;
    defaultSort: Sort;
}
declare const _default: import("vue").DefineComponent<{
    fixed: {
        type: StringConstructor;
        default: string;
    };
    store: {
        required: true;
        type: PropType<any>;
    };
    border: BooleanConstructor;
    defaultSort: {
        type: PropType<Sort>;
        default: () => {
            prop: string;
            order: string;
        };
    };
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
    filterPanels: Ref<{}>;
    onColumnsChange: (layout: import("../table-layout").default<any>) => void;
    onScrollableChange: (layout: import("../table-layout").default<any>) => void;
    columnRows: import("vue").ComputedRef<import("../table-column/defaults").TableColumnCtx<unknown>[]>;
    getHeaderRowClass: (rowIndex: number) => string;
    getHeaderRowStyle: (rowIndex: number) => any;
    getHeaderCellClass: (rowIndex: number, columnIndex: number, row: unknown, column: import("../table-column/defaults").TableColumnCtx<unknown>) => string;
    getHeaderCellStyle: (rowIndex: number, columnIndex: number, row: unknown, column: import("../table-column/defaults").TableColumnCtx<unknown>) => any;
    handleHeaderClick: (event: Event, column: import("../table-column/defaults").TableColumnCtx<unknown>) => void;
    handleHeaderContextMenu: (event: Event, column: import("../table-column/defaults").TableColumnCtx<unknown>) => void;
    handleMouseDown: (event: MouseEvent, column: import("../table-column/defaults").TableColumnCtx<unknown>) => void;
    handleMouseMove: (event: MouseEvent, column: import("../table-column/defaults").TableColumnCtx<unknown>) => void;
    handleMouseOut: () => void;
    handleSortClick: (event: Event, column: import("../table-column/defaults").TableColumnCtx<unknown>, givenOrder: string | boolean) => void;
    handleFilterClick: (event: Event) => void;
    isGroup: import("vue").ComputedRef<boolean>;
    toggleAllSelection: (event: Event) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    fixed: {
        type: StringConstructor;
        default: string;
    };
    store: {
        required: true;
        type: PropType<any>;
    };
    border: BooleanConstructor;
    defaultSort: {
        type: PropType<Sort>;
        default: () => {
            prop: string;
            order: string;
        };
    };
}>>, {
    fixed: string;
    border: boolean;
    defaultSort: Sort;
}>;
export default _default;
