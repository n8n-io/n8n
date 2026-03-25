import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { MfaSubmitChallengeError } from "../error_type/MfaError.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { MfaCompletedState } from "../state/MfaCompletedState.js";
import { MfaFailedState } from "../state/MfaFailedState.js";
/**
 * Result of submitting an MFA challenge.
 */
export declare class MfaSubmitChallengeResult extends AuthFlowResultBase<MfaSubmitChallengeResultState, MfaSubmitChallengeError, CustomAuthAccountData> {
    /**
     * Creates an MfaSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaSubmitChallengeResult with error.
     */
    static createWithError(error: unknown): MfaSubmitChallengeResult;
    /**
     * Checks if the MFA flow is completed successfully.
     * @returns true if completed, false otherwise.
     */
    isCompleted(): this is MfaSubmitChallengeResult & {
        state: MfaCompletedState;
    };
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is MfaSubmitChallengeResult & {
        state: MfaFailedState;
    };
}
export type MfaSubmitChallengeResultState = MfaCompletedState | MfaFailedState;
//# sourceMappingURL=MfaSubmitChallengeResult.d.ts.map