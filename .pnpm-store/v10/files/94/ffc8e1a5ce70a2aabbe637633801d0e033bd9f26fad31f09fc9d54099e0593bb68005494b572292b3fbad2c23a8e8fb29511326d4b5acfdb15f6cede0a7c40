"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumToMap = enumToMap;
function enumToMap(obj, filter = [], exceptions = []) {
    const emptyFilter = (filter?.length ?? 0) === 0;
    const emptyExceptions = (exceptions?.length ?? 0) === 0;
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => {
        return (typeof value === 'number' &&
            (emptyFilter || filter.includes(value)) &&
            (emptyExceptions || !exceptions.includes(value)));
    }));
}
