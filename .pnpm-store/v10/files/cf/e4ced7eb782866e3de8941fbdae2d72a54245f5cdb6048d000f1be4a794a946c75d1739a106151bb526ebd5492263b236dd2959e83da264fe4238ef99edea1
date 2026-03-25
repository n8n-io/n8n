"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var date_1 = require("./utils/date");
var register_1 = require("./register");
/**
 * format a TDate into string
 * @param date
 * @param locale
 * @param opts
 */
exports.format = function (date, locale, opts) {
    // diff seconds
    var sec = date_1.diffSec(date, opts && opts.relativeDate);
    // format it with locale
    return date_1.formatDiff(sec, register_1.getLocale(locale));
};
//# sourceMappingURL=format.js.map