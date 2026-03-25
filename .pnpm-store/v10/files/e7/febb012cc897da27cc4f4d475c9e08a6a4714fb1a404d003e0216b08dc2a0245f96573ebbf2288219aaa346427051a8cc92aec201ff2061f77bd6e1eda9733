"use strict";
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProtoFilesRoot = exports.GrpcClient = exports.ClientStub = void 0;
const grpcProtoLoader = require("@grpc/proto-loader");
const child_process_1 = require("child_process");
const fs = require("fs");
const google_auth_library_1 = require("google-auth-library");
const grpc = require("@grpc/grpc-js");
const os = require("os");
const path_1 = require("path");
const path = require("path");
const protobuf = require("protobufjs");
const objectHash = require("object-hash");
const gax = require("./gax");
const googleProtoFilesDir = path.join(__dirname, '..', '..', 'build', 'protos');
// INCLUDE_DIRS is passed to @grpc/proto-loader
const INCLUDE_DIRS = [];
INCLUDE_DIRS.push(googleProtoFilesDir);
// COMMON_PROTO_FILES logic is here for protobufjs loads (see
// GoogleProtoFilesRoot below)
const commonProtoFiles = require("./protosList.json");
// use the correct path separator for the OS we are running on
const COMMON_PROTO_FILES = commonProtoFiles.map(file => file.replace(/[/\\]/g, path.sep));
/*
 * Async version of readFile.
 *
 * @returns {Promise} Contents of file at path.
 */
async function readFileAsync(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, content) => {
            if (err)
                return reject(err);
            else
                resolve(content);
        });
    });
}
/*
 * Async version of execFile.
 *
 * @returns {Promise} stdout from command execution.
 */
