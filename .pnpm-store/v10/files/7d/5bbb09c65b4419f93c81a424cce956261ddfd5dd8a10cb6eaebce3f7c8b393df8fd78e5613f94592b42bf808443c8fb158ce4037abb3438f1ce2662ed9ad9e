import {
    CronDate,
    DateType,
    ICronExpression,
    IStringResult,
    ParserOptions,
} from './common';

type BuildRangeTuple<Current extends [...number[]], Count extends number> =
    Current["length"] extends Count
        ? Current
        : BuildRangeTuple<[number, ...Current], Count>
type RangeTuple<Count extends number> = BuildRangeTuple<[], Count>
type BuildRange<Current extends number, End extends number, Accu extends [...number[]]> =
    Accu["length"] extends End
        ? Current
        : BuildRange<Current | Accu["length"], End, [number, ...Accu]>
type Range<StartInclusive extends number, EndExclusive extends number> = BuildRange<StartInclusive, EndExclusive, RangeTuple<StartInclusive>>

export type SixtyRange = Range<0, 30> | Range<30, 60>; // Typescript restriction on recursion depth
export type HourRange = Range<0, 24>;
export type DayOfTheMonthRange = Range<1, 32> | 'L';
export type MonthRange = Range<1, 13>;
export type DayOfTheWeekRange = Range<0, 8>;

export type CronFields = {
    readonly second: readonly SixtyRange[];
    readonly minute: readonly SixtyRange[];
    readonly hour: readonly HourRange[];
    readonly dayOfMonth: readonly DayOfTheMonthRange[];
    readonly month: readonly MonthRange[];
    readonly dayOfWeek: readonly DayOfTheWeekRange[];
}

export {ParserOptions, CronDate, DateType}
export type CronExpression<IsIterable extends boolean = false> = ICronExpression<CronFields, IsIterable>
export type StringResult = IStringResult<CronFields>

export function parseExpression<IsIterable extends boolean = false>(expression: string, options?: ParserOptions<IsIterable>): CronExpression<IsIterable>;

export function fieldsToExpression<IsIterable extends boolean = false>(fields: CronFields, options?: ParserOptions<IsIterable>): CronExpression<IsIterable>;

export function parseFile(filePath: string, callback: (err: any, data: StringResult) => any): void;

export function parseString(data: string): StringResult;
