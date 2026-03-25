import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
declare type RangePickValue = {
    minDate: Dayjs;
    maxDate: Dayjs;
};
declare const _default: import("vue").DefineComponent<{
    readonly unlinkPanels: BooleanConstructor;
    readonly parsedValue: {
        readonly type: import("vue").PropType<dayjs.Dayjs[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly unlinkPanels: BooleanConstructor;
        readonly parsedValue: {
            readonly type: import("vue").PropType<dayjs.Dayjs[]>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
    }>>;
    emit: (event: string, ...args: any[]) => void;
    unit: string;
    lang: import("vue").Ref<string>;
    pickerBase: any;
    shortcuts: any;
    disabledDate: any;
    format: any;
    defaultValue: import("vue").Ref<any>;
    leftDate: import("vue").Ref<{
        clone: () => dayjs.Dayjs;
        isValid: () => boolean;
        year: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        month: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        date: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        day: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        hour: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        minute: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        second: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        millisecond: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        set: (unit: dayjs.UnitType, value: number) => dayjs.Dayjs;
        get: (unit: dayjs.UnitType) => number;
        add: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
        subtract: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
        startOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
        endOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
        format: (template?: string | undefined) => string;
        diff: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
        valueOf: () => number;
        unix: () => number;
        daysInMonth: () => number;
        toDate: () => Date;
        toJSON: () => string;
        toISOString: () => string;
        toString: () => string;
        utcOffset: () => number;
        isBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isSame: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        locale: {
            (): string;
            (preset: string | ILocale, object?: Partial<ILocale> | undefined): dayjs.Dayjs;
        };
        localeData: () => dayjs.InstanceLocaleDataReturn;
        week: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        weekYear: () => number;
        dayOfYear: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        isSameOrAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isSameOrBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
    }>;
    rightDate: import("vue").Ref<{
        clone: () => dayjs.Dayjs;
        isValid: () => boolean;
        year: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        month: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        date: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        day: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        hour: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        minute: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        second: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        millisecond: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        set: (unit: dayjs.UnitType, value: number) => dayjs.Dayjs;
        get: (unit: dayjs.UnitType) => number;
        add: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
        subtract: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
        startOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
        endOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
        format: (template?: string | undefined) => string;
        diff: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
        valueOf: () => number;
        unix: () => number;
        daysInMonth: () => number;
        toDate: () => Date;
        toJSON: () => string;
        toISOString: () => string;
        toString: () => string;
        utcOffset: () => number;
        isBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isSame: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        locale: {
            (): string;
            (preset: string | ILocale, object?: Partial<ILocale> | undefined): dayjs.Dayjs;
        };
        localeData: () => dayjs.InstanceLocaleDataReturn;
        week: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        weekYear: () => number;
        dayOfYear: {
            (): number;
            (value: number): dayjs.Dayjs;
        };
        isSameOrAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        isSameOrBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
    }>;
    minDate: import("vue").Ref<dayjs.Dayjs | undefined>;
    maxDate: import("vue").Ref<dayjs.Dayjs | undefined>;
    rangeState: import("vue").Ref<{
        endDate: {
            clone: () => dayjs.Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            month: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            date: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            day: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            hour: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            minute: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            second: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            set: (unit: dayjs.UnitType, value: number) => dayjs.Dayjs;
            get: (unit: dayjs.UnitType) => number;
            add: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
            subtract: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
            startOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
            endOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            isSame: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            isAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): dayjs.Dayjs;
            };
            localeData: () => dayjs.InstanceLocaleDataReturn;
            week: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            weekYear: () => number;
            dayOfYear: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            isSameOrAfter: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            isSameOrBefore: (date: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
        } | null;
        selecting: boolean;
    }>;
    ppNs: {
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
    drpNs: {
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
    handleChangeRange: (val: import("../props/shared").RangeState) => void;
    handleRangeConfirm: (visible?: boolean) => void;
    handleShortcutClick: (shortcut: import("../composables/use-shortcut").Shortcut) => void;
    onSelect: (selecting: boolean) => void;
    hasShortcuts: import("vue").ComputedRef<boolean>;
    leftPrevYear: () => void;
    rightNextYear: () => void;
    leftNextYear: () => void;
    rightPrevYear: () => void;
    leftLabel: import("vue").ComputedRef<string>;
    rightLabel: import("vue").ComputedRef<string>;
    leftYear: import("vue").ComputedRef<number>;
    rightYear: import("vue").ComputedRef<number>;
    enableYearArrow: import("vue").ComputedRef<boolean>;
    handleRangePick: (val: RangePickValue, close?: boolean) => void;
    formatToString: (days: Dayjs[]) => string[];
    onParsedValueChanged: (minDate: Dayjs | undefined, maxDate: Dayjs | undefined) => void;
    ElIcon: import("../../../../utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly size: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly color: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly size: {
                readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly color: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
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
        style: import("vue").ComputedRef<import("vue").CSSProperties>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly size: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly color: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>>, {}>> & Record<string, any>;
    DArrowLeft: any;
    DArrowRight: any;
    MonthTable: import("vue").DefineComponent<{
        selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
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
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        maxDate: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        parsedValue: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
            endDate: null;
            selecting: boolean;
        }, boolean>;
    }, {
        datesInMonth: (year: number, month: number, lang: string) => Date[];
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
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
                readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            maxDate: {
                readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            parsedValue: {
                readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
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
        rows: import("vue").ComputedRef<{
            column: number;
            row: number;
            disabled: boolean;
            start: boolean;
            end: boolean;
            text: number;
            type: "normal" | "today";
            inRange: boolean;
        }[][]>;
        focus: () => void;
        getCellStyle: (cell: {
            column: number;
            row: number;
            disabled: boolean;
            start: boolean;
            end: boolean;
            text: number;
            type: "normal" | "today";
            inRange: boolean;
        }) => any;
        isSelectedCell: (cell: {
            column: number;
            row: number;
            disabled: boolean;
            start: boolean;
            end: boolean;
            text: number;
            type: "normal" | "today";
            inRange: boolean;
        }) => boolean;
        handleMouseMove: (event: MouseEvent) => void;
        handleMonthTableClick: (event: MouseEvent | KeyboardEvent) => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("select" | "pick" | "changerange")[], "select" | "pick" | "changerange", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
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
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        maxDate: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        parsedValue: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
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
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, string[], string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly unlinkPanels: BooleanConstructor;
    readonly parsedValue: {
        readonly type: import("vue").PropType<dayjs.Dayjs[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}>> & {
    [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
}, {
    readonly unlinkPanels: boolean;
}>;
export default _default;
