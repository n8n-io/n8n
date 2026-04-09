"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsingToolFunction = exports.ParsingFunction = exports.isRunnableFunctionWithParse = void 0;
function isRunnableFunctionWithParse(fn) {
    return typeof fn.parse === 'function';
}
exports.isRunnableFunctionWithParse = isRunnableFunctionWithParse;
/**
 * This is helper class for passing a `function` and `parse` where the `function`
 * argument type matches the `parse` return type.
 *
 * @deprecated - please use ParsingToolFunction instead.
 */
class ParsingFunction {
    constructor(input) {
        this.function = input.function;
        this.parse = input.parse;
        this.parameters = input.parameters;
        this.description = input.description;
        this.name = input.name;
    }
}
exports.ParsingFunction = ParsingFunction;
/**
 * This is helper class for passing a `function` and `parse` where the `function`
 * argument type matches the `parse` return type.
 */
class ParsingToolFunction {
    constructor(input) {
        this.type = 'function';
        this.function = input;
    }
}
exports.ParsingToolFunction = ParsingToolFunction;
//# sourceMappingURL=RunnableFunction.js.map