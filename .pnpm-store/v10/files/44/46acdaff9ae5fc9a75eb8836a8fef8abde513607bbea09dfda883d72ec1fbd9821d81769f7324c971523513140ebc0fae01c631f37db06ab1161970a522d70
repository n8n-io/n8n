import { WeekdayNumbers } from "./datetime";
import { CalendarSystem, NumberingSystem, StringUnitLength, UnitLength } from "./misc";
import { Zone } from "./zone";

export interface InfoOptions {
    locale?: string | undefined;
}

export interface InfoUnitOptions extends InfoOptions {
    numberingSystem?: NumberingSystem | undefined;
}

/** @deprecated */
export type UnitOptions = InfoUnitOptions;

export interface InfoCalendarOptions extends InfoUnitOptions {
    /**
     * @default gregory
     */
    outputCalendar?: CalendarSystem | undefined;
}

/**
 * The set of available features in this environment. Some features of Luxon are not available in all environments.
 */
export interface Features {
    /**
     * Whether this environment supports relative time formatting
     */
    relative: boolean;

    /**
     * Whether this environment supports different weekdays for the start of the week based on the locale
     */
    localeWeek: boolean;
}

/**
 * The Info class contains static methods for retrieving general time and date related data. For example, it has methods for finding out if a time zone has a DST, for listing the months in any
 * supported locale, and for discovering which of Luxon features are available in the current environment.
 */
export namespace Info {
    /**
     * Return whether the specified zone contains a DST.
     *
     * @param zone - Zone to check. Defaults to the environment's local zone. Defaults to 'local'.
     */
    function hasDST(zone?: string | Zone): boolean;

    /**
     * Return whether the specified zone is a valid IANA specifier.
     *
     * @param zone - Zone to check
     */
    function isValidIANAZone(zone: string): boolean;

    /**
     * Converts the input into a {@link Zone} instance.
     *
     * * If `input` is already a Zone instance, it is returned unchanged.
     * * If `input` is a string containing a valid time zone name, a Zone instance
     *   with that name is returned.
     * * If `input` is a string that doesn't refer to a known time zone, a Zone
     *   instance with {@link Zone.isValid} == false is returned.
     * * If `input is a number, a Zone instance with the specified fixed offset
     *   in minutes is returned.
     * * If `input` is `null` or `undefined`, the default zone is returned.
     *
     * @param input - the value to be converted
     */
    function normalizeZone(input?: string | Zone | number): Zone;

    interface LocaleInput {
        /**
         * the locale code
         */
        locale?: string | null | undefined;
        /**
         * an existing locale object to use, instead of the locale code string
         */
        locObj?: object | null | undefined;
    }

    /**
     * Get the weekday on which the week starts,
     * according to the given locale.
     */
    function getStartOfWeek(input?: LocaleInput): WeekdayNumbers;

    /**
     * Get the minimum number of days necessary in a week before it is considered part of the next year,
     * according to the given locale.
     */
    function getMinimumDaysInFirstWeek(input?: LocaleInput): WeekdayNumbers;

    /**
     * Get the weekdays which are considered the weekend,
     * according to the given locale.
     */
    function getWeekendWeekdays(input?: LocaleInput): WeekdayNumbers[];

    /**
     * Return an array of standalone month names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     *
     * @param length - the length of the month representation. Defaults to 'long'.
     * @param opts - options
     * @param opts.locale - the locale code
     * @param opts.numberingSystem - the numbering system.
     * @param opts.locObj - an existing locale object to use.
     * @param opts.outputCalendar - the calendar. Defaults to 'gregory'.
     *
     * @example
     * Info.months()[0] //=> 'January'
     * @example
     * Info.months('short')[0] //=> 'Jan'
     * @example
     * Info.months('numeric')[0] //=> '1'
     * @example
     * Info.months('short', { locale: 'fr-CA' } )[0] //=> 'janv.'
     * @example
     * Info.months('numeric', { locale: 'ar' })[0] //=> '١'
     * @example
     * Info.months('long', { outputCalendar: 'islamic' })[0] //=> 'Rabiʻ I'
     */
    function months(length?: UnitLength, opts?: InfoCalendarOptions): string[];

    /**
     * Return an array of format month names.
     * Format months differ from standalone months in that they are meant to appear next to the day of the month.
     * In some languages, that changes the string.
     * See {@link Info#months}
     *
     * @param length - the length of the month representation. Defaults to 'long'.
     * @param opts - options
     * @param opts.locale - the locale code
     * @param opts.numberingSystem - the numbering system.
     * @param opts.locObj - an existing locale object to use.
     * @param opts.outputCalendar - the calendar. Defaults to 'gregory'.
     */
    function monthsFormat(length?: UnitLength, opts?: InfoCalendarOptions): string[];

    /**
     * Return an array of standalone week names.
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
     *
     * @param length - the length of the weekday representation. Defaults to 'long'.
     * @param opts - options
     * @param opts.locale - the locale code
     * @param opts.numberingSystem - the numbering system.
     * @param opts.locObj - an existing locale object to use.
     *
     * @example
     * Info.weekdays()[0] //=> 'Monday'
     * @example
     * Info.weekdays('short')[0] //=> 'Mon'
     * @example
     * Info.weekdays('short', { locale: 'fr-CA' })[0] //=> 'lun.'
     * @example
     * Info.weekdays('short', { locale: 'ar' })[0] //=> 'الاثنين'
     */
    function weekdays(length?: StringUnitLength, opts?: InfoUnitOptions): string[];

    /**
     * Return an array of format week names.
     * Format weekdays differ from standalone weekdays in that they are meant to appear next to more date information.
     * In some languages, that changes the string.
     * See {@link Info#weekdays}
     *
     * @param length - the length of the month representation. Defaults to 'long'.
     * @param opts - options
     * @param opts.locale - the locale code.
     * @param opts.numberingSystem - the numbering system.
     * @param opts.locObj - an existing locale object to use.
     */
    function weekdaysFormat(length?: StringUnitLength, opts?: InfoUnitOptions): string[];

    /**
     * Return an array of meridiems.
     *
     * @param opts - options
     * @param opts.locale - the locale code
     *
     * @example
     * Info.meridiems() //=> [ 'AM', 'PM' ]
     * @example
     * Info.meridiems({ locale: 'my' }) //=> [ 'နံနက်', 'ညနေ' ]
     */
    function meridiems(opts?: InfoOptions): string[];

    /**
     * Return an array of eras, such as ['BC', 'AD']. The locale can be specified, but the calendar system is always Gregorian.
     *
     * @param length - the length of the era representation. Defaults to 'short'.
     * @param opts - options
     * @param opts.locale - the locale code
     *
     * @example
     * Info.eras() //=> [ 'BC', 'AD' ]
     * @example
     * Info.eras('long') //=> [ 'Before Christ', 'Anno Domini' ]
     * @example
     * Info.eras('long', { locale: 'fr' }) //=> [ 'avant Jésus-Christ', 'après Jésus-Christ' ]
     */
    function eras(length?: StringUnitLength, opts?: InfoOptions): string[];

    /**
     * Return the set of available features in this environment.
     * Some features of Luxon are not available in all environments.
     * For example, on older browsers, timezone support is not available.
     * Use this function to figure out if that is the case.
     *
     * @example
     * Info.features() //=> { intl: true, intlTokens: false, zones: true, relative: false }
     */
    function features(): Features;
}
