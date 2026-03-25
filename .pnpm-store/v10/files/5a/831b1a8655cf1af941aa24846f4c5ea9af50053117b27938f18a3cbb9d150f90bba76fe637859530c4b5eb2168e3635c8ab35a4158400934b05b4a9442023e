"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonError = void 0;
const stringifyValidationErrors_1 = require("./stringifyValidationErrors");
class JsonError extends Error {
    constructor(errors) {
        super(errors.map(stringifyValidationErrors_1.stringifyValidationError).join("; "));
        this.errors = errors;
        Object.setPrototypeOf(this, JsonError.prototype);
    }
}
exports.JsonError = JsonError;
