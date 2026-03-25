/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ICrypto,
    Logger,
    AuthorizeResponse,
    UrlUtils,
} from "@azure/msal-common/browser";
import {
    BrowserAuthErrorCodes,
    createBrowserAuthError,
} from "../error/BrowserAuthError.js";
import { extractBrowserRequestState } from "../utils/BrowserProtocolUtils.js";
import { InteractionType } from "../utils/BrowserConstants.js";

export function deserializeResponse(
    responseString: string,
    responseLocation: string,
    logger: Logger
): AuthorizeResponse {
    // Deserialize hash fragment response parameters.
    const serverParams = UrlUtils.getDeserializedResponse(responseString);
    if (!serverParams) {
        if (!UrlUtils.stripLeadingHashOrQuery(responseString)) {
            // Hash or Query string is empty
            logger.error(
                `The request has returned to the redirectUri but a ${responseLocation} is not present. It's likely that the ${responseLocation} has been removed or the page has been redirected by code running on the redirectUri page.`
            );
            throw createBrowserAuthError(BrowserAuthErrorCodes.hashEmptyError);
        } else {
            logger.error(
                `A ${responseLocation} is present in the iframe but it does not contain known properties. It's likely that the ${responseLocation} has been replaced by code running on the redirectUri page.`
            );
            logger.errorPii(
                `The ${responseLocation} detected is: ${responseString}`
            );
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.hashDoesNotContainKnownProperties
            );
        }
    }
    return serverParams;
}

/**
 * Returns the interaction type that the response object belongs to
 */
export function validateInteractionType(
    response: AuthorizeResponse,
    browserCrypto: ICrypto,
    interactionType: InteractionType
): void {
    if (!response.state) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.noStateInHash);
    }

    const platformStateObj = extractBrowserRequestState(
        browserCrypto,
        response.state
    );
    if (!platformStateObj) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.unableToParseState);
    }

    if (platformStateObj.interactionType !== interactionType) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.stateInteractionTypeMismatch
        );
    }
}
