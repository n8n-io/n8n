/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UserAttribute } from "../../../core/network_client/custom_auth_api/types/ApiErrorResponseTypes.js";

interface SignUpActionResult {
    type: string;
    correlationId: string;
    continuationToken: string;
}

export interface SignUpCompletedResult extends SignUpActionResult {
    type: typeof SIGN_UP_COMPLETED_RESULT_TYPE;
}

export interface SignUpPasswordRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE;
}

export interface SignUpCodeRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_CODE_REQUIRED_RESULT_TYPE;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    interval: number;
    bindingMethod: string;
}

export interface SignUpAttributesRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE;
    requiredAttributes: Array<UserAttribute>;
}

export const SIGN_UP_COMPLETED_RESULT_TYPE = "SignUpCompletedResult";
export const SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE =
    "SignUpPasswordRequiredResult";
export const SIGN_UP_CODE_REQUIRED_RESULT_TYPE = "SignUpCodeRequiredResult";
export const SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE =
    "SignUpAttributesRequiredResult";

export function createSignUpCompletedResult(
    input: Omit<SignUpCompletedResult, "type">
): SignUpCompletedResult {
    return {
        type: SIGN_UP_COMPLETED_RESULT_TYPE,
        ...input,
    };
}

export function createSignUpPasswordRequiredResult(
    input: Omit<SignUpPasswordRequiredResult, "type">
): SignUpPasswordRequiredResult {
    return {
        type: SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE,
        ...input,
    };
}

export function createSignUpCodeRequiredResult(
    input: Omit<SignUpCodeRequiredResult, "type">
): SignUpCodeRequiredResult {
    return {
        type: SIGN_UP_CODE_REQUIRED_RESULT_TYPE,
        ...input,
    };
}

export function createSignUpAttributesRequiredResult(
    input: Omit<SignUpAttributesRequiredResult, "type">
): SignUpAttributesRequiredResult {
    return {
        type: SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE,
        ...input,
    };
}
