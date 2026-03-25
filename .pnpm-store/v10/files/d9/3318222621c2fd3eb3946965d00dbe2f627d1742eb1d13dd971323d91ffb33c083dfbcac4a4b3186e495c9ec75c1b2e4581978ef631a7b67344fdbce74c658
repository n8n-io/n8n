"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStringFromStrOrFunc = exports.escapeForWithinString = void 0;
/** @internal */
function escapeForWithinString(str, quoteKind) {
    let result = "";
    // todo: reduce appends (don't go char by char)
    for (let i = 0; i < str.length; i++) {
        if (str[i] === quoteKind) {
            result += "\\";
        }
        else if (str[i] === "\r" && str[i + 1] === "\n") {
            result += "\\r\\n\\";
            i++; // skip the \r
        }
        else if (str[i] === "\n") {
            result += "\\n\\";
        }
        else if (str[i] === "\\") {
            result += "\\";
        }
        result += str[i];
    }
    return result;
}
exports.escapeForWithinString = escapeForWithinString;
/** @internal */
function getStringFromStrOrFunc(strOrFunc) {
    return strOrFunc instanceof Function ? strOrFunc() : strOrFunc;
}
exports.getStringFromStrOrFunc = getStringFromStrOrFunc;