async function execFileAsync(command, args) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(command, args, (err, stdout) => {
            if (err)
                return reject(err);
            else
                resolve(stdout);
        });
    });
}
class ClientStub extends grpc.Client {
}
exports.ClientStub = ClientStub;
class GrpcClient {
    /**
     * Key for proto cache map. We are doing our best to make sure we respect
     * the options, so if the same proto file is loaded with different set of
     * options, the cache won't be used.  Since some of the options are
     * Functions (e.g. `enums: String` - see below in `loadProto()`),
     * they will be omitted from the cache key.  If the cache breaks anything
     * for you, use the `ignoreCache` parameter of `loadProto()` to disable it.
     */
    static protoCacheKey(filename, options) {
        if (!filename ||
            (Array.isArray(filename) && (filename.length === 0 || !filename[0]))) {
            return undefined;
        }
        return JSON.stringify(filename) + ' ' + JSON.stringify(options);
    }
    /**
     * In rare cases users might need to deallocate all memory consumed by loaded protos.
     * This method will delete the proto cache content.
     */
    static clearProtoCache() {
        GrpcClient.protoCache.clear();
    }
    /**
     * A class which keeps the context of gRPC and auth for the gRPC.
     *
     * @param {Object=} options - The optional parameters. It will be directly
     *   passed to google-auth-library library, so parameters like keyFile or
     *   credentials will be valid.
     * @param {Object=} options.auth - An instance of google-auth-library.
     *   When specified, this auth instance will be used instead of creating
     *   a new one.
     * @param {Object=} options.grpc - When specified, this will be used
     *   for the 'grpc' module in this context. By default, it will load the grpc
     *   module in the standard way.
     * @constructor
     */
    constructor(options = {}) {
        var _a;
        this.auth = options.auth || new google_auth_library_1.GoogleAuth(options);
        this.fallback = false;
        const minimumVersion = 10;
        const major = Number((_a = process.version.match(/^v(\d+)/)) === null || _a === void 0 ? void 0 : _a[1]);
        if (Number.isNaN(major) || major < minimumVersion) {
            const errorMessage = `Node.js v${minimumVersion}.0.0 is a minimum requirement. To learn about legacy version support visit: ` +
                'https://github.com/googleapis/google-cloud-node#supported-nodejs-versions';
            throw new Error(errorMessage);
        }
        if ('grpc' in options) {
            this.grpc = options.grpc;
            this.grpcVersion = '';
        }
        else {
            this.grpc = grpc;
            this.grpcVersion = require('@grpc/grpc-js/package.json').version;
        }
    }
    /**
     * Creates a gRPC credentials. It asks the auth data if necessary.
     * @private
     * @param {Object} opts - options values for configuring credentials.
     * @param {Object=} opts.sslCreds - when specified, this is used instead
     *   of default channel credentials.
     * @return {Promise} The promise which will be resolved to the gRPC credential.
     */
    async _getCredentials(opts) {
        if (opts.sslCreds) {
            return opts.sslCreds;
        }
        const grpc = this.grpc;
        const sslCreds = opts.cert && opts.key
            ? grpc.credentials.createSsl(null, Buffer.from(opts.key), Buffer.from(opts.cert))
            : grpc.credentials.createSsl();
        const client = await this.auth.getClient();
        const credentials = grpc.credentials.combineChannelCredentials(sslCreds, grpc.credentials.createFromGoogleCredential(client));
        return credentials;
    }
    static defaultOptions() {
        // This set of @grpc/proto-loader options
        // 'closely approximates the existing behavior of grpc.load'
        const includeDirs = INCLUDE_DIRS.slice();
        const options = {
            keepCase: false,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs,
        };
        return options;
    }
    /**
     * Loads the gRPC service from the proto file(s) at the given path and with the
     * given options. Caches the loaded protos so the subsequent loads don't do
     * any disk reads.
     * @param filename The path to the proto file(s).
     * @param options Options for loading the proto file.
     * @param ignoreCache Defaults to `false`. Set it to `true` if the caching logic
     *   incorrectly decides that the options object is the same, or if you want to
     *   re-read the protos from disk for any other reason.
     */
    loadFromProto(filename, options, ignoreCache = false) {
        const cacheKey = GrpcClient.protoCacheKey(filename, options);
        let grpcPackage = cacheKey
            ? GrpcClient.protoCache.get(cacheKey)
            : undefined;
        if (ignoreCache || !grpcPackage) {
            const packageDef = grpcProtoLoader.loadSync(filename, options);
            grpcPackage = this.grpc.loadPackageDefinition(packageDef);
            if (cacheKey) {
                GrpcClient.protoCache.set(cacheKey, grpcPackage);
            }
        }
        return grpcPackage;
    }
    /**
     * Load gRPC proto service from a filename looking in googleapis common protos
     * when necessary. Caches the loaded protos so the subsequent loads don't do
     * any disk reads.
     * @param {String} protoPath - The directory to search for the protofile.
     * @param {String|String[]} filename - The filename(s) of the proto(s) to be loaded.
     *   If omitted, protoPath will be treated as a file path to load.
     * @param ignoreCache Defaults to `false`. Set it to `true` if the caching logic
     *   incorrectly decides that the options object is the same, or if you want to
     *   re-read the protos from disk for any other reason.
     * @return {Object<string, *>} The gRPC loaded result (the toplevel namespace
     *   object).
     */
    loadProto(protoPath, filename, ignoreCache = false) {
        if (!filename) {
            filename = path.basename(protoPath);
            protoPath = path.dirname(protoPath);
        }
        if (Array.isArray(filename) && filename.length === 0) {
            return {};
        }
        const options = GrpcClient.defaultOptions();
        options.includeDirs.unshift(protoPath);
        return this.loadFromProto(filename, options, ignoreCache);
    }
    static _resolveFile(protoPath, filename) {
        if (fs.existsSync(path.join(protoPath, filename))) {
            return path.join(protoPath, filename);
        }
        else if (COMMON_PROTO_FILES.indexOf(filename) > -1) {
            return path.join(googleProtoFilesDir, filename);
        }
        throw new Error(filename + ' could not be found in ' + protoPath);
    }
    loadProtoJSON(json, ignoreCache = false) {
        const hash = objectHash(JSON.stringify(json)).toString();
        const cached = GrpcClient.protoCache.get(hash);
        if (cached && !ignoreCache) {
            return cached;
        }
        const options = GrpcClient.defaultOptions();
        const packageDefinition = grpcProtoLoader.fromJSON(json, options);
        const grpcPackage = this.grpc.loadPackageDefinition(packageDefinition);
        GrpcClient.protoCache.set(hash, grpcPackage);
        return grpcPackage;
    }
    metadataBuilder(headers) {
        const Metadata = this.grpc.Metadata;
        const baseMetadata = new Metadata();
        for (const key in headers) {
            const value = headers[key];
            if (Array.isArray(value)) {
                value.forEach(v => baseMetadata.add(key, v));
            }
            else {
                baseMetadata.set(key, `${value}`);
            }
        }
        return function buildMetadata(abTests, moreHeaders) {
            // TODO: bring the A/B testing info into the metadata.
            let copied = false;
            let metadata = baseMetadata;
            if (moreHeaders) {
                for (const key in moreHeaders) {
                    if (key.toLowerCase() !== 'x-goog-api-client') {
                        if (!copied) {
                            copied = true;
                            metadata = metadata.clone();
                        }
                        const value = moreHeaders[key];
                        if (Array.isArray(value)) {
                            value.forEach(v => metadata.add(key, v));
                        }
                        else {
                            metadata.set(key, `${value}`);
                        }
                    }
                }
            }
            return metadata;
        };
    }
    /**
     * A wrapper of {@link constructSettings} function under the gRPC context.
     *
     * Most of parameters are common among constructSettings, please take a look.
     * @param {string} serviceName - The fullly-qualified name of the service.
     * @param {Object} clientConfig - A dictionary of the client config.
     * @param {Object} configOverrides - A dictionary of overriding configs.
     * @param {Object} headers - A dictionary of additional HTTP header name to
     *   its value.
     * @return {Object} A mapping of method names to CallSettings.
     */
    constructSettings(serviceName, clientConfig, configOverrides, headers) {
        return gax.constructSettings(serviceName, clientConfig, configOverrides, this.grpc.status, { metadataBuilder: this.metadataBuilder(headers) });
    }
    /**
     * Creates a gRPC stub with current gRPC and auth.
     * @param {function} CreateStub - The constructor function of the stub.
     * @param {Object} options - The optional arguments to customize
     *   gRPC connection. This options will be passed to the constructor of
     *   gRPC client too.
     * @param {string} options.servicePath - The name of the server of the service.
     * @param {number} options.port - The port of the service.
     * @param {grpcTypes.ClientCredentials=} options.sslCreds - The credentials to be used
     *   to set up gRPC connection.
     * @param {string} defaultServicePath - The default service path.
     * @return {Promise} A promise which resolves to a gRPC stub instance.
     */
    async createStub(CreateStub, options, customServicePath) {
        // The following options are understood by grpc-gcp and need a special treatment
        // (should be passed without a `grpc.` prefix)
        const grpcGcpOptions = [
            'grpc.callInvocationTransformer',
            'grpc.channelFactoryOverride',
            'grpc.gcpApiConfig',
        ];
        const [cert, key] = await this._detectClientCertificate(options, options.universeDomain);
        const servicePath = this._mtlsServicePath(options.servicePath, customServicePath, cert && key);
        const opts = Object.assign({}, options, { cert, key, servicePath });
        const serviceAddress = servicePath + ':' + opts.port;
        if (!options.universeDomain) {
            options.universeDomain = 'googleapis.com';
        }
        if (options.universeDomain) {
            const universeFromAuth = await this.auth.getUniverseDomain();
            if (universeFromAuth && options.universeDomain !== universeFromAuth) {
                throw new Error(`The configured universe domain (${options.universeDomain}) does not match the universe domain found in the credentials (${universeFromAuth}). ` +
                    "If you haven't configured the universe domain explicitly, googleapis.com is the default.");
            }
        }
        const creds = await this._getCredentials(opts);
        const grpcOptions = {};
        // @grpc/grpc-js limits max receive/send message length starting from v0.8.0
        // https://github.com/grpc/grpc-node/releases/tag/%40grpc%2Fgrpc-js%400.8.0
        // To keep the existing behavior and avoid libraries breakage, we pass -1 there as suggested.
        grpcOptions['grpc.max_receive_message_length'] = -1;
        grpcOptions['grpc.max_send_message_length'] = -1;
        grpcOptions['grpc.initial_reconnect_backoff_ms'] = 1000;
        Object.keys(opts).forEach(key => {
            const value = options[key];
            // the older versions had a bug which required users to call an option
            // grpc.grpc.* to make it actually pass to gRPC as grpc.*, let's handle
            // this here until the next major release
            if (key.startsWith('grpc.grpc.')) {
                key = key.replace(/^grpc\./, '');
            }
            if (key.startsWith('grpc.')) {
                if (grpcGcpOptions.includes(key)) {
                    key = key.replace(/^grpc\./, '');
                }
                grpcOptions[key] = value;
            }
            if (key.startsWith('grpc-node.')) {
                grpcOptions[key] = value;
            }
        });
        const stub = new CreateStub(serviceAddress, creds, grpcOptions);
        return stub;
    }
    /**
     * Detect mTLS client certificate based on logic described in
     * https://google.aip.dev/auth/4114.
     *
     * @param {object} [options] - The configuration object.
     * @returns {Promise} Resolves array of strings representing cert and key.
     */
    async _detectClientCertificate(opts, universeDomain) {
        var _a;
        const certRegex = /(?<cert>-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----)/s;
        const keyRegex = /(?<key>-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----)/s;
        // If GOOGLE_API_USE_CLIENT_CERTIFICATE is true...:
        if (typeof process !== 'undefined' &&
            ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.GOOGLE_API_USE_CLIENT_CERTIFICATE) === 'true') {
            if (universeDomain && universeDomain !== 'googleapis.com') {
                throw new Error('mTLS is not supported outside of googleapis.com universe domain.');
            }
            if ((opts === null || opts === void 0 ? void 0 : opts.cert) && (opts === null || opts === void 0 ? void 0 : opts.key)) {
                return [opts.cert, opts.key];
            }
            // If context aware metadata exists, run the cert provider command,
            // parse the output to extract cert and key, and use this cert/key.
            const metadataPath = (0, path_1.join)(os.homedir(), '.secureConnect', 'context_aware_metadata.json');
            const metadata = JSON.parse(await readFileAsync(metadataPath));
            if (!metadata.cert_provider_command) {
                throw Error('no cert_provider_command found');
            }
            const stdout = await execFileAsync(metadata.cert_provider_command[0], metadata.cert_provider_command.slice(1));
            const matchCert = stdout.toString().match(certRegex);
            const matchKey = stdout.toString().match(keyRegex);
            if (!((matchCert === null || matchCert === void 0 ? void 0 : matchCert.groups) && (matchKey === null || matchKey === void 0 ? void 0 : matchKey.groups))) {
                throw Error('unable to parse certificate and key');
            }
            else {
                return [matchCert.groups.cert, matchKey.groups.key];
            }
        }
        // If GOOGLE_API_USE_CLIENT_CERTIFICATE is not set or false,
        // use no cert or key:
        return [undefined, undefined];
    }
    /**
     * Return service path, taking into account mTLS logic.
     * See: https://google.aip.dev/auth/4114
     *
     * @param {string|undefined} servicePath - The path of the service.
     * @param {string|undefined} customServicePath - Did the user provide a custom service URL.
     * @param {boolean} hasCertificate - Was a certificate found.
     * @returns {string} The DNS address for this service.
     */
    _mtlsServicePath(servicePath, customServicePath, hasCertificate) {
        var _a, _b;
        // If user provides a custom service path, return the current service
        // path and do not attempt to add mtls subdomain:
        if (customServicePath || !servicePath)
            return servicePath;
        if (typeof process !== 'undefined' &&
            ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.GOOGLE_API_USE_MTLS_ENDPOINT) === 'never') {
            // It was explicitly asked that mtls endpoint not be used:
            return servicePath;
        }
        else if ((typeof process !== 'undefined' &&
            ((_b = process === null || process === void 0 ? void 0 : process.env) === null || _b === void 0 ? void 0 : _b.GOOGLE_API_USE_MTLS_ENDPOINT) === 'always') ||
            hasCertificate) {
            // Either auto-detect or explicit setting of endpoint:
            return servicePath.replace('googleapis.com', 'mtls.googleapis.com');
        }
        return servicePath;
    }
    /**
     * Creates a 'bytelength' function for a given proto message class.
     *
     * See {@link BundleDescriptor} about the meaning of the return value.
     *
     * @param {function} message - a constructor function that is generated by
     *   protobuf.js. Assumes 'encoder' field in the message.
     * @return {function(Object):number} - a function to compute the byte length
     *   for an object.
     */
    static createByteLengthFunction(message) {
        return gax.createByteLengthFunction(message);
    }
}
exports.GrpcClient = GrpcClient;
GrpcClient.protoCache = new Map();
class GoogleProtoFilesRoot extends protobuf.Root {
    constructor(...args) {
        super(...args);
    }
    // Causes the loading of an included proto to check if it is a common
    // proto. If it is a common proto, use the bundled proto.
    resolvePath(originPath, includePath) {
        originPath = path.normalize(originPath);
        includePath = path.normalize(includePath);
        // Fully qualified paths don't need to be resolved.
        if (path.isAbsolute(includePath)) {
            if (!fs.existsSync(includePath)) {
                throw new Error('The include `' + includePath + '` was not found.');
            }
            return includePath;
        }
        if (COMMON_PROTO_FILES.indexOf(includePath) > -1) {
            return path.join(googleProtoFilesDir, includePath);
        }
        return GoogleProtoFilesRoot._findIncludePath(originPath, includePath);
    }
    static _findIncludePath(originPath, includePath) {
        originPath = path.normalize(originPath);
        includePath = path.normalize(includePath);
        let current = originPath;
        let found = fs.existsSync(path.join(current, includePath));
        while (!found && current.length > 0) {
            current = current.substring(0, current.lastIndexOf(path.sep));
            found = fs.existsSync(path.join(current, includePath));
        }
        if (!found) {
            throw new Error('The include `' + includePath + '` was not found.');
        }
        return path.join(current, includePath);
    }
}
exports.GoogleProtoFilesRoot = GoogleProtoFilesRoot;
//# sourceMappingURL=grpc.js.map