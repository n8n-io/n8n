import dayjs from 'dayjs';
declare type MonthCell = {
    column: number;
    row: number;
    disabled: boolean;
    start: boolean;
    end: boolean;
    text: number;
    type: 'normal' | 'today';
    inRange: boolean;
};
declare const _default: import("vue").DefineComponent<{
    selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
    disabledDate: {
        readonly type: import("vue").PropType<(date: Date) => boolean>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    date: {
        readonly type: import("vue").PropType<dayjs.Dayjs>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    minDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    maxDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    parsedValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
}, {
    datesInMonth: (year: number, month: number, lang: string) => Date[];
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
        disabledDate: {
            readonly type: import("vue").PropType<(date: Date) => boolean>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        date: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        minDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        maxDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        parsedValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
            endDate: null;
            selecting: boolean;
        }, boolean>;
    }>> & {
        onSelect?: ((...args: any[]) => any) | undefined;
        onPick?: ((...args: any[]) => any) | undefined;
        onChangerange?: ((...args: any[]) => any) | undefined;
    }>>;
    emit: (event: "select" | "pick" | "changerange", ...args: any[]) => void;
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
    t: import("element-plus/es/hooks").Translator;
    lang: import("vue").Ref<string>;
    tbodyRef: import("vue").Ref<HTMLElement | undefined>;
    currentCellRef: import("vue").Ref<HTMLElement | undefined>;
    months: import("vue").Ref<string[]>;
    tableRows: import("vue").Ref<{
        column: number;
        row: number;
        disabled: boolean;
        start: boolean;
        end: boolean;
        text: number;
        type: "normal" | "today";
        inRange: boolean;
    }[][]>;
    lastRow: import("vue").Ref<number | undefined>;
    lastColumn: import("vue").Ref<number | undefined>;
    rows: import("vue").ComputedRef<MonthCell[][]>;
    focus: () => void;
    getCellStyle: (cell: MonthCell) => any;
    isSelectedCell: (cell: MonthCell) => boolean;
    handleMouseMove: (event: MouseEvent) => void;
    handleMonthTableClick: (event: MouseEvent | KeyboardEvent) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("select" | "pick" | "changerange")[], "select" | "pick" | "changerange", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
    disabledDate: {
        readonly type: import("vue").PropType<(date: Date) => boolean>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    date: {
        readonly type: import("vue").PropType<dayjs.Dayjs>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    minDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    maxDate: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    parsedValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
}>> & {
    onSelect?: ((...args: any[]) => any) | undefined;
    onPick?: ((...args: any[]) => any) | undefined;
    onChangerange?: ((...args: any[]) => any) | undefined;
}, {
    rangeState: import("../props/shared").RangeState;
    selectionMode: string;
}>;
export default _default;
