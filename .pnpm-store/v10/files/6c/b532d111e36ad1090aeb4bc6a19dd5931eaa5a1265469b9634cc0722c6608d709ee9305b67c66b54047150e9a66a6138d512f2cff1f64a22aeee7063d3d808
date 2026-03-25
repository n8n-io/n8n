/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { ProtocolUtils, createClientAuthError, ClientAuthErrorCodes } from '@azure/msal-common/browser';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Extracts the BrowserStateObject from the state string.
 * @param browserCrypto
 * @param state
 */
function extractBrowserRequestState(browserCrypto, state) {
    if (!state) {
        return null;
    }
    try {
        const requestStateObj = ProtocolUtils.parseRequestState(browserCrypto, state);
        return requestStateObj.libraryState.meta;
    }
    catch (e) {
        throw createClientAuthError(ClientAuthErrorCodes.invalidState);
    }
}

export { extractBrowserRequestState };
//# sourceMappingURL=BrowserProtocolUtils.mjs.map
