"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBotAuthorization = void 0;
const logger_1 = require("@microsoft/agents-activity/logger");
const types_1 = require("../types");
const messageFactory_1 = require("../../../messageFactory");
const cards_1 = require("../../../cards");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const handlerStorage_1 = require("../handlerStorage");
const agents_activity_1 = require("@microsoft/agents-activity");
const logger = (0, logger_1.debug)('agents:authorization:azurebot');
const DEFAULT_SIGN_IN_ATTEMPTS = 2;
var Category;
(function (Category) {
    Category["SIGNIN"] = "signin";
    Category["UNKNOWN"] = "unknown";
})(Category || (Category = {}));
/**
 * Default implementation of an authorization handler using Azure Bot Service.
 */
class AzureBotAuthorization {
    /**
     * Creates an instance of the AzureBotAuthorization.
     * @param id The unique identifier for the handler.
     * @param options The settings for the handler.
     * @param app The agent application instance.
     */
    constructor(id, options, settings) {
        this.id = id;
        this.settings = settings;
        this._key = `${AzureBotAuthorization.name}/${this.id}`;
        /**
         * Predefined messages with dynamic placeholders.
         */
        this.messages = {
            invalidCode: (code) => {
                var _a, _b;
                const message = (_b = (_a = this._options.messages) === null || _a === void 0 ? void 0 : _a.invalidCode) !== null && _b !== void 0 ? _b : 'Invalid **{code}** code entered. Please try again with a new sign-in request.';
                return message.replaceAll('{code}', code);
            },
            invalidCodeFormat: (attemptsLeft) => {
                var _a, _b;
                const message = (_b = (_a = this._options.messages) === null || _a === void 0 ? void 0 : _a.invalidCodeFormat) !== null && _b !== void 0 ? _b : 'Please enter a valid **6-digit** code format (_e.g. 123456_).\r\n**{attemptsLeft} attempt(s) left...**';
                return message.replaceAll('{attemptsLeft}', attemptsLeft.toString());
            },
            maxAttemptsExceeded: (maxAttempts) => {
                var _a, _b;
                const message = (_b = (_a = this._options.messages) === null || _a === void 0 ? void 0 : _a.maxAttemptsExceeded) !== null && _b !== void 0 ? _b : 'You have exceeded the maximum number of sign-in attempts ({maxAttempts}). Please try again with a new sign-in request.';
                return message.replaceAll('{maxAttempts}', maxAttempts.toString());
            },
        };
        if (!this.settings.storage) {
            throw new Error(this.prefix('The \'storage\' option is not available in the app options. Ensure that the app is properly configured.'));
        }
        if (!this.settings.connections) {
            throw new Error(this.prefix('The \'connections\' option is not available in the app options. Ensure that the app is properly configured.'));
        }
        this._options = this.loadOptions(options);
    }
    /**
     * Loads and validates the authorization handler options.
     */
    loadOptions(settings) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const result = {
            name: (_a = settings.name) !== null && _a !== void 0 ? _a : (process.env[`${this.id}_connectionName`]),
            title: (_c = (_b = settings.title) !== null && _b !== void 0 ? _b : (process.env[`${this.id}_connectionTitle`])) !== null && _c !== void 0 ? _c : 'Sign-in',
            text: (_e = (_d = settings.text) !== null && _d !== void 0 ? _d : (process.env[`${this.id}_connectionText`])) !== null && _e !== void 0 ? _e : 'Please sign-in to continue',
            maxAttempts: (_f = settings.maxAttempts) !== null && _f !== void 0 ? _f : parseInt(process.env[`${this.id}_maxAttempts`]),
            messages: {
                invalidCode: (_h = (_g = settings.messages) === null || _g === void 0 ? void 0 : _g.invalidCode) !== null && _h !== void 0 ? _h : process.env[`${this.id}_messages_invalidCode`],
                invalidCodeFormat: (_k = (_j = settings.messages) === null || _j === void 0 ? void 0 : _j.invalidCodeFormat) !== null && _k !== void 0 ? _k : process.env[`${this.id}_messages_invalidCodeFormat`],
                maxAttemptsExceeded: (_m = (_l = settings.messages) === null || _l === void 0 ? void 0 : _l.maxAttemptsExceeded) !== null && _m !== void 0 ? _m : process.env[`${this.id}_messages_maxAttemptsExceeded`],
            },
            obo: {
                connection: (_p = (_o = settings.obo) === null || _o === void 0 ? void 0 : _o.connection) !== null && _p !== void 0 ? _p : process.env[`${this.id}_obo_connection`],
                scopes: (_r = (_q = settings.obo) === null || _q === void 0 ? void 0 : _q.scopes) !== null && _r !== void 0 ? _r : this.loadScopes(process.env[`${this.id}_obo_scopes`]),
            },
            enableSso: process.env[`${this.id}_enableSso`] !== 'false' // default value is true
        };
        if (!result.name) {
            throw new Error(this.prefix(`The 'name' property or '${this.id}_connectionName' env variable is required to initialize the handler.`));
        }
        return result;
    }
    /**
     * Maximum number of attempts for magic code entry.
     */
    get maxAttempts() {
        const attempts = this._options.maxAttempts;
        const result = typeof attempts === 'number' && Number.isFinite(attempts) ? Math.round(attempts) : NaN;
        return result > 0 ? result : DEFAULT_SIGN_IN_ATTEMPTS;
    }
    /**
     * Sets a handler to be called when a user successfully signs in.
     * @param callback The callback function to be invoked on successful sign-in.
     */
    onSuccess(callback) {
        this._onSuccess = callback;
    }
    /**
     * Sets a handler to be called when a user fails to sign in.
     * @param callback The callback function to be invoked on sign-in failure.
     */
    onFailure(callback) {
        this._onFailure = callback;
    }
    /**
     * Retrieves the token for the user, optionally using on-behalf-of flow for specified scopes.
     * @param context The turn context.
     * @param options Optional options for token acquisition, including connection and scopes for on-behalf-of flow.
     * @returns The token response containing the token or undefined if not available.
     */
    async token(context, options) {
        var _a;
        let { token } = this.getContext(context);
        if (!(token === null || token === void 0 ? void 0 : token.trim())) {
            const { activity } = context;
            const userTokenClient = await this.getUserTokenClient(context);
            // Using getTokenOrSignInResource instead of getUserToken to avoid HTTP 404 errors.
            const { tokenResponse } = await userTokenClient.getTokenOrSignInResource((_a = activity.from) === null || _a === void 0 ? void 0 : _a.id, this._options.name, activity.channelId, activity.getConversationReference(), activity.relatesTo, '');
            token = tokenResponse === null || tokenResponse === void 0 ? void 0 : tokenResponse.token;
        }
        if (!(token === null || token === void 0 ? void 0 : token.trim())) {
            return { token: undefined };
        }
        return await this.handleOBO(token, options);
    }
    /**
     * Signs out the user from the service.
     * @param context The turn context.
     * @returns True if the signout was successful, false otherwise.
     */
    async signout(context) {
        var _a;
        const user = (_a = context.activity.from) === null || _a === void 0 ? void 0 : _a.id;
        const channel = context.activity.channelId;
        const connection = this._options.name;
        if (!channel || !user) {
            throw new Error(this.prefix('Both \'activity.channelId\' and \'activity.from.id\' are required to perform signout.'));
        }
        logger.debug(this.prefix(`Signing out User '${user}' from => Channel: '${channel}', Connection: '${connection}'`), context.activity);
        const userTokenClient = await this.getUserTokenClient(context);
        await userTokenClient.signOut(user, connection, channel);
        return true;
    }
    /**
     * Initiates the sign-in process for the handler.
     * @param context The turn context.
     * @param active Optional active handler data.
     * @returns The status of the sign-in attempt.
     */
    async signin(context, active) {
        var _a, _b, _c, _d, _e;
        const { activity } = context;
        const [category] = (_b = (_a = activity.name) === null || _a === void 0 ? void 0 : _a.split('/')) !== null && _b !== void 0 ? _b : [Category.UNKNOWN];
        const storage = new handlerStorage_1.HandlerStorage(this.settings.storage, context);
        if (!active) {
            return this.setToken(storage, context);
        }
        logger.debug(this.prefix('Sign-in active session detected'), active.activity);
        if (((_c = active.activity.conversation) === null || _c === void 0 ? void 0 : _c.id) !== ((_d = activity.conversation) === null || _d === void 0 ? void 0 : _d.id)) {
            await this.sendInvokeResponse(context, { status: 400 });
            logger.warn(this.prefix('Discarding the active session due to the conversation has changed during an active sign-in process'), activity);
            return types_1.AuthorizationHandlerStatus.IGNORED;
        }
        if (active.attemptsLeft <= 0) {
            logger.warn(this.prefix('Maximum sign-in attempts exceeded'), activity);
            await context.sendActivity(messageFactory_1.MessageFactory.text(this.messages.maxAttemptsExceeded(this.maxAttempts)));
            return types_1.AuthorizationHandlerStatus.REJECTED;
        }
        if (category === Category.SIGNIN) {
            await storage.write({ ...active, category });
            const status = await this.handleSignInActivities(context);
            if (status !== types_1.AuthorizationHandlerStatus.IGNORED) {
                return status;
            }
        }
        else if (active.category === Category.SIGNIN) {
            // This is only for safety in case of unexpected behaviors during the MS Teams sign-in process,
            // e.g., user interrupts the flow by clicking the Consent Cancel button.
            logger.warn(this.prefix('The incoming activity will be revalidated due to a change in the sign-in flow'), activity);
            return types_1.AuthorizationHandlerStatus.REVALIDATE;
        }
        const { status, code } = await this.codeVerification(storage, context, active);
        if (status !== types_1.AuthorizationHandlerStatus.APPROVED) {
            return status;
        }
        try {
            const result = await this.setToken(storage, context, active, code);
            if (result !== types_1.AuthorizationHandlerStatus.APPROVED) {
                await this.sendInvokeResponse(context, { status: 404 });
                return result;
            }
            await this.sendInvokeResponse(context, { status: 200 });
            await ((_e = this._onSuccess) === null || _e === void 0 ? void 0 : _e.call(this, context));
            return result;
        }
        catch (error) {
            await this.sendInvokeResponse(context, { status: 500 });
            if (error instanceof Error) {
                error.message = this.prefix(error.message);
            }
            throw error;
        }
    }
    /**
     * Handles on-behalf-of token acquisition.
     */
    async handleOBO(token, options) {
        var _a, _b, _c;
        const oboConnection = (_a = options === null || options === void 0 ? void 0 : options.connection) !== null && _a !== void 0 ? _a : (_b = this._options.obo) === null || _b === void 0 ? void 0 : _b.connection;
        const oboScopes = (options === null || options === void 0 ? void 0 : options.scopes) && options.scopes.length > 0 ? options.scopes : (_c = this._options.obo) === null || _c === void 0 ? void 0 : _c.scopes;
        if (!oboScopes || oboScopes.length === 0) {
            return { token };
        }
        if (!this.isExchangeable(token)) {
            throw new Error(this.prefix('The current token is not exchangeable for an on-behalf-of flow. Ensure the token audience starts with \'api://\'.'));
        }
        try {
            const provider = oboConnection ? this.settings.connections.getConnection(oboConnection) : this.settings.connections.getDefaultConnection();
            const newToken = await provider.acquireTokenOnBehalfOf(oboScopes, token);
            logger.debug(this.prefix('Successfully acquired on-behalf-of token'), { connection: oboConnection, scopes: oboScopes });
            return { token: newToken };
        }
        catch (error) {
            logger.error(this.prefix('Failed to exchange on-behalf-of token'), { connection: oboConnection, scopes: oboScopes }, error);
            return { token: undefined };
        }
    }
    /**
     * Checks if a token is exchangeable for an on-behalf-of flow.
     */
    isExchangeable(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        const payload = jsonwebtoken_1.default.decode(token);
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        return audiences.some(aud => typeof aud === 'string' && aud.startsWith('api://'));
    }
    /**
     * Sets the token from the token response or initiates the sign-in flow.
     */
    async setToken(storage, context, active, code) {
        var _a;
        const { activity } = context;
        const userTokenClient = await this.getUserTokenClient(context);
        const { tokenResponse, signInResource } = await userTokenClient.getTokenOrSignInResource((_a = activity.from) === null || _a === void 0 ? void 0 : _a.id, this._options.name, activity.channelId, activity.getConversationReference(), activity.relatesTo, code !== null && code !== void 0 ? code : '');
        if (!tokenResponse && active) {
            logger.warn(this.prefix('Invalid code entered. Restarting sign-in flow'), activity);
            await context.sendActivity(messageFactory_1.MessageFactory.text(this.messages.invalidCode(code !== null && code !== void 0 ? code : '')));
            return types_1.AuthorizationHandlerStatus.REJECTED;
        }
        if (!tokenResponse) {
            logger.debug(this.prefix('Cannot find token. Sending sign-in card'), activity);
            const oCard = cards_1.CardFactory.oauthCard(this._options.name, this._options.title, this._options.text, signInResource, this._options.enableSso);
            await context.sendActivity(messageFactory_1.MessageFactory.attachment(oCard));
            await storage.write({ activity, id: this.id, ...(active !== null && active !== void 0 ? active : {}), attemptsLeft: this.maxAttempts });
            return types_1.AuthorizationHandlerStatus.PENDING;
        }
        logger.debug(this.prefix('Successfully acquired token'), activity);
        this.setContext(context, { token: tokenResponse.token });
        return types_1.AuthorizationHandlerStatus.APPROVED;
    }
    /**
     * Handles sign-in related activities.
     */
    async handleSignInActivities(context) {
        var _a, _b, _c, _d;
        const { activity } = context;
        // Ignore signin/verifyState here (handled in codeVerification).
        if (activity.name === 'signin/verifyState') {
            return types_1.AuthorizationHandlerStatus.IGNORED;
        }
        const userTokenClient = await this.getUserTokenClient(context);
        if (activity.name === 'signin/tokenExchange') {
            const tokenExchangeInvokeRequest = activity.value;
            const tokenExchangeRequest = { token: tokenExchangeInvokeRequest.token };
            if (!(tokenExchangeRequest === null || tokenExchangeRequest === void 0 ? void 0 : tokenExchangeRequest.token)) {
                const reason = 'The Agent received an InvokeActivity that is missing a TokenExchangeInvokeRequest value. This is required to be sent with the InvokeActivity.';
                await this.sendInvokeResponse(context, {
                    status: 400,
                    body: { connectionName: this._options.name, failureDetail: reason }
                });
                logger.error(this.prefix(reason));
                await ((_a = this._onFailure) === null || _a === void 0 ? void 0 : _a.call(this, context, reason));
                return types_1.AuthorizationHandlerStatus.REJECTED;
            }
            if (tokenExchangeInvokeRequest.connectionName !== this._options.name) {
                const reason = `The Agent received an InvokeActivity with a TokenExchangeInvokeRequest for a different connection name ('${tokenExchangeInvokeRequest.connectionName}') than expected ('${this._options.name}').`;
                await this.sendInvokeResponse(context, {
                    status: 400,
                    body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name, failureDetail: reason }
                });
                logger.error(this.prefix(reason));
                await ((_b = this._onFailure) === null || _b === void 0 ? void 0 : _b.call(this, context, reason));
                return types_1.AuthorizationHandlerStatus.REJECTED;
            }
            const { token } = await userTokenClient.exchangeTokenAsync((_c = activity.from) === null || _c === void 0 ? void 0 : _c.id, this._options.name, activity.channelId, tokenExchangeRequest);
            if (!token) {
                const reason = 'The MS Teams token service didn\'t send back the exchanged token. Waiting for MS Teams to send another signin/tokenExchange request. After multiple failed attempts, the user will be asked to enter the magic code.';
                await this.sendInvokeResponse(context, {
                    status: 412,
                    body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name, failureDetail: reason }
                });
                logger.debug(this.prefix(reason));
                return types_1.AuthorizationHandlerStatus.PENDING;
            }
            await this.sendInvokeResponse(context, {
                status: 200,
                body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name }
            });
            logger.debug(this.prefix('Successfully exchanged token'));
            this.setContext(context, { token });
            await ((_d = this._onSuccess) === null || _d === void 0 ? void 0 : _d.call(this, context));
            return types_1.AuthorizationHandlerStatus.APPROVED;
        }
        if (activity.name === 'signin/failure') {
            await this.sendInvokeResponse(context, { status: 200 });
            const reason = 'Failed to sign-in';
            const value = activity.value;
            logger.error(this.prefix(reason), value, activity);
            if (this._onFailure) {
                await this._onFailure(context, value.message || reason);
            }
            else {
                await context.sendActivity(messageFactory_1.MessageFactory.text(`${reason}. Please try again.`));
            }
            return types_1.AuthorizationHandlerStatus.REJECTED;
        }
        logger.error(this.prefix(`Unknown sign-in activity name: ${activity.name}`), activity);
        return types_1.AuthorizationHandlerStatus.REJECTED;
    }
    /**
     * Verifies the magic code provided by the user.
     */
    async codeVerification(storage, context, active) {
        if (!active) {
            logger.debug(this.prefix('No active session found. Skipping code verification.'), context.activity);
            return { status: types_1.AuthorizationHandlerStatus.IGNORED };
        }
        const { activity } = context;
        let state = activity.text;
        if (activity.name === 'signin/verifyState') {
            logger.debug(this.prefix('Getting code from activity.value'), activity);
            const { state: teamsState } = activity.value;
            state = teamsState;
        }
        if (state === 'CancelledByUser') {
            await this.sendInvokeResponse(context, { status: 200 });
            logger.warn(this.prefix('Sign-in process was cancelled by the user'), activity);
            return { status: types_1.AuthorizationHandlerStatus.REJECTED };
        }
        if (!(state === null || state === void 0 ? void 0 : state.match(/^\d{6}$/))) {
            logger.warn(this.prefix(`Invalid magic code entered. Attempts left: ${active.attemptsLeft}`), activity);
            await context.sendActivity(messageFactory_1.MessageFactory.text(this.messages.invalidCodeFormat(active.attemptsLeft)));
            await storage.write({ ...active, attemptsLeft: active.attemptsLeft - 1 });
            return { status: types_1.AuthorizationHandlerStatus.PENDING };
        }
        await this.sendInvokeResponse(context, { status: 200 });
        logger.debug(this.prefix('Code verification successful'), activity);
        return { status: types_1.AuthorizationHandlerStatus.APPROVED, code: state };
    }
    /**
     * Sets the authorization context in the turn state.
     */
    setContext(context, data) {
        return context.turnState.set(this._key, () => data);
    }
    /**
     * Gets the authorization context from the turn state.
     */
    getContext(context) {
        var _a;
        const result = context.turnState.get(this._key);
        return (_a = result === null || result === void 0 ? void 0 : result()) !== null && _a !== void 0 ? _a : { token: undefined };
    }
    /**
     * Gets the user token client from the turn context.
     */
    async getUserTokenClient(context) {
        const userTokenClient = context.turnState.get(context.adapter.UserTokenClientKey);
        if (!userTokenClient) {
            throw new Error(this.prefix('The \'userTokenClient\' is not available in the adapter. Ensure that the adapter supports user token operations.'));
        }
        return userTokenClient;
    }
    /**
     * Sends an InvokeResponse activity if the channel is Microsoft Teams, including Copilot within MS Teams.
     */
    sendInvokeResponse(context, response) {
        const [parentChannel] = agents_activity_1.Activity.parseChannelId(context.activity.channelId);
        if (parentChannel !== agents_activity_1.Channels.Msteams) {
            return Promise.resolve();
        }
        return context.sendActivity(agents_activity_1.Activity.fromObject({
            type: agents_activity_1.ActivityTypes.InvokeResponse,
            value: response
        }));
    }
    /**
     * Prefixes a message with the handler ID.
     */
    prefix(message) {
        return `[handler:${this.id}] ${message}`;
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
exports.AzureBotAuthorization = AzureBotAuthorization;
//# sourceMappingURL=azureBotAuthorization.js.map