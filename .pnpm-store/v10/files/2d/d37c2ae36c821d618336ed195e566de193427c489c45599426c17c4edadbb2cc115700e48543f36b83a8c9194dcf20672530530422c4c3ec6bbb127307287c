"use strict";
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateSubjectTokenSupplier = exports.InvalidConfigurationError = exports.CertificateSourceUnavailableError = exports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE = void 0;
const util_1 = require("../util");
const fs = require("fs");
const crypto_1 = require("crypto");
const https = require("https");
exports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE = 'GOOGLE_API_CERTIFICATE_CONFIG';
/**
 * Thrown when the certificate source cannot be located or accessed.
 */
class CertificateSourceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CertificateSourceUnavailableError';
    }
}
exports.CertificateSourceUnavailableError = CertificateSourceUnavailableError;
/**
 * Thrown for invalid configuration that is not related to file availability.
 */
class InvalidConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidConfigurationError';
    }
}
exports.InvalidConfigurationError = InvalidConfigurationError;
/**
 * A subject token supplier that uses a client certificate for authentication.
 * It provides the certificate chain as the subject token for identity federation.
 */
class CertificateSubjectTokenSupplier {
    certificateConfigPath;
    trustChainPath;
    cert;
    key;
    /**
     * Initializes a new instance of the CertificateSubjectTokenSupplier.
     * @param opts The configuration options for the supplier.
     */
    constructor(opts) {
        if (!opts.useDefaultCertificateConfig && !opts.certificateConfigLocation) {
            throw new InvalidConfigurationError('Either `useDefaultCertificateConfig` must be true or a `certificateConfigLocation` must be provided.');
        }
        if (opts.useDefaultCertificateConfig && opts.certificateConfigLocation) {
            throw new InvalidConfigurationError('Both `useDefaultCertificateConfig` and `certificateConfigLocation` cannot be provided.');
        }
        this.trustChainPath = opts.trustChainPath;
        this.certificateConfigPath = opts.certificateConfigLocation ?? '';
    }
    /**
     * Creates an HTTPS agent configured with the client certificate and private key for mTLS.
     * @returns An mTLS-configured https.Agent.
     */
    async createMtlsHttpsAgent() {
        if (!this.key || !this.cert) {
            throw new InvalidConfigurationError('Cannot create mTLS Agent with missing certificate or key');
        }
        return new https.Agent({ key: this.key, cert: this.cert });
    }
    /**
     * Constructs the subject token, which is the base64-encoded certificate chain.
     * @returns A promise that resolves with the subject token.
     */
    async getSubjectToken() {
        // The "subject token" in this context is the processed certificate chain.
        this.certificateConfigPath = await this.#resolveCertificateConfigFilePath();
        const { certPath, keyPath } = await this.#getCertAndKeyPaths();
        ({ cert: this.cert, key: this.key } = await this.#getKeyAndCert(certPath, keyPath));
        return await this.#processChainFromPaths(this.cert);
    }
    /**
     * Resolves the absolute path to the certificate configuration file
     * by checking the "certificate_config_location" provided in the ADC file,
     * or the "GOOGLE_API_CERTIFICATE_CONFIG" environment variable
     * or in the default gcloud path.
     * @param overridePath An optional path to check first.
     * @returns The resolved file path.
     */
    async #resolveCertificateConfigFilePath() {
        // 1. Check for the override path from constructor options.
        const overridePath = this.certificateConfigPath;
        if (overridePath) {
            if (await (0, util_1.isValidFile)(overridePath)) {
                return overridePath;
            }
            throw new CertificateSourceUnavailableError(`Provided certificate config path is invalid: ${overridePath}`);
        }
        // 2. Check the standard environment variable.
        const envPath = process.env[exports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE];
        if (envPath) {
            if (await (0, util_1.isValidFile)(envPath)) {
                return envPath;
            }
            throw new CertificateSourceUnavailableError(`Path from environment variable "${exports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE}" is invalid: ${envPath}`);
        }
        // 3. Check the well-known gcloud config location.
        const wellKnownPath = (0, util_1.getWellKnownCertificateConfigFileLocation)();
        if (await (0, util_1.isValidFile)(wellKnownPath)) {
            return wellKnownPath;
        }
        // 4. If none are found, throw an error.
        throw new CertificateSourceUnavailableError('Could not find certificate configuration file. Searched override path, ' +
            `the "${exports.CERTIFICATE_CONFIGURATION_ENV_VARIABLE}" env var, and the gcloud path (${wellKnownPath}).`);
    }
    /**
     * Reads and parses the certificate config JSON file to extract the certificate and key paths.
     * @returns An object containing the certificate and key paths.
     */
    async #getCertAndKeyPaths() {
        const configPath = this.certificateConfigPath;
        let fileContents;
        try {
            fileContents = await fs.promises.readFile(configPath, 'utf8');
        }
        catch (err) {
            throw new CertificateSourceUnavailableError(`Failed to read certificate config file at: ${configPath}`);
        }
        try {
            const config = JSON.parse(fileContents);
            const certPath = config?.cert_configs?.workload?.cert_path;
            const keyPath = config?.cert_configs?.workload?.key_path;
            if (!certPath || !keyPath) {
                throw new InvalidConfigurationError(`Certificate config file (${configPath}) is missing required "cert_path" or "key_path" in the workload config.`);
            }
            return { certPath, keyPath };
        }
        catch (e) {
            if (e instanceof InvalidConfigurationError)
                throw e;
            throw new InvalidConfigurationError(`Failed to parse certificate config from ${configPath}: ${e.message}`);
        }
    }
    /**
     * Reads and parses the cert and key files get their content and check valid format.
     * @returns An object containing the cert content and key content in buffer format.
     */
    async #getKeyAndCert(certPath, keyPath) {
        let cert, key;
        try {
            cert = await fs.promises.readFile(certPath);
            new crypto_1.X509Certificate(cert);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new CertificateSourceUnavailableError(`Failed to read certificate file at ${certPath}: ${message}`);
        }
        try {
            key = await fs.promises.readFile(keyPath);
            (0, crypto_1.createPrivateKey)(key);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new CertificateSourceUnavailableError(`Failed to read private key file at ${keyPath}: ${message}`);
        }
        return { cert, key };
    }
    /**
     * Reads the leaf certificate and trust chain, combines them,
     * and returns a JSON array of base64-encoded certificates.
     * @returns A stringified JSON array of the certificate chain.
     */
    async #processChainFromPaths(leafCertBuffer) {
        const leafCert = new crypto_1.X509Certificate(leafCertBuffer);
        // If no trust chain is provided, just use the successfully parsed leaf certificate.
        if (!this.trustChainPath) {
            return JSON.stringify([leafCert.raw.toString('base64')]);
        }
        // Handle the trust chain logic.
        try {
            const chainPems = await fs.promises.readFile(this.trustChainPath, 'utf8');
            const pemBlocks = chainPems.match(/-----BEGIN CERTIFICATE-----[^-]+-----END CERTIFICATE-----/g) ?? [];
            const chainCerts = pemBlocks.map((pem, index) => {
                try {
                    return new crypto_1.X509Certificate(pem);
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    // Throw a more precise error if a single certificate in the chain is invalid.
                    throw new InvalidConfigurationError(`Failed to parse certificate at index ${index} in trust chain file ${this.trustChainPath}: ${message}`);
                }
            });
            const leafIndex = chainCerts.findIndex(chainCert => leafCert.raw.equals(chainCert.raw));
            let finalChain;
            if (leafIndex === -1) {
                // Leaf not found, so prepend it to the chain.
                finalChain = [leafCert, ...chainCerts];
            }
            else if (leafIndex === 0) {
                // Leaf is already the first element, so the chain is correctly ordered.
                finalChain = chainCerts;
            }
            else {
                // Leaf is in the chain but not at the top, which is invalid.
                throw new InvalidConfigurationError(`Leaf certificate exists in the trust chain but is not the first entry (found at index ${leafIndex}).`);
            }
            return JSON.stringify(finalChain.map(cert => cert.raw.toString('base64')));
        }
        catch (err) {
            // Re-throw our specific configuration errors.
            if (err instanceof InvalidConfigurationError)
                throw err;
            const message = err instanceof Error ? err.message : String(err);
            throw new CertificateSourceUnavailableError(`Failed to process certificate chain from ${this.trustChainPath}: ${message}`);
        }
    }
}
exports.CertificateSubjectTokenSupplier = CertificateSubjectTokenSupplier;
//# sourceMappingURL=certificatesubjecttokensupplier.js.map