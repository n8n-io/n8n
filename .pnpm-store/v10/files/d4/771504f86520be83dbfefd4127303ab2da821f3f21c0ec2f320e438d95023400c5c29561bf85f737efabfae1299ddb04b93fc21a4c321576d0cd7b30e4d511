"use strict";
/* eslint-disable no-unused-vars */
// Type definitions for @node-saml/xml-crypto
// Project: https://github.com/node-saml/xml-crypto#readme
// Original definitions by: Eric Heikes <https://github.com/eheikes>
//                          Max Chehab <https://github.com/maxchehab>
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOptionalCallbackFunction = void 0;
/**
 * ### Sign
 * #### Properties
 * - {@link SignedXml#privateKey} [required]
 * - {@link SignedXml#publicCert} [optional]
 * - {@link SignedXml#signatureAlgorithm} [optional]
 * - {@link SignedXml#canonicalizationAlgorithm} [optional]
 * #### Api
 *  - {@link SignedXml#addReference}
 *  - {@link SignedXml#computeSignature}
 *  - {@link SignedXml#getSignedXml}
 *  - {@link SignedXml#getSignatureXml}
 *  - {@link SignedXml#getOriginalXmlWithIds}
 *
 * ### Verify
 * #### Properties
 * -  {@link SignedXml#publicCert} [optional]
 * #### Api
 *  - {@link SignedXml#loadSignature}
 *  - {@link SignedXml#checkSignature}
 */
function isErrorFirstCallback(possibleCallback) {
    return typeof possibleCallback === "function";
}
/**
 * This function will add a callback version of a sync function.
 *
 * This follows the factory pattern.
 * Just call this function, passing the function that you'd like to add a callback version of.
 */
function createOptionalCallbackFunction(syncVersion) {
    return ((...args) => {
        const possibleCallback = args[args.length - 1];
        if (isErrorFirstCallback(possibleCallback)) {
            try {
                const result = syncVersion(...args.slice(0, -1));
                possibleCallback(null, result);
            }
            catch (err) {
                possibleCallback(err instanceof Error ? err : new Error("Unknown error"));
            }
        }
        else {
            return syncVersion(...args);
        }
    });
}
exports.createOptionalCallbackFunction = createOptionalCallbackFunction;
//# sourceMappingURL=types.js.map