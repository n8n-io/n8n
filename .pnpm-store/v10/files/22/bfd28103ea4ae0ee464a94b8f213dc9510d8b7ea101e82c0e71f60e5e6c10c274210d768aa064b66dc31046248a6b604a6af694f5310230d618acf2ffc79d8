/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowActionRequiredStateParameters } from "../../AuthFlowState.js";
import { MfaClient } from "../../../interaction_client/mfa/MfaClient.js";
import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";
import { CustomAuthSilentCacheClient } from "../../../../get_account/interaction_client/CustomAuthSilentCacheClient.js";

export interface MfaStateParameters
    extends AuthFlowActionRequiredStateParameters {
    mfaClient: MfaClient;
    cacheClient: CustomAuthSilentCacheClient;
    scopes?: string[];
}

export interface MfaVerificationRequiredStateParameters
    extends MfaStateParameters {
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    selectedAuthMethodId?: string;
}

export interface MfaAwaitingStateParameters extends MfaStateParameters {
    authMethods: AuthenticationMethod[];
}
