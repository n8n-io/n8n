/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { GetAccountResult } from '../get_account/auth_flow/result/GetAccountResult.mjs';
import { SignInResult } from '../sign_in/auth_flow/result/SignInResult.mjs';
import { SignUpResult } from '../sign_up/auth_flow/result/SignUpResult.mjs';
import { SignInClient } from '../sign_in/interaction_client/SignInClient.mjs';
import { CustomAuthAccountData } from '../get_account/auth_flow/CustomAuthAccountData.mjs';
import { UnexpectedError } from '../core/error/UnexpectedError.mjs';
import { ResetPasswordStartResult } from '../reset_password/auth_flow/result/ResetPasswordStartResult.mjs';
import { CustomAuthAuthority } from '../core/CustomAuthAuthority.mjs';
import { DefaultPackageInfo } from '../CustomAuthConstants.mjs';
import { SIGN_IN_CODE_SEND_RESULT_TYPE, SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE, SIGN_IN_COMPLETED_RESULT_TYPE, SIGN_IN_JIT_REQUIRED_RESULT_TYPE, SIGN_IN_MFA_REQUIRED_RESULT_TYPE } from '../sign_in/interaction_client/result/SignInActionResult.mjs';
import { SignUpClient } from '../sign_up/interaction_client/SignUpClient.mjs';
import { CustomAuthInterationClientFactory } from '../core/interaction_client/CustomAuthInterationClientFactory.mjs';
import { SIGN_UP_CODE_REQUIRED_RESULT_TYPE, SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE } from '../sign_up/interaction_client/result/SignUpActionResult.mjs';
import { CustomAuthApiClient } from '../core/network_client/custom_auth_api/CustomAuthApiClient.mjs';
import { FetchHttpClient } from '../core/network_client/http_client/FetchHttpClient.mjs';
import { ResetPasswordClient } from '../reset_password/interaction_client/ResetPasswordClient.mjs';
import { JitClient } from '../core/interaction_client/jit/JitClient.mjs';
import { MfaClient } from '../core/interaction_client/mfa/MfaClient.mjs';
import { NoCachedAccountFoundError } from '../core/error/NoCachedAccountFoundError.mjs';
import { ensureArgumentIsNotNullOrUndefined, ensureArgumentIsNotEmptyString, ensureArgumentIsJSONString } from '../core/utils/ArgumentValidator.mjs';
import { UserAlreadySignedInError } from '../core/error/UserAlreadySignedInError.mjs';
import { CustomAuthSilentCacheClient } from '../get_account/interaction_client/CustomAuthSilentCacheClient.mjs';
import { UnsupportedEnvironmentError } from '../core/error/UnsupportedEnvironmentError.mjs';
import { SignInCodeRequiredState } from '../sign_in/auth_flow/state/SignInCodeRequiredState.mjs';
import { SignInPasswordRequiredState } from '../sign_in/auth_flow/state/SignInPasswordRequiredState.mjs';
import { SignInCompletedState } from '../sign_in/auth_flow/state/SignInCompletedState.mjs';
import { AuthMethodRegistrationRequiredState } from '../core/auth_flow/jit/state/AuthMethodRegistrationState.mjs';
import { MfaAwaitingState } from '../core/auth_flow/mfa/state/MfaState.mjs';
import { SignUpCodeRequiredState } from '../sign_up/auth_flow/state/SignUpCodeRequiredState.mjs';
import { SignUpPasswordRequiredState } from '../sign_up/auth_flow/state/SignUpPasswordRequiredState.mjs';
import { ResetPasswordCodeRequiredState } from '../reset_password/auth_flow/state/ResetPasswordCodeRequiredState.mjs';
import { StandardController } from '../../controllers/StandardController.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Controller for standard native auth operations.
 */
