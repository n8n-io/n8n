import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { AuthMethodRegistrationChallengeMethodError } from "../error_type/AuthMethodRegistrationError.js";
import type { AuthMethodVerificationRequiredState } from "../state/AuthMethodRegistrationState.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationCompletedState } from "../state/AuthMethodRegistrationCompletedState.js";
import { AuthMethodRegistrationFailedState } from "../state/AuthMethodRegistrationFailedState.js";
/**
 * Result of challenging an authentication method for registration.
 * Uses base state type to avoid circular dependencies.
 */
export declare class AuthMethodRegistrationChallengeMethodResult extends AuthFlowResultBase<AuthMethodRegistrationChallengeMethodResultState, AuthMethodRegistrationChallengeMethodError, CustomAuthAccountData> {
    /**
     * Creates an AuthMethodRegistrationChallengeMethodResult with an error.
     * @param error The error that occurred.
     * @returns The AuthMethodRegistrationChallengeMethodResult with error.
     */
    static createWithError(error: unknown): AuthMethodRegistrationChallengeMethodResult;
    /**
     * Checks if the result indicates that verification is required.
     * @returns true if verification is required, false otherwise.
     */
    isVerificationRequired(): this is AuthMethodRegistrationChallengeMethodResult & {
        state: AuthMethodVerificationRequiredState;
    };
    /**
     * Checks if the result indicates that registration is completed (fast-pass scenario).
     * @returns true if registration is completed, false otherwise.
     */
    isCompleted(): this is AuthMethodRegistrationChallengeMethodResult & {
        state: AuthMethodRegistrationCompletedState;
    };
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is AuthMethodRegistrationChallengeMethodResult & {
        state: AuthMethodRegistrationFailedState;
    };
}
/**
 * Type definition for possible states in AuthMethodRegistrationChallengeMethodResult.
 */
export type AuthMethodRegistrationChallengeMethodResultState = AuthMethodVerificationRequiredState | AuthMethodRegistrationCompletedState | AuthMethodRegistrationFailedState;
//# sourceMappingURL=AuthMethodRegistrationChallengeMethodResult.d.ts.map