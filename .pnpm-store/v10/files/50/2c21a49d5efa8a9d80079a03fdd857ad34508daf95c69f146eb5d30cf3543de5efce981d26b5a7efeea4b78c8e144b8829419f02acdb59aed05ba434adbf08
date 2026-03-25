/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";

export interface JitClientParametersBase {
    correlationId: string;
    continuationToken: string;
}

export interface JitChallengeAuthMethodParams extends JitClientParametersBase {
    authMethod: AuthenticationMethod;
    verificationContact: string;
    scopes: string[];
    username?: string;
    claims?: string;
}

export interface JitSubmitChallengeParams extends JitClientParametersBase {
    grantType: string;
    challenge?: string;
    scopes: string[];
    username?: string;
    claims?: string;
}
