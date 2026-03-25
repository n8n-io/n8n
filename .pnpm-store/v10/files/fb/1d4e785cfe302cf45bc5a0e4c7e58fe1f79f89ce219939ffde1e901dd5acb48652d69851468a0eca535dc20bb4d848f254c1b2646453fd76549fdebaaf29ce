import { ParsedOptions } from './types';
export declare class Time {
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    constructor(hour: number, minute: number, second: number, millisecond: number);
    getHours(): number;
    getMinutes(): number;
    getSeconds(): number;
    getMilliseconds(): number;
    getTime(): number;
}
export declare class DateTime extends Time {
    day: number;
    month: number;
    year: number;
    static fromDate(date: Date): DateTime;
    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number);
    getWeekday(): number;
    getTime(): number;
    getDay(): number;
    getMonth(): number;
    getYear(): number;
    addYears(years: number): void;
    addMonths(months: number): void;
    addWeekly(days: number, wkst: number): void;
    addDaily(days: number): void;
    addHours(hours: number, filtered: boolean, byhour: number[]): void;
    addMinutes(minutes: number, filtered: boolean, byhour: number[], byminute: number[]): void;
    addSeconds(seconds: number, filtered: boolean, byhour: number[], byminute: number[], bysecond: number[]): void;
    fixDay(): void;
    add(options: ParsedOptions, filtered: boolean): void;
}
//# sourceMappingURL=datetime.d.ts.map