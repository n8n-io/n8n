import { GetAccountResult } from "./get_account/auth_flow/result/GetAccountResult.js";
import { SignInResult } from "./sign_in/auth_flow/result/SignInResult.js";
import { SignUpResult } from "./sign_up/auth_flow/result/SignUpResult.js";
import { ICustomAuthPublicClientApplication } from "./ICustomAuthPublicClientApplication.js";
import { AccountRetrievalInputs, SignInInputs, SignUpInputs, ResetPasswordInputs } from "./CustomAuthActionInputs.js";
import { CustomAuthConfiguration } from "./configuration/CustomAuthConfiguration.js";
import { ResetPasswordStartResult } from "./reset_password/auth_flow/result/ResetPasswordStartResult.js";
import { PublicClientApplication } from "../app/PublicClientApplication.js";
export declare class CustomAuthPublicClientApplication extends PublicClientApplication implements ICustomAuthPublicClientApplication {
    private readonly customAuthController;
    /**
     * Creates a new instance of a PublicClientApplication with the given configuration and controller to start Native authentication flows
     * @param {CustomAuthConfiguration} config - A configuration object for the PublicClientApplication instance
     * @returns {Promise<ICustomAuthPublicClientApplication>} - A promise that resolves to a CustomAuthPublicClientApplication instance
     */
    static create(config: CustomAuthConfiguration): Promise<ICustomAuthPublicClientApplication>;
    private constructor();
    /**
     * Gets the current account from the browser cache.
     * @param {AccountRetrievalInputs} accountRetrievalInputs?:AccountRetrievalInputs
     * @returns {GetAccountResult} - The result of the get account operation
     */
    getCurrentAccount(accountRetrievalInputs?: AccountRetrievalInputs): GetAccountResult;
    /**
     * Initiates the sign-in flow.
     * This method results in sign-in completion, or extra actions (password, code, etc.) required to complete the sign-in.
     * Create result with error details if any exception thrown.
     * @param {SignInInputs} signInInputs - Inputs for the sign-in flow
     * @returns {Promise<SignInResult>} - A promise that resolves to SignInResult
     */
    signIn(signInInputs: SignInInputs): Promise<SignInResult>;
    /**
     * Initiates the sign-up flow.
     * This method results in sign-up completion, or extra actions (password, code, etc.) required to complete the sign-up.
     * Create result with error details if any exception thrown.
     * @param {SignUpInputs} signUpInputs
     * @returns {Promise<SignUpResult>} - A promise that resolves to SignUpResult
     */
    signUp(signUpInputs: SignUpInputs): Promise<SignUpResult>;
    /**
     * Initiates the reset password flow.
     * This method results in triggering extra action (submit code) to complete the reset password.
     * Create result with error details if any exception thrown.
     * @param {ResetPasswordInputs} resetPasswordInputs - Inputs for the reset password flow
     * @returns {Promise<ResetPasswordStartResult>} - A promise that resolves to ResetPasswordStartResult
     */
    resetPassword(resetPasswordInputs: ResetPasswordInputs): Promise<ResetPasswordStartResult>;
    /**
     * Validates the configuration to ensure it is a valid CustomAuthConfiguration object.
     * @param {CustomAuthConfiguration} config - The configuration object for the PublicClientApplication.
     * @returns {void}
     */
    private static validateConfig;
}
//# sourceMappingURL=CustomAuthPublicClientApplication.d.ts.map