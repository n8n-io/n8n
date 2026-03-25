"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forever = void 0;
const execute_1 = require("./execute");
/**
 * Return a promise that never fulfills and only rejects with `AbortError` once
 * `signal` is aborted.
 */
function forever(signal) {
    return (0, execute_1.execute)(signal, () => () => { });
}
exports.forever = forever;
//# sourceMappingURL=forever.js.map