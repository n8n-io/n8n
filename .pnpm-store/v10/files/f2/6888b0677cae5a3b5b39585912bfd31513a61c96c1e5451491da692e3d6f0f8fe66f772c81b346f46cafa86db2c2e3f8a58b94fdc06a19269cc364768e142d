"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partition = void 0;
function partition(items, predicate) {
    const trueItems = [], falseItems = [];
    for (const item of items) {
        if (predicate(item)) {
            trueItems.push(item);
        }
        else {
            falseItems.push(item);
        }
    }
    return [trueItems, falseItems];
}
exports.partition = partition;
