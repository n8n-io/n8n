import { ParsedOptions, Frequency } from '../types';
import { YearInfo } from './yearinfo';
import { MonthInfo } from './monthinfo';
import { Time } from '../datetime';
export declare type DaySet = [(number | null)[], number, number];
export declare type GetDayset = () => DaySet;
export default class Iterinfo {
    private options;
    yearinfo: YearInfo;
    monthinfo: MonthInfo;
    eastermask: number[] | null;
    constructor(options: ParsedOptions);
    rebuild(year: number, month: number): void;
    get lastyear(): number;
    get lastmonth(): number;
    get yearlen(): 366 | 365;
    get yearordinal(): number;
    get mrange(): number[];
    get wdaymask(): number[];
    get mmask(): number[];
    get wnomask(): number[];
    get nwdaymask(): number[];
    get nextyearlen(): 366 | 365;
    get mdaymask(): number[];
    get nmdaymask(): number[];
    ydayset(): (number | number[])[];
    mdayset(_: unknown, month: number): (number | (number | number[])[])[];
    wdayset(year: number, month: number, day: number): (number | (number | number[])[])[];
    ddayset(year: number, month: number, day: number): (number | number[])[];
    htimeset(hour: number, _: number, second: number, millisecond: number): Time[];
    mtimeset(hour: number, minute: number, _: number, millisecond: number): Time[];
    stimeset(hour: number, minute: number, second: number, millisecond: number): Time[];
    getdayset(freq: Frequency): (y: number, m: number, d: number) => DaySet;
    gettimeset(freq: Frequency.HOURLY | Frequency.MINUTELY | Frequency.SECONDLY): (h: number, m: number, s: number, ms: number) => Time[];
}
//# sourceMappingURL=index.d.ts.map