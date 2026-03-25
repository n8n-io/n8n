/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthenticationResult } from "../../../../../response/AuthenticationResult.js";

interface JitActionResult {
    type: string;
    correlationId: string;
}

export interface JitVerificationRequiredResult extends JitActionResult {
    type: typeof JIT_VERIFICATION_REQUIRED_RESULT_TYPE;
    continuationToken: string;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
}

export interface JitCompletedResult extends JitActionResult {
    type: typeof JIT_COMPLETED_RESULT_TYPE;
    authenticationResult: AuthenticationResult;
}

// Result type constants
export const JIT_VERIFICATION_REQUIRED_RESULT_TYPE =
    "JitVerificationRequiredResult";
export const JIT_COMPLETED_RESULT_TYPE = "JitCompletedResult";

export function createJitVerificationRequiredResult(
    input: Omit<JitVerificationRequiredResult, "type">
): JitVerificationRequiredResult {
    return {
        type: JIT_VERIFICATION_REQUIRED_RESULT_TYPE,
        ...input,
    };
}

export function createJitCompletedResult(
    input: Omit<JitCompletedResult, "type">
): JitCompletedResult {
    return {
        type: JIT_COMPLETED_RESULT_TYPE,
        ...input,
    };
}
