"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsalConnectionManager = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const msalTokenProvider_1 = require("./msalTokenProvider");
class MsalConnectionManager {
    constructor(connectionsConfigurations = new Map(), connectionsMap = [], configuration = {}) {
        this._connections = new Map();
        this._connectionsMap = connectionsMap.length > 0 ? connectionsMap : (configuration.connectionsMap || []);
        this._serviceConnectionConfiguration = {};
        const providedConnections = connectionsConfigurations.size > 0 ? connectionsConfigurations : (configuration.connections || new Map());
        for (const [name, config] of providedConnections) {
            // Instantiate MsalTokenProvider for each connection
            this._connections.set(name, new msalTokenProvider_1.MsalTokenProvider(config));
            if (name === MsalConnectionManager.DEFAULT_CONNECTION) {
                this._serviceConnectionConfiguration = config;
            }
        }
    }
    /**
     * Get the OAuth connection for the agent.
     * @param connectionName The name of the connection.
     * @returns The OAuth connection for the agent.
     */
    getConnection(connectionName) {
        const conn = this._connections.get(connectionName);
        if (!conn) {
            throw new Error(`Connection not found: ${connectionName}`);
        }
        return this.applyConnectionDefaults(conn);
    }
    /**
     * Get the default OAuth connection for the agent.
     * @returns The default OAuth connection for the agent.
     */
    getDefaultConnection() {
        if (this._connections.size === 0) {
            throw new Error('No connections found for this Agent in the Connections Configuration.');
        }
        // Return the wildcard map item instance.
        for (const item of this._connectionsMap) {
            if (item.serviceUrl === '*' && !item.audience) {
                return this.getConnection(item.connection);
            }
        }
        const conn = this._connections.values().next().value;
        return this.applyConnectionDefaults(conn);
    }
    /**
     * Finds a connection based on a map.
     *
     * @param identity - The identity.  Usually TurnContext.identity.
     * @param serviceUrl The service URL.
     * @returns The TokenProvider for the connection.
     *
     * @remarks
     * Example environment variables:
     * connectionsMap__0__connection=seviceConnection
     * connectionsMap__0__serviceUrl=http://*..botframework.com/*
     * connectionsMap__0__audience=optional
     * connectionsMap__1__connection=agentic
     * connectionsMap__1__serviceUrl=agentic
     *
     * ServiceUrl is:  A regex to match with, or "*" for any serviceUrl value.
     * Connection is: A name in the 'Connections' list.
     */
    getTokenProvider(identity, serviceUrl) {
        if (!identity) {
            throw new Error('Identity is required to get the token provider.');
        }
        let audience;
        if (Array.isArray(identity === null || identity === void 0 ? void 0 : identity.aud)) {
            audience = identity.aud[0];
        }
        else {
            audience = identity.aud;
        }
        if (!audience || !serviceUrl)
            throw new Error('Audience and Service URL are required to get the token provider.');
        if (this._connectionsMap.length === 0) {
            return this.getDefaultConnection();
        }
        for (const item of this._connectionsMap) {
            let audienceMatch = true;
            // if we have an audience to match against, match it.
            if (item.audience && audience) {
                audienceMatch = item.audience === audience;
            }
            if (audienceMatch) {
                if (item.serviceUrl === '*' || !item.serviceUrl) {
                    return this.getConnection(item.connection);
                }
                const regex = new RegExp(item.serviceUrl, 'i');
                if (regex.test(serviceUrl)) {
                    return this.getConnection(item.connection);
                }
            }
        }
        throw new Error(`No connection found for audience: ${audience} and serviceUrl: ${serviceUrl}`);
    }
    /**
     * Finds a connection based on an activity's blueprint.
     * @param identity - The identity.  Usually TurnContext.identity.
     * @param activity The activity.
     * @returns The TokenProvider for the connection.
     */
    getTokenProviderFromActivity(identity, activity) {
        var _a, _b, _c, _d;
        let connection = this.getTokenProvider(identity, activity.serviceUrl || '');
        // This is for the case where the Agentic BlueprintId is not the same as the AppId
        if (connection &&
            (((_a = activity.recipient) === null || _a === void 0 ? void 0 : _a.role) === agents_activity_1.RoleTypes.AgenticIdentity ||
                ((_b = activity.recipient) === null || _b === void 0 ? void 0 : _b.role) === agents_activity_1.RoleTypes.AgenticUser)) {
            if (((_c = connection.connectionSettings) === null || _c === void 0 ? void 0 : _c.altBlueprintConnectionName) &&
                connection.connectionSettings.altBlueprintConnectionName.trim() !== '') {
                connection = this.getConnection((_d = connection.connectionSettings) === null || _d === void 0 ? void 0 : _d.altBlueprintConnectionName);
            }
        }
        return connection;
    }
    /**
     * Get the default connection configuration for the agent.
     * @returns The default connection configuration for the agent.
     */
    getDefaultConnectionConfiguration() {
        return this._serviceConnectionConfiguration;
    }
    applyConnectionDefaults(conn) {
        var _a, _b;
        var _c, _d;
        if (conn.connectionSettings) {
            (_a = (_c = conn.connectionSettings).authority) !== null && _a !== void 0 ? _a : (_c.authority = 'https://login.microsoftonline.com');
            (_b = (_d = conn.connectionSettings).issuers) !== null && _b !== void 0 ? _b : (_d.issuers = [
                'https://api.botframework.com',
                `https://sts.windows.net/${conn.connectionSettings.tenantId}/`,
                `${conn.connectionSettings.authority}/${conn.connectionSettings.tenantId}/v2.0`
            ]);
        }
        return conn;
    }
}
exports.MsalConnectionManager = MsalConnectionManager;
MsalConnectionManager.DEFAULT_CONNECTION = 'serviceConnection';
//# sourceMappingURL=msalConnectionManager.js.map