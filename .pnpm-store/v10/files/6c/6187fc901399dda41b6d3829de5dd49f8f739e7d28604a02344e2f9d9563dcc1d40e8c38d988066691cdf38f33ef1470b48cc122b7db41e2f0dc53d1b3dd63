"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.polyfillDisposeSymbols = polyfillDisposeSymbols;
/**
 * @public
 * Polyfill for `Symbol.dispose` and `Symbol.asyncDispose` for Node.js versions prior to 20
 */
function polyfillDisposeSymbols() {
    var _a, _b;
    var _c, _d;
    (_a = (_c = Symbol).dispose) !== null && _a !== void 0 ? _a : (_c.dispose = Symbol.for('Symbol.dispose'));
    (_b = (_d = Symbol).asyncDispose) !== null && _b !== void 0 ? _b : (_d.asyncDispose = Symbol.for('Symbol.asyncDispose'));
}
//# sourceMappingURL=polyfillDisposeSymbols.js.map