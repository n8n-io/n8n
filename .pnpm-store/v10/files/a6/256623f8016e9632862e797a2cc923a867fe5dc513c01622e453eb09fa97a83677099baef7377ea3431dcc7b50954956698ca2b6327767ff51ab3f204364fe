"use strict";
// Copyright 2019 Google LLC
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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _GoogleAuth_instances, _GoogleAuth_pendingAuthClient, _GoogleAuth_prepareAndCacheClient, _GoogleAuth_determineClient;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuth = exports.GoogleAuthExceptionMessages = exports.CLOUD_SDK_CLIENT_ID = void 0;
const child_process_1 = require("child_process");
const fs = require("fs");
const gcpMetadata = require("gcp-metadata");
const os = require("os");
const path = require("path");
const crypto_1 = require("../crypto/crypto");
const transporters_1 = require("../transporters");
const computeclient_1 = require("./computeclient");
const idtokenclient_1 = require("./idtokenclient");
const envDetect_1 = require("./envDetect");
const jwtclient_1 = require("./jwtclient");
const refreshclient_1 = require("./refreshclient");
const impersonated_1 = require("./impersonated");
const externalclient_1 = require("./externalclient");
const baseexternalclient_1 = require("./baseexternalclient");
const authclient_1 = require("./authclient");
const externalAccountAuthorizedUserClient_1 = require("./externalAccountAuthorizedUserClient");
const util_1 = require("../util");
exports.CLOUD_SDK_CLIENT_ID = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
exports.GoogleAuthExceptionMessages = {
    API_KEY_WITH_CREDENTIALS: 'API Keys and Credentials are mutually exclusive authentication methods and cannot be used together.',
    NO_PROJECT_ID_FOUND: 'Unable to detect a Project Id in the current environment. \n' +
        'To learn more about authentication and Google APIs, visit: \n' +
        'https://cloud.google.com/docs/authentication/getting-started',
    NO_CREDENTIALS_FOUND: 'Unable to find credentials in current environment. \n' +
        'To learn more about authentication and Google APIs, visit: \n' +
        'https://cloud.google.com/docs/authentication/getting-started',
    NO_ADC_FOUND: 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.',
    NO_UNIVERSE_DOMAIN_FOUND: 'Unable to detect a Universe Domain in the current environment.\n' +
        'To learn more about Universe Domain retrieval, visit: \n' +
        'https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys',
};
class GoogleAuth {
    // Note:  this properly is only public to satisfy unit tests.
    // https://github.com/Microsoft/TypeScript/issues/5228
    get isGCE() {
        return this.checkIsGCE;
    }
    /**
     * Configuration is resolved in the following order of precedence:
     * - {@link GoogleAuthOptions.credentials `credentials`}
     * - {@link GoogleAuthOptions.keyFilename `keyFilename`}
     * - {@link GoogleAuthOptions.keyFile `keyFile`}
     *
     * {@link GoogleAuthOptions.clientOptions `clientOptions`} are passed to the
     * {@link AuthClient `AuthClient`s}.
     *
     * @param opts
     */
    constructor(opts = {}) {
        _GoogleAuth_instances.add(this);
        /**
         * Caches a value indicating whether the auth layer is running on Google
         * Compute Engine.
         * @private
         */
        this.checkIsGCE = undefined;
        // To save the contents of the JSON credential file
        this.jsonContent = null;
        this.cachedCredential = null;
        /**
         * A pending {@link AuthClient}. Used for concurrent {@link GoogleAuth.getClient} calls.
         */
        _GoogleAuth_pendingAuthClient.set(this, null);
        this.clientOptions = {};
        this._cachedProjectId = opts.projectId || null;
        this.cachedCredential = opts.authClient || null;
        this.keyFilename = opts.keyFilename || opts.keyFile;
        this.scopes = opts.scopes;
        this.clientOptions = opts.clientOptions || {};
        this.jsonContent = opts.credentials || null;
        this.apiKey = opts.apiKey || this.clientOptions.apiKey || null;
        // Cannot use both API Key + Credentials
        if (this.apiKey && (this.jsonContent || this.clientOptions.credentials)) {
            throw new RangeError(exports.GoogleAuthExceptionMessages.API_KEY_WITH_CREDENTIALS);
        }
        if (opts.universeDomain) {
            this.clientOptions.universeDomain = opts.universeDomain;
        }
    }
    // GAPIC client libraries should always use self-signed JWTs. The following
    // variables are set on the JWT client in order to indicate the type of library,
    // and sign the JWT with the correct audience and scopes (if not supplied).
    setGapicJWTValues(client) {
        client.defaultServicePath = this.defaultServicePath;
        client.useJWTAccessWithScope = this.useJWTAccessWithScope;
        client.defaultScopes = this.defaultScopes;
    }
    getProjectId(callback) {
        if (callback) {
            this.getProjectIdAsync().then(r => callback(null, r), callback);
        }
        else {
            return this.getProjectIdAsync();
        }
    }
    /**
     * A temporary method for internal `getProjectId` usages where `null` is
     * acceptable. In a future major release, `getProjectId` should return `null`
     * (as the `Promise<string | null>` base signature describes) and this private
     * method should be removed.
     *
     * @returns Promise that resolves with project id (or `null`)
     */
    async getProjectIdOptional() {
        try {
            return await this.getProjectId();
        }
        catch (e) {
            if (e instanceof Error &&
                e.message === exports.GoogleAuthExceptionMessages.NO_PROJECT_ID_FOUND) {
                return null;
            }
            else {
                throw e;
            }
        }
    }
    /**
     * A private method for finding and caching a projectId.
     *
     * Supports environments in order of precedence:
     * - GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variable
     * - GOOGLE_APPLICATION_CREDENTIALS JSON file
     * - Cloud SDK: `gcloud config config-helper --format json`
     * - GCE project ID from metadata server
     *
     * @returns projectId
     */
    async findAndCacheProjectId() {
        let projectId = null;
        projectId || (projectId = await this.getProductionProjectId());
        projectId || (projectId = await this.getFileProjectId());
        projectId || (projectId = await this.getDefaultServiceProjectId());
        projectId || (projectId = await this.getGCEProjectId());
        projectId || (projectId = await this.getExternalAccountClientProjectId());
        if (projectId) {
            this._cachedProjectId = projectId;
            return projectId;
        }
        else {
            throw new Error(exports.GoogleAuthExceptionMessages.NO_PROJECT_ID_FOUND);
        }
    }
    async getProjectIdAsync() {
        if (this._cachedProjectId) {
            return this._cachedProjectId;
        }
        if (!this._findProjectIdPromise) {
            this._findProjectIdPromise = this.findAndCacheProjectId();
        }
        return this._findProjectIdPromise;
    }
    /**
     * Retrieves a universe domain from the metadata server via
     * {@link gcpMetadata.universe}.
     *
     * @returns a universe domain
     */
    async getUniverseDomainFromMetadataServer() {
        var _a;
        let universeDomain;
        try {
            universeDomain = await gcpMetadata.universe('universe-domain');
            universeDomain || (universeDomain = authclient_1.DEFAULT_UNIVERSE);
        }
        catch (e) {
            if (e && ((_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                universeDomain = authclient_1.DEFAULT_UNIVERSE;
            }
            else {
                throw e;
            }
        }
        return universeDomain;
    }
    /**
     * Retrieves, caches, and returns the universe domain in the following order
     * of precedence:
     * - The universe domain in {@link GoogleAuth.clientOptions}
     * - An existing or ADC {@link AuthClient}'s universe domain
     * - {@link gcpMetadata.universe}, if {@link Compute} client
     *
     * @returns The universe domain
     */
    async getUniverseDomain() {
        let universeDomain = (0, util_1.originalOrCamelOptions)(this.clientOptions).get('universe_domain');
        try {
            universeDomain !== null && universeDomain !== void 0 ? universeDomain : (universeDomain = (await this.getClient()).universeDomain);
        }
        catch (_a) {
            // client or ADC is not available
            universeDomain !== null && universeDomain !== void 0 ? universeDomain : (universeDomain = authclient_1.DEFAULT_UNIVERSE);
        }
        return universeDomain;
    }
    /**
     * @returns Any scopes (user-specified or default scopes specified by the
     *   client library) that need to be set on the current Auth client.
     */
    getAnyScopes() {
        return this.scopes || this.defaultScopes;
    }
    getApplicationDefault(optionsOrCallback = {}, callback) {
        let options;
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else {
            options = optionsOrCallback;
        }
        if (callback) {
            this.getApplicationDefaultAsync(options).then(r => callback(null, r.credential, r.projectId), callback);
        }
        else {
            return this.getApplicationDefaultAsync(options);
        }
    }
    async getApplicationDefaultAsync(options = {}) {
        // If we've already got a cached credential, return it.
        // This will also preserve one's configured quota project, in case they
        // set one directly on the credential previously.
        if (this.cachedCredential) {
            // cache, while preserving existing quota project preferences
            return await __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_prepareAndCacheClient).call(this, this.cachedCredential, null);
        }
        let credential;
        // Check for the existence of a local environment variable pointing to the
        // location of the credential file. This is typically used in local
        // developer scenarios.
        credential =
            await this._tryGetApplicationCredentialsFromEnvironmentVariable(options);
        if (credential) {
            if (credential instanceof jwtclient_1.JWT) {
                credential.scopes = this.scopes;
            }
            else if (credential instanceof baseexternalclient_1.BaseExternalAccountClient) {
                credential.scopes = this.getAnyScopes();
            }
            return await __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_prepareAndCacheClient).call(this, credential);
        }
        // Look in the well-known credential file location.
        credential =
            await this._tryGetApplicationCredentialsFromWellKnownFile(options);
        if (credential) {
            if (credential instanceof jwtclient_1.JWT) {
                credential.scopes = this.scopes;
            }
            else if (credential instanceof baseexternalclient_1.BaseExternalAccountClient) {
                credential.scopes = this.getAnyScopes();
            }
            return await __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_prepareAndCacheClient).call(this, credential);
        }
        // Determine if we're running on GCE.
        if (await this._checkIsGCE()) {
            options.scopes = this.getAnyScopes();
            return await __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_prepareAndCacheClient).call(this, new computeclient_1.Compute(options));
        }
        throw new Error(exports.GoogleAuthExceptionMessages.NO_ADC_FOUND);
    }
    /**
     * Determines whether the auth layer is running on Google Compute Engine.
     * Checks for GCP Residency, then fallback to checking if metadata server
     * is available.
     *
     * @returns A promise that resolves with the boolean.
     * @api private
     */
    async _checkIsGCE() {
        if (this.checkIsGCE === undefined) {
            this.checkIsGCE =
                gcpMetadata.getGCPResidency() || (await gcpMetadata.isAvailable());
        }
        return this.checkIsGCE;
    }
    /**
     * Attempts to load default credentials from the environment variable path..
     * @returns Promise that resolves with the OAuth2Client or null.
     * @api private
     */
    async _tryGetApplicationCredentialsFromEnvironmentVariable(options) {
        const credentialsPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ||
            process.env['google_application_credentials'];
        if (!credentialsPath || credentialsPath.length === 0) {
            return null;
        }
        try {
            return this._getApplicationCredentialsFromFilePath(credentialsPath, options);
        }
        catch (e) {
            if (e instanceof Error) {
                e.message = `Unable to read the credential file specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable: ${e.message}`;
            }
            throw e;
        }
    }
    /**
     * Attempts to load default credentials from a well-known file location
     * @return Promise that resolves with the OAuth2Client or null.
     * @api private
     */
    async _tryGetApplicationCredentialsFromWellKnownFile(options) {
        // First, figure out the location of the file, depending upon the OS type.
        let location = null;
        if (this._isWindows()) {
            // Windows
            location = process.env['APPDATA'];
        }
        else {
            // Linux or Mac
            const home = process.env['HOME'];
            if (home) {
                location = path.join(home, '.config');
            }
        }
        // If we found the root path, expand it.
        if (location) {
            location = path.join(location, 'gcloud', 'application_default_credentials.json');
            if (!fs.existsSync(location)) {
                location = null;
            }
        }
        // The file does not exist.
        if (!location) {
            return null;
        }
        // The file seems to exist. Try to use it.
        const client = await this._getApplicationCredentialsFromFilePath(location, options);
        return client;
    }
    /**
     * Attempts to load default credentials from a file at the given path..
     * @param filePath The path to the file to read.
     * @returns Promise that resolves with the OAuth2Client
     * @api private
     */
    async _getApplicationCredentialsFromFilePath(filePath, options = {}) {
        // Make sure the path looks like a string.
        if (!filePath || filePath.length === 0) {
            throw new Error('The file path is invalid.');
        }
        // Make sure there is a file at the path. lstatSync will throw if there is
        // nothing there.
        try {
            // Resolve path to actual file in case of symlink. Expect a thrown error
            // if not resolvable.
            filePath = fs.realpathSync(filePath);
            if (!fs.lstatSync(filePath).isFile()) {
                throw new Error();
            }
        }
        catch (err) {
            if (err instanceof Error) {
                err.message = `The file at ${filePath} does not exist, or it is not a file. ${err.message}`;
            }
            throw err;
        }
        // Now open a read stream on the file, and parse it.
        const readStream = fs.createReadStream(filePath);
        return this.fromStream(readStream, options);
    }
    /**
     * Create a credentials instance using a given impersonated input options.
     * @param json The impersonated input object.
     * @returns JWT or UserRefresh Client with data
     */
    fromImpersonatedJSON(json) {
        var _a, _b, _c, _d;
        if (!json) {
            throw new Error('Must pass in a JSON object containing an  impersonated refresh token');
        }
        if (json.type !== impersonated_1.IMPERSONATED_ACCOUNT_TYPE) {
            throw new Error(`The incoming JSON object does not have the "${impersonated_1.IMPERSONATED_ACCOUNT_TYPE}" type`);
        }
        if (!json.source_credentials) {
            throw new Error('The incoming JSON object does not contain a source_credentials field');
        }
        if (!json.service_account_impersonation_url) {
            throw new Error('The incoming JSON object does not contain a service_account_impersonation_url field');
        }
        const sourceClient = this.fromJSON(json.source_credentials);
        if (((_a = json.service_account_impersonation_url) === null || _a === void 0 ? void 0 : _a.length) > 256) {
            /**
             * Prevents DOS attacks.
             * @see {@link https://github.com/googleapis/google-auth-library-nodejs/security/code-scanning/85}
             **/
            throw new RangeError(`Target principal is too long: ${json.service_account_impersonation_url}`);
        }
        // Extract service account from service_account_impersonation_url
        const targetPrincipal = (_c = (_b = /(?<target>[^/]+):(generateAccessToken|generateIdToken)$/.exec(json.service_account_impersonation_url)) === null || _b === void 0 ? void 0 : _b.groups) === null || _c === void 0 ? void 0 : _c.target;
        if (!targetPrincipal) {
            throw new RangeError(`Cannot extract target principal from ${json.service_account_impersonation_url}`);
        }
        const targetScopes = (_d = this.getAnyScopes()) !== null && _d !== void 0 ? _d : [];
        return new impersonated_1.Impersonated({
            ...json,
            sourceClient,
            targetPrincipal,
            targetScopes: Array.isArray(targetScopes) ? targetScopes : [targetScopes],
        });
    }
    /**
     * Create a credentials instance using the given input options.
     * This client is not cached.
     *
     * **Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to {@link https://cloud.google.com/docs/authentication/external/externally-sourced-credentials Validate credential configurations from external sources}.
     *
     * @param json The input object.
     * @param options The JWT or UserRefresh options for the client
     * @returns JWT or UserRefresh Client with data
     */
    fromJSON(json, options = {}) {
        let client;
        // user's preferred universe domain
        const preferredUniverseDomain = (0, util_1.originalOrCamelOptions)(options).get('universe_domain');
        if (json.type === refreshclient_1.USER_REFRESH_ACCOUNT_TYPE) {
            client = new refreshclient_1.UserRefreshClient(options);
            client.fromJSON(json);
        }
        else if (json.type === impersonated_1.IMPERSONATED_ACCOUNT_TYPE) {
            client = this.fromImpersonatedJSON(json);
        }
        else if (json.type === baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
            client = externalclient_1.ExternalAccountClient.fromJSON(json, options);
            client.scopes = this.getAnyScopes();
        }
        else if (json.type === externalAccountAuthorizedUserClient_1.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE) {
            client = new externalAccountAuthorizedUserClient_1.ExternalAccountAuthorizedUserClient(json, options);
        }
        else {
            options.scopes = this.scopes;
            client = new jwtclient_1.JWT(options);
            this.setGapicJWTValues(client);
            client.fromJSON(json);
        }
        if (preferredUniverseDomain) {
            client.universeDomain = preferredUniverseDomain;
        }
        return client;
    }
    /**
     * Return a JWT or UserRefreshClient from JavaScript object, caching both the
     * object used to instantiate and the client.
     * @param json The input object.
     * @param options The JWT or UserRefresh options for the client
     * @returns JWT or UserRefresh Client with data
     */
    _cacheClientFromJSON(json, options) {
        const client = this.fromJSON(json, options);
        // cache both raw data used to instantiate client and client itself.
        this.jsonContent = json;
        this.cachedCredential = client;
        return client;
    }
    fromStream(inputStream, optionsOrCallback = {}, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else {
            options = optionsOrCallback;
        }
        if (callback) {
            this.fromStreamAsync(inputStream, options).then(r => callback(null, r), callback);
        }
        else {
            return this.fromStreamAsync(inputStream, options);
        }
    }
    fromStreamAsync(inputStream, options) {
        return new Promise((resolve, reject) => {
            if (!inputStream) {
                throw new Error('Must pass in a stream containing the Google auth settings.');
            }
            const chunks = [];
            inputStream
                .setEncoding('utf8')
                .on('error', reject)
                .on('data', chunk => chunks.push(chunk))
                .on('end', () => {
                try {
                    try {
                        const data = JSON.parse(chunks.join(''));
                        const r = this._cacheClientFromJSON(data, options);
                        return resolve(r);
                    }
                    catch (err) {
                        // If we failed parsing this.keyFileName, assume that it
                        // is a PEM or p12 certificate:
                        if (!this.keyFilename)
                            throw err;
                        const client = new jwtclient_1.JWT({
                            ...this.clientOptions,
                            keyFile: this.keyFilename,
                        });
                        this.cachedCredential = client;
                        this.setGapicJWTValues(client);
                        return resolve(client);
                    }
                }
                catch (err) {
                    return reject(err);
                }
            });
        });
    }
    /**
     * Create a credentials instance using the given API key string.
     * The created client is not cached. In order to create and cache it use the {@link GoogleAuth.getClient `getClient`} method after first providing an {@link GoogleAuth.apiKey `apiKey`}.
     *
     * @param apiKey The API key string
     * @param options An optional options object.
     * @returns A JWT loaded from the key
     */
    fromAPIKey(apiKey, options = {}) {
        return new jwtclient_1.JWT({ ...options, apiKey });
    }
    /**
     * Determines whether the current operating system is Windows.
     * @api private
     */
    _isWindows() {
        const sys = os.platform();
        if (sys && sys.length >= 3) {
            if (sys.substring(0, 3).toLowerCase() === 'win') {
                return true;
            }
        }
        return false;
    }
    /**
     * Run the Google Cloud SDK command that prints the default project ID
     */
    async getDefaultServiceProjectId() {
        return new Promise(resolve => {
            (0, child_process_1.exec)('gcloud config config-helper --format json', (err, stdout) => {
                if (!err && stdout) {
                    try {
                        const projectId = JSON.parse(stdout).configuration.properties.core.project;
                        resolve(projectId);
                        return;
                    }
                    catch (e) {
                        // ignore errors
                    }
                }
                resolve(null);
            });
        });
    }
    /**
     * Loads the project id from environment variables.
     * @api private
     */
    getProductionProjectId() {
        return (process.env['GCLOUD_PROJECT'] ||
            process.env['GOOGLE_CLOUD_PROJECT'] ||
            process.env['gcloud_project'] ||
            process.env['google_cloud_project']);
    }
    /**
     * Loads the project id from the GOOGLE_APPLICATION_CREDENTIALS json file.
     * @api private
     */
    async getFileProjectId() {
        if (this.cachedCredential) {
            // Try to read the project ID from the cached credentials file
            return this.cachedCredential.projectId;
        }
        // Ensure the projectId is loaded from the keyFile if available.
        if (this.keyFilename) {
            const creds = await this.getClient();
            if (creds && creds.projectId) {
                return creds.projectId;
            }
        }
        // Try to load a credentials file and read its project ID
        const r = await this._tryGetApplicationCredentialsFromEnvironmentVariable();
        if (r) {
            return r.projectId;
        }
        else {
            return null;
        }
    }
    /**
     * Gets the project ID from external account client if available.
     */
    async getExternalAccountClientProjectId() {
        if (!this.jsonContent || this.jsonContent.type !== baseexternalclient_1.EXTERNAL_ACCOUNT_TYPE) {
            return null;
        }
        const creds = await this.getClient();
        // Do not suppress the underlying error, as the error could contain helpful
        // information for debugging and fixing. This is especially true for
        // external account creds as in order to get the project ID, the following
        // operations have to succeed:
        // 1. Valid credentials file should be supplied.
        // 2. Ability to retrieve access tokens from STS token exchange API.
        // 3. Ability to exchange for service account impersonated credentials (if
        //    enabled).
        // 4. Ability to get project info using the access token from step 2 or 3.
        // Without surfacing the error, it is harder for developers to determine
        // which step went wrong.
        return await creds.getProjectId();
    }
    /**
     * Gets the Compute Engine project ID if it can be inferred.
     */
    async getGCEProjectId() {
        try {
            const r = await gcpMetadata.project('project-id');
            return r;
        }
        catch (e) {
            // Ignore any errors
            return null;
        }
    }
    getCredentials(callback) {
        if (callback) {
            this.getCredentialsAsync().then(r => callback(null, r), callback);
        }
        else {
            return this.getCredentialsAsync();
        }
    }
    async getCredentialsAsync() {
        const client = await this.getClient();
        if (client instanceof impersonated_1.Impersonated) {
            return { client_email: client.getTargetPrincipal() };
        }
        if (client instanceof baseexternalclient_1.BaseExternalAccountClient) {
            const serviceAccountEmail = client.getServiceAccountEmail();
            if (serviceAccountEmail) {
                return {
                    client_email: serviceAccountEmail,
                    universe_domain: client.universeDomain,
                };
            }
        }
        if (this.jsonContent) {
            return {
                client_email: this.jsonContent.client_email,
                private_key: this.jsonContent.private_key,
                universe_domain: this.jsonContent.universe_domain,
            };
        }
        if (await this._checkIsGCE()) {
            const [client_email, universe_domain] = await Promise.all([
                gcpMetadata.instance('service-accounts/default/email'),
                this.getUniverseDomain(),
            ]);
            return { client_email, universe_domain };
        }
        throw new Error(exports.GoogleAuthExceptionMessages.NO_CREDENTIALS_FOUND);
    }
    /**
     * Automatically obtain an {@link AuthClient `AuthClient`} based on the
     * provided configuration. If no options were passed, use Application
     * Default Credentials.
     */
    async getClient() {
        if (this.cachedCredential) {
            return this.cachedCredential;
        }
        // Use an existing auth client request, or cache a new one
        __classPrivateFieldSet(this, _GoogleAuth_pendingAuthClient, __classPrivateFieldGet(this, _GoogleAuth_pendingAuthClient, "f") || __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_determineClient).call(this), "f");
        try {
            return await __classPrivateFieldGet(this, _GoogleAuth_pendingAuthClient, "f");
        }
        finally {
            // reset the pending auth client in case it is changed later
            __classPrivateFieldSet(this, _GoogleAuth_pendingAuthClient, null, "f");
        }
    }
    /**
     * Creates a client which will fetch an ID token for authorization.
     * @param targetAudience the audience for the fetched ID token.
     * @returns IdTokenClient for making HTTP calls authenticated with ID tokens.
     */
    async getIdTokenClient(targetAudience) {
        const client = await this.getClient();
        if (!('fetchIdToken' in client)) {
            throw new Error('Cannot fetch ID token in this environment, use GCE or set the GOOGLE_APPLICATION_CREDENTIALS environment variable to a service account credentials JSON file.');
        }
        return new idtokenclient_1.IdTokenClient({ targetAudience, idTokenProvider: client });
    }
    /**
     * Automatically obtain application default credentials, and return
     * an access token for making requests.
     */
    async getAccessToken() {
        const client = await this.getClient();
        return (await client.getAccessToken()).token;
    }
    /**
     * Obtain the HTTP headers that will provide authorization for a given
     * request.
     */
    async getRequestHeaders(url) {
        const client = await this.getClient();
        return client.getRequestHeaders(url);
    }
    /**
     * Obtain credentials for a request, then attach the appropriate headers to
     * the request options.
     * @param opts Axios or Request options on which to attach the headers
     */
    async authorizeRequest(opts) {
        opts = opts || {};
        const url = opts.url || opts.uri;
        const client = await this.getClient();
        const headers = await client.getRequestHeaders(url);
        opts.headers = Object.assign(opts.headers || {}, headers);
        return opts;
    }
    /**
     * Automatically obtain application default credentials, and make an
     * HTTP request using the given options.
     * @param opts Axios request options for the HTTP request.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async request(opts) {
        const client = await this.getClient();
        return client.request(opts);
    }
    /**
     * Determine the compute environment in which the code is running.
     */
    getEnv() {
        return (0, envDetect_1.getEnv)();
    }
    /**
     * Sign the given data with the current private key, or go out
     * to the IAM API to sign it.
     * @param data The data to be signed.
     * @param endpoint A custom endpoint to use.
     *
     * @example
     * ```
     * sign('data', 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/');
     * ```
     */
    async sign(data, endpoint) {
        const client = await this.getClient();
        const universe = await this.getUniverseDomain();
        endpoint =
            endpoint ||
                `https://iamcredentials.${universe}/v1/projects/-/serviceAccounts/`;
        if (client instanceof impersonated_1.Impersonated) {
            const signed = await client.sign(data);
            return signed.signedBlob;
        }
        const crypto = (0, crypto_1.createCrypto)();
        if (client instanceof jwtclient_1.JWT && client.key) {
            const sign = await crypto.sign(client.key, data);
            return sign;
        }
        const creds = await this.getCredentials();
        if (!creds.client_email) {
            throw new Error('Cannot sign data without `client_email`.');
        }
        return this.signBlob(crypto, creds.client_email, data, endpoint);
    }
    async signBlob(crypto, emailOrUniqueId, data, endpoint) {
        const url = new URL(endpoint + `${emailOrUniqueId}:signBlob`);
        const res = await this.request({
            method: 'POST',
            url: url.href,
            data: {
                payload: crypto.encodeBase64StringUtf8(data),
            },
            retry: true,
            retryConfig: {
                httpMethodsToRetry: ['POST'],
            },
        });
        return res.data.signedBlob;
    }
}
exports.GoogleAuth = GoogleAuth;
_GoogleAuth_pendingAuthClient = new WeakMap(), _GoogleAuth_instances = new WeakSet(), _GoogleAuth_prepareAndCacheClient = async function _GoogleAuth_prepareAndCacheClient(credential, quotaProjectIdOverride = process.env['GOOGLE_CLOUD_QUOTA_PROJECT'] || null) {
    const projectId = await this.getProjectIdOptional();
    if (quotaProjectIdOverride) {
        credential.quotaProjectId = quotaProjectIdOverride;
    }
    this.cachedCredential = credential;
    return { credential, projectId };
}, _GoogleAuth_determineClient = async function _GoogleAuth_determineClient() {
    if (this.jsonContent) {
        return this._cacheClientFromJSON(this.jsonContent, this.clientOptions);
    }
    else if (this.keyFilename) {
        const filePath = path.resolve(this.keyFilename);
        const stream = fs.createReadStream(filePath);
        return await this.fromStreamAsync(stream, this.clientOptions);
    }
    else if (this.apiKey) {
        const client = await this.fromAPIKey(this.apiKey, this.clientOptions);
        client.scopes = this.scopes;
        const { credential } = await __classPrivateFieldGet(this, _GoogleAuth_instances, "m", _GoogleAuth_prepareAndCacheClient).call(this, client);
        return credential;
    }
    else {
        const { credential } = await this.getApplicationDefaultAsync(this.clientOptions);
        return credential;
    }
};
/**
 * Export DefaultTransporter as a static property of the class.
 */
GoogleAuth.DefaultTransporter = transporters_1.DefaultTransporter;
