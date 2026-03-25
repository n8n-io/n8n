"use strict";
// Forked from: https://github.com/eslint/eslint/blob/0dd9704c4751e1cd02039f7d6485fee09bbccbf6/lib/shared/severity.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSeverityToString = normalizeSeverityToString;
exports.normalizeSeverityToNumber = normalizeSeverityToNumber;
/**
 * Convert severity value of different types to a string.
 * @param  severity severity value
 * @throws error if severity is invalid
 */
function normalizeSeverityToString(severity) {
    if ([2, '2', 'error'].includes(severity)) {
        return 'error';
    }
    if ([1, '1', 'warn'].includes(severity)) {
        return 'warn';
    }
    if ([0, '0', 'off'].includes(severity)) {
        return 'off';
    }
    throw new Error(`Invalid severity value: ${severity}`);
}
/**
 * Convert severity value of different types to a number.
 * @param  severity severity value
 * @throws error if severity is invalid
 */
function normalizeSeverityToNumber(severity) {
    if ([2, '2', 'error'].includes(severity)) {
        return 2;
    }
    if ([1, '1', 'warn'].includes(severity)) {
        return 1;
    }
    if ([0, '0', 'off'].includes(severity)) {
        return 0;
    }
    throw new Error(`Invalid severity value: ${severity}`);
}
