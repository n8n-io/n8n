import type { CSSProperties, ExtractPropTypes } from 'vue';
import type { FixedDirection, KeyType, RowCommonParams } from './types';
export declare type RowExpandParams = {
    expanded: boolean;
    rowKey: KeyType;
} & RowCommonParams;
export declare type RowHoverParams = {
    event: MouseEvent;
    hovered: boolean;
    rowKey: KeyType;
} & RowCommonParams;
export declare type RowEventHandlerParams = {
    rowKey: KeyType;
    event: Event;
} & RowCommonParams;
export declare type RowHeightChangedParams = {
    rowKey: KeyType;
    height: number;
    rowIndex: number;
};
export declare type RowExpandHandler = (params: RowExpandParams) => void;
export declare type RowHoverHandler = (params: RowHoverParams) => void;
export declare type RowEventHandler = (params: RowEventHandlerParams) => void;
export declare type RowHeightChangeHandler = (row: RowHeightChangedParams, fixedDirection: boolean | FixedDirection | undefined) => void;
export declare type RowEventHandlers = {
    onClick?: RowEventHandler;
    onContextmenu?: RowEventHandler;
    onDblclick?: RowEventHandler;
    onMouseenter?: RowEventHandler;
    onMouseleave?: RowEventHandler;
};
export declare const tableV2RowProps: {
    readonly class: StringConstructor;
    readonly columns: {
        readonly type: import("vue").PropType<import("./common").AnyColumn[]>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly columnsStyles: {
        readonly type: import("vue").PropType<Record<KeyType, CSSProperties>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly depth: NumberConstructor;
    readonly expandColumnKey: StringConstructor;
    readonly estimatedRowHeight: {
        readonly default: undefined;
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        readonly __epPropKey: true;
    };
    readonly isScrolling: BooleanConstructor;
    readonly onRowExpand: {
        readonly type: import("vue").PropType<RowExpandHandler>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onRowHover: {
        readonly type: import("vue").PropType<RowHoverHandler>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly onRowHeightChange: {
        readonly type: import("vue").PropType<RowHeightChangeHandler>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowData: {
        readonly type: import("vue").PropType<any>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowEventHandlers: {
        readonly type: import("vue").PropType<RowEventHandlers>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowIndex: {
        readonly type: import("vue").PropType<number>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rowKey: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => KeyType & {}) | (() => KeyType) | ((new (...args: any[]) => KeyType & {}) | (() => KeyType))[], unknown, unknown, "id", boolean>;
    readonly style: {
        readonly type: import("vue").PropType<CSSProperties>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare type TableV2RowProps = ExtractPropTypes<typeof tableV2RowProps>;
