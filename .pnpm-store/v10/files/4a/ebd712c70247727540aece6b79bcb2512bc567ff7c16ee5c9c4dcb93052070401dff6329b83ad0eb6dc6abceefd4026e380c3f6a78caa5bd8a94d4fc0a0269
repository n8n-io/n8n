/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

interface ResetPasswordActionResult {
    correlationId: string;
    continuationToken: string;
}

export interface ResetPasswordCodeRequiredResult
    extends ResetPasswordActionResult {
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    bindingMethod: string;
}

export type ResetPasswordPasswordRequiredResult = ResetPasswordActionResult;

export type ResetPasswordCompletedResult = ResetPasswordActionResult;