class CustomAuthStandardController extends StandardController {
    /*
     * Constructor for CustomAuthStandardController.
     * @param operatingContext - The operating context for the controller.
     * @param customAuthApiClient - The client to use for custom auth API operations.
     */
    constructor(operatingContext, customAuthApiClient) {
        super(operatingContext);
        if (!this.isBrowserEnvironment) {
            this.logger.verbose("The SDK can only be used in a browser environment.");
            throw new UnsupportedEnvironmentError();
        }
        this.logger = this.logger.clone(DefaultPackageInfo.SKU, DefaultPackageInfo.VERSION);
        this.customAuthConfig = operatingContext.getCustomAuthConfig();
        this.authority = new CustomAuthAuthority(this.customAuthConfig.auth.authority, this.customAuthConfig, this.networkClient, this.browserStorage, this.logger, this.customAuthConfig.customAuth?.authApiProxyUrl);
        const interactionClientFactory = new CustomAuthInterationClientFactory(this.customAuthConfig, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, customAuthApiClient ??
            new CustomAuthApiClient(this.authority.getCustomAuthApiDomain(), this.customAuthConfig.auth.clientId, new FetchHttpClient(this.logger), this.customAuthConfig.customAuth?.capabilities?.join(" "), this.customAuthConfig.customAuth?.customAuthApiQueryParams), this.authority);
        this.signInClient = interactionClientFactory.create(SignInClient);
        this.signUpClient = interactionClientFactory.create(SignUpClient);
        this.resetPasswordClient =
            interactionClientFactory.create(ResetPasswordClient);
        this.jitClient = interactionClientFactory.create(JitClient);
        this.mfaClient = interactionClientFactory.create(MfaClient);
        this.cacheClient = interactionClientFactory.create(CustomAuthSilentCacheClient);
    }
    /*
     * Gets the current account from the cache.
     * @param accountRetrievalInputs - Inputs for getting the current cached account
     * @returns {GetAccountResult} The account result
     */
    getCurrentAccount(accountRetrievalInputs) {
        const correlationId = this.getCorrelationId(accountRetrievalInputs);
        try {
            this.logger.verbose("Getting current account data.", correlationId);
            const account = this.cacheClient.getCurrentAccount(correlationId);
            if (account) {
                this.logger.verbose("Account data found.", correlationId);
                return new GetAccountResult(new CustomAuthAccountData(account, this.customAuthConfig, this.cacheClient, this.logger, correlationId));
            }
            throw new NoCachedAccountFoundError(correlationId);
        }
        catch (error) {
            this.logger.errorPii(`An error occurred during getting current account: ${error}`, correlationId);
            return GetAccountResult.createWithError(error);
        }
    }
    /*
     * Signs the user in.
     * @param signInInputs - Inputs for signing in the user.
     * @returns {Promise<SignInResult>} The result of the operation.
     */
    async signIn(signInInputs) {
        const correlationId = this.getCorrelationId(signInInputs);
        try {
            ensureArgumentIsNotNullOrUndefined("signInInputs", signInInputs, correlationId);
            ensureArgumentIsNotEmptyString("signInInputs.username", signInInputs.username, correlationId);
            this.ensureUserNotSignedIn(correlationId);
            if (signInInputs.claims) {
                ensureArgumentIsJSONString("signInInputs.claims", signInInputs.claims, correlationId);
            }
            // start the signin flow
            const signInStartParams = {
                clientId: this.customAuthConfig.auth.clientId,
                correlationId: correlationId,
                challengeType: this.customAuthConfig.customAuth.challengeTypes ?? [],
                username: signInInputs.username,
                password: signInInputs.password,
            };
            this.logger.verbose(`Starting sign-in flow ${!!signInInputs.password ? "with" : "without"} password.`, correlationId);
            const startResult = await this.signInClient.start(signInStartParams);
            this.logger.verbose("Sign-in flow started.", correlationId);
            if (startResult.type === SIGN_IN_CODE_SEND_RESULT_TYPE) {
                // require code
                this.logger.verbose("Code required for sign-in.", correlationId);
                return new SignInResult(new SignInCodeRequiredState({
                    correlationId: startResult.correlationId,
                    continuationToken: startResult.continuationToken,
                    logger: this.logger,
                    config: this.customAuthConfig,
                    signInClient: this.signInClient,
                    cacheClient: this.cacheClient,
                    jitClient: this.jitClient,
                    mfaClient: this.mfaClient,
                    username: signInInputs.username,
                    codeLength: startResult.codeLength,
                    scopes: signInInputs.scopes ?? [],
                    claims: signInInputs.claims,
                }));
            }
            else if (startResult.type === SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE) {
                // require password
                this.logger.verbose("Password required for sign-in.", correlationId);
                if (!signInInputs.password) {
                    this.logger.verbose("Password required but not provided. Returning password required state.", correlationId);
                    return new SignInResult(new SignInPasswordRequiredState({
                        correlationId: startResult.correlationId,
                        continuationToken: startResult.continuationToken,
                        logger: this.logger,
                        config: this.customAuthConfig,
                        signInClient: this.signInClient,
                        cacheClient: this.cacheClient,
                        jitClient: this.jitClient,
                        mfaClient: this.mfaClient,
                        username: signInInputs.username,
                        scopes: signInInputs.scopes ?? [],
                        claims: signInInputs.claims,
                    }));
                }
                this.logger.verbose("Submitting password for sign-in.", correlationId);
                // if the password is provided, then try to get token silently.
                const submitPasswordParams = {
                    clientId: this.customAuthConfig.auth.clientId,
                    correlationId: correlationId,
                    challengeType: this.customAuthConfig.customAuth.challengeTypes ?? [],
                    scopes: signInInputs.scopes ?? [],
                    continuationToken: startResult.continuationToken,
                    password: signInInputs.password,
                    username: signInInputs.username,
                    claims: signInInputs.claims,
                };
                const submitPasswordResult = await this.signInClient.submitPassword(submitPasswordParams);
                this.logger.verbose("Sign-in flow completed.", correlationId);
                if (submitPasswordResult.type === SIGN_IN_COMPLETED_RESULT_TYPE) {
                    const accountInfo = new CustomAuthAccountData(submitPasswordResult.authenticationResult.account, this.customAuthConfig, this.cacheClient, this.logger, correlationId);
                    return new SignInResult(new SignInCompletedState(), accountInfo);
                }
                else if (submitPasswordResult.type ===
                    SIGN_IN_JIT_REQUIRED_RESULT_TYPE) {
                    // Authentication method registration is required - create AuthMethodRegistrationRequiredState
                    this.logger.verbose("Authentication method registration required for sign-in.", correlationId);
                    return new SignInResult(new AuthMethodRegistrationRequiredState({
                        correlationId: correlationId,
                        continuationToken: submitPasswordResult.continuationToken,
                        logger: this.logger,
                        config: this.customAuthConfig,
                        jitClient: this.jitClient,
                        cacheClient: this.cacheClient,
                        authMethods: submitPasswordResult.authMethods,
                        username: signInInputs.username,
                        scopes: signInInputs.scopes ?? [],
                        claims: signInInputs.claims,
                    }));
                }
                else if (submitPasswordResult.type ===
                    SIGN_IN_MFA_REQUIRED_RESULT_TYPE) {
                    // MFA is required - create MfaAwaitingState
                    this.logger.verbose("MFA required for sign-in.", correlationId);
                    return new SignInResult(new MfaAwaitingState({
                        correlationId: correlationId,
                        continuationToken: submitPasswordResult.continuationToken,
                        logger: this.logger,
                        config: this.customAuthConfig,
                        mfaClient: this.mfaClient,
                        cacheClient: this.cacheClient,
                        scopes: signInInputs.scopes ?? [],
                        authMethods: submitPasswordResult.authMethods ?? [],
                    }));
                }
                else {
                    // Unexpected result type
                    const result = submitPasswordResult;
                    const error = new Error(`Unexpected result type: ${result.type}`);
                    return SignInResult.createWithError(error);
                }
            }
            this.logger.error("Unexpected sign-in result type. Returning error.", correlationId);
            throw new UnexpectedError("Unknow sign-in result type", correlationId);
        }
        catch (error) {
            this.logger.errorPii(`An error occurred during starting sign-in: ${error}`, correlationId);
            return SignInResult.createWithError(error);
        }
    }
    /*
     * Signs the user up.
     * @param signUpInputs - Inputs for signing up the user.
     * @returns {Promise<SignUpResult>} The result of the operation
     */
    async signUp(signUpInputs) {
        const correlationId = this.getCorrelationId(signUpInputs);
        try {
            ensureArgumentIsNotNullOrUndefined("signUpInputs", signUpInputs, correlationId);
            ensureArgumentIsNotEmptyString("signUpInputs.username", signUpInputs.username, correlationId);
            this.ensureUserNotSignedIn(correlationId);
            this.logger.verbose(`Starting sign-up flow${!!signUpInputs.password
                ? ` with ${!!signUpInputs.attributes
                    ? "password and attributes"
                    : "password"}`
                : ""}.`, correlationId);
            const startResult = await this.signUpClient.start({
                clientId: this.customAuthConfig.auth.clientId,
                correlationId: correlationId,
                challengeType: this.customAuthConfig.customAuth.challengeTypes ?? [],
                username: signUpInputs.username,
                password: signUpInputs.password,
                attributes: signUpInputs.attributes,
            });
            this.logger.verbose("Sign-up flow started.", correlationId);
            if (startResult.type === SIGN_UP_CODE_REQUIRED_RESULT_TYPE) {
                // Code required
                this.logger.verbose("Code required for sign-up.", correlationId);
                return new SignUpResult(new SignUpCodeRequiredState({
                    correlationId: startResult.correlationId,
                    continuationToken: startResult.continuationToken,
                    logger: this.logger,
                    config: this.customAuthConfig,
                    signInClient: this.signInClient,
                    signUpClient: this.signUpClient,
                    cacheClient: this.cacheClient,
                    jitClient: this.jitClient,
                    mfaClient: this.mfaClient,
                    username: signUpInputs.username,
                    codeLength: startResult.codeLength,
                    codeResendInterval: startResult.interval,
                }));
            }
            else if (startResult.type === SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE) {
                // Password required
                this.logger.verbose("Password required for sign-up.", correlationId);
                return new SignUpResult(new SignUpPasswordRequiredState({
                    correlationId: startResult.correlationId,
                    continuationToken: startResult.continuationToken,
                    logger: this.logger,
                    config: this.customAuthConfig,
                    signInClient: this.signInClient,
                    signUpClient: this.signUpClient,
                    cacheClient: this.cacheClient,
                    jitClient: this.jitClient,
                    mfaClient: this.mfaClient,
                    username: signUpInputs.username,
                }));
            }
            this.logger.error("Unexpected sign-up result type. Returning error.", correlationId);
            throw new UnexpectedError("Unknown sign-up result type", correlationId);
        }
        catch (error) {
            this.logger.errorPii(`An error occurred during starting sign-up: ${error}`, correlationId);
            return SignUpResult.createWithError(error);
        }
    }
    /*
     * Resets the user's password.
     * @param resetPasswordInputs - Inputs for resetting the user's password.
     * @returns {Promise<ResetPasswordStartResult>} The result of the operation.
     */
    async resetPassword(resetPasswordInputs) {
        const correlationId = this.getCorrelationId(resetPasswordInputs);
        try {
            ensureArgumentIsNotNullOrUndefined("resetPasswordInputs", resetPasswordInputs, correlationId);
            ensureArgumentIsNotEmptyString("resetPasswordInputs.username", resetPasswordInputs.username, correlationId);
            this.ensureUserNotSignedIn(correlationId);
            this.logger.verbose("Starting password-reset flow.", correlationId);
            const startResult = await this.resetPasswordClient.start({
                clientId: this.customAuthConfig.auth.clientId,
                correlationId: correlationId,
                challengeType: this.customAuthConfig.customAuth.challengeTypes ?? [],
                username: resetPasswordInputs.username,
            });
            this.logger.verbose("Password-reset flow started.", correlationId);
            return new ResetPasswordStartResult(new ResetPasswordCodeRequiredState({
                correlationId: startResult.correlationId,
                continuationToken: startResult.continuationToken,
                logger: this.logger,
                config: this.customAuthConfig,
                signInClient: this.signInClient,
                resetPasswordClient: this.resetPasswordClient,
                cacheClient: this.cacheClient,
                jitClient: this.jitClient,
                mfaClient: this.mfaClient,
                username: resetPasswordInputs.username,
                codeLength: startResult.codeLength,
            }));
        }
        catch (error) {
            this.logger.errorPii(`An error occurred during starting reset-password: ${error}`, correlationId);
            return ResetPasswordStartResult.createWithError(error);
        }
    }
    getCorrelationId(actionInputs) {
        return (actionInputs?.correlationId || this.browserCrypto.createNewGuid());
    }
    ensureUserNotSignedIn(correlationId) {
        const account = this.getCurrentAccount({
            correlationId: correlationId,
        });
        if (account && !!account.data) {
            this.logger.error("User has already signed in.", correlationId);
            throw new UserAlreadySignedInError(correlationId);
        }
    }
}

export { CustomAuthStandardController };
//# sourceMappingURL=CustomAuthStandardController.mjs.map
