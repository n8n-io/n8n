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
exports.fallback = exports.GoogleError = exports.operation = exports.Operation = exports.warn = exports.protobufMinimal = exports.protobuf = exports.LocationProtos = exports.IamProtos = exports.operationsProtos = exports.GrpcClient = exports.defaultToObjectOptions = exports.makeUUID = exports.LocationsClient = exports.IamClient = exports.OperationsClient = exports.StreamType = exports.StreamDescriptor = exports.PageDescriptor = exports.LongrunningDescriptor = exports.BundleDescriptor = exports.version = exports.createDefaultBackoffSettings = exports.RetryOptions = exports.constructSettings = exports.CallSettings = exports.routingHeader = exports.PathTemplate = void 0;
exports.lro = lro;
exports.createApiCall = createApiCall;
const objectHash = require("object-hash");
const protobuf = require("protobufjs");
exports.protobuf = protobuf;
const gax = require("./gax");
const routingHeader = require("./routingHeader");
exports.routingHeader = routingHeader;
const status_1 = require("./status");
const google_auth_library_1 = require("google-auth-library");
const operationsClient_1 = require("./operationsClient");
const createApiCall_1 = require("./createApiCall");
const fallbackRest = require("./fallbackRest");
const featureDetection_1 = require("./featureDetection");
const fallbackServiceStub_1 = require("./fallbackServiceStub");
const streaming_1 = require("./streamingCalls/streaming");
const util_1 = require("./util");
const IamProtos = require("../protos/iam_service");
exports.IamProtos = IamProtos;
const LocationProtos = require("../protos/locations");
exports.LocationProtos = LocationProtos;
const operationsProtos = require("../protos/operations");
exports.operationsProtos = operationsProtos;
var pathTemplate_1 = require("./pathTemplate");
Object.defineProperty(exports, "PathTemplate", { enumerable: true, get: function () { return pathTemplate_1.PathTemplate; } });
var gax_1 = require("./gax");
Object.defineProperty(exports, "CallSettings", { enumerable: true, get: function () { return gax_1.CallSettings; } });
Object.defineProperty(exports, "constructSettings", { enumerable: true, get: function () { return gax_1.constructSettings; } });
Object.defineProperty(exports, "RetryOptions", { enumerable: true, get: function () { return gax_1.RetryOptions; } });
Object.defineProperty(exports, "createDefaultBackoffSettings", { enumerable: true, get: function () { return gax_1.createDefaultBackoffSettings; } });
exports.version = require('../../package.json').version + '-fallback';
var descriptor_1 = require("./descriptor");
Object.defineProperty(exports, "BundleDescriptor", { enumerable: true, get: function () { return descriptor_1.BundleDescriptor; } });
Object.defineProperty(exports, "LongrunningDescriptor", { enumerable: true, get: function () { return descriptor_1.LongrunningDescriptor; } });
Object.defineProperty(exports, "PageDescriptor", { enumerable: true, get: function () { return descriptor_1.PageDescriptor; } });
Object.defineProperty(exports, "StreamDescriptor", { enumerable: true, get: function () { return descriptor_1.StreamDescriptor; } });
var streaming_2 = require("./streamingCalls/streaming");
Object.defineProperty(exports, "StreamType", { enumerable: true, get: function () { return streaming_2.StreamType; } });
var operationsClient_2 = require("./operationsClient");
Object.defineProperty(exports, "OperationsClient", { enumerable: true, get: function () { return operationsClient_2.OperationsClient; } });
var iamService_1 = require("./iamService");
Object.defineProperty(exports, "IamClient", { enumerable: true, get: function () { return iamService_1.IamClient; } });
var locationService_1 = require("./locationService");
Object.defineProperty(exports, "LocationsClient", { enumerable: true, get: function () { return locationService_1.LocationsClient; } });
var util_2 = require("./util");
Object.defineProperty(exports, "makeUUID", { enumerable: true, get: function () { return util_2.makeUUID; } });
exports.defaultToObjectOptions = {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};
const CLIENT_VERSION_HEADER = 'x-goog-api-client';
class GrpcClient {
    /**
     * In rare cases users might need to deallocate all memory consumed by loaded protos.
     * This method will delete the proto cache content.
     */
    static clearProtoCache() {
        GrpcClient.protoCache.clear();
    }
    /**
     * gRPC-fallback version of GrpcClient
     * Implements GrpcClient API for a browser using grpc-fallback protocol (sends serialized protobuf to HTTP/1 $rpc endpoint).
     *
     * @param {Object=} options.auth - An instance of OAuth2Client to use in browser, or an instance of GoogleAuth from google-auth-library
     *  to use in Node.js. Required for browser, optional for Node.js.
     * @constructor
     */
    constructor(options = {}) {
        var _a;
        if (!(0, featureDetection_1.isNodeJS)()) {
            if (!options.auth) {
                throw new Error(JSON.stringify(options) +
                    'You need to pass auth instance to use gRPC-fallback client in browser or other non-Node.js environments. Use OAuth2Client from google-auth-library.');
            }
            this.auth = options.auth;
        }
        else {
            this.auth =
                options.auth ||
                    new google_auth_library_1.GoogleAuth(options);
        }
        this.fallback = options.fallback ? true : false;
        this.grpcVersion = require('../../package.json').version;
        this.httpRules = options.httpRules;
        this.numericEnums = (_a = options.numericEnums) !== null && _a !== void 0 ? _a : false;
    }
    /**
     * gRPC-fallback version of loadProto
     * Loads the protobuf root object from a JSON object created from a proto file
     * @param {Object} jsonObject - A JSON version of a protofile created usin protobuf.js
     * @returns {Object} Root namespace of proto JSON
     */
    loadProto(jsonObject) {
        const rootObject = protobuf.Root.fromJSON(jsonObject);
        return rootObject;
    }
    loadProtoJSON(json, ignoreCache = false) {
        const hash = objectHash(JSON.stringify(json)).toString();
        const cached = GrpcClient.protoCache.get(hash);
        if (cached && !ignoreCache) {
            return cached;
        }
        const root = protobuf.Root.fromJSON(json);
        GrpcClient.protoCache.set(hash, root);
        return root;
    }
    static getServiceMethods(service) {
        const methods = {};
        for (const [methodName, methodObject] of Object.entries(service.methods)) {
            const methodNameLowerCamelCase = (0, util_1.toLowerCamelCase)(methodName);
            methods[methodNameLowerCamelCase] = methodObject;
        }
        return methods;
    }
    /**
     * gRPC-fallback version of constructSettings
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
        function buildMetadata(abTests, moreHeaders) {
            const metadata = {};
            if (!headers) {
                headers = {};
            }
            // Since gRPC expects each header to be an array,
            // we are doing the same for fallback here.
            for (const key in headers) {
                metadata[key] = Array.isArray(headers[key])
                    ? headers[key]
                    : [headers[key]];
            }
            // gRPC-fallback request must have 'grpc-web/' in 'x-goog-api-client'
            const clientVersions = [];
            if (metadata[CLIENT_VERSION_HEADER] &&
                metadata[CLIENT_VERSION_HEADER][0]) {
                clientVersions.push(...metadata[CLIENT_VERSION_HEADER][0].split(' '));
            }
            clientVersions.push(`grpc-web/${exports.version}`);
            metadata[CLIENT_VERSION_HEADER] = [clientVersions.join(' ')];
            if (!moreHeaders) {
                return metadata;
            }
            for (const key in moreHeaders) {
                if (key.toLowerCase() !== CLIENT_VERSION_HEADER) {
                    const value = moreHeaders[key];
                    if (Array.isArray(value)) {
                        if (metadata[key] === undefined) {
                            metadata[key] = value;
                        }
                        else {
                            if (Array.isArray(metadata[key])) {
                                metadata[key].push(...value);
                            }
                            else {
                                throw new Error(`Can not add value ${value} to the call metadata.`);
                            }
                        }
                    }
                    else {
                        metadata[key] = [value];
                    }
                }
            }
            return metadata;
        }
        return gax.constructSettings(serviceName, clientConfig, configOverrides, status_1.Status, { metadataBuilder: buildMetadata });
    }
    /**
     * gRPC-fallback version of createStub
     * Creates a gRPC-fallback stub with authentication headers built from supplied OAuth2Client instance
     *
     * @param {function} CreateStub - The constructor function of the stub.
     * @param {Object} service - A protobufjs Service object (as returned by lookupService)
     * @param {Object} opts - Connection options, as described below.
     * @param {string} opts.servicePath - The hostname of the API endpoint service.
     * @param {number} opts.port - The port of the service.
     * @return {Promise} A promise which resolves to a gRPC-fallback service stub, which is a protobuf.js service stub instance modified to match the gRPC stub API
     */
    async createStub(service, opts, 
    // For consistency with createStub in grpc.ts, customServicePath is defined:
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customServicePath) {
        if (!this.authClient) {
            if (this.auth && 'getClient' in this.auth) {
                this.authClient = (await this.auth.getClient());
            }
            else if (this.auth && 'getRequestHeaders' in this.auth) {
                this.authClient = this.auth;
            }
        }
        if (!this.authClient) {
            throw new Error('No authentication was provided');
        }
        if (!opts.universeDomain) {
            opts.universeDomain = 'googleapis.com';
        }
        if (opts.universeDomain) {
            const universeFromAuth = this.authClient.universeDomain;
            if (universeFromAuth && opts.universeDomain !== universeFromAuth) {
                throw new Error(`The configured universe domain (${opts.universeDomain}) does not match the universe domain found in the credentials (${universeFromAuth}). ` +
                    "If you haven't configured the universe domain explicitly, googleapis.com is the default.");
            }
        }
        service.resolveAll();
        const methods = GrpcClient.getServiceMethods(service);
        const protocol = opts.protocol || 'https';
        let servicePath = opts.servicePath;
        if (!servicePath &&
            service.options &&
            service.options['(google.api.default_host)']) {
            servicePath = service.options['(google.api.default_host)'];
        }
        if (!servicePath) {
            throw new Error(`Cannot determine service API path for service ${service.name}.`);
        }
        let servicePort;
        const match = servicePath.match(/^(.*):(\d+)$/);
        if (match) {
            servicePath = match[1];
            servicePort = parseInt(match[2]);
        }
        if (opts.port) {
            servicePort = opts.port;
        }
        else if (!servicePort) {
            servicePort = 443;
        }
        const encoder = fallbackRest.encodeRequest;
        const decoder = fallbackRest.decodeResponse;
        const serviceStub = (0, fallbackServiceStub_1.generateServiceStub)(methods, protocol, servicePath, servicePort, this.authClient, encoder, decoder, this.numericEnums);
        return serviceStub;
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
/**
 * gRPC-fallback version of lro
 *
 * @param {Object=} options.auth - An instance of google-auth-library.
 * @return {Object} A OperationsClientBuilder that will return a OperationsClient
 */
function lro(options) {
    options = Object.assign({ scopes: [] }, options);
    if (options.protoJson) {
        options = Object.assign(options, { fallback: true });
    }
    const gaxGrpc = new GrpcClient(options);
    return new operationsClient_1.OperationsClientBuilder(gaxGrpc, options.protoJson);
}
/**
 * gRPC-fallback version of createApiCall
 *
 * Converts an rpc call into an API call governed by the settings.
 *
 * In typical usage, `func` will be a promise to a callable used to make an rpc
 * request. This will mostly likely be a bound method from a request stub used
 * to make an rpc call. It is not a direct function but a Promise instance,
 * because of its asynchronism (typically, obtaining the auth information).
 *
 * The result is a function which manages the API call with the given settings
 * and the options on the invocation.
 *
 * Throws exception on unsupported streaming calls
 *
 * @param {Promise<GRPCCall>|GRPCCall} func - is either a promise to be used to make
 *   a bare RPC call, or just a bare RPC call.
 * @param {CallSettings} settings - provides the settings for this call
 * @param {Descriptor} descriptor - optionally specify the descriptor for
 *   the method call.
 * @return {GaxCall} func - a bound method on a request stub used
 *   to make an rpc call.
 */
function createApiCall(func, settings, descriptor, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_fallback // unused; for compatibility only
) {
    if (descriptor &&
        'streaming' in descriptor &&
        descriptor.type !== streaming_1.StreamType.SERVER_STREAMING) {
        return () => {
            throw new Error('The REST transport currently does not support client-streaming or bidi-stream calls.');
        };
    }
    if (descriptor && 'streaming' in descriptor && !(0, featureDetection_1.isNodeJS)()) {
        return () => {
            throw new Error('Server streaming over the REST transport is only supported in Node.js.');
        };
    }
    return (0, createApiCall_1.createApiCall)(func, settings, descriptor);
}
exports.protobufMinimal = require("protobufjs/minimal");
var warnings_1 = require("./warnings");
Object.defineProperty(exports, "warn", { enumerable: true, get: function () { return warnings_1.warn; } });
var longrunning_1 = require("./longRunningCalls/longrunning");
Object.defineProperty(exports, "Operation", { enumerable: true, get: function () { return longrunning_1.Operation; } });
Object.defineProperty(exports, "operation", { enumerable: true, get: function () { return longrunning_1.operation; } });
var googleError_1 = require("./googleError");
Object.defineProperty(exports, "GoogleError", { enumerable: true, get: function () { return googleError_1.GoogleError; } });
// Different environments or bundlers may or may not respect "browser" field
// in package.json (e.g. Electron does not respect it, but if you run the code
// through webpack first, it will follow the "browser" field).
// To make it safer and more compatible, let's make sure that if you do
// const gax = require("google-gax");
// you can always ask for gax.fallback, regardless of "browser" field being
// understood or not.
const fallback = module.exports;
exports.fallback = fallback;
//# sourceMappingURL=fallback.js.map