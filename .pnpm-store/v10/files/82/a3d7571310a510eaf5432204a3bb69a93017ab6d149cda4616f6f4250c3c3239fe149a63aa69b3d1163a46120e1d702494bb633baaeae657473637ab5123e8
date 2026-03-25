import { nextTick } from 'vue';
import dayjs from 'dayjs';
import type { SetupContext } from 'vue';
import type { ConfigType, Dayjs } from 'dayjs';
import type { DateTableEmits } from '../props/basic-date-table';
declare type Shortcut = {
    value: (() => Dayjs) | Dayjs;
    onClick?: (ctx: Omit<SetupContext, 'expose'>) => void;
};
declare const _default: import("vue").DefineComponent<{
    readonly parsedValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly visible: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly type: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") | ((new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange"))[], "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange", unknown>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly dateFormat: StringConstructor;
    readonly timeFormat: StringConstructor;
}, {
    timeWithinRange: (_: ConfigType, __: any, ___: string) => boolean;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly parsedValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly visible: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly type: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") | ((new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange"))[], "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange", unknown>>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly dateFormat: StringConstructor;
        readonly timeFormat: StringConstructor;
    }>> & {
        onPick?: ((...args: any[]) => any) | undefined;
        "onPanel-change"?: ((...args: any[]) => any) | undefined;
        "onSet-picker-option"?: ((...args: any[]) => any) | undefined;
    }>>;
    contextEmit: (event: "panel-change" | "pick" | "set-picker-option", ...args: any[]) => void;
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
    dpNs: {
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
    attrs: {
        [x: string]: unknown;
    };
    slots: Readonly<{
        [name: string]: import("vue").Slot | undefined;
    }>;
    t: import("element-plus/es/hooks").Translator;
    lang: import("vue").Ref<string>;
    pickerBase: any;
    popper: import("element-plus/es/components/tooltip").ElTooltipInjectionContext | undefined;
    shortcuts: any;
    disabledDate: any;
    cellClassName: any;
    defaultTime: any;
    defaultValue: import("vue").Ref<any>;
    currentViewRef: import("vue").Ref<{
        focus: () => void;
    } | undefined>;
    innerDate: import("vue").Ref<{
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
    isChangeToNow: import("vue").Ref<boolean>;
    isShortcut: boolean;
    defaultTimeD: import("vue").ComputedRef<dayjs.Dayjs>;
    month: import("vue").ComputedRef<number>;
    year: import("vue").ComputedRef<number>;
    selectableRange: import("vue").Ref<never[]>;
    userInputDate: import("vue").Ref<string | null>;
    userInputTime: import("vue").Ref<string | null>;
    checkDateWithinRange: (date: ConfigType) => boolean;
    formatEmit: (emitDayjs: Dayjs) => dayjs.Dayjs;
    emit: (value: Dayjs | Dayjs[], ...args: any[]) => void;
    handleDatePick: (value: DateTableEmits, keepOpen?: boolean | undefined) => void;
    moveByMonth: (forward: boolean) => void;
    moveByYear: (forward: boolean) => void;
    currentView: import("vue").Ref<string>;
    yearLabel: import("vue").ComputedRef<string>;
    handleShortcutClick: (shortcut: Shortcut) => void;
    selectionMode: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") | ((new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange"))[], "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange", unknown>>;
    keyboardMode: import("vue").ComputedRef<string>;
    hasShortcuts: import("vue").ComputedRef<boolean>;
    handleMonthPick: (month: number) => Promise<void>;
    handleYearPick: (year: number) => Promise<void>;
    showPicker: (view: 'month' | 'year') => Promise<void>;
    showTime: import("vue").ComputedRef<boolean>;
    footerVisible: import("vue").ComputedRef<boolean>;
    disabledConfirm: import("vue").ComputedRef<any>;
    onConfirm: () => void;
    disabledNow: import("vue").ComputedRef<any>;
    changeToNow: () => void;
    timeFormat: import("vue").ComputedRef<string>;
    dateFormat: import("vue").ComputedRef<string>;
    visibleTime: import("vue").ComputedRef<string | undefined>;
    visibleDate: import("vue").ComputedRef<string | undefined>;
    timePickerVisible: import("vue").Ref<boolean>;
    onTimePickerInputFocus: () => void;
    handleTimePickClose: () => void;
    getUnits: (date: Dayjs) => {
        hour: number;
        minute: number;
        second: number;
        year: number;
        month: number;
        date: number;
    };
    handleTimePick: (value: Dayjs, visible: boolean, first: boolean) => void;
    handleVisibleTimeChange: (value: string) => void;
    handleVisibleDateChange: (value: string) => void;
    isValidValue: (date: unknown) => boolean;
    formatToString: (value: Dayjs | Dayjs[]) => string | string[];
    parseUserInput: (value: Dayjs) => dayjs.Dayjs;
    getDefaultValue: () => dayjs.Dayjs;
    handleFocusPicker: () => Promise<void>;
    handleKeydownTable: (event: KeyboardEvent) => void;
    handleKeyControl: (code: string) => void;
    handlePanelChange: (mode: 'month' | 'year') => void;
    ElButton: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
        readonly icon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly nativeType: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "reset" | "submit" | "button", unknown, "button", boolean>;
        readonly loading: BooleanConstructor;
        readonly loadingIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, () => any, boolean>;
        readonly plain: BooleanConstructor;
        readonly text: BooleanConstructor;
        readonly link: BooleanConstructor;
        readonly bg: BooleanConstructor;
        readonly autofocus: BooleanConstructor;
        readonly round: BooleanConstructor;
        readonly circle: BooleanConstructor;
        readonly color: StringConstructor;
        readonly dark: BooleanConstructor;
        readonly autoInsertSpace: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly tag: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, "button", boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
            readonly icon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly nativeType: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "reset" | "submit" | "button", unknown, "button", boolean>;
            readonly loading: BooleanConstructor;
            readonly loadingIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, () => any, boolean>;
            readonly plain: BooleanConstructor;
            readonly text: BooleanConstructor;
            readonly link: BooleanConstructor;
            readonly bg: BooleanConstructor;
            readonly autofocus: BooleanConstructor;
            readonly round: BooleanConstructor;
            readonly circle: BooleanConstructor;
            readonly color: StringConstructor;
            readonly dark: BooleanConstructor;
            readonly autoInsertSpace: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
            readonly tag: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, "button", boolean>;
        }>> & {
            onClick?: ((evt: MouseEvent) => any) | undefined;
        }>>;
        emit: (event: "click", evt: MouseEvent) => void;
        buttonStyle: import("vue").ComputedRef<Record<string, string>>;
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
        _ref: import("vue").Ref<HTMLButtonElement | undefined>;
        _size: import("vue").ComputedRef<"" | "default" | "small" | "large">;
        _type: import("vue").ComputedRef<"" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger">;
        _disabled: import("vue").ComputedRef<boolean>;
        _props: import("vue").ComputedRef<{
            ariaDisabled: boolean;
            disabled: boolean;
            autofocus: boolean;
            type: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "reset" | "submit" | "button", unknown>;
        } | {
            ariaDisabled?: undefined;
            disabled?: undefined;
            autofocus?: undefined;
            type?: undefined;
        }>;
        shouldAddSpace: import("vue").ComputedRef<boolean>;
        handleClick: (evt: MouseEvent) => void;
        ElIcon: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        click: (evt: MouseEvent) => boolean;
    }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
        readonly icon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly nativeType: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "reset" | "submit" | "button", unknown, "button", boolean>;
        readonly loading: BooleanConstructor;
        readonly loadingIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, () => any, boolean>;
        readonly plain: BooleanConstructor;
        readonly text: BooleanConstructor;
        readonly link: BooleanConstructor;
        readonly bg: BooleanConstructor;
        readonly autofocus: BooleanConstructor;
        readonly round: BooleanConstructor;
        readonly circle: BooleanConstructor;
        readonly color: StringConstructor;
        readonly dark: BooleanConstructor;
        readonly autoInsertSpace: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly tag: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, "button", boolean>;
    }>> & {
        onClick?: ((evt: MouseEvent) => any) | undefined;
    }, {
        readonly type: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown>;
        readonly link: boolean;
        readonly dark: boolean;
        readonly disabled: boolean;
        readonly text: boolean;
        readonly autofocus: boolean;
        readonly round: boolean;
        readonly circle: boolean;
        readonly tag: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>;
        readonly nativeType: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "reset" | "submit" | "button", unknown>;
        readonly loadingIcon: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>;
        readonly autoInsertSpace: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly loading: boolean;
        readonly plain: boolean;
        readonly bg: boolean;
    }>> & {
        ButtonGroup: import("vue").DefineComponent<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly size: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
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
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown, "", boolean>;
        }>>, {
            readonly type: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "success" | "warning" | "info" | "text" | "primary" | "danger", unknown>;
        }>;
    };
    vClickOutside: import("vue").ObjectDirective<any, any>;
    ElInput: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
        readonly resize: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
        readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
        readonly formatter: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parser: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly placeholder: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly form: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly suffixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly prefixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
        readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
        readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
            readonly resize: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
            readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
            readonly formatter: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parser: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly placeholder: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly form: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly suffixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly prefixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
            readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
            readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        }>> & {
            onChange?: ((value: string) => any) | undefined;
            "onUpdate:modelValue"?: ((value: string) => any) | undefined;
            onInput?: ((value: string) => any) | undefined;
            onBlur?: ((evt: FocusEvent) => any) | undefined;
            onFocus?: ((evt: FocusEvent) => any) | undefined;
            onClear?: (() => any) | undefined;
            onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
            onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
            onMouseenter?: ((evt: MouseEvent) => any) | undefined;
            onMouseleave?: ((evt: MouseEvent) => any) | undefined;
        }>>;
        emit: ((event: "update:modelValue", value: string) => void) & ((event: "change", value: string) => void) & ((event: "input", value: string) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "compositionend", evt: CompositionEvent) => void) & ((event: "compositionstart", evt: CompositionEvent) => void) & ((event: "compositionupdate", evt: CompositionEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "keydown", evt: Event | KeyboardEvent) => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void) & ((event: "clear") => void);
        rawAttrs: {
            [x: string]: unknown;
        };
        slots: Readonly<{
            [name: string]: import("vue").Slot | undefined;
        }>;
        containerAttrs: import("vue").ComputedRef<Record<string, unknown>>;
        containerKls: import("vue").ComputedRef<unknown[]>;
        wrapperKls: import("vue").ComputedRef<string[]>;
        attrs: import("vue").ComputedRef<Record<string, unknown>>;
        form: import("../../..").FormContext | undefined;
        formItem: import("../../..").FormItemContext | undefined;
        inputId: import("vue").Ref<string | undefined>;
        inputSize: import("vue").ComputedRef<"" | "default" | "small" | "large">;
        inputDisabled: import("vue").ComputedRef<boolean>;
        nsInput: {
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
        nsTextarea: {
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
        input: import("vue").ShallowRef<HTMLInputElement | undefined>;
        textarea: import("vue").ShallowRef<HTMLTextAreaElement | undefined>;
        hovering: import("vue").Ref<boolean>;
        isComposing: import("vue").Ref<boolean>;
        passwordVisible: import("vue").Ref<boolean>;
        countStyle: import("vue").Ref<import("vue").StyleValue | undefined>;
        textareaCalcStyle: import("vue").ShallowRef<import("vue").StyleValue>;
        _ref: import("vue").ComputedRef<HTMLInputElement | HTMLTextAreaElement | undefined>;
        wrapperRef: import("vue").ShallowRef<HTMLElement | undefined>;
        isFocused: import("vue").Ref<boolean>;
        handleFocus: (event: FocusEvent) => void;
        handleBlur: (event: FocusEvent) => void;
        needStatusIcon: import("vue").ComputedRef<boolean>;
        validateState: import("vue").ComputedRef<"" | "error" | "success" | "validating">;
        validateIcon: import("vue").ComputedRef<any>;
        passwordIcon: import("vue").ComputedRef<any>;
        containerStyle: import("vue").ComputedRef<import("vue").StyleValue>;
        textareaStyle: import("vue").ComputedRef<import("vue").StyleValue>;
        nativeInputValue: import("vue").ComputedRef<string>;
        showClear: import("vue").ComputedRef<boolean>;
        showPwdVisible: import("vue").ComputedRef<boolean>;
        isWordLimitVisible: import("vue").ComputedRef<boolean>;
        textLength: import("vue").ComputedRef<number>;
        inputExceed: import("vue").ComputedRef<boolean>;
        suffixVisible: import("vue").ComputedRef<boolean>;
        recordCursor: () => void;
        setCursor: () => void;
        resizeTextarea: () => void;
        createOnceInitResize: (resizeTextarea: () => void) => () => void;
        onceInitSizeTextarea: () => void;
        setNativeInputValue: () => void;
        handleInput: (event: Event) => Promise<void>;
        handleChange: (event: Event) => void;
        handleCompositionStart: (event: CompositionEvent) => void;
        handleCompositionUpdate: (event: CompositionEvent) => void;
        handleCompositionEnd: (event: CompositionEvent) => void;
        handlePasswordVisible: () => void;
        focus: () => Promise<void>;
        blur: () => void | undefined;
        handleMouseLeave: (evt: MouseEvent) => void;
        handleMouseEnter: (evt: MouseEvent) => void;
        handleKeydown: (evt: KeyboardEvent) => void;
        select: () => void;
        clear: () => void;
        ElIcon: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
        CircleClose: any;
        NOOP: () => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        "update:modelValue": (value: string) => boolean;
        input: (value: string) => boolean;
        change: (value: string) => boolean;
        focus: (evt: FocusEvent) => boolean;
        blur: (evt: FocusEvent) => boolean;
        clear: () => boolean;
        mouseleave: (evt: MouseEvent) => boolean;
        mouseenter: (evt: MouseEvent) => boolean;
        keydown: (evt: Event | KeyboardEvent) => boolean;
        compositionstart: (evt: CompositionEvent) => boolean;
        compositionupdate: (evt: CompositionEvent) => boolean;
        compositionend: (evt: CompositionEvent) => boolean;
    }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
        readonly resize: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
        readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
        readonly formatter: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parser: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly placeholder: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly form: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly suffixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly prefixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
        readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
        readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    }>> & {
        onChange?: ((value: string) => any) | undefined;
        "onUpdate:modelValue"?: ((value: string) => any) | undefined;
        onInput?: ((value: string) => any) | undefined;
        onBlur?: ((evt: FocusEvent) => any) | undefined;
        onFocus?: ((evt: FocusEvent) => any) | undefined;
        onClear?: (() => any) | undefined;
        onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
        onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
        onMouseenter?: ((evt: MouseEvent) => any) | undefined;
        onMouseleave?: ((evt: MouseEvent) => any) | undefined;
    }, {
        readonly type: string;
        readonly modelValue: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown>;
        readonly label: string;
        readonly id: string;
        readonly disabled: boolean;
        readonly clearable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly autosize: import("element-plus/es/components/input").InputAutoSize;
        readonly autocomplete: string;
        readonly readonly: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly showPassword: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly containerRole: string;
        readonly tabindex: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
        readonly validateEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly inputStyle: import("vue").StyleValue;
        readonly autofocus: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    }>> & Record<string, any>;
    TimePickPanel: import("vue").DefineComponent<{
        readonly datetimeRole: StringConstructor;
        readonly parsedValue: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly visible: BooleanConstructor;
        readonly actualVisible: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly datetimeRole: StringConstructor;
            readonly parsedValue: {
                readonly type: import("vue").PropType<dayjs.Dayjs>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly visible: BooleanConstructor;
            readonly actualVisible: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
            readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        }>> & {
            onPick?: ((...args: any[]) => any) | undefined;
            "onSelect-range"?: ((...args: any[]) => any) | undefined;
            "onSet-picker-option"?: ((...args: any[]) => any) | undefined;
        }>>;
        emit: (event: "pick" | "select-range" | "set-picker-option", ...args: any[]) => void;
        pickerBase: any;
        arrowControl: any;
        disabledHours: any;
        disabledMinutes: any;
        disabledSeconds: any;
        defaultValue: any;
        getAvailableHours: import("../../../time-picker/src/types").GetDisabledHoursState;
        getAvailableMinutes: import("../../../time-picker/src/types").GetDisabledMinutesState;
        getAvailableSeconds: import("../../../time-picker/src/types").GetDisabledSecondsState;
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
        selectionRange: import("vue").Ref<number[]>;
        oldValue: import("vue").Ref<string | {
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
        } | {
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
        }[] | undefined>;
        transitionName: import("vue").ComputedRef<string>;
        showSeconds: import("vue").ComputedRef<boolean>;
        amPmMode: import("vue").ComputedRef<"" | "A" | "a">;
        isValidValue: (_date: dayjs.Dayjs) => boolean;
        handleCancel: () => void;
        handleConfirm: (visible?: boolean, first?: boolean) => void;
        handleChange: (_date: dayjs.Dayjs) => void;
        setSelectionRange: (start: number, end: number) => void;
        changeSelectionRange: (step: number) => void;
        handleKeydown: (event: KeyboardEvent) => void;
        timePickerOptions: Record<string, (...args: any[]) => void>;
        onSetOption: ([key, val]: [string, (...args: any[]) => void]) => void;
        getAvailableTime: (date: dayjs.Dayjs, role: string, first: boolean, compareDate?: dayjs.Dayjs | undefined) => dayjs.Dayjs;
        getRangeAvailableTime: (date: dayjs.Dayjs) => dayjs.Dayjs;
        parseUserInput: (value: dayjs.Dayjs) => dayjs.Dayjs | null;
        formatToString: (value: dayjs.Dayjs) => string | null;
        getDefaultValue: () => dayjs.Dayjs;
        TimeSpinner: import("vue").DefineComponent<{
            readonly disabledHours: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledHours>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabledMinutes: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledMinutes>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabledSeconds: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledSeconds>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly role: {
                readonly type: import("vue").PropType<string>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly spinnerDate: {
                readonly type: import("vue").PropType<dayjs.Dayjs>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly showSeconds: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly arrowControl: BooleanConstructor;
            readonly amPmMode: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a") | ((new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a"))[], unknown, unknown, "", boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly disabledHours: {
                    readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledHours>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly disabledMinutes: {
                    readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledMinutes>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly disabledSeconds: {
                    readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledSeconds>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly role: {
                    readonly type: import("vue").PropType<string>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly spinnerDate: {
                    readonly type: import("vue").PropType<dayjs.Dayjs>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly showSeconds: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly arrowControl: BooleanConstructor;
                readonly amPmMode: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a") | ((new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a"))[], unknown, unknown, "", boolean>;
            }>> & {
                onChange?: ((...args: any[]) => any) | undefined;
                "onSelect-range"?: ((...args: any[]) => any) | undefined;
                "onSet-option"?: ((...args: any[]) => any) | undefined;
            }>>;
            emit: (event: "change" | "select-range" | "set-option", ...args: any[]) => void;
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
            getHoursList: (role: string, compare?: dayjs.Dayjs | undefined) => boolean[];
            getMinutesList: (hour: number, role: string, compare?: dayjs.Dayjs | undefined) => boolean[];
            getSecondsList: (hour: number, minute: number, role: string, compare?: dayjs.Dayjs | undefined) => boolean[];
            isScrolling: boolean;
            currentScrollbar: import("vue").Ref<"hours" | "minutes" | "seconds" | undefined>;
            listHoursRef: import("vue").Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
                $attrs: {
                    [x: string]: unknown;
                };
                $refs: {
                    [x: string]: unknown;
                };
                $slots: Readonly<{
                    [name: string]: import("vue").Slot | undefined;
                }>;
                $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
                $el: any;
                $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }, {
                    COMPONENT_NAME: string;
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                        readonly noresize: BooleanConstructor;
                        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                        readonly always: BooleanConstructor;
                        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                        readonly id: StringConstructor;
                        readonly role: StringConstructor;
                        readonly ariaLabel: StringConstructor;
                        readonly ariaOrientation: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                    }>> & {
                        onScroll?: ((args_0: {
                            scrollTop: number;
                            scrollLeft: number;
                        }) => any) | undefined;
                    }>>;
                    emit: (event: "scroll", args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => void;
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
                    stopResizeObserver: undefined;
                    stopResizeListener: undefined;
                    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                    resizeRef: import("vue").Ref<HTMLElement | undefined>;
                    sizeWidth: import("vue").Ref<string>;
                    sizeHeight: import("vue").Ref<string>;
                    barRef: import("vue").Ref<({
                        $: import("vue").ComponentInternalInstance;
                        $data: {};
                        $props: Partial<{
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                        $attrs: {
                            [x: string]: unknown;
                        };
                        $refs: {
                            [x: string]: unknown;
                        };
                        $slots: Readonly<{
                            [name: string]: import("vue").Slot | undefined;
                        }>;
                        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $emit: (event: string, ...args: any[]) => void;
                        $el: any;
                        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>>, {
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                                readonly width: StringConstructor;
                                readonly height: StringConstructor;
                                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            moveX: import("vue").Ref<number>;
                            moveY: import("vue").Ref<number>;
                            handleScroll: (wrap: HTMLDivElement) => void;
                            Thumb: import("vue").DefineComponent<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }, {
                                COMPONENT_NAME: string;
                                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                    readonly vertical: BooleanConstructor;
                                    readonly size: StringConstructor;
                                    readonly move: NumberConstructor;
                                    readonly ratio: {
                                        readonly type: import("vue").PropType<number>;
                                        readonly required: true;
                                        readonly validator: ((val: unknown) => boolean) | undefined;
                                        __epPropKey: true;
                                    };
                                    readonly always: BooleanConstructor;
                                }>> & {
                                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                                }>>;
                                scrollbar: import("../../..").ScrollbarContext;
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
                                instance: import("vue").Ref<HTMLDivElement | undefined>;
                                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                                thumbState: import("vue").Ref<{
                                    X?: number | undefined;
                                    Y?: number | undefined;
                                }>;
                                visible: import("vue").Ref<boolean>;
                                cursorDown: boolean;
                                cursorLeave: boolean;
                                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                                bar: import("vue").ComputedRef<{
                                    readonly offset: "offsetHeight";
                                    readonly scroll: "scrollTop";
                                    readonly scrollSize: "scrollHeight";
                                    readonly size: "height";
                                    readonly key: "vertical";
                                    readonly axis: "Y";
                                    readonly client: "clientY";
                                    readonly direction: "top";
                                } | {
                                    readonly offset: "offsetWidth";
                                    readonly scroll: "scrollLeft";
                                    readonly scrollSize: "scrollWidth";
                                    readonly size: "width";
                                    readonly key: "horizontal";
                                    readonly axis: "X";
                                    readonly client: "clientX";
                                    readonly direction: "left";
                                }>;
                                thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                                offsetRatio: import("vue").ComputedRef<number>;
                                clickThumbHandler: (e: MouseEvent) => void;
                                clickTrackHandler: (e: MouseEvent) => void;
                                startDrag: (e: MouseEvent) => void;
                                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                                mouseUpDocumentHandler: () => void;
                                mouseMoveScrollbarHandler: () => void;
                                mouseLeaveScrollbarHandler: () => void;
                                restoreOnselectstart: () => void;
                            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>>, {
                                readonly vertical: boolean;
                                readonly always: boolean;
                            }>;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & {
                            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                            created?: ((() => void) | (() => void)[]) | undefined;
                            beforeMount?: ((() => void) | (() => void)[]) | undefined;
                            mounted?: ((() => void) | (() => void)[]) | undefined;
                            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                            updated?: ((() => void) | (() => void)[]) | undefined;
                            activated?: ((() => void) | (() => void)[]) | undefined;
                            deactivated?: ((() => void) | (() => void)[]) | undefined;
                            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                            destroyed?: ((() => void) | (() => void)[]) | undefined;
                            unmounted?: ((() => void) | (() => void)[]) | undefined;
                            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                        };
                        $forceUpdate: () => void;
                        $nextTick: typeof nextTick;
                        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                    } & Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").ShallowUnwrapRef<{
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                    ratioY: import("vue").Ref<number>;
                    ratioX: import("vue").Ref<number>;
                    wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                        [x: string]: boolean;
                    })[]>;
                    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                    handleScroll: () => void;
                    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                    setScrollTop: (value: number) => void;
                    setScrollLeft: (value: number) => void;
                    update: () => void;
                    Bar: import("vue").DefineComponent<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    scroll: ({ scrollTop, scrollLeft, }: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => boolean;
                }, string, {
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & {
                    beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                    created?: ((() => void) | (() => void)[]) | undefined;
                    beforeMount?: ((() => void) | (() => void)[]) | undefined;
                    mounted?: ((() => void) | (() => void)[]) | undefined;
                    beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                    updated?: ((() => void) | (() => void)[]) | undefined;
                    activated?: ((() => void) | (() => void)[]) | undefined;
                    deactivated?: ((() => void) | (() => void)[]) | undefined;
                    beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                    beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                    destroyed?: ((() => void) | (() => void)[]) | undefined;
                    unmounted?: ((() => void) | (() => void)[]) | undefined;
                    renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                };
                $forceUpdate: () => void;
                $nextTick: typeof nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            } & import("vue").ShallowUnwrapRef<{
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>;
            listMinutesRef: import("vue").Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
                $attrs: {
                    [x: string]: unknown;
                };
                $refs: {
                    [x: string]: unknown;
                };
                $slots: Readonly<{
                    [name: string]: import("vue").Slot | undefined;
                }>;
                $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
                $el: any;
                $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }, {
                    COMPONENT_NAME: string;
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                        readonly noresize: BooleanConstructor;
                        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                        readonly always: BooleanConstructor;
                        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                        readonly id: StringConstructor;
                        readonly role: StringConstructor;
                        readonly ariaLabel: StringConstructor;
                        readonly ariaOrientation: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                    }>> & {
                        onScroll?: ((args_0: {
                            scrollTop: number;
                            scrollLeft: number;
                        }) => any) | undefined;
                    }>>;
                    emit: (event: "scroll", args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => void;
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
                    stopResizeObserver: undefined;
                    stopResizeListener: undefined;
                    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                    resizeRef: import("vue").Ref<HTMLElement | undefined>;
                    sizeWidth: import("vue").Ref<string>;
                    sizeHeight: import("vue").Ref<string>;
                    barRef: import("vue").Ref<({
                        $: import("vue").ComponentInternalInstance;
                        $data: {};
                        $props: Partial<{
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                        $attrs: {
                            [x: string]: unknown;
                        };
                        $refs: {
                            [x: string]: unknown;
                        };
                        $slots: Readonly<{
                            [name: string]: import("vue").Slot | undefined;
                        }>;
                        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $emit: (event: string, ...args: any[]) => void;
                        $el: any;
                        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>>, {
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                                readonly width: StringConstructor;
                                readonly height: StringConstructor;
                                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            moveX: import("vue").Ref<number>;
                            moveY: import("vue").Ref<number>;
                            handleScroll: (wrap: HTMLDivElement) => void;
                            Thumb: import("vue").DefineComponent<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }, {
                                COMPONENT_NAME: string;
                                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                    readonly vertical: BooleanConstructor;
                                    readonly size: StringConstructor;
                                    readonly move: NumberConstructor;
                                    readonly ratio: {
                                        readonly type: import("vue").PropType<number>;
                                        readonly required: true;
                                        readonly validator: ((val: unknown) => boolean) | undefined;
                                        __epPropKey: true;
                                    };
                                    readonly always: BooleanConstructor;
                                }>> & {
                                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                                }>>;
                                scrollbar: import("../../..").ScrollbarContext;
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
                                instance: import("vue").Ref<HTMLDivElement | undefined>;
                                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                                thumbState: import("vue").Ref<{
                                    X?: number | undefined;
                                    Y?: number | undefined;
                                }>;
                                visible: import("vue").Ref<boolean>;
                                cursorDown: boolean;
                                cursorLeave: boolean;
                                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                                bar: import("vue").ComputedRef<{
                                    readonly offset: "offsetHeight";
                                    readonly scroll: "scrollTop";
                                    readonly scrollSize: "scrollHeight";
                                    readonly size: "height";
                                    readonly key: "vertical";
                                    readonly axis: "Y";
                                    readonly client: "clientY";
                                    readonly direction: "top";
                                } | {
                                    readonly offset: "offsetWidth";
                                    readonly scroll: "scrollLeft";
                                    readonly scrollSize: "scrollWidth";
                                    readonly size: "width";
                                    readonly key: "horizontal";
                                    readonly axis: "X";
                                    readonly client: "clientX";
                                    readonly direction: "left";
                                }>;
                                thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                                offsetRatio: import("vue").ComputedRef<number>;
                                clickThumbHandler: (e: MouseEvent) => void;
                                clickTrackHandler: (e: MouseEvent) => void;
                                startDrag: (e: MouseEvent) => void;
                                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                                mouseUpDocumentHandler: () => void;
                                mouseMoveScrollbarHandler: () => void;
                                mouseLeaveScrollbarHandler: () => void;
                                restoreOnselectstart: () => void;
                            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>>, {
                                readonly vertical: boolean;
                                readonly always: boolean;
                            }>;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & {
                            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                            created?: ((() => void) | (() => void)[]) | undefined;
                            beforeMount?: ((() => void) | (() => void)[]) | undefined;
                            mounted?: ((() => void) | (() => void)[]) | undefined;
                            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                            updated?: ((() => void) | (() => void)[]) | undefined;
                            activated?: ((() => void) | (() => void)[]) | undefined;
                            deactivated?: ((() => void) | (() => void)[]) | undefined;
                            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                            destroyed?: ((() => void) | (() => void)[]) | undefined;
                            unmounted?: ((() => void) | (() => void)[]) | undefined;
                            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                        };
                        $forceUpdate: () => void;
                        $nextTick: typeof nextTick;
                        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                    } & Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").ShallowUnwrapRef<{
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                    ratioY: import("vue").Ref<number>;
                    ratioX: import("vue").Ref<number>;
                    wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                        [x: string]: boolean;
                    })[]>;
                    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                    handleScroll: () => void;
                    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                    setScrollTop: (value: number) => void;
                    setScrollLeft: (value: number) => void;
                    update: () => void;
                    Bar: import("vue").DefineComponent<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    scroll: ({ scrollTop, scrollLeft, }: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => boolean;
                }, string, {
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & {
                    beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                    created?: ((() => void) | (() => void)[]) | undefined;
                    beforeMount?: ((() => void) | (() => void)[]) | undefined;
                    mounted?: ((() => void) | (() => void)[]) | undefined;
                    beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                    updated?: ((() => void) | (() => void)[]) | undefined;
                    activated?: ((() => void) | (() => void)[]) | undefined;
                    deactivated?: ((() => void) | (() => void)[]) | undefined;
                    beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                    beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                    destroyed?: ((() => void) | (() => void)[]) | undefined;
                    unmounted?: ((() => void) | (() => void)[]) | undefined;
                    renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                };
                $forceUpdate: () => void;
                $nextTick: typeof nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            } & import("vue").ShallowUnwrapRef<{
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>;
            listSecondsRef: import("vue").Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
                $attrs: {
                    [x: string]: unknown;
                };
                $refs: {
                    [x: string]: unknown;
                };
                $slots: Readonly<{
                    [name: string]: import("vue").Slot | undefined;
                }>;
                $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
                $el: any;
                $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }, {
                    COMPONENT_NAME: string;
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                        readonly noresize: BooleanConstructor;
                        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                        readonly always: BooleanConstructor;
                        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                        readonly id: StringConstructor;
                        readonly role: StringConstructor;
                        readonly ariaLabel: StringConstructor;
                        readonly ariaOrientation: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                    }>> & {
                        onScroll?: ((args_0: {
                            scrollTop: number;
                            scrollLeft: number;
                        }) => any) | undefined;
                    }>>;
                    emit: (event: "scroll", args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => void;
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
                    stopResizeObserver: undefined;
                    stopResizeListener: undefined;
                    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                    resizeRef: import("vue").Ref<HTMLElement | undefined>;
                    sizeWidth: import("vue").Ref<string>;
                    sizeHeight: import("vue").Ref<string>;
                    barRef: import("vue").Ref<({
                        $: import("vue").ComponentInternalInstance;
                        $data: {};
                        $props: Partial<{
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                        $attrs: {
                            [x: string]: unknown;
                        };
                        $refs: {
                            [x: string]: unknown;
                        };
                        $slots: Readonly<{
                            [name: string]: import("vue").Slot | undefined;
                        }>;
                        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $emit: (event: string, ...args: any[]) => void;
                        $el: any;
                        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>>, {
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                                readonly width: StringConstructor;
                                readonly height: StringConstructor;
                                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            moveX: import("vue").Ref<number>;
                            moveY: import("vue").Ref<number>;
                            handleScroll: (wrap: HTMLDivElement) => void;
                            Thumb: import("vue").DefineComponent<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }, {
                                COMPONENT_NAME: string;
                                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                    readonly vertical: BooleanConstructor;
                                    readonly size: StringConstructor;
                                    readonly move: NumberConstructor;
                                    readonly ratio: {
                                        readonly type: import("vue").PropType<number>;
                                        readonly required: true;
                                        readonly validator: ((val: unknown) => boolean) | undefined;
                                        __epPropKey: true;
                                    };
                                    readonly always: BooleanConstructor;
                                }>> & {
                                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                                }>>;
                                scrollbar: import("../../..").ScrollbarContext;
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
                                instance: import("vue").Ref<HTMLDivElement | undefined>;
                                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                                thumbState: import("vue").Ref<{
                                    X?: number | undefined;
                                    Y?: number | undefined;
                                }>;
                                visible: import("vue").Ref<boolean>;
                                cursorDown: boolean;
                                cursorLeave: boolean;
                                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                                bar: import("vue").ComputedRef<{
                                    readonly offset: "offsetHeight";
                                    readonly scroll: "scrollTop";
                                    readonly scrollSize: "scrollHeight";
                                    readonly size: "height";
                                    readonly key: "vertical";
                                    readonly axis: "Y";
                                    readonly client: "clientY";
                                    readonly direction: "top";
                                } | {
                                    readonly offset: "offsetWidth";
                                    readonly scroll: "scrollLeft";
                                    readonly scrollSize: "scrollWidth";
                                    readonly size: "width";
                                    readonly key: "horizontal";
                                    readonly axis: "X";
                                    readonly client: "clientX";
                                    readonly direction: "left";
                                }>;
                                thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                                offsetRatio: import("vue").ComputedRef<number>;
                                clickThumbHandler: (e: MouseEvent) => void;
                                clickTrackHandler: (e: MouseEvent) => void;
                                startDrag: (e: MouseEvent) => void;
                                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                                mouseUpDocumentHandler: () => void;
                                mouseMoveScrollbarHandler: () => void;
                                mouseLeaveScrollbarHandler: () => void;
                                restoreOnselectstart: () => void;
                            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>>, {
                                readonly vertical: boolean;
                                readonly always: boolean;
                            }>;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & {
                            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                            created?: ((() => void) | (() => void)[]) | undefined;
                            beforeMount?: ((() => void) | (() => void)[]) | undefined;
                            mounted?: ((() => void) | (() => void)[]) | undefined;
                            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                            updated?: ((() => void) | (() => void)[]) | undefined;
                            activated?: ((() => void) | (() => void)[]) | undefined;
                            deactivated?: ((() => void) | (() => void)[]) | undefined;
                            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                            destroyed?: ((() => void) | (() => void)[]) | undefined;
                            unmounted?: ((() => void) | (() => void)[]) | undefined;
                            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                        };
                        $forceUpdate: () => void;
                        $nextTick: typeof nextTick;
                        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                    } & Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").ShallowUnwrapRef<{
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                    ratioY: import("vue").Ref<number>;
                    ratioX: import("vue").Ref<number>;
                    wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                        [x: string]: boolean;
                    })[]>;
                    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                    handleScroll: () => void;
                    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                    setScrollTop: (value: number) => void;
                    setScrollLeft: (value: number) => void;
                    update: () => void;
                    Bar: import("vue").DefineComponent<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    scroll: ({ scrollTop, scrollLeft, }: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => boolean;
                }, string, {
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & {
                    beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                    created?: ((() => void) | (() => void)[]) | undefined;
                    beforeMount?: ((() => void) | (() => void)[]) | undefined;
                    mounted?: ((() => void) | (() => void)[]) | undefined;
                    beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                    updated?: ((() => void) | (() => void)[]) | undefined;
                    activated?: ((() => void) | (() => void)[]) | undefined;
                    deactivated?: ((() => void) | (() => void)[]) | undefined;
                    beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                    beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                    destroyed?: ((() => void) | (() => void)[]) | undefined;
                    unmounted?: ((() => void) | (() => void)[]) | undefined;
                    renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                };
                $forceUpdate: () => void;
                $nextTick: typeof nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            } & import("vue").ShallowUnwrapRef<{
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>;
            listRefsMap: Record<"hours" | "minutes" | "seconds", import("vue").Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
                $attrs: {
                    [x: string]: unknown;
                };
                $refs: {
                    [x: string]: unknown;
                };
                $slots: Readonly<{
                    [name: string]: import("vue").Slot | undefined;
                }>;
                $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
                $el: any;
                $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }, {
                    COMPONENT_NAME: string;
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                        readonly noresize: BooleanConstructor;
                        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                        readonly always: BooleanConstructor;
                        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                        readonly id: StringConstructor;
                        readonly role: StringConstructor;
                        readonly ariaLabel: StringConstructor;
                        readonly ariaOrientation: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                    }>> & {
                        onScroll?: ((args_0: {
                            scrollTop: number;
                            scrollLeft: number;
                        }) => any) | undefined;
                    }>>;
                    emit: (event: "scroll", args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => void;
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
                    stopResizeObserver: undefined;
                    stopResizeListener: undefined;
                    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                    resizeRef: import("vue").Ref<HTMLElement | undefined>;
                    sizeWidth: import("vue").Ref<string>;
                    sizeHeight: import("vue").Ref<string>;
                    barRef: import("vue").Ref<({
                        $: import("vue").ComponentInternalInstance;
                        $data: {};
                        $props: Partial<{
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                        $attrs: {
                            [x: string]: unknown;
                        };
                        $refs: {
                            [x: string]: unknown;
                        };
                        $slots: Readonly<{
                            [name: string]: import("vue").Slot | undefined;
                        }>;
                        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $emit: (event: string, ...args: any[]) => void;
                        $el: any;
                        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>>, {
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                                readonly width: StringConstructor;
                                readonly height: StringConstructor;
                                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            moveX: import("vue").Ref<number>;
                            moveY: import("vue").Ref<number>;
                            handleScroll: (wrap: HTMLDivElement) => void;
                            Thumb: import("vue").DefineComponent<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }, {
                                COMPONENT_NAME: string;
                                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                    readonly vertical: BooleanConstructor;
                                    readonly size: StringConstructor;
                                    readonly move: NumberConstructor;
                                    readonly ratio: {
                                        readonly type: import("vue").PropType<number>;
                                        readonly required: true;
                                        readonly validator: ((val: unknown) => boolean) | undefined;
                                        __epPropKey: true;
                                    };
                                    readonly always: BooleanConstructor;
                                }>> & {
                                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                                }>>;
                                scrollbar: import("../../..").ScrollbarContext;
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
                                instance: import("vue").Ref<HTMLDivElement | undefined>;
                                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                                thumbState: import("vue").Ref<{
                                    X?: number | undefined;
                                    Y?: number | undefined;
                                }>;
                                visible: import("vue").Ref<boolean>;
                                cursorDown: boolean;
                                cursorLeave: boolean;
                                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                                bar: import("vue").ComputedRef<{
                                    readonly offset: "offsetHeight";
                                    readonly scroll: "scrollTop";
                                    readonly scrollSize: "scrollHeight";
                                    readonly size: "height";
                                    readonly key: "vertical";
                                    readonly axis: "Y";
                                    readonly client: "clientY";
                                    readonly direction: "top";
                                } | {
                                    readonly offset: "offsetWidth";
                                    readonly scroll: "scrollLeft";
                                    readonly scrollSize: "scrollWidth";
                                    readonly size: "width";
                                    readonly key: "horizontal";
                                    readonly axis: "X";
                                    readonly client: "clientX";
                                    readonly direction: "left";
                                }>;
                                thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                                offsetRatio: import("vue").ComputedRef<number>;
                                clickThumbHandler: (e: MouseEvent) => void;
                                clickTrackHandler: (e: MouseEvent) => void;
                                startDrag: (e: MouseEvent) => void;
                                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                                mouseUpDocumentHandler: () => void;
                                mouseMoveScrollbarHandler: () => void;
                                mouseLeaveScrollbarHandler: () => void;
                                restoreOnselectstart: () => void;
                            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>>, {
                                readonly vertical: boolean;
                                readonly always: boolean;
                            }>;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & {
                            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                            created?: ((() => void) | (() => void)[]) | undefined;
                            beforeMount?: ((() => void) | (() => void)[]) | undefined;
                            mounted?: ((() => void) | (() => void)[]) | undefined;
                            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                            updated?: ((() => void) | (() => void)[]) | undefined;
                            activated?: ((() => void) | (() => void)[]) | undefined;
                            deactivated?: ((() => void) | (() => void)[]) | undefined;
                            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                            destroyed?: ((() => void) | (() => void)[]) | undefined;
                            unmounted?: ((() => void) | (() => void)[]) | undefined;
                            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                        };
                        $forceUpdate: () => void;
                        $nextTick: typeof nextTick;
                        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                    } & Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").ShallowUnwrapRef<{
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                    ratioY: import("vue").Ref<number>;
                    ratioX: import("vue").Ref<number>;
                    wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                        [x: string]: boolean;
                    })[]>;
                    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                    handleScroll: () => void;
                    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                    setScrollTop: (value: number) => void;
                    setScrollLeft: (value: number) => void;
                    update: () => void;
                    Bar: import("vue").DefineComponent<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    scroll: ({ scrollTop, scrollLeft, }: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => boolean;
                }, string, {
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & {
                    beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                    created?: ((() => void) | (() => void)[]) | undefined;
                    beforeMount?: ((() => void) | (() => void)[]) | undefined;
                    mounted?: ((() => void) | (() => void)[]) | undefined;
                    beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                    updated?: ((() => void) | (() => void)[]) | undefined;
                    activated?: ((() => void) | (() => void)[]) | undefined;
                    deactivated?: ((() => void) | (() => void)[]) | undefined;
                    beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                    beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                    destroyed?: ((() => void) | (() => void)[]) | undefined;
                    unmounted?: ((() => void) | (() => void)[]) | undefined;
                    renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                };
                $forceUpdate: () => void;
                $nextTick: typeof nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            } & import("vue").ShallowUnwrapRef<{
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>>;
            spinnerItems: import("vue").ComputedRef<readonly ["hours", "minutes", "seconds"] | ("hours" | "minutes" | "seconds")[]>;
            timePartials: import("vue").ComputedRef<Record<"hours" | "minutes" | "seconds", number>>;
            timeList: import("vue").ComputedRef<{
                hours: boolean[];
                minutes: boolean[];
                seconds: boolean[];
            }>;
            arrowControlTimeList: import("vue").ComputedRef<Record<"hours" | "minutes" | "seconds", import("element-plus/es/components/time-picker").TimeList>>;
            debouncedResetScroll: import("lodash").DebouncedFunc<(type: any) => void>;
            getAmPmFlag: (hour: number) => string;
            emitSelectRange: (type: "hours" | "minutes" | "seconds") => void;
            adjustCurrentSpinner: (type: "hours" | "minutes" | "seconds") => void;
            adjustSpinners: () => void;
            getScrollbarElement: (el: HTMLElement) => HTMLElement;
            adjustSpinner: (type: "hours" | "minutes" | "seconds", value: number) => void;
            typeItemHeight: (type: "hours" | "minutes" | "seconds") => number;
            onIncrement: () => void;
            onDecrement: () => void;
            scrollDown: (step: number) => void;
            findNextUnDisabled: (type: "hours" | "minutes" | "seconds", now: number, step: number, total: number) => number;
            modifyDateField: (type: "hours" | "minutes" | "seconds", value: number) => void;
            handleClick: (type: "hours" | "minutes" | "seconds", { value, disabled }: {
                value: number;
                disabled: boolean;
            }) => void;
            handleScroll: (type: "hours" | "minutes" | "seconds") => void;
            scrollBarHeight: (type: "hours" | "minutes" | "seconds") => any;
            bindScrollEvent: () => void;
            setRef: (scrollbar: {
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
                $attrs: {
                    [x: string]: unknown;
                };
                $refs: {
                    [x: string]: unknown;
                };
                $slots: Readonly<{
                    [name: string]: import("vue").Slot | undefined;
                }>;
                $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                $emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
                $el: any;
                $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }, {
                    COMPONENT_NAME: string;
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                        readonly noresize: BooleanConstructor;
                        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                        readonly always: BooleanConstructor;
                        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                        readonly id: StringConstructor;
                        readonly role: StringConstructor;
                        readonly ariaLabel: StringConstructor;
                        readonly ariaOrientation: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                    }>> & {
                        onScroll?: ((args_0: {
                            scrollTop: number;
                            scrollLeft: number;
                        }) => any) | undefined;
                    }>>;
                    emit: (event: "scroll", args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => void;
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
                    stopResizeObserver: undefined;
                    stopResizeListener: undefined;
                    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                    resizeRef: import("vue").Ref<HTMLElement | undefined>;
                    sizeWidth: import("vue").Ref<string>;
                    sizeHeight: import("vue").Ref<string>;
                    barRef: import("vue").Ref<({
                        $: import("vue").ComponentInternalInstance;
                        $data: {};
                        $props: Partial<{
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                        $attrs: {
                            [x: string]: unknown;
                        };
                        $refs: {
                            [x: string]: unknown;
                        };
                        $slots: Readonly<{
                            [name: string]: import("vue").Slot | undefined;
                        }>;
                        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                        $emit: (event: string, ...args: any[]) => void;
                        $el: any;
                        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>>, {
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                                readonly width: StringConstructor;
                                readonly height: StringConstructor;
                                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            moveX: import("vue").Ref<number>;
                            moveY: import("vue").Ref<number>;
                            handleScroll: (wrap: HTMLDivElement) => void;
                            Thumb: import("vue").DefineComponent<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }, {
                                COMPONENT_NAME: string;
                                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                    readonly vertical: BooleanConstructor;
                                    readonly size: StringConstructor;
                                    readonly move: NumberConstructor;
                                    readonly ratio: {
                                        readonly type: import("vue").PropType<number>;
                                        readonly required: true;
                                        readonly validator: ((val: unknown) => boolean) | undefined;
                                        __epPropKey: true;
                                    };
                                    readonly always: BooleanConstructor;
                                }>> & {
                                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                                }>>;
                                scrollbar: import("../../..").ScrollbarContext;
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
                                instance: import("vue").Ref<HTMLDivElement | undefined>;
                                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                                thumbState: import("vue").Ref<{
                                    X?: number | undefined;
                                    Y?: number | undefined;
                                }>;
                                visible: import("vue").Ref<boolean>;
                                cursorDown: boolean;
                                cursorLeave: boolean;
                                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                                bar: import("vue").ComputedRef<{
                                    readonly offset: "offsetHeight";
                                    readonly scroll: "scrollTop";
                                    readonly scrollSize: "scrollHeight";
                                    readonly size: "height";
                                    readonly key: "vertical";
                                    readonly axis: "Y";
                                    readonly client: "clientY";
                                    readonly direction: "top";
                                } | {
                                    readonly offset: "offsetWidth";
                                    readonly scroll: "scrollLeft";
                                    readonly scrollSize: "scrollWidth";
                                    readonly size: "width";
                                    readonly key: "horizontal";
                                    readonly axis: "X";
                                    readonly client: "clientX";
                                    readonly direction: "left";
                                }>;
                                thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                                offsetRatio: import("vue").ComputedRef<number>;
                                clickThumbHandler: (e: MouseEvent) => void;
                                clickTrackHandler: (e: MouseEvent) => void;
                                startDrag: (e: MouseEvent) => void;
                                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                                mouseUpDocumentHandler: () => void;
                                mouseMoveScrollbarHandler: () => void;
                                mouseLeaveScrollbarHandler: () => void;
                                restoreOnselectstart: () => void;
                            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>>, {
                                readonly vertical: boolean;
                                readonly always: boolean;
                            }>;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                            readonly ratioX: number;
                            readonly ratioY: number;
                        }> & {
                            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                            created?: ((() => void) | (() => void)[]) | undefined;
                            beforeMount?: ((() => void) | (() => void)[]) | undefined;
                            mounted?: ((() => void) | (() => void)[]) | undefined;
                            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                            updated?: ((() => void) | (() => void)[]) | undefined;
                            activated?: ((() => void) | (() => void)[]) | undefined;
                            deactivated?: ((() => void) | (() => void)[]) | undefined;
                            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                            destroyed?: ((() => void) | (() => void)[]) | undefined;
                            unmounted?: ((() => void) | (() => void)[]) | undefined;
                            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                        };
                        $forceUpdate: () => void;
                        $nextTick: typeof nextTick;
                        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                    } & Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").ShallowUnwrapRef<{
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                    ratioY: import("vue").Ref<number>;
                    ratioX: import("vue").Ref<number>;
                    wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                        [x: string]: boolean;
                    })[]>;
                    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                    handleScroll: () => void;
                    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                    setScrollTop: (value: number) => void;
                    setScrollLeft: (value: number) => void;
                    update: () => void;
                    Bar: import("vue").DefineComponent<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    scroll: ({ scrollTop, scrollLeft, }: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => boolean;
                }, string, {
                    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly always: boolean;
                    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly wrapStyle: import("vue").StyleValue;
                    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                    readonly tag: string;
                    readonly minSize: number;
                    readonly noresize: boolean;
                }> & {
                    beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                    created?: ((() => void) | (() => void)[]) | undefined;
                    beforeMount?: ((() => void) | (() => void)[]) | undefined;
                    mounted?: ((() => void) | (() => void)[]) | undefined;
                    beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                    updated?: ((() => void) | (() => void)[]) | undefined;
                    activated?: ((() => void) | (() => void)[]) | undefined;
                    deactivated?: ((() => void) | (() => void)[]) | undefined;
                    beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                    beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                    destroyed?: ((() => void) | (() => void)[]) | undefined;
                    unmounted?: ((() => void) | (() => void)[]) | undefined;
                    renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                    errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                };
                $forceUpdate: () => void;
                $nextTick: typeof nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            } & import("vue").ShallowUnwrapRef<{
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }> & {} & import("vue").ComponentCustomProperties, type: "hours" | "minutes" | "seconds") => void;
            vRepeatClick: import("vue").ObjectDirective<HTMLElement, import("../../../../directives/repeat-click").RepeatClickOptions | ((...args: unknown[]) => unknown)>;
            ElScrollbar: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }, {
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                    readonly noresize: BooleanConstructor;
                    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                    readonly always: BooleanConstructor;
                    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                    readonly id: StringConstructor;
                    readonly role: StringConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly ariaOrientation: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                }>> & {
                    onScroll?: ((args_0: {
                        scrollTop: number;
                        scrollLeft: number;
                    }) => any) | undefined;
                }>>;
                emit: (event: "scroll", args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => void;
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
                stopResizeObserver: undefined;
                stopResizeListener: undefined;
                scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
                wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
                resizeRef: import("vue").Ref<HTMLElement | undefined>;
                sizeWidth: import("vue").Ref<string>;
                sizeHeight: import("vue").Ref<string>;
                barRef: import("vue").Ref<({
                    $: import("vue").ComponentInternalInstance;
                    $data: {};
                    $props: Partial<{
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
                    $attrs: {
                        [x: string]: unknown;
                    };
                    $refs: {
                        [x: string]: unknown;
                    };
                    $slots: Readonly<{
                        [name: string]: import("vue").Slot | undefined;
                    }>;
                    $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
                    $emit: (event: string, ...args: any[]) => void;
                    $el: any;
                    $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>>, {
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                            readonly width: StringConstructor;
                            readonly height: StringConstructor;
                            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        moveX: import("vue").Ref<number>;
                        moveY: import("vue").Ref<number>;
                        handleScroll: (wrap: HTMLDivElement) => void;
                        Thumb: import("vue").DefineComponent<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }, {
                            COMPONENT_NAME: string;
                            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                                readonly vertical: BooleanConstructor;
                                readonly size: StringConstructor;
                                readonly move: NumberConstructor;
                                readonly ratio: {
                                    readonly type: import("vue").PropType<number>;
                                    readonly required: true;
                                    readonly validator: ((val: unknown) => boolean) | undefined;
                                    __epPropKey: true;
                                };
                                readonly always: BooleanConstructor;
                            }>> & {
                                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                            }>>;
                            scrollbar: import("../../..").ScrollbarContext;
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
                            instance: import("vue").Ref<HTMLDivElement | undefined>;
                            thumb: import("vue").Ref<HTMLDivElement | undefined>;
                            thumbState: import("vue").Ref<{
                                X?: number | undefined;
                                Y?: number | undefined;
                            }>;
                            visible: import("vue").Ref<boolean>;
                            cursorDown: boolean;
                            cursorLeave: boolean;
                            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                            bar: import("vue").ComputedRef<{
                                readonly offset: "offsetHeight";
                                readonly scroll: "scrollTop";
                                readonly scrollSize: "scrollHeight";
                                readonly size: "height";
                                readonly key: "vertical";
                                readonly axis: "Y";
                                readonly client: "clientY";
                                readonly direction: "top";
                            } | {
                                readonly offset: "offsetWidth";
                                readonly scroll: "scrollLeft";
                                readonly scrollSize: "scrollWidth";
                                readonly size: "width";
                                readonly key: "horizontal";
                                readonly axis: "X";
                                readonly client: "clientX";
                                readonly direction: "left";
                            }>;
                            thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                            offsetRatio: import("vue").ComputedRef<number>;
                            clickThumbHandler: (e: MouseEvent) => void;
                            clickTrackHandler: (e: MouseEvent) => void;
                            startDrag: (e: MouseEvent) => void;
                            mouseMoveDocumentHandler: (e: MouseEvent) => void;
                            mouseUpDocumentHandler: () => void;
                            mouseMoveScrollbarHandler: () => void;
                            mouseLeaveScrollbarHandler: () => void;
                            restoreOnselectstart: () => void;
                        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>>, {
                            readonly vertical: boolean;
                            readonly always: boolean;
                        }>;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                        readonly ratioX: number;
                        readonly ratioY: number;
                    }> & {
                        beforeCreate?: ((() => void) | (() => void)[]) | undefined;
                        created?: ((() => void) | (() => void)[]) | undefined;
                        beforeMount?: ((() => void) | (() => void)[]) | undefined;
                        mounted?: ((() => void) | (() => void)[]) | undefined;
                        beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
                        updated?: ((() => void) | (() => void)[]) | undefined;
                        activated?: ((() => void) | (() => void)[]) | undefined;
                        deactivated?: ((() => void) | (() => void)[]) | undefined;
                        beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
                        beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
                        destroyed?: ((() => void) | (() => void)[]) | undefined;
                        unmounted?: ((() => void) | (() => void)[]) | undefined;
                        renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
                        errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
                    };
                    $forceUpdate: () => void;
                    $nextTick: typeof nextTick;
                    $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
                } & Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>> & import("vue").ShallowUnwrapRef<{
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }> & {} & import("vue").ComponentCustomProperties) | undefined>;
                ratioY: import("vue").Ref<number>;
                ratioX: import("vue").Ref<number>;
                wrapStyle: import("vue").ComputedRef<import("vue").StyleValue>;
                wrapKls: import("vue").ComputedRef<(string | unknown[] | {
                    [x: string]: boolean;
                })[]>;
                resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
                handleScroll: () => void;
                scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
                setScrollTop: (value: number) => void;
                setScrollLeft: (value: number) => void;
                update: () => void;
                Bar: import("vue").DefineComponent<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly width: StringConstructor;
                        readonly height: StringConstructor;
                        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    moveX: import("vue").Ref<number>;
                    moveY: import("vue").Ref<number>;
                    handleScroll: (wrap: HTMLDivElement) => void;
                    Thumb: import("vue").DefineComponent<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }, {
                        COMPONENT_NAME: string;
                        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                            readonly vertical: BooleanConstructor;
                            readonly size: StringConstructor;
                            readonly move: NumberConstructor;
                            readonly ratio: {
                                readonly type: import("vue").PropType<number>;
                                readonly required: true;
                                readonly validator: ((val: unknown) => boolean) | undefined;
                                __epPropKey: true;
                            };
                            readonly always: BooleanConstructor;
                        }>> & {
                            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                        }>>;
                        scrollbar: import("../../..").ScrollbarContext;
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
                        instance: import("vue").Ref<HTMLDivElement | undefined>;
                        thumb: import("vue").Ref<HTMLDivElement | undefined>;
                        thumbState: import("vue").Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: import("vue").Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: import("vue").ComputedRef<{
                            readonly offset: "offsetHeight";
                            readonly scroll: "scrollTop";
                            readonly scrollSize: "scrollHeight";
                            readonly size: "height";
                            readonly key: "vertical";
                            readonly axis: "Y";
                            readonly client: "clientY";
                            readonly direction: "top";
                        } | {
                            readonly offset: "offsetWidth";
                            readonly scroll: "scrollLeft";
                            readonly scrollSize: "scrollWidth";
                            readonly size: "width";
                            readonly key: "horizontal";
                            readonly axis: "X";
                            readonly client: "clientX";
                            readonly direction: "left";
                        }>;
                        thumbStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: import("vue").ComputedRef<number>;
                        clickThumbHandler: (e: MouseEvent) => void;
                        clickTrackHandler: (e: MouseEvent) => void;
                        startDrag: (e: MouseEvent) => void;
                        mouseMoveDocumentHandler: (e: MouseEvent) => void;
                        mouseUpDocumentHandler: () => void;
                        mouseMoveScrollbarHandler: () => void;
                        mouseLeaveScrollbarHandler: () => void;
                        restoreOnselectstart: () => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        readonly vertical: BooleanConstructor;
                        readonly size: StringConstructor;
                        readonly move: NumberConstructor;
                        readonly ratio: {
                            readonly type: import("vue").PropType<number>;
                            readonly required: true;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly always: BooleanConstructor;
                    }>>, {
                        readonly vertical: boolean;
                        readonly always: boolean;
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly width: StringConstructor;
                    readonly height: StringConstructor;
                    readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                    readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                }>>, {
                    readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ratioX: number;
                    readonly ratioY: number;
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                scroll: ({ scrollTop, scrollLeft, }: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => boolean;
            }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
                readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown, "", boolean>;
                readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
                readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
                readonly noresize: BooleanConstructor;
                readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
                readonly always: BooleanConstructor;
                readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
                readonly id: StringConstructor;
                readonly role: StringConstructor;
                readonly ariaLabel: StringConstructor;
                readonly ariaOrientation: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
            }>> & {
                onScroll?: ((args_0: {
                    scrollTop: number;
                    scrollLeft: number;
                }) => any) | undefined;
            }, {
                readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                readonly always: boolean;
                readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
                readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly wrapStyle: import("vue").StyleValue;
                readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
                readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
                readonly tag: string;
                readonly minSize: number;
                readonly noresize: boolean;
            }>> & Record<string, any>;
            ElIcon: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
                readonly size: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
            ArrowDown: any;
            ArrowUp: any;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("change" | "select-range" | "set-option")[], "change" | "select-range" | "set-option", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly disabledHours: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledHours>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabledMinutes: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledMinutes>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabledSeconds: {
                readonly type: import("vue").PropType<import("../../../time-picker/src/props/shared").GetDisabledSeconds>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly role: {
                readonly type: import("vue").PropType<string>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly spinnerDate: {
                readonly type: import("vue").PropType<dayjs.Dayjs>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly showSeconds: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly arrowControl: BooleanConstructor;
            readonly amPmMode: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a") | ((new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a"))[], unknown, unknown, "", boolean>;
        }>> & {
            onChange?: ((...args: any[]) => any) | undefined;
            "onSelect-range"?: ((...args: any[]) => any) | undefined;
            "onSet-option"?: ((...args: any[]) => any) | undefined;
        }, {
            readonly arrowControl: boolean;
            readonly showSeconds: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly amPmMode: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a") | ((new (...args: any[]) => ("" | "A" | "a") & {}) | (() => "" | "A" | "a"))[], unknown, unknown>;
        }>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("pick" | "select-range" | "set-picker-option")[], "pick" | "select-range" | "set-picker-option", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly datetimeRole: StringConstructor;
        readonly parsedValue: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly visible: BooleanConstructor;
        readonly actualVisible: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    }>> & {
        onPick?: ((...args: any[]) => any) | undefined;
        "onSelect-range"?: ((...args: any[]) => any) | undefined;
        "onSet-picker-option"?: ((...args: any[]) => any) | undefined;
    }, {
        readonly visible: boolean;
        readonly format: string;
        readonly actualVisible: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    }>;
    ElIcon: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
    ArrowLeft: any;
    ArrowRight: any;
    DArrowLeft: any;
    DArrowRight: any;
    DateTable: import("vue").DefineComponent<{
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
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly minDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly maxDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parsedValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
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
            readonly selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
            readonly disabledDate: {
                readonly type: import("vue").PropType<(date: Date) => boolean>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly date: {
                readonly type: import("vue").PropType<dayjs.Dayjs>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly minDate: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly maxDate: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parsedValue: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
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
        t: import("element-plus/es/hooks").Translator;
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
        readonly selectionMode: import("element-plus/es/utils").EpPropFinalized<StringConstructor, string, unknown, string, boolean>;
        readonly disabledDate: {
            readonly type: import("vue").PropType<(date: Date) => boolean>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly date: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly minDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly maxDate: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null) | ((new (...args: any[]) => dayjs.Dayjs) | (() => dayjs.Dayjs | null))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parsedValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly rangeState: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState) | ((new (...args: any[]) => import("../props/shared").RangeState) | (() => import("../props/shared").RangeState))[], unknown, unknown, () => {
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
    MonthTable: import("vue").DefineComponent<{
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
    YearTable: import("vue").DefineComponent<{
        date: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        disabledDate: {
            readonly type: import("vue").PropType<(date: Date) => boolean>;
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
    }, {
        datesInYear: (year: number, lang: string) => Date[];
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            date: {
                readonly type: import("vue").PropType<dayjs.Dayjs>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            disabledDate: {
                readonly type: import("vue").PropType<(date: Date) => boolean>;
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
        }>> & {
            onPick?: ((...args: any[]) => any) | undefined;
        }>>;
        emit: (event: "pick", ...args: any[]) => void;
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
        startYear: import("vue").ComputedRef<number>;
        focus: () => void;
        getCellKls: (year: number) => Record<string, boolean>;
        isSelectedCell: (year: number) => boolean;
        handleYearTableClick: (event: MouseEvent | KeyboardEvent) => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "pick"[], "pick", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        date: {
            readonly type: import("vue").PropType<dayjs.Dayjs>;
            readonly required: true;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        disabledDate: {
            readonly type: import("vue").PropType<(date: Date) => boolean>;
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
    }>> & {
        onPick?: ((...args: any[]) => any) | undefined;
    }, {}>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("panel-change" | "pick" | "set-picker-option")[], "pick" | "panel-change" | "set-picker-option", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly parsedValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]) | ((new (...args: any[]) => dayjs.Dayjs | dayjs.Dayjs[]) | (() => dayjs.Dayjs | dayjs.Dayjs[]))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly visible: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly type: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") | ((new (...args: any[]) => ("year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange") & {}) | (() => "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange"))[], "year" | "month" | "date" | "dates" | "week" | "datetime" | "datetimerange" | "daterange" | "monthrange", unknown>>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly dateFormat: StringConstructor;
    readonly timeFormat: StringConstructor;
}>> & {
    onPick?: ((...args: any[]) => any) | undefined;
    "onPanel-change"?: ((...args: any[]) => any) | undefined;
    "onSet-picker-option"?: ((...args: any[]) => any) | undefined;
}, {
    readonly format: string;
}>;
export default _default;
