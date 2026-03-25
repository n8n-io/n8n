"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPrevAuthConfigFromEnv = exports.loadAuthConfigFromEnv = void 0;
exports.getAuthConfigWithDefaults = getAuthConfigWithDefaults;
const logger_1 = require("@microsoft/agents-activity/logger");
const object_path_1 = __importDefault(require("object-path"));
const logger = (0, logger_1.debug)('agents:authConfiguration');
const DEFAULT_CONNECTION = 'serviceConnection';
/**
 * Loads the authentication configuration from environment variables.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @remarks
 * - `clientId` is required
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
const loadAuthConfigFromEnv = (cnxName) => {
    var _a, _b, _c;
    const envConnections = loadConnectionsMapFromEnv();
    let authConfig;
    if (envConnections.connectionsMap.length === 0) {
        // No connections provided, we need to populate the connections map with the old config settings
        authConfig = buildLegacyAuthConfig(cnxName);
        envConnections.connections.set(DEFAULT_CONNECTION, authConfig);
        envConnections.connectionsMap.push({
            serviceUrl: '*',
            connection: DEFAULT_CONNECTION,
        });
    }
    else {
        // There are connections provided, use the default or specified connection
        if (cnxName) {
            const entry = envConnections.connections.get(cnxName);
            if (entry) {
                authConfig = entry;
            }
            else {
                throw new Error(`Connection "${cnxName}" not found in environment.`);
            }
        }
        else {
            const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*');
            const defaultConn = defaultItem ? envConnections.connections.get(defaultItem.connection) : undefined;
            if (!defaultConn) {
                throw new Error('No default connection found in environment connections.');
            }
            authConfig = defaultConn;
        }
        (_a = authConfig.authority) !== null && _a !== void 0 ? _a : (authConfig.authority = 'https://login.microsoftonline.com');
        (_b = authConfig.issuers) !== null && _b !== void 0 ? _b : (authConfig.issuers = getDefaultIssuers((_c = authConfig.tenantId) !== null && _c !== void 0 ? _c : '', authConfig.authority));
    }
    return {
        ...authConfig,
        ...envConnections,
    };
};
exports.loadAuthConfigFromEnv = loadAuthConfigFromEnv;
/**
 * Loads the agent authentication configuration from previous version environment variables.
 *
 * @returns The agent authentication configuration.
 * @throws Will throw an error if MicrosoftAppId is not provided in production.
 *
 * @example
 * ```
 * MicrosoftAppId=your-client-id
 * MicrosoftAppPassword=your-client-secret
 * MicrosoftAppTenantId=your-tenant-id
 * ```
 *
 */
