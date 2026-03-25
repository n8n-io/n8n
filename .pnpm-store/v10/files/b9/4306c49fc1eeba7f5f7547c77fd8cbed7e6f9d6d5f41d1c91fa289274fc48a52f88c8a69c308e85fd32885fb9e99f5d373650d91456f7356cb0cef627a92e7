import { ResetPasswordResendCodeResult } from "../result/ResetPasswordResendCodeResult.js";
import { ResetPasswordSubmitCodeResult } from "../result/ResetPasswordSubmitCodeResult.js";
import { ResetPasswordCodeRequiredStateParameters } from "./ResetPasswordStateParameters.js";
import { ResetPasswordState } from "./ResetPasswordState.js";
export declare class ResetPasswordCodeRequiredState extends ResetPasswordState<ResetPasswordCodeRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Submits a one-time passcode that the customer user received in their email in order to continue password reset flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<ResetPasswordSubmitCodeResult>} The result of the operation.
     */
    submitCode(code: string): Promise<ResetPasswordSubmitCodeResult>;
    /**
     * Resends another one-time passcode if the previous one hasn't been verified
     * @returns {Promise<ResetPasswordResendCodeResult>} The result of the operation.
     */
    resendCode(): Promise<ResetPasswordResendCodeResult>;
    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength(): number;
}
//# sourceMappingURL=ResetPasswordCodeRequiredState.d.ts.map