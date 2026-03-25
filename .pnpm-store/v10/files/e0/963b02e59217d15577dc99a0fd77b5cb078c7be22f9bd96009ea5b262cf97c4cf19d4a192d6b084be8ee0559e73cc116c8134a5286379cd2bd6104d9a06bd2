"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidNumberArray = exports.isValidNumber = exports.isValidPositiveIntProperty = exports.isValidIntProperty = void 0;
function isValidIntProperty(input) {
    return Number.isInteger(input);
}
exports.isValidIntProperty = isValidIntProperty;
function isValidPositiveIntProperty(input) {
    return isValidIntProperty(input) && input >= 0;
}
exports.isValidPositiveIntProperty = isValidPositiveIntProperty;
function isValidNumber(input) {
    return typeof input == 'number';
}
exports.isValidNumber = isValidNumber;
function isValidNumberArray(input) {
    if (Array.isArray(input)) {
        for (const i in input) {
            if (!isValidNumber(input[i])) {
                return false;
            }
        }
        return true;
    }
    return false;
}
exports.isValidNumberArray = isValidNumberArray;
