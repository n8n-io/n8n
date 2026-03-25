import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitPasswordError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
export declare class SignUpSubmitPasswordResult extends AuthFlowResultBase<SignUpSubmitPasswordResultState, SignUpSubmitPasswordError, void> {
    /**
     * Creates a new instance of SignUpSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitPasswordResultState);
    /**
     * Creates a new instance of SignUpSubmitPasswordResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitPasswordResult} A new instance of SignUpSubmitPasswordResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitPasswordResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitPasswordResult & {
        state: SignUpFailedState;
    };
    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpSubmitPasswordResult & {
        state: SignUpAttributesRequiredState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitPasswordResult & {
        state: SignUpCompletedState;
    };
}
/**
 * The possible states for the SignUpSubmitPasswordResult.
 * This includes:
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitPasswordResultState = SignUpAttributesRequiredState | SignUpCompletedState | SignUpFailedState;
//# sourceMappingURL=SignUpSubmitPasswordResult.d.ts.map