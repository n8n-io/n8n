"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLimit = exports.isFilter = exports.filterNames = void 0;
exports.filterNames = new Set([
    "first",
    "last",
    "eq",
    "gt",
    "nth",
    "lt",
    "even",
    "odd",
]);
function isFilter(s) {
    if (s.type !== "pseudo")
        return false;
    if (exports.filterNames.has(s.name))
        return true;
    if (s.name === "not" && Array.isArray(s.data)) {
        // Only consider `:not` with embedded filters
        return s.data.some(function (s) { return s.some(isFilter); });
    }
    return false;
}
exports.isFilter = isFilter;
function getLimit(filter, data, partLimit) {
    var num = data != null ? parseInt(data, 10) : NaN;
    switch (filter) {
        case "first":
            return 1;
        case "nth":
        case "eq":
            return isFinite(num) ? (num >= 0 ? num + 1 : Infinity) : 0;
        case "lt":
            return isFinite(num)
                ? num >= 0
                    ? Math.min(num, partLimit)
                    : Infinity
                : 0;
        case "gt":
            return isFinite(num) ? Infinity : 0;
        case "odd":
            return 2 * partLimit;
        case "even":
            return 2 * partLimit - 1;
        case "last":
        case "not":
            return Infinity;
    }
}
exports.getLimit = getLimit;
//# sourceMappingURL=positionals.js.map