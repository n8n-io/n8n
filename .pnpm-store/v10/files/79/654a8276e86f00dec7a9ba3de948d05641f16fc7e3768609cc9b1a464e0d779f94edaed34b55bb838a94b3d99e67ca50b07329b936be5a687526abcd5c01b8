"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureArgObject = ensureArgObject;
/**
 * Ensure that the provided args are an object. This is for backwards compatibility with v1 commands which
 * defined args as an array.
 *
 * @param args Either an array of args or an object of args
 * @returns ArgInput
 */
function ensureArgObject(args) {
    return (Array.isArray(args) ? (args ?? []).reduce((x, y) => ({ ...x, [y.name]: y }), {}) : args ?? {});
}
