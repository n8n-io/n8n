import { SignInResendCodeResult } from "../result/SignInResendCodeResult.js";
import { SignInSubmitCodeResult } from "../result/SignInSubmitCodeResult.js";
import { SignInCodeRequiredStateParameters } from "./SignInStateParameters.js";
import { SignInState } from "./SignInState.js";
export declare class SignInCodeRequiredState extends SignInState<SignInCodeRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Once user configures email one-time passcode as a authentication method in Microsoft Entra, a one-time passcode will be sent to the user’s email.
     * Submit this one-time passcode to continue sign-in flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<SignInSubmitCodeResult>} The result of the operation.
     */
    submitCode(code: string): Promise<SignInSubmitCodeResult>;
    /**
     * Resends the another one-time passcode for sign-in flow if the previous one hasn't been verified.
     * @returns {Promise<SignInResendCodeResult>} The result of the operation.
     */
    resendCode(): Promise<SignInResendCodeResult>;
    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength(): number;
    /**
     * Gets the scopes to request.
     * @returns {string[] | undefined} The scopes to request.
     */
    getScopes(): string[] | undefined;
}
//# sourceMappingURL=SignInCodeRequiredState.d.ts.map