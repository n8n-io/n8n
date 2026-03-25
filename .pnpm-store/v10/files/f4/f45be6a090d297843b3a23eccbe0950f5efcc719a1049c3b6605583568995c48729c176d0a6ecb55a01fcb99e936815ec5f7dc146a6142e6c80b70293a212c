/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface MfaClientParametersBase {
    correlationId: string;
    continuationToken: string;
}

export interface MfaRequestChallengeParams extends MfaClientParametersBase {
    challengeType: string[];
    authMethodId: string;
}

export interface MfaSubmitChallengeParams extends MfaClientParametersBase {
    challenge: string;
    scopes: string[];
    claims?: string;
}
