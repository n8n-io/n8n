"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function formatNum(single, one, few, other, n) {
    var rem10 = n % 10;
    var rem100 = n % 100;
    if (n == 1) {
        return single;
    }
    else if (rem10 == 1 && rem100 != 11) {
        return one;
    }
    else if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) {
        return few;
    }
    else {
        return other;
    }
}
var seconds = formatNum.bind(null, '1 секунд', '%s секунд', '%s секунде', '%s секунди'), minutes = formatNum.bind(null, '1 минут', '%s минут', '%s минуте', '%s минута'), hours = formatNum.bind(null, 'сат времена', '%s сат', '%s сата', '%s сати'), days = formatNum.bind(null, '1 дан', '%s дан', '%s дана', '%s дана'), weeks = formatNum.bind(null, 'недељу дана', '%s недељу', '%s недеље', '%s недеља'), months = formatNum.bind(null, 'месец дана', '%s месец', '%s месеца', '%s месеци'), years = formatNum.bind(null, 'годину дана', '%s годину', '%s године', '%s година');
function default_1(number, index) {
    switch (index) {
        case 0:
            return ['малопре', 'управо сад'];
        case 1:
            return ['пре ' + seconds(number), 'за ' + seconds(number)];
        case 2:
        case 3:
            return ['пре ' + minutes(number), 'за ' + minutes(number)];
        case 4:
        case 5:
            return ['пре ' + hours(number), 'за ' + hours(number)];
        case 6:
        case 7:
            return ['пре ' + days(number), 'за ' + days(number)];
        case 8:
        case 9:
            return ['пре ' + weeks(number), 'за ' + weeks(number)];
        case 10:
        case 11:
            return ['пре ' + months(number), 'за ' + months(number)];
        case 12:
        case 13:
            return ['пре ' + years(number), 'за ' + years(number)];
        default:
            return ['', ''];
    }
}
exports.default = default_1;
//# sourceMappingURL=sr.js.map