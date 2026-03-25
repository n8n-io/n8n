import type { ExtractPropTypes } from 'vue';
import type { Dayjs } from 'dayjs';
export declare const basicDateTableProps: {
    readonly cellClassName: {
        readonly type: import("vue").PropType<(date: Date) => string>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly showWeekNumber: BooleanConstructor;
    readonly selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
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
    readonly rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("./shared").RangeState) | (() => import("./shared").RangeState) | ((new (...args: any[]) => import("./shared").RangeState) | (() => import("./shared").RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
};
export declare const basicDateTableEmits: string[];
export declare type BasicDateTableProps = ExtractPropTypes<typeof basicDateTableProps>;
export declare type BasicDateTableEmits = typeof basicDateTableEmits;
export declare type RangePickerEmits = {
    minDate: Dayjs;
    maxDate: null;
};
export declare type DatePickerEmits = Dayjs;
export declare type DatesPickerEmits = Dayjs[];
export declare type WeekPickerEmits = {
    year: number;
    week: number;
    value: string;
    date: Dayjs;
};
export declare type DateTableEmits = RangePickerEmits | DatePickerEmits | DatesPickerEmits | WeekPickerEmits;
