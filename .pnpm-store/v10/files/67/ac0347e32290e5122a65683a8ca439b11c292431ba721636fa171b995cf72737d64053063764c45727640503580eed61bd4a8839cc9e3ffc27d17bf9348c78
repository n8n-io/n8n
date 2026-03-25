/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity } from '@microsoft/agents-activity';
import { AgentApplication } from '../agentApplication';
import { TurnContext } from '../../turnContext';
import { AuthorizationHandler } from './types';
import { Connections } from '../../auth/connections';
/**
 * Result of the authorization manager process.
 */
export interface AuthorizationManagerProcessResult {
    /**
     * Indicates whether the authorization was successful.
     */
    authorized: boolean;
}
/**
 * Function to retrieve handler IDs for the current activity.
 */
export type GetHandlerIds = (activity: Activity) => string[] | Promise<string[]>;
/**
 * Manages multiple authorization handlers and their interactions.
 * Processes authorization requests and maintains handler states.
 * @remarks
 * This class is responsible for coordinating the authorization process
 * across multiple handlers, ensuring that each handler is invoked in
 * the correct order and with the appropriate context.
 */
export declare class AuthorizationManager {
    private app;
    private _handlers;
    /**
     * Creates an instance of the AuthorizationManager.
     * @param app The agent application instance.
     */
    constructor(app: AgentApplication<any>, connections: Connections);
    /**
     * Loads and validates the authorization handler options.
     */
    private loadOptions;
    /**
     * Gets the registered authorization handlers.
     * @returns A record of authorization handlers by their IDs.
     */
    get handlers(): Record<string, AuthorizationHandler>;
    /**
     * Processes an authorization request.
     * @param context The turn context.
     * @param getHandlerIds A function to retrieve the handler IDs for the current activity.
     * @returns The result of the authorization process.
     */
    process(context: TurnContext, getHandlerIds: GetHandlerIds): Promise<AuthorizationManagerProcessResult>;
    /**
     * Gets the active handler session from storage.
     */
    private active;
    /**
     * Attempts to sign in using the specified handler and options.
     */
    private signin;
    /**
     * Maps an array of handler IDs to their corresponding handler instances.
     */
    private mapHandlers;
    /**
     * Prefixes a message with the handler ID.
     */
    private prefix;
}
