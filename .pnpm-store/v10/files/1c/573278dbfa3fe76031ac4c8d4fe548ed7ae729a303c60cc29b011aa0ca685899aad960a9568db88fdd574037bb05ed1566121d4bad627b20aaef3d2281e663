"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAuthorization = void 0;
const logger_1 = require("@microsoft/agents-activity/logger");
const turnState_1 = require("../turnState");
const logger = (0, logger_1.debug)('agents:authorization');
/**
 * Class responsible for managing authorization and OAuth flows.
 * Handles multiple OAuth providers and manages the complete authentication lifecycle.
 *
 * @remarks
 * The Authorization class provides a centralized way to handle OAuth authentication
 * flows within the agent application. It supports multiple authentication handlers,
 * token exchange, on-behalf-of flows, and provides event handlers for success/failure scenarios.
 *
 * Key features:
 * - Multiple OAuth provider support
 * - Token caching and exchange
 * - On-behalf-of (OBO) token flows
 * - Sign-in success/failure event handling
 * - Automatic configuration from environment variables
 *
 */
class UserAuthorization {
    /**
     * Creates a new instance of Authorization.
     * @param manager The AuthorizationManager instance to manage handlers.
     */
    constructor(manager) {
        this.manager = manager;
    }
    /**
     * Gets the token for a specific auth handler.
     *
     * @param context - The context object for the current turn.
     * @param authHandlerId - ID of the auth handler to use.
     * @returns A promise that resolves to the token response from the OAuth provider.
     * @throws {Error} If the auth handler is not configured.
     *
     * @remarks
     * This method retrieves an existing token for the specified auth handler.
     * The token may be cached and will be retrieved from the OAuth provider if needed.
     *
     * @example
     * ```typescript
     * const tokenResponse = await auth.getToken(context, 'microsoft');
     * if (tokenResponse.token) {
     *   console.log('User is authenticated');
     * }
     * ```
     *
     * @public
     */
    async getToken(context, authHandlerId) {
        const handler = this.getHandler(authHandlerId);
        const { token } = await handler.token(context);
        return { token };
    }
    /**
     * @internal
     * Internal implementation of exchangeToken method.
     * Handles both overloads and performs the actual token exchange logic.
     */
    async exchangeToken(context, authHandlerId, options) {
        if (authHandlerId instanceof Array && typeof options === 'string') {
            logger.warn('Authorization.exchangeToken(context, scopes, authHandlerId) is deprecated. Use Authorization.exchangeToken(context, authHandlerId, options) instead.');
            const [handlerId, handlerScopes] = [options, authHandlerId];
            return this.exchangeToken(context, handlerId, { scopes: handlerScopes });
        }
        if (typeof authHandlerId === 'string' && typeof options !== 'string') {
            const handler = this.getHandler(authHandlerId);
            const { token } = await handler.token(context, options);
            return { token };
        }
        throw new Error('Invalid parameters for exchangeToken method.');
    }
    /**
     * Signs out the current user.
     *
     * @param context - The context object for the current turn.
     * @param state - The state object for the current turn.
     * @param authHandlerId - Optional ID of the auth handler to use for sign out. If not provided, signs out from all handlers.
     * @returns A promise that resolves when sign out is complete.
     * @throws {Error} If the specified auth handler is not configured.
     *
     * @remarks
     * This method clears the user's token and resets the authentication state.
     * If no specific authHandlerId is provided, it signs out from all configured handlers.
     * This ensures complete cleanup of authentication state across all providers.
     *
     * @example
     * ```typescript
     * // Sign out from specific handler
     * await auth.signOut(context, state, 'microsoft');
     *
     * // Sign out from all handlers
     * await auth.signOut(context, state);
     * ```
     *
     * @public
     */
    async signOut(context, state, authHandlerId) {
        if (authHandlerId) {
            await this.getHandler(authHandlerId).signout(context);
        }
        else {
            for (const handler of Object.values(this.manager.handlers)) {
                await handler.signout(context);
            }
        }
    }
    /**
     * Sets a handler to be called when sign-in is successfully completed.
     *
     * @param handler - The handler function to call on successful sign-in.
     *
     * @remarks
     * This method allows you to register a callback that will be invoked whenever
     * a user successfully completes the authentication process. The handler receives
     * the turn context, state, and the ID of the auth handler that was used.
     *
     * @example
     * ```typescript
     * auth.onSignInSuccess(async (context, state, authHandlerId) => {
     *   await context.sendActivity(`Welcome! You signed in using ${authHandlerId}.`);
     *   // Perform any post-authentication setup
     * });
     * ```
     *
     * @public
     */
    onSignInSuccess(handler) {
        for (const authHandler of Object.values(this.manager.handlers)) {
            authHandler.onSuccess((context) => handler(context, new turnState_1.TurnState(), authHandler.id));
        }
    }
    /**
     * Sets a handler to be called when sign-in fails.
     *
     * @param handler - The handler function to call on sign-in failure.
     *
     * @remarks
     * This method allows you to register a callback that will be invoked whenever
     * a user's authentication attempt fails. The handler receives the turn context,
     * state, auth handler ID, and an optional error message describing the failure.
     *
     * Common failure scenarios include:
     * - User cancels the authentication process
     * - Invalid credentials or expired tokens
     * - Network connectivity issues
     * - OAuth provider errors
     *
     * @example
     * ```typescript
     * auth.onSignInFailure(async (context, state, authHandlerId, errorMessage) => {
     *   await context.sendActivity(`Sign-in failed: ${errorMessage || 'Unknown error'}`);
     *   await context.sendActivity('Please try signing in again.');
     * });
     * ```
     *
     * @public
     */
    onSignInFailure(handler) {
        for (const authHandler of Object.values(this.manager.handlers)) {
            authHandler.onFailure((context, reason) => handler(context, new turnState_1.TurnState(), authHandler.id, reason));
        }
    }
    /**
     * Gets the auth handler by ID or throws an error if not found.
     *
     * @param id - ID of the auth handler to retrieve.
     * @returns The auth handler instance.
     * @throws {Error} If the auth handler with the specified ID is not configured.
     * @private
     */
    getHandler(id) {
        if (!Object.prototype.hasOwnProperty.call(this.manager.handlers, id)) {
            throw new Error(`Cannot find auth handler with ID '${id}'. Ensure it is configured in the agent application options.`);
        }
        return this.manager.handlers[id];
    }
}
exports.UserAuthorization = UserAuthorization;
//# sourceMappingURL=authorization.js.map