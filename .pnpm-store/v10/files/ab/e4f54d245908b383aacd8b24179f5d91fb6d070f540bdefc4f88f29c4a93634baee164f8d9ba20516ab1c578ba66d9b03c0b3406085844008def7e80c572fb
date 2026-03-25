"use strict";
/*
 * Copyright 2024 gRPC authors.
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
exports.FileWatcherCertificateProvider = void 0;
const fs = require("fs");
const logging = require("./logging");
const constants_1 = require("./constants");
const util_1 = require("util");
const TRACER_NAME = 'certificate_provider';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const readFilePromise = (0, util_1.promisify)(fs.readFile);
class FileWatcherCertificateProvider {
    constructor(config) {
        this.config = config;
        this.refreshTimer = null;
        this.fileResultPromise = null;
        this.latestCaUpdate = undefined;
        this.caListeners = new Set();
        this.latestIdentityUpdate = undefined;
        this.identityListeners = new Set();
        this.lastUpdateTime = null;
        if ((config.certificateFile === undefined) !== (config.privateKeyFile === undefined)) {
            throw new Error('certificateFile and privateKeyFile must be set or unset together');
        }
        if (config.certificateFile === undefined && config.caCertificateFile === undefined) {
            throw new Error('At least one of certificateFile and caCertificateFile must be set');
        }
        trace('File watcher constructed with config ' + JSON.stringify(config));
    }
    updateCertificates() {
        if (this.fileResultPromise) {
            return;
        }
        this.fileResultPromise = Promise.allSettled([
            this.config.certificateFile ? readFilePromise(this.config.certificateFile) : Promise.reject(),
            this.config.privateKeyFile ? readFilePromise(this.config.privateKeyFile) : Promise.reject(),
            this.config.caCertificateFile ? readFilePromise(this.config.caCertificateFile) : Promise.reject()
        ]);
        this.fileResultPromise.then(([certificateResult, privateKeyResult, caCertificateResult]) => {
            if (!this.refreshTimer) {
                return;
            }
            trace('File watcher read certificates certificate ' + certificateResult.status + ', privateKey ' + privateKeyResult.status + ', CA certificate ' + caCertificateResult.status);
            this.lastUpdateTime = new Date();
            this.fileResultPromise = null;
            if (certificateResult.status === 'fulfilled' && privateKeyResult.status === 'fulfilled') {
                this.latestIdentityUpdate = {
                    certificate: certificateResult.value,
                    privateKey: privateKeyResult.value
                };
            }
            else {
                this.latestIdentityUpdate = null;
            }
            if (caCertificateResult.status === 'fulfilled') {
                this.latestCaUpdate = {
                    caCertificate: caCertificateResult.value
                };
            }
            else {
                this.latestCaUpdate = null;
            }
            for (const listener of this.identityListeners) {
                listener(this.latestIdentityUpdate);
            }
            for (const listener of this.caListeners) {
                listener(this.latestCaUpdate);
            }
        });
        trace('File watcher initiated certificate update');
    }
    maybeStartWatchingFiles() {
        if (!this.refreshTimer) {
            /* Perform the first read immediately, but only if there was not already
             * a recent read, to avoid reading from the filesystem significantly more
             * frequently than configured if the provider quickly switches between
             * used and unused. */
            const timeSinceLastUpdate = this.lastUpdateTime ? (new Date()).getTime() - this.lastUpdateTime.getTime() : Infinity;
            if (timeSinceLastUpdate > this.config.refreshIntervalMs) {
                this.updateCertificates();
            }
            if (timeSinceLastUpdate > this.config.refreshIntervalMs * 2) {
                // Clear out old updates if they are definitely stale
                this.latestCaUpdate = undefined;
                this.latestIdentityUpdate = undefined;
            }
            this.refreshTimer = setInterval(() => this.updateCertificates(), this.config.refreshIntervalMs);
            trace('File watcher started watching');
        }
    }
    maybeStopWatchingFiles() {
        if (this.caListeners.size === 0 && this.identityListeners.size === 0) {
            this.fileResultPromise = null;
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        }
    }
    addCaCertificateListener(listener) {
        this.caListeners.add(listener);
        this.maybeStartWatchingFiles();
        if (this.latestCaUpdate !== undefined) {
            process.nextTick(listener, this.latestCaUpdate);
        }
    }
    removeCaCertificateListener(listener) {
        this.caListeners.delete(listener);
        this.maybeStopWatchingFiles();
    }
    addIdentityCertificateListener(listener) {
        this.identityListeners.add(listener);
        this.maybeStartWatchingFiles();
        if (this.latestIdentityUpdate !== undefined) {
            process.nextTick(listener, this.latestIdentityUpdate);
        }
    }
    removeIdentityCertificateListener(listener) {
        this.identityListeners.delete(listener);
        this.maybeStopWatchingFiles();
    }
}
exports.FileWatcherCertificateProvider = FileWatcherCertificateProvider;
//# sourceMappingURL=certificate-provider.js.map