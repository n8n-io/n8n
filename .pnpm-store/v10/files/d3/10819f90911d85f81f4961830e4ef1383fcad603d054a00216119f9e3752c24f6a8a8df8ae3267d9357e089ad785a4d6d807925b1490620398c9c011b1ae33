"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContextVar = getContextVar;
exports.setContextVar = setContextVar;
const constants_js_1 = require("../singletons/constants.cjs");
/**
 * Get a context variable from a run tree instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContextVar(runTree, key) {
    if (constants_js_1._LC_CONTEXT_VARIABLES_KEY in runTree) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contextVars = runTree[constants_js_1._LC_CONTEXT_VARIABLES_KEY];
        return contextVars[key];
    }
    return undefined;
}
/**
 * Set a context variable on a run tree instance
 */
function setContextVar(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
runTree, key, value) {
    const contextVars = constants_js_1._LC_CONTEXT_VARIABLES_KEY in runTree
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            runTree[constants_js_1._LC_CONTEXT_VARIABLES_KEY]
        : {};
    contextVars[key] = value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runTree[constants_js_1._LC_CONTEXT_VARIABLES_KEY] = contextVars;
}
