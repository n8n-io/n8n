import dayjs from 'dayjs';
import type { SetupContext } from 'vue';
import type { DateCell } from '../date-picker.type';
import type { BasicDateTableEmits, BasicDateTableProps } from '../props/basic-date-table';
export declare const useBasicDateTable: (props: BasicDateTableProps, emit: SetupContext<BasicDateTableEmits>['emit']) => {
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
    isCurrent: (cell: DateCell) => boolean;
    isWeekActive: (cell: DateCell) => boolean;
    isSelectedCell: (cell: DateCell) => boolean | undefined;
    handlePickDate: (event: FocusEvent | MouseEvent, isKeyboardMovement?: boolean) => void;
    handleMouseUp: (event: MouseEvent) => void;
    handleMouseDown: (event: MouseEvent) => void;
    handleMouseMove: (event: MouseEvent) => void;
    handleFocus: (event: FocusEvent) => void;
};
export declare const useBasicDateTableDOM: (props: BasicDateTableProps, { isCurrent, isWeekActive, }: Pick<ReturnType<typeof useBasicDateTable>, 'isCurrent' | 'isWeekActive'>) => {
    tableKls: import("vue").ComputedRef<(string | {
        'is-week-mode': boolean;
    })[]>;
    tableLabel: import("vue").ComputedRef<string>;
    weekLabel: import("vue").ComputedRef<string>;
    getCellClasses: (cell: DateCell) => string;
    getRowKls: (cell: DateCell) => (string | {
        current: boolean;
    })[];
    t: import("element-plus/es/hooks").Translator;
};
