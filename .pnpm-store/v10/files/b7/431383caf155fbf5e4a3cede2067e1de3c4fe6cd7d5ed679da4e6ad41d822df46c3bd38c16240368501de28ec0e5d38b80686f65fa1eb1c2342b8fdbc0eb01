"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// As persian language has different number symbols we need to replace regular numbers
// to standard persian numbres.
function toPersianNumber(number) {
    // List of standard persian numbers from 0 to 9
    var persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return number.toString().replace(/\d/g, function (x) { return persianDigits[x]; });
}
function default_1(number, index) {
    var formattedString = [
        ['لحظاتی پیش', 'همین حالا'],
        ['%s ثانیه پیش', '%s ثانیه دیگر'],
        ['۱ دقیقه پیش', '۱ دقیقه دیگر'],
        ['%s دقیقه پیش', '%s دقیقه دیگر'],
        ['۱ ساعت پیش', '۱ ساعت دیگر'],
        ['%s ساعت پیش', '%s ساعت دیگر'],
        ['۱ روز پیش', '۱ روز دیگر'],
        ['%s روز پیش', '%s روز دیگر'],
        ['۱ هفته پیش', '۱ هفته دیگر'],
        ['%s هفته پیش', '%s هفته دیگر'],
        ['۱ ماه پیش', '۱ ماه دیگر'],
        ['%s ماه پیش', '%s ماه دیگر'],
        ['۱ سال پیش', '۱ سال دیگر'],
        ['%s سال پیش', '%s سال دیگر'],
    ][index];
    // We convert regular numbers (%s) to standard persian numbers using toPersianNumber function
    return [
        formattedString[0].replace('%s', toPersianNumber(number)),
        formattedString[1].replace('%s', toPersianNumber(number)),
    ];
}
exports.default = default_1;
//# sourceMappingURL=fa.js.map