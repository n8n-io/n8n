import type { Dayjs } from 'dayjs';
import type { GetDisabledHoursState, GetDisabledMinutesState, GetDisabledSecondsState } from '../types';
import type { GetDisabledHours, GetDisabledMinutes, GetDisabledSeconds } from '../props/shared';
export declare const getTimeLists: (disabledHours?: GetDisabledHours | undefined, disabledMinutes?: GetDisabledMinutes | undefined, disabledSeconds?: GetDisabledSeconds | undefined) => {
    getHoursList: (role: string, compare?: Dayjs | undefined) => boolean[];
    getMinutesList: (hour: number, role: string, compare?: Dayjs | undefined) => boolean[];
    getSecondsList: (hour: number, minute: number, role: string, compare?: Dayjs | undefined) => boolean[];
};
export declare const buildAvailableTimeSlotGetter: (disabledHours: GetDisabledHours, disabledMinutes: GetDisabledMinutes, disabledSeconds: GetDisabledSeconds) => {
    getAvailableHours: GetDisabledHoursState;
    getAvailableMinutes: GetDisabledMinutesState;
    getAvailableSeconds: GetDisabledSecondsState;
};
export declare const useOldValue: (props: {
    parsedValue?: string | Dayjs | Dayjs[];
    visible: boolean;
}) => import("vue").Ref<string | {
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
} | {
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
}[] | undefined>;
