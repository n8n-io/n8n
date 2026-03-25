import { SignInSubmitPasswordResult } from "../result/SignInSubmitPasswordResult.js";
import { SignInState } from "./SignInState.js";
import { SignInPasswordRequiredStateParameters } from "./SignInStateParameters.js";
export declare class SignInPasswordRequiredState extends SignInState<SignInPasswordRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Once user configures email with password as a authentication method in Microsoft Entra, user submits a password to continue sign-in flow.
     * @param {string} password - The password to submit.
     * @returns {Promise<SignInSubmitPasswordResult>} The result of the operation.
     */
    submitPassword(password: string): Promise<SignInSubmitPasswordResult>;
    /**
     * Gets the scopes to request.
     * @returns {string[] | undefined} The scopes to request.
     */
    getScopes(): string[] | undefined;
}
//# sourceMappingURL=SignInPasswordRequiredState.d.ts.map