/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthError } from '@azure/msal-common/browser';
import { inMemRedirectUnavailable, stubbedPublicClientApplicationCalled, storageNotSupported } from './BrowserConfigurationAuthErrorCodes.mjs';
import * as BrowserConfigurationAuthErrorCodes from './BrowserConfigurationAuthErrorCodes.mjs';
export { BrowserConfigurationAuthErrorCodes };

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const BrowserConfigurationAuthErrorMessages = {
    [storageNotSupported]: "Given storage configuration option was not supported.",
    [stubbedPublicClientApplicationCalled]: "Stub instance of Public Client Application was called. If using msal-react, please ensure context is not used without a provider. For more visit: aka.ms/msaljs/browser-errors",
    [inMemRedirectUnavailable]: "Redirect cannot be supported. In-memory storage was selected and storeAuthStateInCookie=false, which would cause the library to be unable to handle the incoming hash. If you would like to use the redirect API, please use session/localStorage or set storeAuthStateInCookie=true.",
};
/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use BrowserAuthErrorCodes instead
 */
const BrowserConfigurationAuthErrorMessage = {
    storageNotSupportedError: {
        code: storageNotSupported,
        desc: BrowserConfigurationAuthErrorMessages[storageNotSupported],
    },
    stubPcaInstanceCalled: {
        code: stubbedPublicClientApplicationCalled,
        desc: BrowserConfigurationAuthErrorMessages[stubbedPublicClientApplicationCalled],
    },
    inMemRedirectUnavailable: {
        code: inMemRedirectUnavailable,
        desc: BrowserConfigurationAuthErrorMessages[inMemRedirectUnavailable],
    },
};
/**
 * Browser library error class thrown by the MSAL.js library for SPAs
 */
class BrowserConfigurationAuthError extends AuthError {
    constructor(errorCode, errorMessage) {
        super(errorCode, errorMessage);
        this.name = "BrowserConfigurationAuthError";
        Object.setPrototypeOf(this, BrowserConfigurationAuthError.prototype);
    }
}
function createBrowserConfigurationAuthError(errorCode) {
    return new BrowserConfigurationAuthError(errorCode, BrowserConfigurationAuthErrorMessages[errorCode]);
}

export { BrowserConfigurationAuthError, BrowserConfigurationAuthErrorMessage, BrowserConfigurationAuthErrorMessages, createBrowserConfigurationAuthError };
//# sourceMappingURL=BrowserConfigurationAuthError.mjs.map
