"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultErrorHandler = void 0;
/**
 * Protocol for handling options-related issues.
 */
const types_1 = require("./types");
/**
 * Default handler for options-related issues.
 */
class DefaultErrorHandler {
    handle(err, ctx) {
        switch (err) {
            case types_1.OptionsError.invalidOptionsParam:
                throw new TypeError(`Invalid "options" parameter: ${JSON.stringify(ctx.options)}`);
            case types_1.OptionsError.invalidDefaultsParam:
                throw new TypeError(`Invalid "defaults" parameter: ${JSON.stringify(ctx.defaults)}`);
            case types_1.OptionsError.optionNotRecognized:
                throw new Error(`Option "${ctx.key}" is not recognized.`);
            // istanbul ignore next:
            default:
                return ctx.options; // this will never happen
        }
    }
}
exports.DefaultErrorHandler = DefaultErrorHandler;
