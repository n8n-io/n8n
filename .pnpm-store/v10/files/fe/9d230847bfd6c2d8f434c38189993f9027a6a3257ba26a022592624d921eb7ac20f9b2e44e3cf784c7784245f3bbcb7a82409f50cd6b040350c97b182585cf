/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthenticationResult } from "../../../../../response/AuthenticationResult.js";

interface MfaActionResult {
    type: string;
    correlationId: string;
}

export interface MfaVerificationRequiredResult extends MfaActionResult {
    type: typeof MFA_VERIFICATION_REQUIRED_RESULT_TYPE;
    continuationToken: string;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    bindingMethod: string;
}

export interface MfaCompletedResult extends MfaActionResult {
    type: typeof MFA_COMPLETED_RESULT_TYPE;
    authenticationResult: AuthenticationResult;
}

// Result type constants
export const MFA_VERIFICATION_REQUIRED_RESULT_TYPE =
    "MfaVerificationRequiredResult";
export const MFA_COMPLETED_RESULT_TYPE = "MfaCompletedResult";

export function createMfaVerificationRequiredResult(
    input: Omit<MfaVerificationRequiredResult, "type">
): MfaVerificationRequiredResult {
    return {
        type: MFA_VERIFICATION_REQUIRED_RESULT_TYPE,
        ...input,
    };
}

export function createMfaCompletedResult(
    input: Omit<MfaCompletedResult, "type">
): MfaCompletedResult {
    return {
        type: MFA_COMPLETED_RESULT_TYPE,
        ...input,
    };
}
