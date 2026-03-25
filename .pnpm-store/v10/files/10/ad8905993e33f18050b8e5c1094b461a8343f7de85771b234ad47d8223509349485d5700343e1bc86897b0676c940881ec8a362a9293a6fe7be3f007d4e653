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
exports.serializer = exports.warn = exports.ChannelCredentials = exports.makeUUID = exports.fallback = exports.protobufMinimal = exports.protobuf = exports.version = exports.createByteLengthFunction = exports.LocationsClient = exports.IamClient = exports.OperationsClient = exports.LocationProtos = exports.IamProtos = exports.operationsProtos = exports.routingHeader = exports.StreamType = exports.Status = exports.PathTemplate = exports.operation = exports.Operation = exports.GrpcClient = exports.GoogleProtoFilesRoot = exports.ClientStub = exports.GoogleError = exports.createMaxRetriesBackoffSettings = exports.createDefaultBackoffSettings = exports.createBackoffSettings = exports.createBundleOptions = exports.createRetryOptions = exports.RetryOptions = exports.constructSettings = exports.CallSettings = exports.StreamDescriptor = exports.PageDescriptor = exports.LongrunningDescriptor = exports.BundleDescriptor = exports.createApiCall = exports.OngoingCall = exports.grpc = exports.GoogleAuth = void 0;
exports.lro = lro;
const grpc = require("@grpc/grpc-js");
exports.grpc = grpc;
const grpc_1 = require("./grpc");
const IamProtos = require("../protos/iam_service");
exports.IamProtos = IamProtos;
const LocationProtos = require("../protos/locations");
exports.LocationProtos = LocationProtos;
const operationsProtos = require("../protos/operations");
exports.operationsProtos = operationsProtos;
const operationsClient = require("./operationsClient");
const routingHeader = require("./routingHeader");
exports.routingHeader = routingHeader;
var google_auth_library_1 = require("google-auth-library");
Object.defineProperty(exports, "GoogleAuth", { enumerable: true, get: function () { return google_auth_library_1.GoogleAuth; } });
var call_1 = require("./call");
Object.defineProperty(exports, "OngoingCall", { enumerable: true, get: function () { return call_1.OngoingCall; } });
var createApiCall_1 = require("./createApiCall");
Object.defineProperty(exports, "createApiCall", { enumerable: true, get: function () { return createApiCall_1.createApiCall; } });
var descriptor_1 = require("./descriptor");
Object.defineProperty(exports, "BundleDescriptor", { enumerable: true, get: function () { return descriptor_1.BundleDescriptor; } });
Object.defineProperty(exports, "LongrunningDescriptor", { enumerable: true, get: function () { return descriptor_1.LongrunningDescriptor; } });
Object.defineProperty(exports, "PageDescriptor", { enumerable: true, get: function () { return descriptor_1.PageDescriptor; } });
Object.defineProperty(exports, "StreamDescriptor", { enumerable: true, get: function () { return descriptor_1.StreamDescriptor; } });
var gax_1 = require("./gax");
Object.defineProperty(exports, "CallSettings", { enumerable: true, get: function () { return gax_1.CallSettings; } });
Object.defineProperty(exports, "constructSettings", { enumerable: true, get: function () { return gax_1.constructSettings; } });
Object.defineProperty(exports, "RetryOptions", { enumerable: true, get: function () { return gax_1.RetryOptions; } });
Object.defineProperty(exports, "createRetryOptions", { enumerable: true, get: function () { return gax_1.createRetryOptions; } });
Object.defineProperty(exports, "createBundleOptions", { enumerable: true, get: function () { return gax_1.createBundleOptions; } });
Object.defineProperty(exports, "createBackoffSettings", { enumerable: true, get: function () { return gax_1.createBackoffSettings; } });
Object.defineProperty(exports, "createDefaultBackoffSettings", { enumerable: true, get: function () { return gax_1.createDefaultBackoffSettings; } });
Object.defineProperty(exports, "createMaxRetriesBackoffSettings", { enumerable: true, get: function () { return gax_1.createMaxRetriesBackoffSettings; } });
var googleError_1 = require("./googleError");
Object.defineProperty(exports, "GoogleError", { enumerable: true, get: function () { return googleError_1.GoogleError; } });
var grpc_2 = require("./grpc");
Object.defineProperty(exports, "ClientStub", { enumerable: true, get: function () { return grpc_2.ClientStub; } });
Object.defineProperty(exports, "GoogleProtoFilesRoot", { enumerable: true, get: function () { return grpc_2.GoogleProtoFilesRoot; } });
Object.defineProperty(exports, "GrpcClient", { enumerable: true, get: function () { return grpc_2.GrpcClient; } });
var longrunning_1 = require("./longRunningCalls/longrunning");
Object.defineProperty(exports, "Operation", { enumerable: true, get: function () { return longrunning_1.Operation; } });
Object.defineProperty(exports, "operation", { enumerable: true, get: function () { return longrunning_1.operation; } });
var pathTemplate_1 = require("./pathTemplate");
Object.defineProperty(exports, "PathTemplate", { enumerable: true, get: function () { return pathTemplate_1.PathTemplate; } });
var status_1 = require("./status");
Object.defineProperty(exports, "Status", { enumerable: true, get: function () { return status_1.Status; } });
var streaming_1 = require("./streamingCalls/streaming");
Object.defineProperty(exports, "StreamType", { enumerable: true, get: function () { return streaming_1.StreamType; } });
function lro(options) {
    options = Object.assign({ scopes: lro.ALL_SCOPES }, options);
    const gaxGrpc = new grpc_1.GrpcClient(options);
    return new operationsClient.OperationsClientBuilder(gaxGrpc);
}
lro.SERVICE_ADDRESS = operationsClient.SERVICE_ADDRESS;
lro.ALL_SCOPES = operationsClient.ALL_SCOPES;
var operationsClient_1 = require("./operationsClient");
Object.defineProperty(exports, "OperationsClient", { enumerable: true, get: function () { return operationsClient_1.OperationsClient; } });
var iamService_1 = require("./iamService");
Object.defineProperty(exports, "IamClient", { enumerable: true, get: function () { return iamService_1.IamClient; } });
var locationService_1 = require("./locationService");
Object.defineProperty(exports, "LocationsClient", { enumerable: true, get: function () { return locationService_1.LocationsClient; } });
exports.createByteLengthFunction = grpc_1.GrpcClient.createByteLengthFunction;
exports.version = require('../../package.json').version;
const protobuf = require("protobufjs");
exports.protobuf = protobuf;
exports.protobufMinimal = require("protobufjs/minimal");
const fallback = require("./fallback");
exports.fallback = fallback;
var util_1 = require("./util");
Object.defineProperty(exports, "makeUUID", { enumerable: true, get: function () { return util_1.makeUUID; } });
var grpc_js_1 = require("@grpc/grpc-js");
Object.defineProperty(exports, "ChannelCredentials", { enumerable: true, get: function () { return grpc_js_1.ChannelCredentials; } });
var warnings_1 = require("./warnings");
Object.defineProperty(exports, "warn", { enumerable: true, get: function () { return warnings_1.warn; } });
const serializer = require("proto3-json-serializer");
exports.serializer = serializer;
//# sourceMappingURL=index.js.map