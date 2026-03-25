"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binarySearch = void 0;
function binarySearch(offsets, start) {
    let low = 0;
    let high = offsets.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midValue = offsets[mid];
        if (midValue < start) {
            low = mid + 1;
        }
        else if (midValue > start) {
            high = mid - 1;
        }
        else {
            low = mid;
            high = mid;
            break;
        }
    }
    return Math.max(Math.min(low, high, offsets.length - 1), 0);
}
exports.binarySearch = binarySearch;
//# sourceMappingURL=binarySearch.js.map