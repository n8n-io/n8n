/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface SignUpParamsBase {
    clientId: string;
    challengeType: Array<string>;
    username: string;
    correlationId: string;
}

export interface SignUpStartParams extends SignUpParamsBase {
    password?: string;
    attributes?: Record<string, string>;
}

export interface SignUpResendCodeParams extends SignUpParamsBase {
    continuationToken: string;
}

export interface SignUpContinueParams extends SignUpParamsBase {
    continuationToken: string;
}

export interface SignUpSubmitCodeParams extends SignUpContinueParams {
    code: string;
}

export interface SignUpSubmitPasswordParams extends SignUpContinueParams {
    password: string;
}

export interface SignUpSubmitUserAttributesParams extends SignUpContinueParams {
    attributes: Record<string, string>;
}
