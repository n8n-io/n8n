"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationManager = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const handlers_1 = require("./handlers");
const handlerStorage_1 = require("./handlerStorage");
const types_1 = require("./types");
const logger = (0, agents_activity_1.debug)('agents:authorization:manager');
/**
 * Manages multiple authorization handlers and their interactions.
 * Processes authorization requests and maintains handler states.
 * @remarks
 * This class is responsible for coordinating the authorization process
 * across multiple handlers, ensuring that each handler is invoked in
 * the correct order and with the appropriate context.
 */
class AuthorizationManager {
    /**
     * Creates an instance of the AuthorizationManager.
     * @param app The agent application instance.
     */
    constructor(app, connections) {
        this.app = app;
        this._handlers = {};
        if (!app.options.storage) {
            throw new Error('Storage is required for Authorization. Ensure that a storage provider is configured in the AgentApplication options.');
        }
        if (app.options.authorization === undefined || Object.keys(app.options.authorization).length === 0) {
            throw new Error('The AgentApplication.authorization does not have any auth handlers');
        }
        const settings = { storage: app.options.storage, connections };
        for (const [id, handler] of Object.entries(app.options.authorization)) {
            const options = this.loadOptions(id, handler);
            if (options.type === 'agentic') {
                this._handlers[id] = new handlers_1.AgenticAuthorization(id, options, settings);
            }
            else {
                this._handlers[id] = new handlers_1.AzureBotAuthorization(id, options, settings);
            }
        }
    }
    /**
     * Loads and validates the authorization handler options.
     */
    loadOptions(id, options) {
        var _a, _b;
        const result = {
            ...options,
            type: (_b = ((_a = options.type) !== null && _a !== void 0 ? _a : process.env[`${id}_type`])) === null || _b === void 0 ? void 0 : _b.toLowerCase(),
        };
        // Validate supported types, agentic, and default (Azure Bot - undefined)
        const supportedTypes = ['agentic', undefined];
        if (!supportedTypes.includes(result.type)) {
            throw new Error(`Unsupported authorization handler type: '${result.type}' for auth handler: '${id}'. Supported types are: '${supportedTypes.filter(Boolean).join('\', \'')}'.`);
        }
        return result;
    }
    /**
     * Gets the registered authorization handlers.
     * @returns A record of authorization handlers by their IDs.
     */
    get handlers() {
        return this._handlers;
    }
    /**
     * Processes an authorization request.
     * @param context The turn context.
     * @param getHandlerIds A function to retrieve the handler IDs for the current activity.
     * @returns The result of the authorization process.
     */
    async process(context, getHandlerIds) {
        var _a, _b, _c;
        const storage = new handlerStorage_1.HandlerStorage(this.app.options.storage, context);
        let active = await this.active(storage, getHandlerIds);
        const handlers = (_c = (_a = active === null || active === void 0 ? void 0 : active.handlers) !== null && _a !== void 0 ? _a : this.mapHandlers((_b = await getHandlerIds(context.activity)) !== null && _b !== void 0 ? _b : [])) !== null && _c !== void 0 ? _c : [];
        for (const handler of handlers) {
            const status = await this.signin(storage, handler, context, active === null || active === void 0 ? void 0 : active.data);
            logger.debug(this.prefix(handler.id, `Sign-in status: ${status}`));
            if (status === types_1.AuthorizationHandlerStatus.IGNORED) {
                await storage.delete();
                return { authorized: true };
            }
            if (status === types_1.AuthorizationHandlerStatus.PENDING) {
                return { authorized: false };
            }
            if (status === types_1.AuthorizationHandlerStatus.REJECTED) {
                await storage.delete();
                return { authorized: false };
            }
            if (status === types_1.AuthorizationHandlerStatus.REVALIDATE) {
                await storage.delete();
                return this.process(context, getHandlerIds);
            }
            if (status !== types_1.AuthorizationHandlerStatus.APPROVED) {
                throw new Error(this.prefix(handler.id, `Unexpected registration status: ${status}`));
            }
            await storage.delete();
            if (active) {
                // Restore the original activity in the turn context for the next handler to process.
                // This is done like this to avoid losing data that may be set in the turn context.
                context._activity = agents_activity_1.Activity.fromObject(active.data.activity);
                active = undefined;
            }
        }
        return { authorized: true };
    }
    /**
     * Gets the active handler session from storage.
     */
    async active(storage, getHandlerIds) {
        var _a;
        const data = await storage.read();
        if (!data) {
            return;
        }
        const handlerIds = await getHandlerIds(agents_activity_1.Activity.fromObject(data.activity));
        let handlers = this.mapHandlers(handlerIds !== null && handlerIds !== void 0 ? handlerIds : []);
        // Sort handlers to ensure the active handler is processed first, to ensure continuity.
        handlers = (_a = handlers.sort((a, b) => {
            if (a.id === data.id) {
                return -1;
            }
            if (b.id === data.id) {
                return 1;
            }
            return 0;
        })) !== null && _a !== void 0 ? _a : [];
        return { data, handlers };
    }
    /**
     * Attempts to sign in using the specified handler and options.
     */
    async signin(storage, handler, context, active) {
        try {
            return await handler.signin(context, active);
        }
        catch (cause) {
            await storage.delete();
            throw new Error(this.prefix(handler.id, 'Failed to sign in'), { cause });
        }
    }
    /**
     * Maps an array of handler IDs to their corresponding handler instances.
     */
    mapHandlers(ids) {
        let unknownHandlers = '';
        const handlers = ids.map(id => {
            if (!this._handlers[id]) {
                unknownHandlers += ` ${id}`;
            }
            return this._handlers[id];
        });
        if (unknownHandlers) {
            throw new Error(`Cannot find auth handlers with ID(s): ${unknownHandlers}`);
        }
        return handlers;
    }
    /**
     * Prefixes a message with the handler ID.
     */
    prefix(id, message) {
        return `[handler:${id}] ${message}`;
    }
}
exports.AuthorizationManager = AuthorizationManager;
//# sourceMappingURL=authorizationManager.js.map