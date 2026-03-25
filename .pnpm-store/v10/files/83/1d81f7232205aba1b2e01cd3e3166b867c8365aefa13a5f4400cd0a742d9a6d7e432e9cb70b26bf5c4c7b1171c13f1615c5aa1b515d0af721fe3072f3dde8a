"use strict";
/**
 * Created by hustcc on 18/5/20.
 * Contract: i@hust.cc
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * All supported locales
 */
var Locales = {};
/**
 * register a locale
 * @param locale
 * @param func
 */
exports.register = function (locale, func) {
    Locales[locale] = func;
};
/**
 * get a locale, default is en_US
 * @param locale
 * @returns {*}
 */
exports.getLocale = function (locale) {
    return Locales[locale] || Locales['en_US'];
};
//# sourceMappingURL=register.js.map