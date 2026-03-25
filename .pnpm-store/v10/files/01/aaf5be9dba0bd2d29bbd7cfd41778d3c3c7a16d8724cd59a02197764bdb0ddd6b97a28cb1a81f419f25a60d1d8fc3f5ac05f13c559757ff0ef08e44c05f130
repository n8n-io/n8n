/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowActionRequiredStateParameters } from "../../../core/auth_flow/AuthFlowState.js";
import { CustomAuthSilentCacheClient } from "../../../get_account/interaction_client/CustomAuthSilentCacheClient.js";
import { SignInClient } from "../../interaction_client/SignInClient.js";
import { SignInScenarioType } from "../SignInScenario.js";
import { JitClient } from "../../../core/interaction_client/jit/JitClient.js";
import { MfaClient } from "../../../core/interaction_client/mfa/MfaClient.js";

export interface SignInStateParameters
    extends AuthFlowActionRequiredStateParameters {
    username: string;
    signInClient: SignInClient;
    cacheClient: CustomAuthSilentCacheClient;
    claims?: string;
    jitClient: JitClient;
    mfaClient: MfaClient;
}

export interface SignInPasswordRequiredStateParameters
    extends SignInStateParameters {
    scopes?: string[];
}

export interface SignInCodeRequiredStateParameters
    extends SignInStateParameters {
    codeLength: number;
    scopes?: string[];
}

export interface SignInContinuationStateParameters
    extends SignInStateParameters {
    signInScenario: SignInScenarioType;
}
