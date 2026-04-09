"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNever = assertNever;
/**
 * Helper function for exhaustive checks of discriminated unions.
 * https://basarat.gitbooks.io/typescript/docs/types/discriminated-unions.html
 *
 * @example
 *
 *    type A = {type: 'a'};
 *    type B = {type: 'b'};
 *    type Union = A | B;
 *
 *    function doSomething(arg: Union) {
 *      if (arg.type === 'a') {
 *        return something;
 *      }
 *
 *      if (arg.type === 'b') {
 *        return somethingElse;
 *      }
 *
 *      // TS will error if there are other types in the union
 *      // Will throw an Error when called at runtime.
 *      // Use `assertNever(arg, true)` instead to fail silently.
 *      return assertNever(arg);
 *    }
 */
function assertNever(value, errorMessageOrNoThrow) {
    if (typeof errorMessageOrNoThrow === 'string') {
        throw new Error(errorMessageOrNoThrow);
    }
    if (typeof errorMessageOrNoThrow === 'function') {
        throw new Error(errorMessageOrNoThrow(value));
    }
    if (errorMessageOrNoThrow) {
        return value;
    }
    throw new Error("Unhandled discriminated union member: ".concat(JSON.stringify(value)));
}
exports.default = assertNever;
