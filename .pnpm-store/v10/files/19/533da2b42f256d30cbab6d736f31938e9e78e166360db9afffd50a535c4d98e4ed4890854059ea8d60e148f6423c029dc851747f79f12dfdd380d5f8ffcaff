import { formatDiff, diffSec } from './utils/date';
import { getLocale } from './register';
/**
 * format a TDate into string
 * @param date
 * @param locale
 * @param opts
 */
export var format = function (date, locale, opts) {
    // diff seconds
    var sec = diffSec(date, opts && opts.relativeDate);
    // format it with locale
    return formatDiff(sec, getLocale(locale));
};
//# sourceMappingURL=format.js.map