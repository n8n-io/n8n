"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertOptions = exports.createAssert = void 0;
const handler_1 = require("./handler");
const types_1 = require("./types");
/**
 * Creates an options-assert function that uses specified error handler.
 */
function createAssert(errHandler) {
    return function (options, defaults) {
        if (options !== null && options !== undefined && typeof options !== 'object') {
            return errHandler.handle(types_1.OptionsError.invalidOptionsParam, { options, defaults });
        }
        const isArray = Array.isArray(defaults);
        if (!isArray && (!defaults || typeof defaults !== 'object')) {
            return errHandler.handle(types_1.OptionsError.invalidDefaultsParam, { options, defaults });
        }
        if (options) {
            for (const key of Object.keys(options)) {
                if ((isArray && defaults.indexOf(key) === -1) || (!isArray && !(key in defaults))) {
                    return errHandler.handle(types_1.OptionsError.optionNotRecognized, { options, defaults, key });
                }
            }
        }
        else {
            options = {};
        }
        if (!isArray) {
            const defs = defaults;
            for (const d of Object.keys(defs)) {
                if (options[d] === undefined && defs[d] !== undefined) {
                    options[d] = defs[d];
                }
            }
        }
        return options;
    };
}
exports.createAssert = createAssert;
/**
 * Default options-assert function.
 */
exports.assertOptions = createAssert(new handler_1.DefaultErrorHandler());
