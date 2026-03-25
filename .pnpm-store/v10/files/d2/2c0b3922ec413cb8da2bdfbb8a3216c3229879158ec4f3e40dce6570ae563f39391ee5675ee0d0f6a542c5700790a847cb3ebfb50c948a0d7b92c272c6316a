// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var _a;
import { generateUUID } from "./uuidUtils.common.js";
// NOTE: This could be undefined if not used in a secure context
const uuidFunction = typeof ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) === "function"
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : generateUUID;
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export function randomUUID() {
    return uuidFunction();
}
//# sourceMappingURL=uuidUtils-browser.mjs.map