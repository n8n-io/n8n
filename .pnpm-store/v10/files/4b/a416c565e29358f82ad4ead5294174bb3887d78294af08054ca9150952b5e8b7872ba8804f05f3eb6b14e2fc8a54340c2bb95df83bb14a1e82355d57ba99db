import { SignUpResendCodeResult } from "../result/SignUpResendCodeResult.js";
import { SignUpSubmitCodeResult } from "../result/SignUpSubmitCodeResult.js";
import { SignUpState } from "./SignUpState.js";
import { SignUpCodeRequiredStateParameters } from "./SignUpStateParameters.js";
export declare class SignUpCodeRequiredState extends SignUpState<SignUpCodeRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Submit one-time passcode to continue sign-up flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<SignUpSubmitCodeResult>} The result of the operation.
     */
    submitCode(code: string): Promise<SignUpSubmitCodeResult>;
    /**
     * Resends the another one-time passcode for sign-up flow if the previous one hasn't been verified.
     * @returns {Promise<SignUpResendCodeResult>} The result of the operation.
     */
    resendCode(): Promise<SignUpResendCodeResult>;
    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength(): number;
    /**
     * Gets the interval in seconds for the code to be resent.
     * @returns {number} The interval in seconds for the code to be resent.
     */
    getCodeResendInterval(): number;
}
//# sourceMappingURL=SignUpCodeRequiredState.d.ts.map