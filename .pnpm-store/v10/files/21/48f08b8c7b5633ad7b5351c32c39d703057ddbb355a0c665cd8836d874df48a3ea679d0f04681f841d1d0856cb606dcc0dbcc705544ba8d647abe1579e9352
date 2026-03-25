import type { UnwrapRef } from 'vue';
import type { GridDefaultSlotParams, GridScrollOptions, ResetAfterIndex, Alignment as ScrollStrategy } from 'element-plus/es/components/virtual-list';
import type { TableV2GridProps } from './grid';
declare const TableGrid: import("vue").DefineComponent<{
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
    readonly fixedData: {
        readonly type: import("vue").PropType<any[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedRowHeight: {
        readonly default: undefined;
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        readonly __epPropKey: true;
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
    readonly headerWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly headerHeight: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]) | ((new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]))[], unknown, unknown, 50, boolean>;
    readonly bodyWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowHeight: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly cache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly useIsScrolling: BooleanConstructor;
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly scrollbarStartGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly scrollbarEndGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 2, boolean>;
    readonly class: StringConstructor;
    readonly style: {
        readonly type: import("vue").PropType<import("vue").CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly containerStyle: {
        readonly type: import("vue").PropType<import("vue").CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly getRowHeight: {
        readonly type: import("vue").PropType<import("element-plus/es/components/virtual-list").ItemSize>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType) | ((new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType))[], unknown, unknown, "id", boolean>;
    readonly onRowsRendered: {
        readonly type: import("vue").PropType<(params: import("./grid").onRowRenderedParams) => void>;
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
}, () => JSX.Element, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
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
    readonly fixedData: {
        readonly type: import("vue").PropType<any[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly estimatedRowHeight: {
        readonly default: undefined;
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        readonly __epPropKey: true;
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
    readonly headerWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly headerHeight: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]) | ((new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]))[], unknown, unknown, 50, boolean>;
    readonly bodyWidth: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowHeight: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly cache: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, never, never, 2, false>;
    readonly useIsScrolling: BooleanConstructor;
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly scrollbarStartGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly scrollbarEndGap: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 2, boolean>;
    readonly class: StringConstructor;
    readonly style: {
        readonly type: import("vue").PropType<import("vue").CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly containerStyle: {
        readonly type: import("vue").PropType<import("vue").CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly getRowHeight: {
        readonly type: import("vue").PropType<import("element-plus/es/components/virtual-list").ItemSize>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType) | ((new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType))[], unknown, unknown, "id", boolean>;
    readonly onRowsRendered: {
        readonly type: import("vue").PropType<(params: import("./grid").onRowRenderedParams) => void>;
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
}>>, {
    readonly scrollbarAlwaysOn: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly rowKey: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType) | ((new (...args: any[]) => import("./types").KeyType & {}) | (() => import("./types").KeyType))[], unknown, unknown>;
    readonly headerHeight: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]) | ((new (...args: any[]) => (number | number[]) & {}) | (() => number | number[]))[], unknown, unknown>;
    readonly estimatedRowHeight: number;
    readonly useIsScrolling: boolean;
    readonly scrollbarStartGap: number;
    readonly scrollbarEndGap: number;
    readonly cache: number;
}>;
export default TableGrid;
export declare type TableGridRowSlotParams = {
    columns: TableV2GridProps['columns'];
    rowData: any;
} & GridDefaultSlotParams;
export declare type TableGridInstance = InstanceType<typeof TableGrid> & UnwrapRef<{
    forceUpdate: () => void;
    /**
     * @description fetch total height
     */
    totalHeight: number;
    /**
     * @description scrollTo a position
     * @param { number | ScrollToOptions } arg1
     * @param { number } arg2
     */
    scrollTo(leftOrOptions: number | GridScrollOptions, top?: number): void;
    /**
     * @description scroll vertically to position y
     */
    scrollToTop(scrollTop: number): void;
    /**
     * @description scroll to a given row
     * @params row {Number} which row to scroll to
     * @params @optional strategy {ScrollStrategy} use what strategy to scroll to
     */
    scrollToRow(row: number, strategy: ScrollStrategy): void;
    /**
     * @description reset rendered state after row index
     * @param { number } rowIndex
     * @param { boolean } forceUpdate
     */
    resetAfterRowIndex: ResetAfterIndex;
}>;
