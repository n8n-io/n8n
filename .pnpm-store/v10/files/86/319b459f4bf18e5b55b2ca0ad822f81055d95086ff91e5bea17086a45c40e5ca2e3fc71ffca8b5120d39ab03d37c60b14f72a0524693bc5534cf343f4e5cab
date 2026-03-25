"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EN_US = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
function default_1(diff, idx) {
    if (idx === 0)
        return ['just now', 'right now'];
    var unit = EN_US[Math.floor(idx / 2)];
    if (diff > 1)
        unit += 's';
    return [diff + " " + unit + " ago", "in " + diff + " " + unit];
}
exports.default = default_1;
//# sourceMappingURL=en_US.js.map