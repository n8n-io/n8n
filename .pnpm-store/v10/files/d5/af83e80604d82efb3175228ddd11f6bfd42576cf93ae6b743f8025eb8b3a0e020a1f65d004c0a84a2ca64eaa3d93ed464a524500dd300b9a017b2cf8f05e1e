import type { Component, ExtractPropTypes } from 'vue';
import type { Options } from '@popperjs/core';
import type { Dayjs } from 'dayjs';
export declare type SingleOrRange<T> = T | [T, T];
export declare type DateModelType = number | string | Date;
export declare type ModelValueType = SingleOrRange<DateModelType>;
export declare type DayOrDays = SingleOrRange<Dayjs>;
export declare type DateOrDates = SingleOrRange<Date>;
export declare type UserInput = SingleOrRange<string | null>;
export declare type GetDisabledHours = (role: string, comparingDate?: Dayjs) => number[];
export declare type GetDisabledMinutes = (hour: number, role: string, comparingDate?: Dayjs) => number[];
export declare type GetDisabledSeconds = (hour: number, minute: number, role: string, comparingDate?: Dayjs) => number[];
export declare const timePickerDefaultProps: {
    readonly disabledDate: {
        readonly type: import("vue").PropType<Function>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly cellClassName: {
        readonly type: import("vue").PropType<Function>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly shortcuts: import("element-plus/es/utils").EpPropFinalized<ArrayConstructor, unknown, unknown, () => never[], boolean>;
    readonly arrowControl: BooleanConstructor;
    readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly tabindex: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown, 0, boolean>;
    readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly unlinkPanels: BooleanConstructor;
    readonly disabledHours: {
        readonly type: import("vue").PropType<import("../props/shared").GetDisabledHours>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly disabledMinutes: {
        readonly type: import("vue").PropType<import("../props/shared").GetDisabledMinutes>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly disabledSeconds: {
        readonly type: import("vue").PropType<import("../props/shared").GetDisabledSeconds>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly id: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => SingleOrRange<string> & {}) | (() => SingleOrRange<string>) | ((new (...args: any[]) => SingleOrRange<string> & {}) | (() => SingleOrRange<string>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly name: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => SingleOrRange<string> & {}) | (() => SingleOrRange<string>) | ((new (...args: any[]) => SingleOrRange<string> & {}) | (() => SingleOrRange<string>))[], unknown, unknown, "", boolean>;
    readonly popperClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly format: StringConstructor;
    readonly valueFormat: StringConstructor;
    readonly dateFormat: StringConstructor;
    readonly timeFormat: StringConstructor;
    readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly clearIcon: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly editable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly prefixIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, "", boolean>;
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly readonly: BooleanConstructor;
    readonly disabled: BooleanConstructor;
    readonly placeholder: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
    readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => ModelValueType & {}) | (() => ModelValueType) | ((new (...args: any[]) => ModelValueType & {}) | (() => ModelValueType))[], unknown, unknown, "", boolean>;
    readonly rangeSeparator: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "-", boolean>;
    readonly startPlaceholder: StringConstructor;
    readonly endPlaceholder: StringConstructor;
    readonly defaultValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Date | [Date, Date]) | (() => SingleOrRange<Date>) | ((new (...args: any[]) => Date | [Date, Date]) | (() => SingleOrRange<Date>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly defaultTime: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => Date | [Date, Date]) | (() => SingleOrRange<Date>) | ((new (...args: any[]) => Date | [Date, Date]) | (() => SingleOrRange<Date>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        /**
         * @description range separator
         */
        __epPropKey: true;
    };
    readonly isRange: BooleanConstructor;
};
export declare type TimePickerDefaultProps = ExtractPropTypes<typeof timePickerDefaultProps>;
export interface PickerOptions {
    isValidValue: (date: DayOrDays) => boolean;
    handleKeydownInput: (event: KeyboardEvent) => void;
    parseUserInput: (value: UserInput) => DayOrDays;
    formatToString: (value: DayOrDays) => UserInput;
    getRangeAvailableTime: (date: DayOrDays) => DayOrDays;
    getDefaultValue: () => DayOrDays;
    panelReady: boolean;
    handleClear: () => void;
    handleFocusPicker?: () => void;
}
