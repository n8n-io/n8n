"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticAuthorization = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const types_1 = require("../types");
const logger = (0, agents_activity_1.debug)('agents:authorization:agentic');
/**
 * Authorization handler for Agentic authentication.
 */
class AgenticAuthorization {
    /**
     * Creates an instance of the AgenticAuthorization class.
     * @param id The unique identifier for the authorization handler.
     * @param options The options for configuring the authorization handler.
     * @param settings The settings for the authorization handler.
     */
    constructor(id, options, settings) {
        this.id = id;
        this.settings = settings;
        this._key = `${AgenticAuthorization.name}/${this.id}`;
        if (!this.settings.connections) {
            throw new Error(this.prefix('The \'connections\' option is not available in the app options. Ensure that the app is properly configured.'));
        }
        this._options = this.loadOptions(options);
    }
    /**
     * Loads and validates the authorization handler options.
     */
    loadOptions(settings) {
        var _a, _b;
        const result = {
            type: 'agentic',
            altBlueprintConnectionName: (_a = settings.altBlueprintConnectionName) !== null && _a !== void 0 ? _a : (process.env[`${this.id}_altBlueprintConnectionName`]),
            scopes: (_b = settings.scopes) !== null && _b !== void 0 ? _b : this.loadScopes(process.env[`${this.id}_scopes`]),
        };
        if (!result.scopes || result.scopes.length === 0) {
            throw new Error(this.prefix('At least one scope must be specified for the Agentic authorization handler.'));
        }
        return result;
    }
    /**
     * @inheritdoc
     */
    signin() {
        return Promise.resolve(types_1.AuthorizationHandlerStatus.IGNORED);
    }
    /**
     * @inheritdoc
     */
    signout() {
        return Promise.resolve(false);
    }
    /**
     * @inheritdoc
     */
    async token(context, options) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const scopes = (options === null || options === void 0 ? void 0 : options.scopes) || this._options.scopes;
            const tokenResponse = this.getContext(context, scopes);
            if (tokenResponse.token) {
                logger.debug(this.prefix('Using cached Agentic user token'));
                return tokenResponse;
            }
            let connection;
            if ((_a = this._options.altBlueprintConnectionName) === null || _a === void 0 ? void 0 : _a.trim()) {
                connection = this.settings.connections.getConnection(this._options.altBlueprintConnectionName);
            }
            else {
                connection = this.settings.connections.getTokenProvider(context.identity, (_b = context.activity.serviceUrl) !== null && _b !== void 0 ? _b : '');
            }
            const token = await connection.getAgenticUserToken((_c = context.activity.getAgenticTenantId()) !== null && _c !== void 0 ? _c : '', (_d = context.activity.getAgenticInstanceId()) !== null && _d !== void 0 ? _d : '', (_e = context.activity.getAgenticUser()) !== null && _e !== void 0 ? _e : '', scopes);
            this.setContext(context, scopes, { token });
            (_f = this._onSuccess) === null || _f === void 0 ? void 0 : _f.call(this, context);
            return { token };
        }
        catch (error) {
            const reason = 'Error retrieving Agentic user token';
            logger.error(this.prefix(reason), error);
            (_g = this._onFailure) === null || _g === void 0 ? void 0 : _g.call(this, context, `${reason}: ${error.message}`);
            return { token: undefined };
        }
    }
    /**
     * @inheritdoc
     */
    onSuccess(callback) {
        this._onSuccess = callback;
    }
    /**
     * @inheritdoc
     */
    onFailure(callback) {
        this._onFailure = callback;
    }
    /**
     * Prefixes a message with the handler ID.
     */
    prefix(message) {
        return `[handler:${this.id}] ${message}`;
    }
    /**
     * Sets the authorization context in the turn state.
     * @param context The turn context in which to set the authorization data.
     * @param scopes The OAuth scopes associated with the authorization context.
     * @param data The token response to store in the turn state.
     */
    setContext(context, scopes, data) {
        return context.turnState.set(`${this._key}:${scopes.join(';')}`, () => data);
    }
    /**
     * Gets the authorization context from the turn state.
     * @param scopes The OAuth scopes for which the context is being retrieved.
     */
    getContext(context, scopes) {
        var _a;
        const result = context.turnState.get(`${this._key}:${scopes.join(';')}`);
        return (_a = result === null || result === void 0 ? void 0 : result()) !== null && _a !== void 0 ? _a : { token: undefined };
    }
    /**
     * Loads the OAuth scopes from the environment variables.
     */
    loadScopes(value) {
        var _a;
        return (_a = value === null || value === void 0 ? void 0 : value.split(',').reduce((acc, scope) => {
            const trimmed = scope.trim();
            if (trimmed) {
                acc.push(trimmed);
            }
            return acc;
        }, [])) !== null && _a !== void 0 ? _a : [];
    }
}
exports.AgenticAuthorization = AgenticAuthorization;
//# sourceMappingURL=agenticAuthorization.js.map