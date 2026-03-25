/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ShrOptions } from "../crypto/SignedHttpRequest.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
import { AuthenticationScheme } from "../utils/Constants.js";

/**
 * Type representing a unique request thumbprint.
 */
export type RequestThumbprint = {
    clientId: string;
    authority: string;
    scopes: Array<string>;
    homeAccountIdentifier?: string;
    claims?: string;
    authenticationScheme?: AuthenticationScheme;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    shrClaims?: string;
    sshKid?: string;
    shrOptions?: ShrOptions;
    embeddedClientId?: string;
};

export function getRequestThumbprint(
    clientId: string,
    request: BaseAuthRequest,
    homeAccountId?: string
): RequestThumbprint {
    return {
        clientId: clientId,
        authority: request.authority,
        scopes: request.scopes,
        homeAccountIdentifier: homeAccountId,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid,
        embeddedClientId:
            request.embeddedClientId || request.tokenBodyParameters?.clientId,
    };
}
