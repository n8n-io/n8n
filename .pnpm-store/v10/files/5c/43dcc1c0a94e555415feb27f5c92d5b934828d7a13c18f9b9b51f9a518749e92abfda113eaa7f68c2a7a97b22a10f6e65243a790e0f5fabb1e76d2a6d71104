/**
 * @category Types
 * @summary An object passed as the last optional argument to all functions.
 *
 * @description
 * An object passed as the last optional argument to all functions.
 *
 * @typedef {Object} OptionsWithTZ
 * @property {0|1|2|3|4|5|6} [weekStartsOn=0] - the index of the first day of the week (0 - Sunday).
 *   Used by `differenceInCalendarWeeks`, `endOfWeek`, `format`, `getWeek`, `getWeekOfMonth`,
 *   `getWeeksInMonth`, `isSameWeek`, `isSameWeek`, `lastDayOfWeek`, `parse`, `setDay`,
 *   `setWeek`, `startOfWeek` and `startOfWeekYear`.
 * @property {1|2|3|4|5|6|7} [firstWeekContainsDate=1] - the day of January,
 *   which is always in the first week of the year.
 *   Used by `format`, `getWeek`, `getWeekYear`, `parse`, `setWeek`, `setWeekYear` and `startOfWeekYear`.
 * @property {0|1|2} [additionalDigits=2] - the additional number of digits in the extended year format.
 *   Used by all functions that take String as Date-like argument.
 *   Internally, passed to `toDate` to specify which way to convert extended year formatted String to Date.
 *   See [toDate]{@link https://date-fns.org/docs/toDate}
 * @property {String} [timeZone=''] - used to specify the IANA time zone offset of a date String.
 *   Used by all functions that take String as Date-like argument.
 * @property {Locale} [locale=defaultLocale] - the locale object.
 *   Used by `formatDistance`, `formatDistanceStrict`, `format` and `parse`.
 *   See [Locale]{@link https://date-fns.org/docs/Locale}
 * @property {Boolean} [includeSeconds=false] - used by `formatDistance`.
 *   If true, distances less than a minute are more detailed
 * @property {Boolean} [addSuffix=false] - used by `formatDistance` and `formatDistanceStrict`.
 *   If true, the result will indicate if the second date is earlier or later than the first
 * @property {'second'|'minute'|'hour'|'day'|'month'|'year'} [unit] - used by `formatDistanceStrict`.
 *   If specified, will force a unit
 * @property {'floor'|'ceil'|'round'} [roundingMethod='floor'] - used by `formatDistanceStrict`.
 *   Specifies, which way to round partial units
 * @property {Boolean} [awareOfUnicodeTokens=false] - used by `format` and `parse`.
 *   If true, allows usage of Unicode tokens causes confusion:
 *   - Some of the day of year tokens (`D`, `DD`) that are confused with the day of month tokens (`d`, `dd`).
 *   - Some of the local week-numbering year tokens (`YY`, `YYYY`) that are confused with the calendar year tokens (`yy`, `yyyy`).
 *   See: https://git.io/fxCyr
 *
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2.
 *   Thrown by **all** functions
 * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6.
 *   Thrown by `differenceInCalendarWeeks`, `endOfWeek`, `format`, `getWeek`, `getWeekOfMonth`,
 *   `getWeeksInMonth`, `isSameWeek`, `isSameWeek`, `lastDayOfWeek`, `parse`, `setDay`,
 *   `setWeek`, `startOfWeek` and `startOfWeekYear`.
 * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7.
 *   Thrown by `format`, `getWeek`, `getWeekYear`, `parse`, `setWeek`, `setWeekYear` and `startOfWeekYear`.
 * @throws {RangeError} `options.roundingMethod` must be 'floor', 'ceil' or 'round'.
 *   Thrown by `formatDistanceStrict`
 * @throws {RangeError} `options.unit` must be 'second', 'minute', 'hour', 'day', 'month' or 'year'
 *   Thrown by `formatDistanceStrict`
 * @throws {RangeError} `options.locale` must contain `localize` property.
 *   Thrown by `format` and `formatRelative`
 * @throws {RangeError} `options.locale` must contain `formatLong` property.
 *   Thrown by `format` and `formatRelative`
 * @throws {RangeError} `options.locale` must contain `formatRelative` property.
 *   Thrown by `formatRelative`
 * @throws {RangeError} `options.locale` must contain `formatDistance` property.
 *   Thrown by `formatDistance` and `formatDistanceStrict`
 * @throws {RangeError} `options.locale` must contain `match` property.
 *   Thrown by `parse`
 * @throws {RangeError} `options.awareOfUnicodeTokens` must be set to `true` to use `XX` token; see: https://git.io/fxCyr
 *   Thrown by `format` and `parse`
 *
 * @example
 * // For 15 December 12345 AD, represent the start of the week in Esperanto,
 * // if the first day of the week is Monday:
 * var eoLocale = require('date-fns/locale/eo')
 * var options = {
 *   weekStartsOn: 1,
 *   additionalDigits: 1,
 *   locale: eoLocale
 * }
 * var result = format(startOfWeek('+12345-12-15', options), 'EEEE, d MMMM yyyy', options)
 * //=> 'lundo, 10 decembro 12345'
 */
var OptionsWithTZ = {}

module.exports = OptionsWithTZ
