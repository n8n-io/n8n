"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyValidationError = void 0;
function stringifyValidationError(error) {
    if (error.path.length === 0) {
        return error.message;
    }
    return `${error.path.join(" -> ")}: ${error.message}`;
}
exports.stringifyValidationError = stringifyValidationError;
