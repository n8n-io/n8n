/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { AuthError } from './AuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Converts a numeric tag to a string representation
 * @param tag - The numeric tag to convert
 * @returns The string representation of the tag
 */
function tagToString(tag) {
    if (tag === 0) {
        return "UNTAG";
    }
    const tagSymbolSpace = "abcdefghijklmnopqrstuvwxyz0123456789****************************";
    let tagBuffer = "*****";
    const chars = [
        tagSymbolSpace[(tag >> 24) & 0x3f],
        tagSymbolSpace[(tag >> 18) & 0x3f],
        tagSymbolSpace[(tag >> 12) & 0x3f],
        tagSymbolSpace[(tag >> 6) & 0x3f],
        tagSymbolSpace[(tag >> 0) & 0x3f],
    ];
    tagBuffer = chars.join("");
    return tagBuffer;
}
/**
 * Error class for MSAL Runtime errors that preserves detailed broker information
 */
class PlatformBrokerError extends AuthError {
    constructor(errorStatus, errorContext, errorCode, errorTag) {
        const tagString = tagToString(errorTag);
        const enhancedErrorContext = errorContext
            ? `${errorContext} (Error Code: ${errorCode}, Tag: ${tagString})`
            : `(Error Code: ${errorCode}, Tag: ${tagString})`;
        super(errorStatus, enhancedErrorContext);
        this.name = "PlatformBrokerError";
        this.statusCode = errorCode;
        this.tag = tagString;
        Object.setPrototypeOf(this, PlatformBrokerError.prototype);
    }
}

export { PlatformBrokerError };
//# sourceMappingURL=PlatformBrokerError.mjs.map
