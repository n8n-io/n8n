"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNestedValue = getNestedValue;
function getNestedValue(obj, path) {
    let current = obj;
    for (const key of path) {
        if (current && current[key] !== undefined) {
            current = current[key];
        }
        else {
            return undefined;
        }
    }
    return current;
}
//# sourceMappingURL=get-nested-value.js.map