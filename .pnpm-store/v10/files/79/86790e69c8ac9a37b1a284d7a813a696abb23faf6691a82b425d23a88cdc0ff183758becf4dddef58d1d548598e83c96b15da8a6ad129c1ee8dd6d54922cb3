import { Time } from './datetime';
declare type Datelike = Pick<Date, 'getTime'>;
export declare const datetime: (y: number, m: number, d: number, h?: number, i?: number, s?: number) => Date;
/**
 * General date-related utilities.
 * Also handles several incompatibilities between JavaScript and Python
 *
 */
export declare const MONTH_DAYS: number[];
/**
 * Number of milliseconds of one day
 */
export declare const ONE_DAY: number;
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.MAXYEAR>
 */
export declare const MAXYEAR = 9999;
/**
 * Python uses 1-Jan-1 as the base for calculating ordinals but we don't
 * want to confuse the JS engine with milliseconds > Number.MAX_NUMBER,
 * therefore we use 1-Jan-1970 instead
 */
export declare const ORDINAL_BASE: Date;
/**
 * Python: MO-SU: 0 - 6
 * JS: SU-SAT 0 - 6
 */
export declare const PY_WEEKDAYS: number[];
/**
 * py_date.timetuple()[7]
 */
export declare const getYearDay: (date: Date) => number;
export declare const isLeapYear: (year: number) => boolean;
export declare const isDate: (value: unknown) => value is Date;
export declare const isValidDate: (value: unknown) => value is Date;
/**
 * @return {Number} the date's timezone offset in ms
 */
export declare const tzOffset: (date: Date) => number;
/**
 * @see: <http://www.mcfedries.com/JavaScript/DaysBetween.asp>
 */
export declare const daysBetween: (date1: Date, date2: Date) => number;
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.date.toordinal>
 */
export declare const toOrdinal: (date: Date) => number;
/**
 * @see - <http://docs.python.org/library/datetime.html#datetime.date.fromordinal>
 */
export declare const fromOrdinal: (ordinal: number) => Date;
export declare const getMonthDays: (date: Date) => number;
/**
 * @return {Number} python-like weekday
 */
export declare const getWeekday: (date: Date) => number;
/**
 * @see: <http://docs.python.org/library/calendar.html#calendar.monthrange>
 */
export declare const monthRange: (year: number, month: number) => number[];
/**
 * @see: <http://docs.python.org/library/datetime.html#datetime.datetime.combine>
 */
export declare const combine: (date: Date, time: Date | Time) => Date;
export declare const clone: (date: Date | Time) => Date;
export declare const cloneDates: (dates: Date[] | Time[]) => Date[];
/**
 * Sorts an array of Date or Time objects
 */
export declare const sort: <T extends Datelike>(dates: T[]) => void;
export declare const timeToUntilString: (time: number, utc?: boolean) => string;
export declare const untilStringToDate: (until: string) => Date;
export declare const dateInTimeZone: (date: Date, timeZone: string) => Date;
export {};
//# sourceMappingURL=dateutil.d.ts.map