// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var _a;
import { randomUUID as v4RandomUUID } from "crypto";
import { generateUUID } from "./uuidUtils.native";
// NOTE: This is a workaround until we can use `globalThis.crypto.randomUUID` in Node.js 19+.
let uuidFunction = typeof ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) === "function"
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : v4RandomUUID;
// Not defined in earlier versions of Node.js 14
if (!uuidFunction) {
    uuidFunction = generateUUID;
}
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export function randomUUID() {
    return uuidFunction();
}
//# sourceMappingURL=uuidUtils.js.map