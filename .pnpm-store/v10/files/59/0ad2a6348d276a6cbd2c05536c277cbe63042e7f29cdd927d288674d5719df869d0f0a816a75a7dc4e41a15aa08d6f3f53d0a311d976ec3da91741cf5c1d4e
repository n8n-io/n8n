import type { ExtractPropTypes } from 'vue';
import type { Dayjs } from 'dayjs';
declare const selectionModes: string[];
export declare type RangeState = {
    endDate: null | Dayjs;
    selecting: boolean;
};
export declare const datePickerSharedProps: {
    readonly disabledDate: {
        readonly type: import("vue").PropType<(date: Date) => boolean>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly date: {
        readonly type: import("vue").PropType<Dayjs>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly minDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Dayjs) | (() => Dayjs | null) | ((new (...args: any[]) => Dayjs) | (() => Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly maxDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Dayjs) | (() => Dayjs | null) | ((new (...args: any[]) => Dayjs) | (() => Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly parsedValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Dayjs | Dayjs[]) | (() => Dayjs | Dayjs[]) | ((new (...args: any[]) => Dayjs | Dayjs[]) | (() => Dayjs | Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => RangeState) | (() => RangeState) | ((new (...args: any[]) => RangeState) | (() => RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
};
export declare const panelSharedProps: {
    readonly type: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") | ((new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange"))[], "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange", unknown>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly dateFormat: StringConstructor;
    readonly timeFormat: StringConstructor;
};
export declare const panelRangeSharedProps: {
    readonly unlinkPanels: BooleanConstructor;
    readonly parsedValue: {
        readonly type: import("vue").PropType<Dayjs[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare const selectionModeWithDefault: (mode: typeof selectionModes[number]) => {
    type: StringConstructor;
    values: string[];
    default: string;
};
export declare const rangePickerSharedEmits: {
    pick: (range: [Dayjs, Dayjs]) => boolean;
};
export declare type RangePickerSharedEmits = typeof rangePickerSharedEmits;
export declare type PanelRangeSharedProps = ExtractPropTypes<typeof panelRangeSharedProps>;
export {};
