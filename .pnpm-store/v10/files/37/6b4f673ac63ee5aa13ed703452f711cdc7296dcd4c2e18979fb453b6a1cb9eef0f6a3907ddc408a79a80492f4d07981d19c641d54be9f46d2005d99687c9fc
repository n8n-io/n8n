"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendError = void 0;
const isomorphic_node_1 = require("./isomorphic.node");
const stack_1 = require("./stack");
const to_json_1 = require("./to-json");
const protectedProps = ["name", "message", "stack"];
/**
 * Extends the new error with the properties of the original error and the `props` object.
 *
 * @param newError - The error object to extend
 * @param originalError - The original error object, if any
 * @param props - Additional properties to add, if any
 */
function extendError(error, originalError, props) {
    let onoError = error;
    extendStack(onoError, originalError);
    // Copy properties from the original error
    if (originalError && typeof originalError === "object") {
        mergeErrors(onoError, originalError);
    }
    // The default `toJSON` method doesn't output props like `name`, `message`, `stack`, etc.
    // So replace it with one that outputs every property of the error.
    onoError.toJSON = to_json_1.toJSON;
    // On Node.js, add support for the `util.inspect()` method
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (isomorphic_node_1.addInspectMethod) {
        isomorphic_node_1.addInspectMethod(onoError);
    }
    // Finally, copy custom properties that were specified by the user.
    // These props OVERWRITE any previous props
    if (props && typeof props === "object") {
        Object.assign(onoError, props);
    }
    return onoError;
}
exports.extendError = extendError;
/**
 * Extend the error stack to include its cause
 */
function extendStack(newError, originalError) {
    let stackProp = Object.getOwnPropertyDescriptor(newError, "stack");
    if (stack_1.isLazyStack(stackProp)) {
        stack_1.lazyJoinStacks(stackProp, newError, originalError);
    }
    else if (stack_1.isWritableStack(stackProp)) {
        newError.stack = stack_1.joinStacks(newError, originalError);
    }
}
/**
 * Merges properties of the original error with the new error.
 *
 * @param newError - The error object to extend
 * @param originalError - The original error object, if any
 */
function mergeErrors(newError, originalError) {
    // Get the original error's keys
    // NOTE: We specifically exclude properties that we have already set on the new error.
    // This is _especially_ important for the `stack` property, because this property has
    // a lazy getter in some environments
    let keys = to_json_1.getDeepKeys(originalError, protectedProps);
    // HACK: We have to cast the errors to `any` so we can use symbol indexers.
    // see https://github.com/Microsoft/TypeScript/issues/1863
    let _newError = newError;
    let _originalError = originalError;
    for (let key of keys) {
        if (_newError[key] === undefined) {
            try {
                _newError[key] = _originalError[key];
            }
            catch (e) {
                // This property is read-only, so it can't be copied
            }
        }
    }
}
//# sourceMappingURL=extend-error.js.map