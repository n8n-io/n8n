"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidStringArray = exports.isValidStringProperty = void 0;
function isValidStringProperty(input) {
    return typeof input == 'string' && input.length > 0;
}
exports.isValidStringProperty = isValidStringProperty;
function isValidStringArray(input) {
    if (Array.isArray(input)) {
        for (const i in input) {
            if (!isValidStringProperty(input[i])) {
                return false;
            }
        }
        return true;
    }
    return false;
}
exports.isValidStringArray = isValidStringArray;
