import type { Ref } from 'vue';
import type { Dayjs } from 'dayjs';
import type { PanelRangeSharedProps, RangeState } from '../props/shared';
import type { DefaultValue } from '../utils';
declare type UseRangePickerProps = {
    onParsedValueChanged: (minDate: Dayjs | undefined, maxDate: Dayjs | undefined) => void;
    defaultValue: Ref<DefaultValue>;
    leftDate: Ref<Dayjs>;
    rightDate: Ref<Dayjs>;
    unit: 'month' | 'year';
};
export declare const useRangePicker: (props: PanelRangeSharedProps, { defaultValue, leftDate, rightDate, unit, onParsedValueChanged, }: UseRangePickerProps) => {
    minDate: Ref<Dayjs | undefined>;
    maxDate: Ref<Dayjs | undefined>;
    rangeState: Ref<{
        endDate: {
            clone: () => Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): Dayjs;
            };
            month: {
                (): number;
                (value: number): Dayjs;
            };
            date: {
                (): number;
                (value: number): Dayjs;
            };
            day: {
                (): number;
                (value: number): Dayjs;
            };
            hour: {
                (): number;
                (value: number): Dayjs;
            };
            minute: {
                (): number;
                (value: number): Dayjs;
            };
            second: {
                (): number;
                (value: number): Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): Dayjs;
            };
            set: (unit: import("dayjs").UnitType, value: number) => Dayjs;
            get: (unit: import("dayjs").UnitType) => number;
            add: (value: number, unit?: import("dayjs").ManipulateType | undefined) => Dayjs;
            subtract: (value: number, unit?: import("dayjs").ManipulateType | undefined) => Dayjs;
            startOf: (unit: import("dayjs").OpUnitType) => Dayjs;
            endOf: (unit: import("dayjs").OpUnitType) => Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | Dayjs | null | undefined, unit?: "year" | "month" | "date" | "dates" | "week" | "D" | "M" | "y" | "weeks" | "months" | "m" | "s" | "day" | "hour" | "minute" | "second" | "millisecond" | "hours" | "minutes" | "seconds" | "milliseconds" | "days" | "years" | "d" | "h" | "ms" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSame: (date: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isAfter: (date: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): Dayjs;
            };
            localeData: () => import("dayjs").InstanceLocaleDataReturn;
            week: {
                (): number;
                (value: number): Dayjs;
            };
            weekYear: () => number;
            dayOfYear: {
                (): number;
                (value: number): Dayjs;
            };
            isSameOrAfter: (date: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSameOrBefore: (date: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
        } | null;
        selecting: boolean;
    }>;
    lang: Ref<string>;
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
    handleChangeRange: (val: RangeState) => void;
    handleRangeConfirm: (visible?: boolean) => void;
    handleShortcutClick: (shortcut: import("./use-shortcut").Shortcut) => void;
    onSelect: (selecting: boolean) => void;
    t: import("element-plus/es/hooks").Translator;
};
export {};