const loadPrevAuthConfigFromEnv = () => {
    var _a, _b, _c, _d, _e;
    const envConnections = loadConnectionsMapFromEnv();
    let authConfig = {};
    if (envConnections.connectionsMap.length === 0) {
        // No connections provided, we need to populate the connection map with the old config settings
        if (process.env.MicrosoftAppId === undefined && process.env.NODE_ENV === 'production') {
            throw new Error('ClientId required in production');
        }
        const authority = (_a = process.env.authorityEndpoint) !== null && _a !== void 0 ? _a : 'https://login.microsoftonline.com';
        authConfig = {
            tenantId: process.env.MicrosoftAppTenantId,
            clientId: process.env.MicrosoftAppId,
            clientSecret: process.env.MicrosoftAppPassword,
            certPemFile: process.env.certPemFile,
            certKeyFile: process.env.certKeyFile,
            sendX5C: process.env.sendX5C === 'true',
            connectionName: process.env.connectionName,
            FICClientId: process.env.MicrosoftAppClientId,
            authority,
            scope: process.env.scope,
            issuers: getDefaultIssuers((_b = process.env.MicrosoftAppTenantId) !== null && _b !== void 0 ? _b : '', authority),
            altBlueprintConnectionName: process.env.altBlueprintConnectionName,
            WIDAssertionFile: process.env.WIDAssertionFile,
        };
        envConnections.connections.set(DEFAULT_CONNECTION, authConfig);
        envConnections.connectionsMap.push({
            serviceUrl: '*',
            connection: DEFAULT_CONNECTION,
        });
    }
    else {
        // There are connections provided, use the default one.
        const defaultItem = envConnections.connectionsMap.find((item) => item.serviceUrl === '*');
        const defaultConn = defaultItem ? envConnections.connections.get(defaultItem.connection) : undefined;
        if (!defaultConn) {
            throw new Error('No default connection found in environment connections.');
        }
        authConfig = defaultConn;
    }
    (_c = authConfig.authority) !== null && _c !== void 0 ? _c : (authConfig.authority = 'https://login.microsoftonline.com');
    (_d = authConfig.issuers) !== null && _d !== void 0 ? _d : (authConfig.issuers = getDefaultIssuers((_e = authConfig.tenantId) !== null && _e !== void 0 ? _e : '', authConfig.authority));
    return { ...authConfig, ...envConnections };
};
exports.loadPrevAuthConfigFromEnv = loadPrevAuthConfigFromEnv;
function loadConnectionsMapFromEnv() {
    const envVars = process.env;
    const connectionsObj = {};
    const connectionsMap = [];
    const CONNECTIONS_PREFIX = 'connections__';
    const CONNECTIONS_MAP_PREFIX = 'connectionsMap__';
    for (const [key, rawValue] of Object.entries(envVars)) {
        if (key.startsWith(CONNECTIONS_PREFIX)) {
            // Convert to dot notation
            let path = key.substring(CONNECTIONS_PREFIX.length).replace(/__/g, '.');
            // Remove ".settings." from the path
            path = path.replace('.settings.', '.');
            // Convert "true"/"false" strings into boolean values
            const value = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;
            object_path_1.default.set(connectionsObj, path, value);
        }
        else if (key.startsWith(CONNECTIONS_MAP_PREFIX)) {
            const path = key.substring(CONNECTIONS_MAP_PREFIX.length).replace(/__/g, '.');
            object_path_1.default.set(connectionsMap, path, rawValue);
        }
    }
    // Convert connectionsObj to Map<string, AuthConfiguration>
    const connections = new Map(Object.entries(connectionsObj));
    if (connections.size === 0) {
        logger.warn('No connections found in configuration.');
    }
    if (connectionsMap.length === 0) {
        logger.warn('No connections map found in configuration.');
        if (connections.size > 0) {
            const firstEntry = connections.entries().next().value;
            if (firstEntry) {
                const [firstKey] = firstEntry;
                // Provide a default connection map if none is specified
                connectionsMap.push({
                    serviceUrl: '*',
                    connection: firstKey,
                });
            }
        }
    }
    return {
        connections,
        connectionsMap,
    };
}
/**
 * Loads the authentication configuration from the provided config or from the environment variables
 * providing default values for authority and issuers.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
function getAuthConfigWithDefaults(config) {
    var _a, _b, _c, _d;
    if (!config)
        return (0, exports.loadAuthConfigFromEnv)();
    const providedConnections = config.connections && config.connectionsMap
        ? { connections: config.connections, connectionsMap: config.connectionsMap }
        : undefined;
    const connections = providedConnections !== null && providedConnections !== void 0 ? providedConnections : loadConnectionsMapFromEnv();
    let mergedConfig;
    if (connections && ((_a = connections.connectionsMap) === null || _a === void 0 ? void 0 : _a.length) === 0) {
        // No connections provided, we need to populate the connections map with the old config settings
        mergedConfig = buildLegacyAuthConfig(undefined, config);
        (_b = connections.connections) === null || _b === void 0 ? void 0 : _b.set(DEFAULT_CONNECTION, mergedConfig);
        connections.connectionsMap.push({ serviceUrl: '*', connection: DEFAULT_CONNECTION });
    }
    else {
        // There are connections provided, use the default connection
        const defaultItem = (_c = connections.connectionsMap) === null || _c === void 0 ? void 0 : _c.find((item) => item.serviceUrl === '*');
        const defaultConn = defaultItem ? (_d = connections.connections) === null || _d === void 0 ? void 0 : _d.get(defaultItem.connection) : undefined;
        if (!defaultConn) {
            throw new Error('No default connection found in environment connections.');
        }
        mergedConfig = buildLegacyAuthConfig(undefined, defaultConn);
    }
    return {
        ...mergedConfig,
        ...connections,
    };
}
function buildLegacyAuthConfig(envPrefix = '', customConfig) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const prefix = envPrefix ? `${envPrefix}_` : '';
    const authority = (_b = (_a = customConfig === null || customConfig === void 0 ? void 0 : customConfig.authority) !== null && _a !== void 0 ? _a : process.env[`${prefix}authorityEndpoint`]) !== null && _b !== void 0 ? _b : 'https://login.microsoftonline.com';
    const clientId = (_c = customConfig === null || customConfig === void 0 ? void 0 : customConfig.clientId) !== null && _c !== void 0 ? _c : process.env[`${prefix}clientId`];
    if (!clientId && !envPrefix && process.env.NODE_ENV === 'production') {
        throw new Error('ClientId required in production');
    }
    if (!clientId && envPrefix) {
        throw new Error(`ClientId not found for connection: ${envPrefix}`);
    }
    const tenantId = (_d = customConfig === null || customConfig === void 0 ? void 0 : customConfig.tenantId) !== null && _d !== void 0 ? _d : process.env[`${prefix}tenantId`];
    return {
        tenantId,
        clientId: clientId,
        clientSecret: (_e = customConfig === null || customConfig === void 0 ? void 0 : customConfig.clientSecret) !== null && _e !== void 0 ? _e : process.env[`${prefix}clientSecret`],
        certPemFile: (_f = customConfig === null || customConfig === void 0 ? void 0 : customConfig.certPemFile) !== null && _f !== void 0 ? _f : process.env[`${prefix}certPemFile`],
        certKeyFile: (_g = customConfig === null || customConfig === void 0 ? void 0 : customConfig.certKeyFile) !== null && _g !== void 0 ? _g : process.env[`${prefix}certKeyFile`],
        sendX5C: (_h = customConfig === null || customConfig === void 0 ? void 0 : customConfig.sendX5C) !== null && _h !== void 0 ? _h : (process.env[`${prefix}sendX5C`] === 'true'),
        connectionName: (_j = customConfig === null || customConfig === void 0 ? void 0 : customConfig.connectionName) !== null && _j !== void 0 ? _j : process.env[`${prefix}connectionName`],
        FICClientId: (_k = customConfig === null || customConfig === void 0 ? void 0 : customConfig.FICClientId) !== null && _k !== void 0 ? _k : process.env[`${prefix}FICClientId`],
        authority,
        scope: (_l = customConfig === null || customConfig === void 0 ? void 0 : customConfig.scope) !== null && _l !== void 0 ? _l : process.env[`${prefix}scope`],
        issuers: (_m = customConfig === null || customConfig === void 0 ? void 0 : customConfig.issuers) !== null && _m !== void 0 ? _m : getDefaultIssuers(tenantId, authority),
        altBlueprintConnectionName: (_o = customConfig === null || customConfig === void 0 ? void 0 : customConfig.altBlueprintConnectionName) !== null && _o !== void 0 ? _o : process.env[`${prefix}altBlueprintConnectionName`],
        WIDAssertionFile: (_p = customConfig === null || customConfig === void 0 ? void 0 : customConfig.WIDAssertionFile) !== null && _p !== void 0 ? _p : process.env[`${prefix}WIDAssertionFile`]
    };
}
function getDefaultIssuers(tenantId, authority) {
    return [
        'https://api.botframework.com',
        `https://sts.windows.net/${tenantId}/`,
        `${authority}/${tenantId}/v2.0`
    ];
}
//# sourceMappingURL=authConfiguration.js.map