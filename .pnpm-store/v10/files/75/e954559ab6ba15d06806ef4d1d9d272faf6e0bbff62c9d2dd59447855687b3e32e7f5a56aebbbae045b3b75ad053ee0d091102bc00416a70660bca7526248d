import IterResult, { IterArgs } from './iterresult';
import { Language } from './nlp/i18n';
import { DateFormatter, GetText } from './nlp/totext';
import { ParsedOptions, Options, Frequency, QueryMethods, QueryMethodTypes, IterResultType } from './types';
import { parseString } from './parsestring';
import { optionsToString } from './optionstostring';
import { Cache, CacheKeys } from './cache';
import { Weekday } from './weekday';
export declare const Days: {
    MO: Weekday;
    TU: Weekday;
    WE: Weekday;
    TH: Weekday;
    FR: Weekday;
    SA: Weekday;
    SU: Weekday;
};
export declare const DEFAULT_OPTIONS: Options;
export declare const defaultKeys: (keyof Options)[];
/**
 *
 * @param {Options?} options - see <http://labix.org/python-dateutil/#head-cf004ee9a75592797e076752b2a889c10f445418>
 * - The only required option is `freq`, one of RRule.YEARLY, RRule.MONTHLY, ...
 * @constructor
 */
export declare class RRule implements QueryMethods {
    _cache: Cache | null;
    origOptions: Partial<Options>;
    options: ParsedOptions;
    static readonly FREQUENCIES: (keyof typeof Frequency)[];
    static readonly YEARLY = Frequency.YEARLY;
    static readonly MONTHLY = Frequency.MONTHLY;
    static readonly WEEKLY = Frequency.WEEKLY;
    static readonly DAILY = Frequency.DAILY;
    static readonly HOURLY = Frequency.HOURLY;
    static readonly MINUTELY = Frequency.MINUTELY;
    static readonly SECONDLY = Frequency.SECONDLY;
    static readonly MO: Weekday;
    static readonly TU: Weekday;
    static readonly WE: Weekday;
    static readonly TH: Weekday;
    static readonly FR: Weekday;
    static readonly SA: Weekday;
    static readonly SU: Weekday;
    constructor(options?: Partial<Options>, noCache?: boolean);
    static parseText(text: string, language?: Language): Partial<Options>;
    static fromText(text: string, language?: Language): RRule;
    static parseString: typeof parseString;
    static fromString(str: string): RRule;
    static optionsToString: typeof optionsToString;
    protected _iter<M extends QueryMethodTypes>(iterResult: IterResult<M>): IterResultType<M>;
    private _cacheGet;
    _cacheAdd(what: CacheKeys | 'all', value: Date[] | Date | null, args?: Partial<IterArgs>): void;
    /**
     * @param {Function} iterator - optional function that will be called
     * on each date that is added. It can return false
     * to stop the iteration.
     * @return Array containing all recurrences.
     */
    all(iterator?: (d: Date, len: number) => boolean): Date[];
    /**
     * Returns all the occurrences of the rrule between after and before.
     * The inc keyword defines what happens if after and/or before are
     * themselves occurrences. With inc == True, they will be included in the
     * list, if they are found in the recurrence set.
     *
     * @return Array
     */
    between(after: Date, before: Date, inc?: boolean, iterator?: (d: Date, len: number) => boolean): Date[];
    /**
     * Returns the last recurrence before the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     *
     * @return Date or null
     */
    before(dt: Date, inc?: boolean): Date | null;
    /**
     * Returns the first recurrence after the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     *
     * @return Date or null
     */
    after(dt: Date, inc?: boolean): Date | null;
    /**
     * Returns the number of recurrences in this set. It will have go trough
     * the whole recurrence, if this hasn't been done before.
     */
    count(): number;
    /**
     * Converts the rrule into its string representation
     *
     * @see <http://www.ietf.org/rfc/rfc2445.txt>
     * @return String
     */
    toString(): string;
    /**
     * Will convert all rules described in nlp:ToText
     * to text.
     */
    toText(gettext?: GetText, language?: Language, dateFormatter?: DateFormatter): string;
    isFullyConvertibleToText(): boolean;
    /**
     * @return a RRule instance with the same freq and options
     * as this one (cache is not cloned)
     */
    clone(): RRule;
}
//# sourceMappingURL=rrule.d.ts.map