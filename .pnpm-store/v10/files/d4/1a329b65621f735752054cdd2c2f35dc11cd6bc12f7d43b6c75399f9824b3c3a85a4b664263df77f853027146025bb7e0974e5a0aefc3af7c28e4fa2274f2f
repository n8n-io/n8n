// Type definitions for dateformat 3.0
// Project: https://github.com/felixge/node-dateformat
// Definitions by: Kombu <https://github.com/aicest>
//                 BendingBender <https://github.com/BendingBender>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.2

export as namespace dateFormat;
export = dateFormat;

/**
 * dateFormat()
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 *
 * https://github.com/felixge/node-dateformat/blob/master/lib/dateformat.js#L18
 */
declare function dateFormat(
    date?: Date | string | number,
    mask?: string,
    utc?: boolean,
    gmt?: boolean
): string;
declare function dateFormat(mask?: string, utc?: boolean, gmt?: boolean): string;

declare namespace dateFormat {
    const masks: DateFormatMasks;
    let i18n: DateFormatI18n;

    /**
     * dateFormat.masks
     *
     * Predefined Formats
     *
     * @see https://github.com/felixge/node-dateformat/blob/master/lib/dateformat.js#L107
     */
    interface DateFormatMasks {
        default: string;
        shortDate: string;
        mediumDate: string;
        longDate: string;
        fullDate: string;
        shortTime: string;
        mediumTime: string;
        longTime: string;
        isoDate: string;
        isoTime: string;
        isoDateTime: string;
        isoUtcDateTime: string;
        expiresHeaderFormat: string;
        [key: string]: string;
    }

    /**
     * dateFormat.i18n
     *
     * Internationalization strings
     *
     * Example:
     *
     * @example ```
     * dateFormat.i18n = {
     *     dayNames: [
     *         'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
     *         'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
     *     ],
     *     monthNames: [
     *         'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
     *         'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
     *     ],
     *     timeNames: [
     *         'a', 'p', 'am', 'pm', 'A', 'P', 'AM', 'PM'
     *     ]
     * };```
     *
     * @see https://github.com/felixge/node-dateformat/blob/master/lib/dateformat.js#L124
     */
    interface DateFormatI18n {
        dayNames: string[];
        monthNames: string[];
        timeNames: string[];
    }
}
