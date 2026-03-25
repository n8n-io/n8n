export const filterNames = new Set([
    "first",
    "last",
    "eq",
    "gt",
    "nth",
    "lt",
    "even",
    "odd",
]);
export function isFilter(s) {
    if (s.type !== "pseudo")
        return false;
    if (filterNames.has(s.name))
        return true;
    if (s.name === "not" && Array.isArray(s.data)) {
        // Only consider `:not` with embedded filters
        return s.data.some((s) => s.some(isFilter));
    }
    return false;
}
export function getLimit(filter, data, partLimit) {
    const num = data != null ? parseInt(data, 10) : NaN;
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
//# sourceMappingURL=positionals.js.map