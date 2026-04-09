"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortMethods = sortMethods;
const methodCompareMap = {
    post: 0,
    put: 1,
    get: 2,
    patch: 3,
    delete: 4,
    head: 5,
    options: 6,
    trace: 7,
    connect: 8,
    query: 9,
};
function getKeyWeigh(keyMap, key) {
    const uniqueKeyMap = new Map(Object.entries(keyMap));
    const ketToReturn = uniqueKeyMap.get(key.toLowerCase());
    return ketToReturn ? ketToReturn : -1;
}
function sortKeys(a, b, compareMap) {
    const aKeyWeight = getKeyWeigh(compareMap, a);
    const bKeyWeight = getKeyWeigh(compareMap, b);
    return aKeyWeight - bKeyWeight;
}
function sortMethods(a, b) {
    return sortKeys(a, b, methodCompareMap);
}
//# sourceMappingURL=sort.js.map