/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { TurnContext } from '../../../turnContext';
import { AuthorizationHandler, AuthorizationHandlerSettings, AuthorizationHandlerStatus, AuthorizationHandlerTokenOptions } from '../types';
import { TokenResponse } from '../../../oauth';
/**
 * Options for configuring the Agentic authorization handler.
 */
export interface AgenticAuthorizationOptions {
    /**
     * The type of authorization handler.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_type` variable.
     */
    type: 'agentic';
    /**
     * The scopes required for the authorization.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_scopes` variable (comma-separated values, e.g. `scope1,scope2`).
     */
    scopes?: string[];
    /**
     * (Optional) An alternative connection name to use for the authorization process.
     * @remarks
     * When using environment variables, this can be set using the `${authHandlerId}_altBlueprintConnectionName` variable.
     */
    altBlueprintConnectionName?: string;
}
/**
 * Settings for configuring the Agentic authorization handler.
 */
export interface AgenticAuthorizationSettings extends AuthorizationHandlerSettings {
}
/**
 * Authorization handler for Agentic authentication.
 */
export declare class AgenticAuthorization implements AuthorizationHandler {
    readonly id: string;
    private settings;
    private _options;
    private _onSuccess?;
    private _onFailure?;
    /**
     * Creates an instance of the AgenticAuthorization class.
     * @param id The unique identifier for the authorization handler.
     * @param options The options for configuring the authorization handler.
     * @param settings The settings for the authorization handler.
     */
    constructor(id: string, options: AgenticAuthorizationOptions, settings: AgenticAuthorizationSettings);
    /**
     * Loads and validates the authorization handler options.
     */
    private loadOptions;
    /**
     * @inheritdoc
     */
    signin(): Promise<AuthorizationHandlerStatus>;
    /**
     * @inheritdoc
     */
    signout(): Promise<boolean>;
    /**
     * @inheritdoc
     */
    token(context: TurnContext, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse>;
    /**
     * @inheritdoc
     */
    onSuccess(callback: (context: TurnContext) => void): void;
    /**
     * @inheritdoc
     */
    onFailure(callback: (context: TurnContext, reason?: string) => void): void;
    /**
     * Prefixes a message with the handler ID.
     */
    private prefix;
    private _key;
    /**
     * Sets the authorization context in the turn state.
     * @param context The turn context in which to set the authorization data.
     * @param scopes The OAuth scopes associated with the authorization context.
     * @param data The token response to store in the turn state.
     */
    private setContext;
    /**
     * Gets the authorization context from the turn state.
     * @param scopes The OAuth scopes for which the context is being retrieved.
     */
    private getContext;
    /**
     * Loads the OAuth scopes from the environment variables.
     */
    private loadScopes;
}
