import type { CalendarDateCell } from './date-table';
declare const _default: import("vue").DefineComponent<{
    readonly selectedDay: {
        readonly type: import("vue").PropType<import("dayjs").Dayjs>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly range: {
        readonly type: import("vue").PropType<[import("dayjs").Dayjs, import("dayjs").Dayjs]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly date: {
        readonly type: import("vue").PropType<import("dayjs").Dayjs>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly hideHeader: {
        readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly selectedDay: {
            readonly type: import("vue").PropType<import("dayjs").Dayjs>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly range: {
            readonly type: import("vue").PropType<[import("dayjs").Dayjs, import("dayjs").Dayjs]>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly date: {
            readonly type: import("vue").PropType<import("dayjs").Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly hideHeader: {
            readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>> & {
        onPick?: ((value: import("dayjs").Dayjs) => any) | undefined;
    }>>;
    emit: (event: "pick", value: import("dayjs").Dayjs) => void;
    isInRange: import("vue").ComputedRef<boolean>;
    now: import("dayjs").Dayjs;
    rows: import("vue").ComputedRef<CalendarDateCell[][]>;
    weekDays: import("vue").ComputedRef<string[]>;
    getFormattedDate: (day: number, type: import("./date-table").CalendarDateCellType) => import("dayjs").Dayjs;
    handlePickDay: ({ text, type }: CalendarDateCell) => void;
    getSlotData: ({ text, type }: CalendarDateCell) => {
        isSelected: boolean;
        type: string;
        day: string;
        date: Date;
    };
    nsTable: {
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
    nsDay: {
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
    getCellClass: ({ text, type }: CalendarDateCell) => string[];
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    pick: (value: import("dayjs").Dayjs) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly selectedDay: {
        readonly type: import("vue").PropType<import("dayjs").Dayjs>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly range: {
        readonly type: import("vue").PropType<[import("dayjs").Dayjs, import("dayjs").Dayjs]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly date: {
        readonly type: import("vue").PropType<import("dayjs").Dayjs>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly hideHeader: {
        readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}>> & {
    onPick?: ((value: import("dayjs").Dayjs) => any) | undefined;
}, {}>;
export default _default;
