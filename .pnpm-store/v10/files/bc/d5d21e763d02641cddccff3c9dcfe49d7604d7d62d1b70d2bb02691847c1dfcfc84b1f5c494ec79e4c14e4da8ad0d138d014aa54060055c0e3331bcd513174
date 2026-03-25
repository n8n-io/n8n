/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { UrlUtils } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { extractBrowserRequestState } from '../utils/BrowserProtocolUtils.mjs';
import { hashEmptyError, hashDoesNotContainKnownProperties, noStateInHash, unableToParseState, stateInteractionTypeMismatch } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function deserializeResponse(responseString, responseLocation, logger) {
    // Deserialize hash fragment response parameters.
    const serverParams = UrlUtils.getDeserializedResponse(responseString);
    if (!serverParams) {
        if (!UrlUtils.stripLeadingHashOrQuery(responseString)) {
            // Hash or Query string is empty
            logger.error(`The request has returned to the redirectUri but a ${responseLocation} is not present. It's likely that the ${responseLocation} has been removed or the page has been redirected by code running on the redirectUri page.`);
            throw createBrowserAuthError(hashEmptyError);
        }
        else {
            logger.error(`A ${responseLocation} is present in the iframe but it does not contain known properties. It's likely that the ${responseLocation} has been replaced by code running on the redirectUri page.`);
            logger.errorPii(`The ${responseLocation} detected is: ${responseString}`);
            throw createBrowserAuthError(hashDoesNotContainKnownProperties);
        }
    }
    return serverParams;
}
/**
 * Returns the interaction type that the response object belongs to
 */
function validateInteractionType(response, browserCrypto, interactionType) {
    if (!response.state) {
        throw createBrowserAuthError(noStateInHash);
    }
    const platformStateObj = extractBrowserRequestState(browserCrypto, response.state);
    if (!platformStateObj) {
        throw createBrowserAuthError(unableToParseState);
    }
    if (platformStateObj.interactionType !== interactionType) {
        throw createBrowserAuthError(stateInteractionTypeMismatch);
    }
}

export { deserializeResponse, validateInteractionType };
//# sourceMappingURL=ResponseHandler.mjs.map
