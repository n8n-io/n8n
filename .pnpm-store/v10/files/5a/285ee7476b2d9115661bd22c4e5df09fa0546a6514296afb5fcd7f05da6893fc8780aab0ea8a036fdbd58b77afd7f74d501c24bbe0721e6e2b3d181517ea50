/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ApiResponseBase } from "./ApiTypesBase.js";

interface ContinuousResponse extends ApiResponseBase {
    continuation_token?: string;
}

interface InitiateResponse extends ContinuousResponse {
    challenge_type?: string;
}

interface ChallengeResponse extends ApiResponseBase {
    continuation_token?: string;
    challenge_type?: string;
    binding_method?: string;
    challenge_channel?: string;
    challenge_target_label?: string;
    code_length?: number;
}

/* Sign-in API response types */
export type SignInInitiateResponse = InitiateResponse;

export type SignInChallengeResponse = ChallengeResponse;

export interface SignInTokenResponse extends ApiResponseBase {
    token_type: "Bearer";
    scope: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
    id_token: string;
    client_info: string;
    ext_expires_in?: number;
}

export interface AuthenticationMethod {
    id: string;
    challenge_type: string;
    challenge_channel: string;
    login_hint?: string;
}

export interface SignInIntrospectResponse extends ApiResponseBase {
    continuation_token: string;
    methods: AuthenticationMethod[];
}

/* Sign-up API response types */
export type SignUpStartResponse = InitiateResponse;

export interface SignUpChallengeResponse extends ChallengeResponse {
    interval?: number;
}

export type SignUpContinueResponse = InitiateResponse;

/* Reset password API response types */
export type ResetPasswordStartResponse = InitiateResponse;

export type ResetPasswordChallengeResponse = ChallengeResponse;

export interface ResetPasswordContinueResponse extends ContinuousResponse {
    expires_in: number;
}

export interface ResetPasswordSubmitResponse extends ContinuousResponse {
    poll_interval: number;
}

export interface ResetPasswordPollCompletionResponse
    extends ContinuousResponse {
    status: string;
}

/* Register API response types */
export interface RegisterIntrospectResponse extends ApiResponseBase {
    continuation_token: string;
    methods: AuthenticationMethod[];
}

export interface RegisterChallengeResponse extends ApiResponseBase {
    continuation_token: string;
    challenge_type: string;
    binding_method: string;
    challenge_target: string;
    challenge_channel: string;
    code_length?: number;
    interval?: number;
}

export interface RegisterContinueResponse extends ApiResponseBase {
    continuation_token: string;
}
