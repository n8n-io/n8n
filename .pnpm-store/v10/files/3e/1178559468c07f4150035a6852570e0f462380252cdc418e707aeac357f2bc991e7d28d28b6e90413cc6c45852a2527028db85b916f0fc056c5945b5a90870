"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timeTypes = [
    ['ثانية', 'ثانيتين', '%s ثوان', '%s ثانية'],
    ['دقيقة', 'دقيقتين', '%s دقائق', '%s دقيقة'],
    ['ساعة', 'ساعتين', '%s ساعات', '%s ساعة'],
    ['يوم', 'يومين', '%s أيام', '%s يوماً'],
    ['أسبوع', 'أسبوعين', '%s أسابيع', '%s أسبوعاً'],
    ['شهر', 'شهرين', '%s أشهر', '%s شهراً'],
    ['عام', 'عامين', '%s أعوام', '%s عاماً'],
];
function formatTime(type, n) {
    if (n < 3)
        return timeTypes[type][n - 1];
    if (n >= 3 && n <= 10)
        return timeTypes[type][2];
    return timeTypes[type][3];
}
function default_1(number, index) {
    if (index === 0) {
        return ['منذ لحظات', 'بعد لحظات'];
    }
    var timeStr = formatTime(Math.floor(index / 2), number);
    return ['منذ' + ' ' + timeStr, 'بعد' + ' ' + timeStr];
}
exports.default = default_1;
//# sourceMappingURL=ar.js.map