// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var _a;
import { randomUUID as v4RandomUUID } from "node:crypto";
// NOTE: This is a workaround until we can use `globalThis.crypto.randomUUID` in Node.js 19+.
const uuidFunction = typeof ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) === "function"
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : v4RandomUUID;
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export function randomUUID() {
    return uuidFunction();
}
//# sourceMappingURL=uuidUtils.js.map