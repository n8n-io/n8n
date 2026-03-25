"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * @param f1 - 1
 * @param f - 21, 31, ...
 * @param s - 2-4, 22-24, 32-34 ...
 * @param t - 5-20, 25-30, ...
 * @param n
 * @returns
 */
function formatNum(f1, f, s, t, n) {
    var n10 = n % 10;
    var str = t;
    if (n === 1) {
        str = f1;
    }
    else if (n10 === 1 && n > 20) {
        str = f;
    }
    else if (n10 > 1 && n10 < 5 && (n > 20 || n < 10)) {
        str = s;
    }
    return str;
}
var seconds = formatNum.bind(null, 'секунду', '%s секунду', '%s секунды', '%s секунд'), minutes = formatNum.bind(null, 'минуту', '%s минуту', '%s минуты', '%s минут'), hours = formatNum.bind(null, 'час', '%s час', '%s часа', '%s часов'), days = formatNum.bind(null, 'день', '%s день', '%s дня', '%s дней'), weeks = formatNum.bind(null, 'неделю', '%s неделю', '%s недели', '%s недель'), months = formatNum.bind(null, 'месяц', '%s месяц', '%s месяца', '%s месяцев'), years = formatNum.bind(null, 'год', '%s год', '%s года', '%s лет');
function default_1(number, index) {
    switch (index) {
        case 0:
            return ['только что', 'через несколько секунд'];
        case 1:
            return [seconds(number) + ' назад', 'через ' + seconds(number)];
        case 2: // ['минуту назад', 'через минуту'];
        case 3:
            return [minutes(number) + ' назад', 'через ' + minutes(number)];
        case 4: // ['час назад', 'через час'];
        case 5:
            return [hours(number) + ' назад', 'через ' + hours(number)];
        case 6:
            return ['вчера', 'завтра'];
        case 7:
            return [days(number) + ' назад', 'через ' + days(number)];
        case 8: // ['неделю назад', 'через неделю'];
        case 9:
            return [weeks(number) + ' назад', 'через ' + weeks(number)];
        case 10: // ['месяц назад', 'через месяц'];
        case 11:
            return [months(number) + ' назад', 'через ' + months(number)];
        case 12: // ['год назад', 'через год'];
        case 13:
            return [years(number) + ' назад', 'через ' + years(number)];
        default:
            return ['', ''];
    }
}
exports.default = default_1;
//# sourceMappingURL=ru.js.map