// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isObjectWithProperties } from "@azure/core-util";
/**
 * A static-signature-based credential that supports updating
 * the underlying signature value.
 */
export class AzureSASCredential {
    /**
     * The value of the shared access signature to be used in authentication
     */
    get signature() {
        return this._signature;
    }
    /**
     * Create an instance of an AzureSASCredential for use
     * with a service client.
     *
     * @param signature - The initial value of the shared access signature to use in authentication
     */
    constructor(signature) {
        if (!signature) {
            throw new Error("shared access signature must be a non-empty string");
        }
        this._signature = signature;
    }
    /**
     * Change the value of the signature.
     *
     * Updates will take effect upon the next request after
     * updating the signature value.
     *
     * @param newSignature - The new shared access signature value to be used
     */
    update(newSignature) {
        if (!newSignature) {
            throw new Error("shared access signature must be a non-empty string");
        }
        this._signature = newSignature;
    }
}
/**
 * Tests an object to determine whether it implements SASCredential.
 *
 * @param credential - The assumed SASCredential to be tested.
 */
export function isSASCredential(credential) {
    return (isObjectWithProperties(credential, ["signature"]) && typeof credential.signature === "string");
}
//# sourceMappingURL=azureSASCredential.js.map