"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelCredentials = void 0;
exports.createCertificateProviderChannelCredentials = createCertificateProviderChannelCredentials;
const tls_1 = require("tls");
const call_credentials_1 = require("./call-credentials");
const tls_helpers_1 = require("./tls-helpers");
const uri_parser_1 = require("./uri-parser");
const resolver_1 = require("./resolver");
const logging_1 = require("./logging");
const constants_1 = require("./constants");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyIsBufferOrNull(obj, friendlyName) {
    if (obj && !(obj instanceof Buffer)) {
        throw new TypeError(`${friendlyName}, if provided, must be a Buffer.`);
    }
}
/**
 * A class that contains credentials for communicating over a channel, as well
 * as a set of per-call credentials, which are applied to every method call made
 * over a channel initialized with an instance of this class.
 */
class ChannelCredentials {
    /**
     * Returns a copy of this object with the included set of per-call credentials
     * expanded to include callCredentials.
     * @param callCredentials A CallCredentials object to associate with this
     * instance.
     */
    compose(callCredentials) {
        return new ComposedChannelCredentialsImpl(this, callCredentials);
    }
    /**
     * Return a new ChannelCredentials instance with a given set of credentials.
     * The resulting instance can be used to construct a Channel that communicates
     * over TLS.
     * @param rootCerts The root certificate data.
     * @param privateKey The client certificate private key, if available.
     * @param certChain The client certificate key chain, if available.
     * @param verifyOptions Additional options to modify certificate verification
     */
    static createSsl(rootCerts, privateKey, certChain, verifyOptions) {
        var _a;
        verifyIsBufferOrNull(rootCerts, 'Root certificate');
        verifyIsBufferOrNull(privateKey, 'Private key');
        verifyIsBufferOrNull(certChain, 'Certificate chain');
        if (privateKey && !certChain) {
            throw new Error('Private key must be given with accompanying certificate chain');
        }
        if (!privateKey && certChain) {
            throw new Error('Certificate chain must be given with accompanying private key');
        }
        const secureContext = (0, tls_1.createSecureContext)({
            ca: (_a = rootCerts !== null && rootCerts !== void 0 ? rootCerts : (0, tls_helpers_1.getDefaultRootsData)()) !== null && _a !== void 0 ? _a : undefined,
            key: privateKey !== null && privateKey !== void 0 ? privateKey : undefined,
            cert: certChain !== null && certChain !== void 0 ? certChain : undefined,
            ciphers: tls_helpers_1.CIPHER_SUITES,
        });
        return new SecureChannelCredentialsImpl(secureContext, verifyOptions !== null && verifyOptions !== void 0 ? verifyOptions : {});
    }
    /**
     * Return a new ChannelCredentials instance with credentials created using
     * the provided secureContext. The resulting instances can be used to
     * construct a Channel that communicates over TLS. gRPC will not override
     * anything in the provided secureContext, so the environment variables
     * GRPC_SSL_CIPHER_SUITES and GRPC_DEFAULT_SSL_ROOTS_FILE_PATH will
     * not be applied.
     * @param secureContext The return value of tls.createSecureContext()
     * @param verifyOptions Additional options to modify certificate verification
     */
    static createFromSecureContext(secureContext, verifyOptions) {
        return new SecureChannelCredentialsImpl(secureContext, verifyOptions !== null && verifyOptions !== void 0 ? verifyOptions : {});
    }
    /**
     * Return a new ChannelCredentials instance with no credentials.
     */
    static createInsecure() {
        return new InsecureChannelCredentialsImpl();
    }
}
exports.ChannelCredentials = ChannelCredentials;
class InsecureChannelCredentialsImpl extends ChannelCredentials {
    constructor() {
        super();
    }
    compose(callCredentials) {
        throw new Error('Cannot compose insecure credentials');
    }
    _isSecure() {
        return false;
    }
    _equals(other) {
        return other instanceof InsecureChannelCredentialsImpl;
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
        return {
            connect(socket) {
                return Promise.resolve({
                    socket,
                    secure: false
                });
            },
            waitForReady: () => {
                return Promise.resolve();
            },
            getCallCredentials: () => {
                return callCredentials !== null && callCredentials !== void 0 ? callCredentials : call_credentials_1.CallCredentials.createEmpty();
            },
            destroy() { }
        };
    }
}
function getConnectionOptions(secureContext, verifyOptions, channelTarget, options) {
    var _a, _b;
    const connectionOptions = {
        secureContext: secureContext
    };
    let realTarget = channelTarget;
    if ('grpc.http_connect_target' in options) {
        const parsedTarget = (0, uri_parser_1.parseUri)(options['grpc.http_connect_target']);
        if (parsedTarget) {
            realTarget = parsedTarget;
        }
    }
    const targetPath = (0, resolver_1.getDefaultAuthority)(realTarget);
    const hostPort = (0, uri_parser_1.splitHostPort)(targetPath);
    const remoteHost = (_a = hostPort === null || hostPort === void 0 ? void 0 : hostPort.host) !== null && _a !== void 0 ? _a : targetPath;
    connectionOptions.host = remoteHost;
    if (verifyOptions.checkServerIdentity) {
        connectionOptions.checkServerIdentity = verifyOptions.checkServerIdentity;
    }
    if (verifyOptions.rejectUnauthorized !== undefined) {
        connectionOptions.rejectUnauthorized = verifyOptions.rejectUnauthorized;
    }
    connectionOptions.ALPNProtocols = ['h2'];
    if (options['grpc.ssl_target_name_override']) {
        const sslTargetNameOverride = options['grpc.ssl_target_name_override'];
        const originalCheckServerIdentity = (_b = connectionOptions.checkServerIdentity) !== null && _b !== void 0 ? _b : tls_1.checkServerIdentity;
        connectionOptions.checkServerIdentity = (host, cert) => {
            return originalCheckServerIdentity(sslTargetNameOverride, cert);
        };
        connectionOptions.servername = sslTargetNameOverride;
    }
    else {
        connectionOptions.servername = remoteHost;
    }
    if (options['grpc-node.tls_enable_trace']) {
        connectionOptions.enableTrace = true;
    }
    return connectionOptions;
}
class SecureConnectorImpl {
    constructor(connectionOptions, callCredentials) {
        this.connectionOptions = connectionOptions;
        this.callCredentials = callCredentials;
    }
    connect(socket) {
        const tlsConnectOptions = Object.assign({ socket: socket }, this.connectionOptions);
        return new Promise((resolve, reject) => {
            const tlsSocket = (0, tls_1.connect)(tlsConnectOptions, () => {
                var _a;
                if (((_a = this.connectionOptions.rejectUnauthorized) !== null && _a !== void 0 ? _a : true) && !tlsSocket.authorized) {
                    reject(tlsSocket.authorizationError);
                    return;
                }
                resolve({
                    socket: tlsSocket,
                    secure: true
                });
            });
            tlsSocket.on('error', (error) => {
                reject(error);
            });
        });
    }
    waitForReady() {
        return Promise.resolve();
    }
    getCallCredentials() {
        return this.callCredentials;
    }
    destroy() { }
}
class SecureChannelCredentialsImpl extends ChannelCredentials {
    constructor(secureContext, verifyOptions) {
        super();
        this.secureContext = secureContext;
        this.verifyOptions = verifyOptions;
    }
    _isSecure() {
        return true;
    }
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof SecureChannelCredentialsImpl) {
            return (this.secureContext === other.secureContext &&
                this.verifyOptions.checkServerIdentity ===
                    other.verifyOptions.checkServerIdentity);
        }
        else {
            return false;
        }
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
        const connectionOptions = getConnectionOptions(this.secureContext, this.verifyOptions, channelTarget, options);
        return new SecureConnectorImpl(connectionOptions, callCredentials !== null && callCredentials !== void 0 ? callCredentials : call_credentials_1.CallCredentials.createEmpty());
    }
}
class CertificateProviderChannelCredentialsImpl extends ChannelCredentials {
    constructor(caCertificateProvider, identityCertificateProvider, verifyOptions) {
        super();
        this.caCertificateProvider = caCertificateProvider;
        this.identityCertificateProvider = identityCertificateProvider;
        this.verifyOptions = verifyOptions;
        this.refcount = 0;
        /**
         * `undefined` means that the certificates have not yet been loaded. `null`
         * means that an attempt to load them has completed, and has failed.
         */
        this.latestCaUpdate = undefined;
        /**
         * `undefined` means that the certificates have not yet been loaded. `null`
         * means that an attempt to load them has completed, and has failed.
         */
        this.latestIdentityUpdate = undefined;
        this.caCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
        this.identityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
        this.secureContextWatchers = [];
    }
    _isSecure() {
        return true;
    }
    _equals(other) {
        var _a, _b;
        if (this === other) {
            return true;
        }
        if (other instanceof CertificateProviderChannelCredentialsImpl) {
            return this.caCertificateProvider === other.caCertificateProvider &&
                this.identityCertificateProvider === other.identityCertificateProvider &&
                ((_a = this.verifyOptions) === null || _a === void 0 ? void 0 : _a.checkServerIdentity) === ((_b = other.verifyOptions) === null || _b === void 0 ? void 0 : _b.checkServerIdentity);
        }
        else {
            return false;
        }
    }
    ref() {
        var _a;
        if (this.refcount === 0) {
            this.caCertificateProvider.addCaCertificateListener(this.caCertificateUpdateListener);
            (_a = this.identityCertificateProvider) === null || _a === void 0 ? void 0 : _a.addIdentityCertificateListener(this.identityCertificateUpdateListener);
        }
        this.refcount += 1;
    }
    unref() {
        var _a;
        this.refcount -= 1;
        if (this.refcount === 0) {
            this.caCertificateProvider.removeCaCertificateListener(this.caCertificateUpdateListener);
            (_a = this.identityCertificateProvider) === null || _a === void 0 ? void 0 : _a.removeIdentityCertificateListener(this.identityCertificateUpdateListener);
        }
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
        this.ref();
        return new CertificateProviderChannelCredentialsImpl.SecureConnectorImpl(this, channelTarget, options, callCredentials !== null && callCredentials !== void 0 ? callCredentials : call_credentials_1.CallCredentials.createEmpty());
    }
    maybeUpdateWatchers() {
        if (this.hasReceivedUpdates()) {
            for (const watcher of this.secureContextWatchers) {
                watcher(this.getLatestSecureContext());
            }
            this.secureContextWatchers = [];
        }
    }
    handleCaCertificateUpdate(update) {
        this.latestCaUpdate = update;
        this.maybeUpdateWatchers();
    }
    handleIdentityCertitificateUpdate(update) {
        this.latestIdentityUpdate = update;
        this.maybeUpdateWatchers();
    }
    hasReceivedUpdates() {
        if (this.latestCaUpdate === undefined) {
            return false;
        }
        if (this.identityCertificateProvider && this.latestIdentityUpdate === undefined) {
            return false;
        }
        return true;
    }
    getSecureContext() {
        if (this.hasReceivedUpdates()) {
            return Promise.resolve(this.getLatestSecureContext());
        }
        else {
            return new Promise(resolve => {
                this.secureContextWatchers.push(resolve);
            });
        }
    }
    getLatestSecureContext() {
        var _a, _b;
        if (!this.latestCaUpdate) {
            return null;
        }
        if (this.identityCertificateProvider !== null && !this.latestIdentityUpdate) {
            return null;
        }
        try {
            return (0, tls_1.createSecureContext)({
                ca: this.latestCaUpdate.caCertificate,
                key: (_a = this.latestIdentityUpdate) === null || _a === void 0 ? void 0 : _a.privateKey,
                cert: (_b = this.latestIdentityUpdate) === null || _b === void 0 ? void 0 : _b.certificate,
                ciphers: tls_helpers_1.CIPHER_SUITES
            });
        }
        catch (e) {
            (0, logging_1.log)(constants_1.LogVerbosity.ERROR, 'Failed to createSecureContext with error ' + e.message);
            return null;
        }
    }
}
CertificateProviderChannelCredentialsImpl.SecureConnectorImpl = class {
    constructor(parent, channelTarget, options, callCredentials) {
        this.parent = parent;
        this.channelTarget = channelTarget;
        this.options = options;
        this.callCredentials = callCredentials;
    }
    connect(socket) {
        return new Promise((resolve, reject) => {
            const secureContext = this.parent.getLatestSecureContext();
            if (!secureContext) {
                reject(new Error('Failed to load credentials'));
                return;
            }
            if (socket.closed) {
                reject(new Error('Socket closed while loading credentials'));
            }
            const connnectionOptions = getConnectionOptions(secureContext, this.parent.verifyOptions, this.channelTarget, this.options);
            const tlsConnectOptions = Object.assign({ socket: socket }, connnectionOptions);
            const closeCallback = () => {
                reject(new Error('Socket closed'));
            };
            const errorCallback = (error) => {
                reject(error);
            };
            const tlsSocket = (0, tls_1.connect)(tlsConnectOptions, () => {
                var _a;
                tlsSocket.removeListener('close', closeCallback);
                tlsSocket.removeListener('error', errorCallback);
                if (((_a = this.parent.verifyOptions.rejectUnauthorized) !== null && _a !== void 0 ? _a : true) && !tlsSocket.authorized) {
                    reject(tlsSocket.authorizationError);
                    return;
                }
                resolve({
                    socket: tlsSocket,
                    secure: true
                });
            });
            tlsSocket.once('close', closeCallback);
            tlsSocket.once('error', errorCallback);
        });
    }
    async waitForReady() {
        await this.parent.getSecureContext();
    }
    getCallCredentials() {
        return this.callCredentials;
    }
    destroy() {
        this.parent.unref();
    }
};
function createCertificateProviderChannelCredentials(caCertificateProvider, identityCertificateProvider, verifyOptions) {
    return new CertificateProviderChannelCredentialsImpl(caCertificateProvider, identityCertificateProvider, verifyOptions !== null && verifyOptions !== void 0 ? verifyOptions : {});
}
class ComposedChannelCredentialsImpl extends ChannelCredentials {
    constructor(channelCredentials, callCredentials) {
        super();
        this.channelCredentials = channelCredentials;
        this.callCredentials = callCredentials;
        if (!channelCredentials._isSecure()) {
            throw new Error('Cannot compose insecure credentials');
        }
    }
    compose(callCredentials) {
        const combinedCallCredentials = this.callCredentials.compose(callCredentials);
        return new ComposedChannelCredentialsImpl(this.channelCredentials, combinedCallCredentials);
    }
    _isSecure() {
        return true;
    }
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof ComposedChannelCredentialsImpl) {
            return (this.channelCredentials._equals(other.channelCredentials) &&
                this.callCredentials._equals(other.callCredentials));
        }
        else {
            return false;
        }
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
        const combinedCallCredentials = this.callCredentials.compose(callCredentials !== null && callCredentials !== void 0 ? callCredentials : call_credentials_1.CallCredentials.createEmpty());
        return this.channelCredentials._createSecureConnector(channelTarget, options, combinedCallCredentials);
    }
}
//# sourceMappingURL=channel-credentials.js.map