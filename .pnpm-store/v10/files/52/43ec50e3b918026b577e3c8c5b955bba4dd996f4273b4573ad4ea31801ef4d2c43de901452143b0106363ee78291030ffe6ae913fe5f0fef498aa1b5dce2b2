// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { LocalCryptographyUnsupportedError } from "./models.js";
/**
 * @internal
 * Use the platform-local hashing functionality
 */
export async function createHash(_algorithm, _data) {
    throw new LocalCryptographyUnsupportedError("Our libraries don't currently support browser hashing");
}
/**
 * @internal
 * Use the platform-local verify functionality
 */
export function createVerify(_algorithm, _data) {
    throw new LocalCryptographyUnsupportedError("Our libraries don't currently support browser hashing");
}
/**
 * @internal
 * Use the platform-local randomBytes functionality
 */
export function randomBytes(_length) {
    throw new LocalCryptographyUnsupportedError("Our libraries don't currently support browser crypto");
}
//# sourceMappingURL=crypto-browser.mjs.map