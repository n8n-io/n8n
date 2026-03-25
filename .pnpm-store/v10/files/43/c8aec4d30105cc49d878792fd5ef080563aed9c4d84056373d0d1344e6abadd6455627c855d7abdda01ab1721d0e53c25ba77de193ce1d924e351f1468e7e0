import type { Nullable } from 'element-plus/es/utils';
import type { TableColumnCtx } from './table-column/defaults';
import type { ElTooltipProps } from 'element-plus/es/components/tooltip';
export declare type TableOverflowTooltipOptions = Partial<Pick<ElTooltipProps, 'effect' | 'enterable' | 'hideAfter' | 'offset' | 'placement' | 'popperClass' | 'popperOptions' | 'showAfter' | 'showArrow'>>;
export declare const getCell: (event: Event) => HTMLTableCellElement | null;
export declare const orderBy: <T>(array: T[], sortKey: string, reverse: string | number, sortMethod: any, sortBy: string | (string | ((a: T, b: T, array?: T[] | undefined) => number))[]) => T[];
export declare const getColumnById: <T>(table: {
    columns: TableColumnCtx<T>[];
}, columnId: string) => TableColumnCtx<T> | null;
export declare const getColumnByKey: <T>(table: {
    columns: TableColumnCtx<T>[];
}, columnKey: string) => TableColumnCtx<T>;
export declare const getColumnByCell: <T>(table: {
    columns: TableColumnCtx<T>[];
}, cell: HTMLElement, namespace: string) => TableColumnCtx<T> | null;
export declare const getRowIdentity: <T>(row: T, rowKey: string | ((row: T) => any)) => string;
export declare const getKeysMap: <T>(array: T[], rowKey: string) => Record<string, {
    row: T;
    index: number;
}>;
export declare function mergeOptions<T, K>(defaults: T, config: K): T & K;
export declare function parseWidth(width: number | string): number | string;
export declare function parseMinWidth(minWidth: number | string): number | string;
export declare function parseHeight(height: number | string): string | number | null;
export declare function compose(...funcs: any[]): any;
export declare function toggleRowStatus<T>(statusArr: T[], row: T, newVal: boolean): boolean;
export declare function walkTreeNode(root: any, cb: any, childrenKey?: string, lazyKey?: string): void;
export declare let removePopper: any;
export declare function createTablePopper(parentNode: HTMLElement | undefined, trigger: HTMLElement, popperContent: string, nextZIndex: () => number, tooltipOptions?: TableOverflowTooltipOptions): Nullable<{
    $: import("vue").ComponentInternalInstance;
    $data: {};
    $props: Partial<{
        readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
        readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "role">;
    $attrs: {
        [x: string]: unknown;
    };
    $refs: {
        [x: string]: unknown;
    };
    $slots: Readonly<{
        [name: string]: import("vue").Slot | undefined;
    }>;
    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
    $emit: (event: string, ...args: any[]) => void;
    $el: any;
    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
        readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>>, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
        triggerRef: import("vue").Ref<HTMLElement | undefined>;
        popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
        contentRef: import("vue").Ref<HTMLElement | undefined>;
        referenceRef: import("vue").Ref<HTMLElement | undefined>;
        role: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
        popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
        readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
    }> & {
        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
        created?: ((() => void) | (() => void)[]) | undefined;
        beforeMount?: ((() => void) | (() => void)[]) | undefined;
        mounted?: ((() => void) | (() => void)[]) | undefined;
        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
        updated?: ((() => void) | (() => void)[]) | undefined;
        activated?: ((() => void) | (() => void)[]) | undefined;
        deactivated?: ((() => void) | (() => void)[]) | undefined;
        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
        destroyed?: ((() => void) | (() => void)[]) | undefined;
        unmounted?: ((() => void) | (() => void)[]) | undefined;
        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
    };
    $forceUpdate: () => void;
    $nextTick: typeof import("vue").nextTick;
    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
} & Readonly<import("vue").ExtractPropTypes<{
    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
}>> & import("vue").ShallowUnwrapRef<{
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
    }>>;
    triggerRef: import("vue").Ref<HTMLElement | undefined>;
    popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
    contentRef: import("vue").Ref<HTMLElement | undefined>;
    referenceRef: import("vue").Ref<HTMLElement | undefined>;
    role: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
    popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
}> & {} & import("vue").ComponentCustomProperties>;
export declare const isFixedColumn: <T>(index: number, fixed: string | boolean, store: any, realColumns?: TableColumnCtx<T>[] | undefined) => {
    direction: any;
    start: number;
    after: number;
} | {
    direction?: undefined;
    start?: undefined;
    after?: undefined;
};
export declare const getFixedColumnsClass: <T>(namespace: string, index: number, fixed: string | boolean, store: any, realColumns?: TableColumnCtx<T>[] | undefined, offset?: number) => string[];
export declare const getFixedColumnOffset: <T>(index: number, fixed: string | boolean, store: any, realColumns?: TableColumnCtx<T>[] | undefined) => any;
export declare const ensurePosition: (style: any, key: string) => void;
