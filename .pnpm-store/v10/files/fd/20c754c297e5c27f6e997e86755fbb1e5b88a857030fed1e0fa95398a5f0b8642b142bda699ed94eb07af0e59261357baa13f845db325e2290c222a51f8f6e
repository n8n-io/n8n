// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isObjectWithProperties } from "@azure/core-util";
/**
 * Tests an object to determine whether it implements KeyCredential.
 *
 * @param credential - The assumed KeyCredential to be tested.
 */
export function isKeyCredential(credential) {
    return isObjectWithProperties(credential, ["key"]) && typeof credential.key === "string";
}
//# sourceMappingURL=keyCredential.js.map