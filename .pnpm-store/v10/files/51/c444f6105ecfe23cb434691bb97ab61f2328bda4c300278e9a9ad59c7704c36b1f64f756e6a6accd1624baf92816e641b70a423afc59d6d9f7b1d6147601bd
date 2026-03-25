import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { AuthMethodRegistrationSubmitChallengeError } from "../error_type/AuthMethodRegistrationError.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationFailedState } from "../state/AuthMethodRegistrationFailedState.js";
import { AuthMethodRegistrationCompletedState } from "../state/AuthMethodRegistrationCompletedState.js";
/**
 * Result of submitting a challenge for authentication method registration.
 */
export declare class AuthMethodRegistrationSubmitChallengeResult extends AuthFlowResultBase<AuthMethodRegistrationSubmitChallengeResultState, AuthMethodRegistrationSubmitChallengeError, CustomAuthAccountData> {
    /**
     * Creates an AuthMethodRegistrationSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The AuthMethodRegistrationSubmitChallengeResult with error.
     */
    static createWithError(error: unknown): AuthMethodRegistrationSubmitChallengeResult;
    /**
     * Checks if the result indicates that registration is completed.
     * @returns true if registration is completed, false otherwise.
     */
    isCompleted(): this is AuthMethodRegistrationSubmitChallengeResult & {
        state: AuthMethodRegistrationCompletedState;
    };
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is AuthMethodRegistrationSubmitChallengeResult & {
        state: AuthMethodRegistrationFailedState;
    };
}
/**
 * Type definition for possible states in AuthMethodRegistrationSubmitChallengeResult.
 */
export type AuthMethodRegistrationSubmitChallengeResultState = AuthMethodRegistrationCompletedState | AuthMethodRegistrationFailedState;
//# sourceMappingURL=AuthMethodRegistrationSubmitChallengeResult.d.ts.map