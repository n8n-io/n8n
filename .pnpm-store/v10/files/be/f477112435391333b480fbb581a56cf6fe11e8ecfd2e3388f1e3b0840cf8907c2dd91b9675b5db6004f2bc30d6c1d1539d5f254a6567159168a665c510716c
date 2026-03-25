"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encrypter = void 0;
const util_1 = require("util");
const auto_encrypter_1 = require("./client-side-encryption/auto_encrypter");
const constants_1 = require("./constants");
const deps_1 = require("./deps");
const error_1 = require("./error");
const mongo_client_1 = require("./mongo_client");
/** @internal */
const kInternalClient = Symbol('internalClient');
/** @internal */
class Encrypter {
    constructor(client, uri, options) {
        if (typeof options.autoEncryption !== 'object') {
            throw new error_1.MongoInvalidArgumentError('Option "autoEncryption" must be specified');
        }
        // initialize to null, if we call getInternalClient, we may set this it is important to not overwrite those function calls.
        this[kInternalClient] = null;
        this.bypassAutoEncryption = !!options.autoEncryption.bypassAutoEncryption;
        this.needsConnecting = false;
        if (options.maxPoolSize === 0 && options.autoEncryption.keyVaultClient == null) {
            options.autoEncryption.keyVaultClient = client;
        }
        else if (options.autoEncryption.keyVaultClient == null) {
            options.autoEncryption.keyVaultClient = this.getInternalClient(client, uri, options);
        }
        if (this.bypassAutoEncryption) {
            options.autoEncryption.metadataClient = undefined;
        }
        else if (options.maxPoolSize === 0) {
            options.autoEncryption.metadataClient = client;
        }
        else {
            options.autoEncryption.metadataClient = this.getInternalClient(client, uri, options);
        }
        if (options.proxyHost) {
            options.autoEncryption.proxyOptions = {
                proxyHost: options.proxyHost,
                proxyPort: options.proxyPort,
                proxyUsername: options.proxyUsername,
                proxyPassword: options.proxyPassword
            };
        }
        this.autoEncrypter = new auto_encrypter_1.AutoEncrypter(client, options.autoEncryption);
    }
    getInternalClient(client, uri, options) {
        // TODO(NODE-4144): Remove new variable for type narrowing
        let internalClient = this[kInternalClient];
        if (internalClient == null) {
            const clonedOptions = {};
            for (const key of [
                ...Object.getOwnPropertyNames(options),
                ...Object.getOwnPropertySymbols(options)
            ]) {
                if (['autoEncryption', 'minPoolSize', 'servers', 'caseTranslate', 'dbName'].includes(key))
                    continue;
                Reflect.set(clonedOptions, key, Reflect.get(options, key));
            }
            clonedOptions.minPoolSize = 0;
            internalClient = new mongo_client_1.MongoClient(uri, clonedOptions);
            this[kInternalClient] = internalClient;
            for (const eventName of constants_1.MONGO_CLIENT_EVENTS) {
                for (const listener of client.listeners(eventName)) {
                    internalClient.on(eventName, listener);
                }
            }
            client.on('newListener', (eventName, listener) => {
                internalClient?.on(eventName, listener);
            });
            this.needsConnecting = true;
        }
        return internalClient;
    }
    async connectInternalClient() {
        // TODO(NODE-4144): Remove new variable for type narrowing
        const internalClient = this[kInternalClient];
        if (this.needsConnecting && internalClient != null) {
            this.needsConnecting = false;
            await internalClient.connect();
        }
    }
    closeCallback(client, force, callback) {
        (0, util_1.callbackify)(this.close.bind(this))(client, force, callback);
    }
    async close(client, force) {
        let error;
        try {
            await this.autoEncrypter.teardown(force);
        }
        catch (autoEncrypterError) {
            error = autoEncrypterError;
        }
        const internalClient = this[kInternalClient];
        if (internalClient != null && client !== internalClient) {
            return await internalClient.close(force);
        }
        if (error != null) {
            throw error;
        }
    }
    static checkForMongoCrypt() {
        const mongodbClientEncryption = (0, deps_1.getMongoDBClientEncryption)();
        if ('kModuleError' in mongodbClientEncryption) {
            throw new error_1.MongoMissingDependencyError('Auto-encryption requested, but the module is not installed. ' +
                'Please add `mongodb-client-encryption` as a dependency of your project', {
                cause: mongodbClientEncryption['kModuleError'],
                dependencyName: 'mongodb-client-encryption'
            });
        }
    }
}
exports.Encrypter = Encrypter;
//# sourceMappingURL=encrypter.js.map