"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const middlewareSet_1 = require("./middlewareSet");
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:base-adapter');
/**
 * Abstract base class for all adapters in the Agents framework.
 *
 * @remarks
 * This class provides core functionality for handling conversations, managing middleware,
 * authentication, and error handling. Adapters are responsible for translating between
 * the Agents framework and specific communication channels (like Teams, Web Chat, etc.).
 *
 * Key features:
 * - Middleware pipeline for processing incoming and outgoing activities
 * - Error handling and recovery mechanisms
 * - Authentication provider integration
 * - Abstract methods for channel-specific operations
 * - Context management with revocable proxies for security
 */
class BaseAdapter {
    constructor() {
        /**
         * The middleware set used to process the pipeline of middleware handlers.
         */
        this.middleware = new middlewareSet_1.MiddlewareSet();
        this.turnError = async (context, error) => {
            logger.error(`\n [onTurnError] unhandled error: ${error}`);
            // Send a trace activity, which will be displayed in Bot Framework Emulator
            await context.sendTraceActivity('OnTurnError Trace', `${error}`, 'https://www.botframework.com/schemas/error', 'TurnError');
            // Send a message to the user
            await context.sendActivity('The agent encountered an error or bug.');
            await context.sendActivity('To continue to run this agent, please fix the source code.');
        };
        /**
         * Symbol key used to store connector client instances in the TurnContext.
         */
        this.ConnectorClientKey = Symbol('ConnectorClient');
        /**
         * Symbol key used to store User Token Client instances in the TurnContext.
         */
        this.UserTokenClientKey = Symbol('UserTokenClient');
    }
    /**
     * Gets the error handler for the adapter.
     * @returns The current error handler function.
     */
    get onTurnError() {
        return this.turnError;
    }
    /**
     * Sets the error handler for the adapter.
     * @param value - The error handler function to set.
     */
    set onTurnError(value) {
        this.turnError = value;
    }
    /**
     * Adds middleware to the adapter's middleware pipeline.
     * @param middlewares - The middleware to add.
     * @returns The adapter instance.
     */
    use(...middlewares) {
        this.middleware.use(...middlewares);
        return this;
    }
    /**
     * This method creates a revocable proxy for the given target object.
     * If the environment does not support Proxy.revocable, it returns the original object.
     * @remarks
     * This is used to enhance security by allowing the proxy to be revoked after use,
     * preventing further access to the underlying object.
     *
     * @param target The target object to be proxied.
     * @param handler Optional proxy handler to customize behavior.
     * @returns An object containing the proxy and a revoke function.
     */
    makeRevocable(target, handler) {
        // Ensure proxy supported (some browsers don't)
        if (typeof Proxy !== 'undefined' && Proxy.revocable) {
            return Proxy.revocable(target, (handler != null) ? handler : {});
        }
        else {
            return {
                proxy: target,
                revoke: () => {
                    // noop
                }
            };
        }
    }
    /**
     * Runs the middleware pipeline in sequence.
     * @param context - The TurnContext for the current turn.
     * @param next - The next function to call in the pipeline.
     * @returns A promise representing the completion of the middleware pipeline.
     */
    async runMiddleware(context, next) {
        if (context && context.activity && context.activity.locale) {
            context.locale = context.activity.locale;
        }
        // Create a revocable proxy for the context which will automatically be revoked upon completion of the turn.
        const pContext = this.makeRevocable(context);
        try {
            await this.middleware.run(pContext.proxy, async () => await next(pContext.proxy));
        }
        catch (err) {
            if (this.onTurnError) {
                if (err instanceof Error) {
                    await this.onTurnError(pContext.proxy, err);
                }
                else {
                    throw new Error('Unknown error type: ' + err.message);
                }
            }
            else {
                throw err;
            }
        }
        finally {
            pContext.revoke();
            // Accessing the context after this point, will throw a TypeError.
            // e.g.: "TypeError: Cannot perform 'get' on a proxy that has been revoked"
        }
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=baseAdapter.js.map