/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GrantType } from "../../../../CustomAuthConstants.js";
import { ApiRequestBase } from "./ApiTypesBase.js";

/* Sign-in API request types */
export interface SignInInitiateRequest extends ApiRequestBase {
    challenge_type: string;
    username: string;
}

export interface SignInChallengeRequest extends ApiRequestBase {
    challenge_type: string;
    continuation_token: string;
    id?: string;
}

interface SignInTokenRequestBase extends ApiRequestBase {
    continuation_token: string;
    scope: string;
    claims?: string;
}

export interface SignInPasswordTokenRequest extends SignInTokenRequestBase {
    password: string;
}

export interface SignInOobTokenRequest extends SignInTokenRequestBase {
    oob: string;
    grant_type: typeof GrantType.OOB | typeof GrantType.MFA_OOB;
}

export interface SignInContinuationTokenRequest extends SignInTokenRequestBase {
    username?: string;
}

export interface SignInIntrospectRequest extends ApiRequestBase {
    continuation_token: string;
}

/* Sign-up API request types */
export interface SignUpStartRequest extends ApiRequestBase {
    username: string;
    challenge_type: string;
    password?: string;
    attributes?: Record<string, string>;
}

export interface SignUpChallengeRequest extends ApiRequestBase {
    continuation_token: string;
    challenge_type: string;
}

interface SignUpContinueRequestBase extends ApiRequestBase {
    continuation_token: string;
}

export interface SignUpContinueWithOobRequest
    extends SignUpContinueRequestBase {
    oob: string;
}

export interface SignUpContinueWithPasswordRequest
    extends SignUpContinueRequestBase {
    password: string;
}

export interface SignUpContinueWithAttributesRequest
    extends SignUpContinueRequestBase {
    attributes: Record<string, string>;
}

/* Reset password API request types */
export interface ResetPasswordStartRequest extends ApiRequestBase {
    challenge_type: string;
    username: string;
}

export interface ResetPasswordChallengeRequest extends ApiRequestBase {
    challenge_type: string;
    continuation_token: string;
}

export interface ResetPasswordContinueRequest extends ApiRequestBase {
    continuation_token: string;
    oob: string;
}

export interface ResetPasswordSubmitRequest extends ApiRequestBase {
    continuation_token: string;
    new_password: string;
}

export interface ResetPasswordPollCompletionRequest extends ApiRequestBase {
    continuation_token: string;
}

/* Register API request types */
export interface RegisterIntrospectRequest extends ApiRequestBase {
    continuation_token: string;
}

export interface RegisterChallengeRequest extends ApiRequestBase {
    continuation_token: string;
    challenge_type: string;
    challenge_target: string;
    challenge_channel?: string;
}

export interface RegisterContinueRequest extends ApiRequestBase {
    continuation_token: string;
    grant_type: string;
    oob?: string;
}
