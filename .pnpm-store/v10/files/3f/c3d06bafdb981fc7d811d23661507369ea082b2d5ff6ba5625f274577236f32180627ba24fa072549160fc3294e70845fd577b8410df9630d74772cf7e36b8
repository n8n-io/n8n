/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AuthorizationHandlerStatus, AuthorizationHandler, ActiveAuthorizationHandler, AuthorizationHandlerSettings, AuthorizationHandlerTokenOptions } from '../types';
import { TurnContext } from '../../../turnContext';
import { TokenResponse } from '../../../oauth';
declare enum Category {
    SIGNIN = "signin",
    UNKNOWN = "unknown"
}
/**
 * Active handler manager information.
 */
export interface AzureBotActiveHandler extends ActiveAuthorizationHandler {
    /**
     * The number of attempts left for the handler to process in case of failure.
     */
    attemptsLeft: number;
    /**
     * The current category of the handler.
     */
    category?: Category;
}
/**
 * Messages configuration for the AzureBotAuthorization handler.
 */
export interface AzureBotAuthorizationOptionsMessages {
    /**
     * Message displayed when an invalid code is entered.
     * Use `{code}` as a placeholder for the entered code.
     * Defaults to: 'The code entered is invalid. Please sign-in again to continue.'
     */
    invalidCode?: string;
    /**
     * Message displayed when the entered code format is invalid.
     * Use `{attemptsLeft}` as a placeholder for the number of attempts left.
     * Defaults to: 'Please enter a valid **6-digit** code format (_e.g. 123456_).\r\n**{attemptsLeft} attempt(s) left...**'
     */
    invalidCodeFormat?: string;
    /**
     * Message displayed when the maximum number of attempts is exceeded.
     * Use `{maxAttempts}` as a placeholder for the maximum number of attempts.
     * Defaults to: 'You have exceeded the maximum number of sign-in attempts ({maxAttempts}).'
     */
    maxAttemptsExceeded?: string;
}
/**
 * Settings for on-behalf-of token acquisition.
 */
export interface AzureBotAuthorizationOptionsOBO {
    /**
     * Connection name to use for on-behalf-of token acquisition.
     */
    connection?: string;
    /**
     * Scopes to request for on-behalf-of token acquisition.
     */
    scopes?: string[];
}
/**
 * Interface defining an authorization handler configuration.
 */
export interface AzureBotAuthorizationOptions {
    /**
     * The type of authorization handler.
     * This property is optional and should not be set when configuring this handler.
     * It is included here for completeness and type safety.
     */
    type?: undefined;
    /**
     * Connection name for the auth provider.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_connectionName` variable.
     */
    name?: string;
    /**
     * Title to display on auth cards/UI.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_connectionTitle` variable.
     */
    title?: string;
    /**
     * Text to display on auth cards/UI.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_connectionText` variable.
     */
    text?: string;
    /**
     * Maximum number of attempts for entering the magic code. Defaults to 2.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_maxAttempts` variable.
     */
    maxAttempts?: number;
    /**
     * Messages to display for various authentication scenarios.
     * @remarks
     * When using environment variables, these can be set using the following variables:
     * - `${authHandlerId}_messages_invalidCode`
     * - `${authHandlerId}_messages_invalidCodeFormat`
     * - `${authHandlerId}_messages_maxAttemptsExceeded`
     */
    messages?: AzureBotAuthorizationOptionsMessages;
    /**
     * Settings for on-behalf-of token acquisition.
     * @remarks
     * When using environment variables, these can be set using the following variables:
     * - `${authHandlerId}_obo_connection`
     * - `${authHandlerId}_obo_scopes` (comma-separated values, e.g. `scope1,scope2`)
     */
    obo?: AzureBotAuthorizationOptionsOBO;
    /**
     * Option to enable SSO when authenticating using Azure Active Directory (AAD). Defaults to true.
     */
    enableSso?: boolean;
}
/**
 * Settings for configuring the AzureBot authorization handler.
 */
export interface AzureBotAuthorizationSettings extends AuthorizationHandlerSettings {
}
/**
 * Default implementation of an authorization handler using Azure Bot Service.
 */
export declare class AzureBotAuthorization implements AuthorizationHandler {
    readonly id: string;
    private settings;
    private _options;
    private _onSuccess?;
    private _onFailure?;
    /**
     * Creates an instance of the AzureBotAuthorization.
     * @param id The unique identifier for the handler.
     * @param options The settings for the handler.
     * @param app The agent application instance.
     */
    constructor(id: string, options: AzureBotAuthorizationOptions, settings: AzureBotAuthorizationSettings);
    /**
     * Loads and validates the authorization handler options.
     */
    private loadOptions;
    /**
     * Maximum number of attempts for magic code entry.
     */
    private get maxAttempts();
    /**
     * Sets a handler to be called when a user successfully signs in.
     * @param callback The callback function to be invoked on successful sign-in.
     */
    onSuccess(callback: (context: TurnContext) => Promise<void> | void): void;
    /**
     * Sets a handler to be called when a user fails to sign in.
     * @param callback The callback function to be invoked on sign-in failure.
     */
    onFailure(callback: (context: TurnContext, reason?: string) => Promise<void> | void): void;
    /**
     * Retrieves the token for the user, optionally using on-behalf-of flow for specified scopes.
     * @param context The turn context.
     * @param options Optional options for token acquisition, including connection and scopes for on-behalf-of flow.
     * @returns The token response containing the token or undefined if not available.
     */
    token(context: TurnContext, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse>;
    /**
     * Signs out the user from the service.
     * @param context The turn context.
     * @returns True if the signout was successful, false otherwise.
     */
    signout(context: TurnContext): Promise<boolean>;
    /**
     * Initiates the sign-in process for the handler.
     * @param context The turn context.
     * @param active Optional active handler data.
     * @returns The status of the sign-in attempt.
     */
    signin(context: TurnContext, active?: AzureBotActiveHandler): Promise<AuthorizationHandlerStatus>;
    /**
     * Handles on-behalf-of token acquisition.
     */
    private handleOBO;
    /**
     * Checks if a token is exchangeable for an on-behalf-of flow.
     */
    private isExchangeable;
    /**
     * Sets the token from the token response or initiates the sign-in flow.
     */
    private setToken;
    /**
     * Handles sign-in related activities.
     */
    private handleSignInActivities;
    /**
     * Verifies the magic code provided by the user.
     */
    private codeVerification;
    private _key;
    /**
     * Sets the authorization context in the turn state.
     */
    private setContext;
    /**
     * Gets the authorization context from the turn state.
     */
    private getContext;
    /**
     * Gets the user token client from the turn context.
     */
    private getUserTokenClient;
    /**
     * Sends an InvokeResponse activity if the channel is Microsoft Teams, including Copilot within MS Teams.
     */
    private sendInvokeResponse;
    /**
     * Prefixes a message with the handler ID.
     */
    private prefix;
    /**
     * Predefined messages with dynamic placeholders.
     */
    private messages;
    /**
     * Loads the OAuth scopes from the environment variables.
     */
    private loadScopes;
}
export {};
