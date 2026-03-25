declare const _default: import("vue").DefineComponent<{
    readonly cellClassName: {
        readonly type: import("vue").PropType<(date: Date) => string>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly showWeekNumber: BooleanConstructor;
    readonly selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
    readonly disabledDate: {
        readonly type: import("vue").PropType<(date: Date) => boolean>;
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
    readonly minDate: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly maxDate: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly parsedValue: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | ((new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly cellClassName: {
            readonly type: import("vue").PropType<(date: Date) => string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly showWeekNumber: BooleanConstructor;
        readonly selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
        readonly disabledDate: {
            readonly type: import("vue").PropType<(date: Date) => boolean>;
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
        readonly minDate: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly maxDate: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parsedValue: {
            readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | ((new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
            endDate: null;
            selecting: boolean;
        }, boolean>;
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
    }>>;
    emit: (event: string, ...args: any[]) => void;
    WEEKS: import("vue").ComputedRef<string[]>;
    rows: import("vue").ComputedRef<{
        column?: number | undefined;
        customClass?: string | undefined;
        disabled?: boolean | undefined;
        end?: boolean | undefined;
        inRange?: boolean | undefined;
        row?: number | undefined;
        selected?: {
            clone: () => import("dayjs").Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            month: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            date: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            day: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            hour: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            minute: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            second: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            set: (unit: import("dayjs").UnitType, value: number) => import("dayjs").Dayjs;
            get: (unit: import("dayjs").UnitType) => number;
            add: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
            subtract: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
            startOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
            endOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSame: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isAfter: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): import("dayjs").Dayjs;
            };
            localeData: () => import("dayjs").InstanceLocaleDataReturn;
            week: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            weekYear: () => number;
            dayOfYear: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            isSameOrAfter: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSameOrBefore: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
        } | undefined;
        isCurrent?: boolean | undefined;
        isSelected?: boolean | undefined;
        start?: boolean | undefined;
        text?: number | undefined;
        timestamp?: number | undefined;
        date?: {
            toString: () => string;
            toDateString: () => string;
            toTimeString: () => string;
            toLocaleString: {
                (): string;
                (locales?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions | undefined): string;
            };
            toLocaleDateString: {
                (): string;
                (locales?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions | undefined): string;
            };
            toLocaleTimeString: {
                (): string;
                (locales?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions | undefined): string;
            };
            valueOf: () => number;
            getTime: () => number;
            getFullYear: () => number;
            getUTCFullYear: () => number;
            getMonth: () => number;
            getUTCMonth: () => number;
            getDate: () => number;
            getUTCDate: () => number;
            getDay: () => number;
            getUTCDay: () => number;
            getHours: () => number;
            getUTCHours: () => number;
            getMinutes: () => number;
            getUTCMinutes: () => number;
            getSeconds: () => number;
            getUTCSeconds: () => number;
            getMilliseconds: () => number;
            getUTCMilliseconds: () => number;
            getTimezoneOffset: () => number;
            setTime: (time: number) => number;
            setMilliseconds: (ms: number) => number;
            setUTCMilliseconds: (ms: number) => number;
            setSeconds: (sec: number, ms?: number | undefined) => number;
            setUTCSeconds: (sec: number, ms?: number | undefined) => number;
            setMinutes: (min: number, sec?: number | undefined, ms?: number | undefined) => number;
            setUTCMinutes: (min: number, sec?: number | undefined, ms?: number | undefined) => number;
            setHours: (hours: number, min?: number | undefined, sec?: number | undefined, ms?: number | undefined) => number;
            setUTCHours: (hours: number, min?: number | undefined, sec?: number | undefined, ms?: number | undefined) => number;
            setDate: (date: number) => number;
            setUTCDate: (date: number) => number;
            setMonth: (month: number, date?: number | undefined) => number;
            setUTCMonth: (month: number, date?: number | undefined) => number;
            setFullYear: (year: number, month?: number | undefined, date?: number | undefined) => number;
            setUTCFullYear: (year: number, month?: number | undefined, date?: number | undefined) => number;
            toUTCString: () => string;
            toISOString: () => string;
            toJSON: (key?: any) => string;
            [Symbol.toPrimitive]: {
                (hint: "default"): string;
                (hint: "string"): string;
                (hint: "number"): number;
                (hint: string): string | number;
            };
        } | undefined;
        dayjs?: {
            clone: () => import("dayjs").Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            month: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            date: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            day: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            hour: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            minute: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            second: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            set: (unit: import("dayjs").UnitType, value: number) => import("dayjs").Dayjs;
            get: (unit: import("dayjs").UnitType) => number;
            add: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
            subtract: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
            startOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
            endOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSame: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isAfter: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): import("dayjs").Dayjs;
            };
            localeData: () => import("dayjs").InstanceLocaleDataReturn;
            week: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            weekYear: () => number;
            dayOfYear: {
                (): number;
                (value: number): import("dayjs").Dayjs;
            };
            isSameOrAfter: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSameOrBefore: (date: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
        } | undefined;
        type?: ("week" | "normal" | "prev-month" | "next-month" | "today") | undefined;
    }[][]>;
    tbodyRef: import("vue").Ref<HTMLElement | undefined>;
    currentCellRef: import("vue").Ref<HTMLElement | undefined>;
    focus: () => Promise<void | undefined>;
    isCurrent: (cell: import("../date-picker.type").DateCell) => boolean;
    isWeekActive: (cell: import("../date-picker.type").DateCell) => boolean;
    isSelectedCell: (cell: import("../date-picker.type").DateCell) => boolean | undefined;
    handlePickDate: (event: MouseEvent | FocusEvent, isKeyboardMovement?: boolean) => void;
    handleMouseUp: (event: MouseEvent) => void;
    handleMouseDown: (event: MouseEvent) => void;
    handleMouseMove: (event: MouseEvent) => void;
    handleFocus: (event: FocusEvent) => void;
    tableLabel: import("vue").ComputedRef<string>;
    tableKls: import("vue").ComputedRef<(string | {
        'is-week-mode': boolean;
    })[]>;
    weekLabel: import("vue").ComputedRef<string>;
    getCellClasses: (cell: import("../date-picker.type").DateCell) => string;
    getRowKls: (cell: import("../date-picker.type").DateCell) => (string | {
        current: boolean;
    })[];
    t: import("../../../..").Translator;
    ElDatePickerCell: import("vue").DefineComponent<{
        readonly cell: {
            readonly type: import("vue").PropType<import("../date-picker.type").DateCell>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[] | JSX.Element, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly cell: {
            readonly type: import("vue").PropType<import("../date-picker.type").DateCell>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>>, {}>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, string[], string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly cellClassName: {
        readonly type: import("vue").PropType<(date: Date) => string>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly showWeekNumber: BooleanConstructor;
    readonly selectionMode: import("../../../../utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
    readonly disabledDate: {
        readonly type: import("vue").PropType<(date: Date) => boolean>;
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
    readonly minDate: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly maxDate: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null) | ((new (...args: any[]) => import("dayjs").Dayjs) | (() => import("dayjs").Dayjs | null))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly parsedValue: {
        readonly type: import("vue").PropType<import("../../../../utils").EpPropMergeType<(new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | ((new (...args: any[]) => import("dayjs").Dayjs | import("dayjs").Dayjs[]) | (() => import("dayjs").Dayjs | import("dayjs").Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly rangeState: import("../../../../utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
        endDate: null;
        selecting: boolean;
    }, boolean>;
}>> & {
    [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
}, {
    readonly rangeState: import("../props/shared").RangeState;
    readonly showWeekNumber: boolean;
    readonly selectionMode: string;
}>;
export default _default;
