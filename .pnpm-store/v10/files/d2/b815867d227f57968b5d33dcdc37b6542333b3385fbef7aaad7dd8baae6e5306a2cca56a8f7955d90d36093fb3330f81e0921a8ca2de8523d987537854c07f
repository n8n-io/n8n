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
exports.experimental = exports.ServerMetricRecorder = exports.ServerInterceptingCall = exports.ResponderBuilder = exports.ServerListenerBuilder = exports.addAdminServicesToServer = exports.getChannelzHandlers = exports.getChannelzServiceDefinition = exports.InterceptorConfigurationError = exports.InterceptingCall = exports.RequesterBuilder = exports.ListenerBuilder = exports.StatusBuilder = exports.getClientChannel = exports.ServerCredentials = exports.Server = exports.setLogVerbosity = exports.setLogger = exports.load = exports.loadObject = exports.CallCredentials = exports.ChannelCredentials = exports.waitForClientReady = exports.closeClient = exports.Channel = exports.makeGenericClientConstructor = exports.makeClientConstructor = exports.loadPackageDefinition = exports.Client = exports.compressionAlgorithms = exports.propagate = exports.connectivityState = exports.status = exports.logVerbosity = exports.Metadata = exports.credentials = void 0;
const call_credentials_1 = require("./call-credentials");
Object.defineProperty(exports, "CallCredentials", { enumerable: true, get: function () { return call_credentials_1.CallCredentials; } });
const channel_1 = require("./channel");
Object.defineProperty(exports, "Channel", { enumerable: true, get: function () { return channel_1.ChannelImplementation; } });
const compression_algorithms_1 = require("./compression-algorithms");
Object.defineProperty(exports, "compressionAlgorithms", { enumerable: true, get: function () { return compression_algorithms_1.CompressionAlgorithms; } });
const connectivity_state_1 = require("./connectivity-state");
Object.defineProperty(exports, "connectivityState", { enumerable: true, get: function () { return connectivity_state_1.ConnectivityState; } });
const channel_credentials_1 = require("./channel-credentials");
Object.defineProperty(exports, "ChannelCredentials", { enumerable: true, get: function () { return channel_credentials_1.ChannelCredentials; } });
const client_1 = require("./client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
const constants_1 = require("./constants");
Object.defineProperty(exports, "logVerbosity", { enumerable: true, get: function () { return constants_1.LogVerbosity; } });
Object.defineProperty(exports, "status", { enumerable: true, get: function () { return constants_1.Status; } });
Object.defineProperty(exports, "propagate", { enumerable: true, get: function () { return constants_1.Propagate; } });
const logging = require("./logging");
const make_client_1 = require("./make-client");
Object.defineProperty(exports, "loadPackageDefinition", { enumerable: true, get: function () { return make_client_1.loadPackageDefinition; } });
Object.defineProperty(exports, "makeClientConstructor", { enumerable: true, get: function () { return make_client_1.makeClientConstructor; } });
Object.defineProperty(exports, "makeGenericClientConstructor", { enumerable: true, get: function () { return make_client_1.makeClientConstructor; } });
const metadata_1 = require("./metadata");
Object.defineProperty(exports, "Metadata", { enumerable: true, get: function () { return metadata_1.Metadata; } });
const server_1 = require("./server");
Object.defineProperty(exports, "Server", { enumerable: true, get: function () { return server_1.Server; } });
const server_credentials_1 = require("./server-credentials");
Object.defineProperty(exports, "ServerCredentials", { enumerable: true, get: function () { return server_credentials_1.ServerCredentials; } });
const status_builder_1 = require("./status-builder");
Object.defineProperty(exports, "StatusBuilder", { enumerable: true, get: function () { return status_builder_1.StatusBuilder; } });
/**** Client Credentials ****/
// Using assign only copies enumerable properties, which is what we want
exports.credentials = {
    /**
     * Combine a ChannelCredentials with any number of CallCredentials into a
     * single ChannelCredentials object.
     * @param channelCredentials The ChannelCredentials object.
     * @param callCredentials Any number of CallCredentials objects.
     * @return The resulting ChannelCredentials object.
     */
    combineChannelCredentials: (channelCredentials, ...callCredentials) => {
        return callCredentials.reduce((acc, other) => acc.compose(other), channelCredentials);
    },
    /**
     * Combine any number of CallCredentials into a single CallCredentials
     * object.
     * @param first The first CallCredentials object.
     * @param additional Any number of additional CallCredentials objects.
     * @return The resulting CallCredentials object.
     */
    combineCallCredentials: (first, ...additional) => {
        return additional.reduce((acc, other) => acc.compose(other), first);
    },
    // from channel-credentials.ts
    createInsecure: channel_credentials_1.ChannelCredentials.createInsecure,
    createSsl: channel_credentials_1.ChannelCredentials.createSsl,
    createFromSecureContext: channel_credentials_1.ChannelCredentials.createFromSecureContext,
    // from call-credentials.ts
    createFromMetadataGenerator: call_credentials_1.CallCredentials.createFromMetadataGenerator,
    createFromGoogleCredential: call_credentials_1.CallCredentials.createFromGoogleCredential,
    createEmpty: call_credentials_1.CallCredentials.createEmpty,
};
/**
 * Close a Client object.
 * @param client The client to close.
 */
const closeClient = (client) => client.close();
exports.closeClient = closeClient;
const waitForClientReady = (client, deadline, callback) => client.waitForReady(deadline, callback);
exports.waitForClientReady = waitForClientReady;
/* eslint-enable @typescript-eslint/no-explicit-any */
/**** Unimplemented function stubs ****/
/* eslint-disable @typescript-eslint/no-explicit-any */
const loadObject = (value, options) => {
    throw new Error('Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead');
};
exports.loadObject = loadObject;
const load = (filename, format, options) => {
    throw new Error('Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead');
};
exports.load = load;
const setLogger = (logger) => {
    logging.setLogger(logger);
};
exports.setLogger = setLogger;
const setLogVerbosity = (verbosity) => {
    logging.setLoggerVerbosity(verbosity);
};
exports.setLogVerbosity = setLogVerbosity;
const getClientChannel = (client) => {
    return client_1.Client.prototype.getChannel.call(client);
};
exports.getClientChannel = getClientChannel;
var client_interceptors_1 = require("./client-interceptors");
Object.defineProperty(exports, "ListenerBuilder", { enumerable: true, get: function () { return client_interceptors_1.ListenerBuilder; } });
Object.defineProperty(exports, "RequesterBuilder", { enumerable: true, get: function () { return client_interceptors_1.RequesterBuilder; } });
Object.defineProperty(exports, "InterceptingCall", { enumerable: true, get: function () { return client_interceptors_1.InterceptingCall; } });
Object.defineProperty(exports, "InterceptorConfigurationError", { enumerable: true, get: function () { return client_interceptors_1.InterceptorConfigurationError; } });
var channelz_1 = require("./channelz");
Object.defineProperty(exports, "getChannelzServiceDefinition", { enumerable: true, get: function () { return channelz_1.getChannelzServiceDefinition; } });
Object.defineProperty(exports, "getChannelzHandlers", { enumerable: true, get: function () { return channelz_1.getChannelzHandlers; } });
var admin_1 = require("./admin");
Object.defineProperty(exports, "addAdminServicesToServer", { enumerable: true, get: function () { return admin_1.addAdminServicesToServer; } });
var server_interceptors_1 = require("./server-interceptors");
Object.defineProperty(exports, "ServerListenerBuilder", { enumerable: true, get: function () { return server_interceptors_1.ServerListenerBuilder; } });
Object.defineProperty(exports, "ResponderBuilder", { enumerable: true, get: function () { return server_interceptors_1.ResponderBuilder; } });
Object.defineProperty(exports, "ServerInterceptingCall", { enumerable: true, get: function () { return server_interceptors_1.ServerInterceptingCall; } });
var orca_1 = require("./orca");
Object.defineProperty(exports, "ServerMetricRecorder", { enumerable: true, get: function () { return orca_1.ServerMetricRecorder; } });
const experimental = require("./experimental");
exports.experimental = experimental;
const resolver_dns = require("./resolver-dns");
const resolver_uds = require("./resolver-uds");
const resolver_ip = require("./resolver-ip");
const load_balancer_pick_first = require("./load-balancer-pick-first");
const load_balancer_round_robin = require("./load-balancer-round-robin");
const load_balancer_outlier_detection = require("./load-balancer-outlier-detection");
const load_balancer_weighted_round_robin = require("./load-balancer-weighted-round-robin");
const channelz = require("./channelz");
(() => {
    resolver_dns.setup();
    resolver_uds.setup();
    resolver_ip.setup();
    load_balancer_pick_first.setup();
    load_balancer_round_robin.setup();
    load_balancer_outlier_detection.setup();
    load_balancer_weighted_round_robin.setup();
    channelz.setup();
})();
//# sourceMappingURL=index.js.map