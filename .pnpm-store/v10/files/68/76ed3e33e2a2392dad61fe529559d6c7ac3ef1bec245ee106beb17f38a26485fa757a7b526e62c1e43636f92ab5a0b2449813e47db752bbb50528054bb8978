"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
const stringifyValidationErrors_1 = require("./stringifyValidationErrors");
class ParseError extends Error {
    constructor(errors) {
        super(errors.map(stringifyValidationErrors_1.stringifyValidationError).join("; "));
        this.errors = errors;
        Object.setPrototypeOf(this, ParseError.prototype);
    }
}
exports.ParseError = ParseError;
