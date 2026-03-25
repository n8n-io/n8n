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
exports.ServerCredentials = void 0;
exports.createCertificateProviderServerCredentials = createCertificateProviderServerCredentials;
exports.createServerCredentialsWithInterceptors = createServerCredentialsWithInterceptors;
const tls_helpers_1 = require("./tls-helpers");
class ServerCredentials {
    constructor(serverConstructorOptions, contextOptions) {
        this.serverConstructorOptions = serverConstructorOptions;
        this.watchers = new Set();
        this.latestContextOptions = null;
        this.latestContextOptions = contextOptions !== null && contextOptions !== void 0 ? contextOptions : null;
    }
    _addWatcher(watcher) {
        this.watchers.add(watcher);
    }
    _removeWatcher(watcher) {
        this.watchers.delete(watcher);
    }
    getWatcherCount() {
        return this.watchers.size;
    }
    updateSecureContextOptions(options) {
        this.latestContextOptions = options;
        for (const watcher of this.watchers) {
            watcher(this.latestContextOptions);
        }
    }
    _isSecure() {
        return this.serverConstructorOptions !== null;
    }
    _getSecureContextOptions() {
        return this.latestContextOptions;
    }
    _getConstructorOptions() {
        return this.serverConstructorOptions;
    }
    _getInterceptors() {
        return [];
    }
    static createInsecure() {
        return new InsecureServerCredentials();
    }
    static createSsl(rootCerts, keyCertPairs, checkClientCertificate = false) {
        var _a;
        if (rootCerts !== null && !Buffer.isBuffer(rootCerts)) {
            throw new TypeError('rootCerts must be null or a Buffer');
        }
        if (!Array.isArray(keyCertPairs)) {
            throw new TypeError('keyCertPairs must be an array');
        }
        if (typeof checkClientCertificate !== 'boolean') {
            throw new TypeError('checkClientCertificate must be a boolean');
        }
        const cert = [];
        const key = [];
        for (let i = 0; i < keyCertPairs.length; i++) {
            const pair = keyCertPairs[i];
            if (pair === null || typeof pair !== 'object') {
                throw new TypeError(`keyCertPair[${i}] must be an object`);
            }
            if (!Buffer.isBuffer(pair.private_key)) {
                throw new TypeError(`keyCertPair[${i}].private_key must be a Buffer`);
            }
            if (!Buffer.isBuffer(pair.cert_chain)) {
                throw new TypeError(`keyCertPair[${i}].cert_chain must be a Buffer`);
            }
            cert.push(pair.cert_chain);
            key.push(pair.private_key);
        }
        return new SecureServerCredentials({
            requestCert: checkClientCertificate,
            ciphers: tls_helpers_1.CIPHER_SUITES,
        }, {
            ca: (_a = rootCerts !== null && rootCerts !== void 0 ? rootCerts : (0, tls_helpers_1.getDefaultRootsData)()) !== null && _a !== void 0 ? _a : undefined,
            cert,
            key,
        });
    }
}
exports.ServerCredentials = ServerCredentials;
class InsecureServerCredentials extends ServerCredentials {
    constructor() {
        super(null);
    }
    _getSettings() {
        return null;
    }
    _equals(other) {
        return other instanceof InsecureServerCredentials;
    }
}
class SecureServerCredentials extends ServerCredentials {
    constructor(constructorOptions, contextOptions) {
        super(constructorOptions, contextOptions);
        this.options = Object.assign(Object.assign({}, constructorOptions), contextOptions);
    }
    /**
     * Checks equality by checking the options that are actually set by
     * createSsl.
     * @param other
     * @returns
     */
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (!(other instanceof SecureServerCredentials)) {
            return false;
        }
        // options.ca equality check
        if (Buffer.isBuffer(this.options.ca) && Buffer.isBuffer(other.options.ca)) {
            if (!this.options.ca.equals(other.options.ca)) {
                return false;
            }
        }
        else {
            if (this.options.ca !== other.options.ca) {
                return false;
            }
        }
        // options.cert equality check
        if (Array.isArray(this.options.cert) && Array.isArray(other.options.cert)) {
            if (this.options.cert.length !== other.options.cert.length) {
                return false;
            }
            for (let i = 0; i < this.options.cert.length; i++) {
                const thisCert = this.options.cert[i];
                const otherCert = other.options.cert[i];
                if (Buffer.isBuffer(thisCert) && Buffer.isBuffer(otherCert)) {
                    if (!thisCert.equals(otherCert)) {
                        return false;
                    }
                }
                else {
                    if (thisCert !== otherCert) {
                        return false;
                    }
                }
            }
        }
        else {
            if (this.options.cert !== other.options.cert) {
                return false;
            }
        }
        // options.key equality check
        if (Array.isArray(this.options.key) && Array.isArray(other.options.key)) {
            if (this.options.key.length !== other.options.key.length) {
                return false;
            }
            for (let i = 0; i < this.options.key.length; i++) {
                const thisKey = this.options.key[i];
                const otherKey = other.options.key[i];
                if (Buffer.isBuffer(thisKey) && Buffer.isBuffer(otherKey)) {
                    if (!thisKey.equals(otherKey)) {
                        return false;
                    }
                }
                else {
                    if (thisKey !== otherKey) {
                        return false;
                    }
                }
            }
        }
        else {
            if (this.options.key !== other.options.key) {
                return false;
            }
        }
        // options.requestCert equality check
        if (this.options.requestCert !== other.options.requestCert) {
            return false;
        }
        /* ciphers is derived from a value that is constant for the process, so no
         * equality check is needed. */
        return true;
    }
}
class CertificateProviderServerCredentials extends ServerCredentials {
    constructor(identityCertificateProvider, caCertificateProvider, requireClientCertificate) {
        super({
            requestCert: caCertificateProvider !== null,
            rejectUnauthorized: requireClientCertificate,
            ciphers: tls_helpers_1.CIPHER_SUITES
        });
        this.identityCertificateProvider = identityCertificateProvider;
        this.caCertificateProvider = caCertificateProvider;
        this.requireClientCertificate = requireClientCertificate;
        this.latestCaUpdate = null;
        this.latestIdentityUpdate = null;
        this.caCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
        this.identityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
    }
    _addWatcher(watcher) {
        var _a;
        if (this.getWatcherCount() === 0) {
            (_a = this.caCertificateProvider) === null || _a === void 0 ? void 0 : _a.addCaCertificateListener(this.caCertificateUpdateListener);
            this.identityCertificateProvider.addIdentityCertificateListener(this.identityCertificateUpdateListener);
        }
        super._addWatcher(watcher);
    }
    _removeWatcher(watcher) {
        var _a;
        super._removeWatcher(watcher);
        if (this.getWatcherCount() === 0) {
            (_a = this.caCertificateProvider) === null || _a === void 0 ? void 0 : _a.removeCaCertificateListener(this.caCertificateUpdateListener);
            this.identityCertificateProvider.removeIdentityCertificateListener(this.identityCertificateUpdateListener);
        }
    }
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (!(other instanceof CertificateProviderServerCredentials)) {
            return false;
        }
        return (this.caCertificateProvider === other.caCertificateProvider &&
            this.identityCertificateProvider === other.identityCertificateProvider &&
            this.requireClientCertificate === other.requireClientCertificate);
    }
    calculateSecureContextOptions() {
        var _a;
        if (this.latestIdentityUpdate === null) {
            return null;
        }
        if (this.caCertificateProvider !== null && this.latestCaUpdate === null) {
            return null;
        }
        return {
            ca: (_a = this.latestCaUpdate) === null || _a === void 0 ? void 0 : _a.caCertificate,
            cert: [this.latestIdentityUpdate.certificate],
            key: [this.latestIdentityUpdate.privateKey],
        };
    }
    finalizeUpdate() {
        const secureContextOptions = this.calculateSecureContextOptions();
        this.updateSecureContextOptions(secureContextOptions);
    }
    handleCaCertificateUpdate(update) {
        this.latestCaUpdate = update;
        this.finalizeUpdate();
    }
    handleIdentityCertitificateUpdate(update) {
        this.latestIdentityUpdate = update;
        this.finalizeUpdate();
    }
}
function createCertificateProviderServerCredentials(caCertificateProvider, identityCertificateProvider, requireClientCertificate) {
    return new CertificateProviderServerCredentials(caCertificateProvider, identityCertificateProvider, requireClientCertificate);
}
class InterceptorServerCredentials extends ServerCredentials {
    constructor(childCredentials, interceptors) {
        super({});
        this.childCredentials = childCredentials;
        this.interceptors = interceptors;
    }
    _isSecure() {
        return this.childCredentials._isSecure();
    }
    _equals(other) {
        if (!(other instanceof InterceptorServerCredentials)) {
            return false;
        }
        if (!(this.childCredentials._equals(other.childCredentials))) {
            return false;
        }
        if (this.interceptors.length !== other.interceptors.length) {
            return false;
        }
        for (let i = 0; i < this.interceptors.length; i++) {
            if (this.interceptors[i] !== other.interceptors[i]) {
                return false;
            }
        }
        return true;
    }
    _getInterceptors() {
        return this.interceptors;
    }
    _addWatcher(watcher) {
        this.childCredentials._addWatcher(watcher);
    }
    _removeWatcher(watcher) {
        this.childCredentials._removeWatcher(watcher);
    }
    _getConstructorOptions() {
        return this.childCredentials._getConstructorOptions();
    }
    _getSecureContextOptions() {
        return this.childCredentials._getSecureContextOptions();
    }
}
function createServerCredentialsWithInterceptors(credentials, interceptors) {
    return new InterceptorServerCredentials(credentials, interceptors);
}
//# sourceMappingURL=server-credentials.js.map