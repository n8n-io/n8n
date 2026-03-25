import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitAttributesError } from "../error_type/SignUpError.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
export declare class SignUpSubmitAttributesResult extends AuthFlowResultBase<SignUpSubmitAttributesResultState, SignUpSubmitAttributesError, void> {
    /**
     * Creates a new instance of SignUpSubmitAttributesResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitAttributesResultState);
    /**
     * Creates a new instance of SignUpSubmitAttributesResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitAttributesResult} A new instance of SignUpSubmitAttributesResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitAttributesResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitAttributesResult & {
        state: SignUpFailedState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitAttributesResult & {
        state: SignUpCompletedState;
    };
}
/**
 * The possible states for the SignUpSubmitAttributesResult.
 * This includes:
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitAttributesResultState = SignUpCompletedState | SignUpFailedState;
//# sourceMappingURL=SignUpSubmitAttributesResult.d.ts.map