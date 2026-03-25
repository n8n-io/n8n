import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { MfaRequestChallengeError } from "../error_type/MfaError.js";
import { MfaFailedState } from "../state/MfaFailedState.js";
import type { MfaVerificationRequiredState } from "../state/MfaState.js";
/**
 * Result of requesting an MFA challenge.
 * Uses base state type to avoid circular dependencies.
 */
export declare class MfaRequestChallengeResult extends AuthFlowResultBase<MfaRequestChallengeResultState, MfaRequestChallengeError> {
    /**
     * Creates an MfaRequestChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaRequestChallengeResult with error.
     */
    static createWithError(error: unknown): MfaRequestChallengeResult;
    /**
     * Checks if the result indicates that verification is required.
     * @returns true if verification is required, false otherwise.
     */
    isVerificationRequired(): this is MfaRequestChallengeResult & {
        state: MfaVerificationRequiredState;
    };
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is MfaRequestChallengeResult & {
        state: MfaFailedState;
    };
}
/**
 * The possible states for the MfaRequestChallengeResult.
 * This includes:
 * - MfaVerificationRequiredState: The user needs to verify their challenge.
 * - MfaFailedState: The MFA request failed.
 */
export type MfaRequestChallengeResultState = MfaVerificationRequiredState | MfaFailedState;
//# sourceMappingURL=MfaRequestChallengeResult.d.ts.map