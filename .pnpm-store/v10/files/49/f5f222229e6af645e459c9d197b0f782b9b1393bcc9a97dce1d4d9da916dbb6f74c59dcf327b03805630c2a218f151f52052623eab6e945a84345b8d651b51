import { useCache } from '../hooks/use-cache';
import { BACKWARD, FORWARD } from '../defaults';
import type { Ref, StyleValue, UnwrapRef, VNode } from 'vue';
import type { Alignment, GridConstructorProps, GridScrollOptions } from '../types';
import type { VirtualizedGridProps } from '../props';
declare const createGrid: ({ name, clearCache, getColumnPosition, getColumnStartIndexForOffset, getColumnStopIndexForStartIndex, getEstimatedTotalHeight, getEstimatedTotalWidth, getColumnOffset, getRowOffset, getRowPosition, getRowStartIndexForOffset, getRowStopIndexForStartIndex, initCache, injectToInstance, validateProps, }: GridConstructorProps<VirtualizedGridProps>) => import("vue").DefineComponent<{
    readonly className: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly containerElement: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | Element) & {}) | (() => string | Element) | ((new (...args: any[]) => (string | Element) & {}) | (() => string | Element))[], unknown, unknown, "div", boolean>;
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => any[]) | (() => any[]) | ((new (...args: any[]) => any[]) | (() => any[]))[], unknown, unknown, () => [], boolean>;
    readonly direction: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "ltr" | "rtl", never, "ltr", false>;
    readonly height: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly innerElement: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ObjectConstructor], unknown, unknown, "div", boolean>;
    readonly style: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly useIsScrolling: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly width: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [NumberConstructor, StringConstructor], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly perfMode: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly columnCache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly columnWidth: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize) | ((new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize))[], never, never>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedColumnWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedRowHeight: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initScrollLeft: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 0, false>;
    readonly initScrollTop: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 0, false>;
    readonly itemKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../types").GridItemKeyGetter) | (() => import("../types").GridItemKeyGetter) | {
        (): import("../types").GridItemKeyGetter;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => import("../types").GridItemKeyGetter) | (() => import("../types").GridItemKeyGetter) | {
        (): import("../types").GridItemKeyGetter;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, ({ columnIndex, rowIndex, }: {
        columnIndex: number;
        rowIndex: number;
    }) => string, boolean>;
    readonly rowCache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly rowHeight: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize) | ((new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize))[], never, never>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly totalColumn: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly totalRow: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly hScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly vScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly scrollbarStartGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly scrollbarEndGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 2, boolean>;
    readonly role: StringConstructor;
}, () => VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("scroll" | "itemRendered")[], "scroll" | "itemRendered", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly className: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly containerElement: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | Element) & {}) | (() => string | Element) | ((new (...args: any[]) => (string | Element) & {}) | (() => string | Element))[], unknown, unknown, "div", boolean>;
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => any[]) | (() => any[]) | ((new (...args: any[]) => any[]) | (() => any[]))[], unknown, unknown, () => [], boolean>;
    readonly direction: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "ltr" | "rtl", never, "ltr", false>;
    readonly height: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly innerElement: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ObjectConstructor], unknown, unknown, "div", boolean>;
    readonly style: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly useIsScrolling: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly width: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [NumberConstructor, StringConstructor], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly perfMode: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly columnCache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly columnWidth: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize) | ((new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize))[], never, never>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedColumnWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedRowHeight: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initScrollLeft: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 0, false>;
    readonly initScrollTop: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 0, false>;
    readonly itemKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../types").GridItemKeyGetter) | (() => import("../types").GridItemKeyGetter) | {
        (): import("../types").GridItemKeyGetter;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => import("../types").GridItemKeyGetter) | (() => import("../types").GridItemKeyGetter) | {
        (): import("../types").GridItemKeyGetter;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, ({ columnIndex, rowIndex, }: {
        columnIndex: number;
        rowIndex: number;
    }) => string, boolean>;
    readonly rowCache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly rowHeight: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize) | ((new (...args: any[]) => (number | import("../types").ItemSize) & {}) | (() => number | import("../types").ItemSize))[], never, never>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly totalColumn: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly totalRow: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly hScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly vScrollbarSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 6, boolean>;
    readonly scrollbarStartGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly scrollbarEndGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 2, boolean>;
    readonly role: StringConstructor;
}>> & {
    onScroll?: ((...args: any[]) => any) | undefined;
    onItemRendered?: ((...args: any[]) => any) | undefined;
}, {
    readonly className: string;
    readonly direction: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "ltr" | "rtl", never>;
    readonly data: any[];
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly itemKey: import("../types").GridItemKeyGetter;
    readonly containerElement: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | Element) & {}) | (() => string | Element) | ((new (...args: any[]) => (string | Element) & {}) | (() => string | Element))[], unknown, unknown>;
    readonly innerElement: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ObjectConstructor], unknown, unknown>;
    readonly useIsScrolling: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly perfMode: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly columnCache: number;
    readonly initScrollLeft: number;
    readonly initScrollTop: number;
    readonly rowCache: number;
    readonly hScrollbarSize: number;
    readonly vScrollbarSize: number;
    readonly scrollbarStartGap: number;
    readonly scrollbarEndGap: number;
}>;
export default createGrid;
declare type Dir = typeof FORWARD | typeof BACKWARD;
export declare type GridInstance = InstanceType<ReturnType<typeof createGrid>> & UnwrapRef<{
    windowRef: Ref<HTMLElement>;
    innerRef: Ref<HTMLElement>;
    getItemStyleCache: ReturnType<typeof useCache>;
    scrollTo: (scrollOptions: GridScrollOptions) => void;
    scrollToItem: (rowIndex: number, columnIndex: number, alignment: Alignment) => void;
    states: Ref<{
        isScrolling: boolean;
        scrollLeft: number;
        scrollTop: number;
        updateRequested: boolean;
        xAxisScrollDir: Dir;
        yAxisScrollDir: Dir;
    }>;
}>;
