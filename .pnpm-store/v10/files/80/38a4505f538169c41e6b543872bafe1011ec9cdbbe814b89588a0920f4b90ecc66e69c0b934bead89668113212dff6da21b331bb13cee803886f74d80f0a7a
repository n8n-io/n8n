import type { ExtractPropTypes } from 'vue';
import type { Dayjs } from 'dayjs';
export declare type CalendarDateCellType = 'next' | 'prev' | 'current';
export declare type CalendarDateCell = {
    text: number;
    type: CalendarDateCellType;
};
export declare const getPrevMonthLastDays: (date: Dayjs, count: number) => number[];
export declare const getMonthDays: (date: Dayjs) => number[];
export declare const toNestedArr: (days: CalendarDateCell[]) => CalendarDateCell[][];
export declare const dateTableProps: {
    readonly selectedDay: {
        readonly type: import("vue").PropType<Dayjs>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly range: {
        readonly type: import("vue").PropType<[Dayjs, Dayjs]>;
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
    readonly hideHeader: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare type DateTableProps = ExtractPropTypes<typeof dateTableProps>;
export declare const dateTableEmits: {
    pick: (value: Dayjs) => boolean;
};
export declare type DateTableEmits = typeof dateTableEmits;
