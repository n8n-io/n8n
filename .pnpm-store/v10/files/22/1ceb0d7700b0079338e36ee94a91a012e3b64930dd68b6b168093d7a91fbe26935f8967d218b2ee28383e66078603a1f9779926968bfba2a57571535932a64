/**
 * Created by hustcc on 18/5/20.
 * Contract: i@hust.cc
 */
import { LocaleFunc, TDate } from '../interface';
/**
 * format Date / string / timestamp to timestamp
 * @param input
 * @returns {*}
 */
export declare function toDate(input?: Date | string | number): Date;
/**
 * format the diff second to *** time ago, with setting locale
 * @param diff
 * @param localeFunc
 * @returns
 */
export declare function formatDiff(diff: number, localeFunc: LocaleFunc): string;
/**
 * calculate the diff second between date to be formatted an now date.
 * @param date
 * @param relativeDate
 * @returns {number}
 */
export declare function diffSec(date: TDate, relativeDate: TDate): number;
/**
 * nextInterval: calculate the next interval time.
 * - diff: the diff sec between now and date to be formatted.
 *
 * What's the meaning?
 * diff = 61 then return 59
 * diff = 3601 (an hour + 1 second), then return 3599
 * make the interval with high performance.
 **/
export declare function nextInterval(diff: number): number;
