"use strict";
/*
 * Copyright 2021 gRPC authors.
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
exports.registerChannelzSocket = exports.registerChannelzServer = exports.registerChannelzSubchannel = exports.registerChannelzChannel = exports.ChannelzCallTrackerStub = exports.ChannelzCallTracker = exports.ChannelzChildrenTrackerStub = exports.ChannelzChildrenTracker = exports.ChannelzTrace = exports.ChannelzTraceStub = void 0;
exports.unregisterChannelzRef = unregisterChannelzRef;
exports.getChannelzHandlers = getChannelzHandlers;
exports.getChannelzServiceDefinition = getChannelzServiceDefinition;
exports.setup = setup;
const net_1 = require("net");
const ordered_map_1 = require("@js-sdsl/ordered-map");
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const subchannel_address_1 = require("./subchannel-address");
const admin_1 = require("./admin");
const make_client_1 = require("./make-client");
function channelRefToMessage(ref) {
    return {
        channel_id: ref.id,
        name: ref.name,
    };
}
function subchannelRefToMessage(ref) {
    return {
        subchannel_id: ref.id,
        name: ref.name,
    };
}
function serverRefToMessage(ref) {
    return {
        server_id: ref.id,
    };
}
function socketRefToMessage(ref) {
    return {
        socket_id: ref.id,
        name: ref.name,
    };
}
/**
 * The loose upper bound on the number of events that should be retained in a
 * trace. This may be exceeded by up to a factor of 2. Arbitrarily chosen as a
 * number that should be large enough to contain the recent relevant
 * information, but small enough to not use excessive memory.
 */
const TARGET_RETAINED_TRACES = 32;
/**
 * Default number of sockets/servers/channels/subchannels to return
 */
const DEFAULT_MAX_RESULTS = 100;
class ChannelzTraceStub {
    constructor() {
        this.events = [];
        this.creationTimestamp = new Date();
        this.eventsLogged = 0;
    }
    addTrace() { }
    getTraceMessage() {
        return {
            creation_timestamp: dateToProtoTimestamp(this.creationTimestamp),
            num_events_logged: this.eventsLogged,
            events: [],
        };
    }
}
exports.ChannelzTraceStub = ChannelzTraceStub;
class ChannelzTrace {
    constructor() {
        this.events = [];
        this.eventsLogged = 0;
        this.creationTimestamp = new Date();
    }
    addTrace(severity, description, child) {
        const timestamp = new Date();
        this.events.push({
            description: description,
            severity: severity,
            timestamp: timestamp,
            childChannel: (child === null || child === void 0 ? void 0 : child.kind) === 'channel' ? child : undefined,
            childSubchannel: (child === null || child === void 0 ? void 0 : child.kind) === 'subchannel' ? child : undefined,
        });
        // Whenever the trace array gets too large, discard the first half
        if (this.events.length >= TARGET_RETAINED_TRACES * 2) {
            this.events = this.events.slice(TARGET_RETAINED_TRACES);
        }
        this.eventsLogged += 1;
    }
    getTraceMessage() {
        return {
            creation_timestamp: dateToProtoTimestamp(this.creationTimestamp),
            num_events_logged: this.eventsLogged,
            events: this.events.map(event => {
                return {
                    description: event.description,
                    severity: event.severity,
                    timestamp: dateToProtoTimestamp(event.timestamp),
                    channel_ref: event.childChannel
                        ? channelRefToMessage(event.childChannel)
                        : null,
                    subchannel_ref: event.childSubchannel
                        ? subchannelRefToMessage(event.childSubchannel)
                        : null,
                };
            }),
        };
    }
}
exports.ChannelzTrace = ChannelzTrace;
class ChannelzChildrenTracker {
    constructor() {
        this.channelChildren = new ordered_map_1.OrderedMap();
        this.subchannelChildren = new ordered_map_1.OrderedMap();
        this.socketChildren = new ordered_map_1.OrderedMap();
        this.trackerMap = {
            ["channel" /* EntityTypes.channel */]: this.channelChildren,
            ["subchannel" /* EntityTypes.subchannel */]: this.subchannelChildren,
            ["socket" /* EntityTypes.socket */]: this.socketChildren,
        };
    }
    refChild(child) {
        const tracker = this.trackerMap[child.kind];
        const trackedChild = tracker.find(child.id);
        if (trackedChild.equals(tracker.end())) {
            tracker.setElement(child.id, {
                ref: child,
                count: 1,
            }, trackedChild);
        }
        else {
            trackedChild.pointer[1].count += 1;
        }
    }
    unrefChild(child) {
        const tracker = this.trackerMap[child.kind];
        const trackedChild = tracker.getElementByKey(child.id);
        if (trackedChild !== undefined) {
            trackedChild.count -= 1;
            if (trackedChild.count === 0) {
                tracker.eraseElementByKey(child.id);
            }
        }
    }
    getChildLists() {
        return {
            channels: this.channelChildren,
            subchannels: this.subchannelChildren,
            sockets: this.socketChildren,
        };
    }
}
exports.ChannelzChildrenTracker = ChannelzChildrenTracker;
class ChannelzChildrenTrackerStub extends ChannelzChildrenTracker {
    refChild() { }
    unrefChild() { }
}
exports.ChannelzChildrenTrackerStub = ChannelzChildrenTrackerStub;
class ChannelzCallTracker {
    constructor() {
        this.callsStarted = 0;
        this.callsSucceeded = 0;
        this.callsFailed = 0;
        this.lastCallStartedTimestamp = null;
    }
    addCallStarted() {
        this.callsStarted += 1;
        this.lastCallStartedTimestamp = new Date();
    }
    addCallSucceeded() {
        this.callsSucceeded += 1;
    }
    addCallFailed() {
        this.callsFailed += 1;
    }
}
exports.ChannelzCallTracker = ChannelzCallTracker;
class ChannelzCallTrackerStub extends ChannelzCallTracker {
    addCallStarted() { }
    addCallSucceeded() { }
    addCallFailed() { }
}
exports.ChannelzCallTrackerStub = ChannelzCallTrackerStub;
const entityMaps = {
    ["channel" /* EntityTypes.channel */]: new ordered_map_1.OrderedMap(),
    ["subchannel" /* EntityTypes.subchannel */]: new ordered_map_1.OrderedMap(),
    ["server" /* EntityTypes.server */]: new ordered_map_1.OrderedMap(),
    ["socket" /* EntityTypes.socket */]: new ordered_map_1.OrderedMap(),
};
const generateRegisterFn = (kind) => {
    let nextId = 1;
    function getNextId() {
        return nextId++;
    }
    const entityMap = entityMaps[kind];
    return (name, getInfo, channelzEnabled) => {
        const id = getNextId();
        const ref = { id, name, kind };
        if (channelzEnabled) {
            entityMap.setElement(id, { ref, getInfo });
        }
        return ref;
    };
};
exports.registerChannelzChannel = generateRegisterFn("channel" /* EntityTypes.channel */);
exports.registerChannelzSubchannel = generateRegisterFn("subchannel" /* EntityTypes.subchannel */);
exports.registerChannelzServer = generateRegisterFn("server" /* EntityTypes.server */);
exports.registerChannelzSocket = generateRegisterFn("socket" /* EntityTypes.socket */);
function unregisterChannelzRef(ref) {
    entityMaps[ref.kind].eraseElementByKey(ref.id);
}
/**
 * Parse a single section of an IPv6 address as two bytes
 * @param addressSection A hexadecimal string of length up to 4
 * @returns The pair of bytes representing this address section
 */
function parseIPv6Section(addressSection) {
    const numberValue = Number.parseInt(addressSection, 16);
    return [(numberValue / 256) | 0, numberValue % 256];
}
/**
 * Parse a chunk of an IPv6 address string to some number of bytes
 * @param addressChunk Some number of segments of up to 4 hexadecimal
 *   characters each, joined by colons.
 * @returns The list of bytes representing this address chunk
 */
function parseIPv6Chunk(addressChunk) {
    if (addressChunk === '') {
        return [];
    }
    const bytePairs = addressChunk
        .split(':')
        .map(section => parseIPv6Section(section));
    const result = [];
    return result.concat(...bytePairs);
}
function isIPv6MappedIPv4(ipAddress) {
    return (0, net_1.isIPv6)(ipAddress) && ipAddress.toLowerCase().startsWith('::ffff:') && (0, net_1.isIPv4)(ipAddress.substring(7));
}
/**
 * Prerequisite: isIPv4(ipAddress)
 * @param ipAddress
 * @returns
 */
function ipv4AddressStringToBuffer(ipAddress) {
    return Buffer.from(Uint8Array.from(ipAddress.split('.').map(segment => Number.parseInt(segment))));
}
/**
 * Converts an IPv4 or IPv6 address from string representation to binary
 * representation
 * @param ipAddress an IP address in standard IPv4 or IPv6 text format
 * @returns
 */
function ipAddressStringToBuffer(ipAddress) {
    if ((0, net_1.isIPv4)(ipAddress)) {
        return ipv4AddressStringToBuffer(ipAddress);
    }
    else if (isIPv6MappedIPv4(ipAddress)) {
        return ipv4AddressStringToBuffer(ipAddress.substring(7));
    }
    else if ((0, net_1.isIPv6)(ipAddress)) {
        let leftSection;
        let rightSection;
        const doubleColonIndex = ipAddress.indexOf('::');
        if (doubleColonIndex === -1) {
            leftSection = ipAddress;
            rightSection = '';
        }
        else {
            leftSection = ipAddress.substring(0, doubleColonIndex);
            rightSection = ipAddress.substring(doubleColonIndex + 2);
        }
        const leftBuffer = Buffer.from(parseIPv6Chunk(leftSection));
        const rightBuffer = Buffer.from(parseIPv6Chunk(rightSection));
        const middleBuffer = Buffer.alloc(16 - leftBuffer.length - rightBuffer.length, 0);
        return Buffer.concat([leftBuffer, middleBuffer, rightBuffer]);
    }
    else {
        return null;
    }
}
function connectivityStateToMessage(state) {
    switch (state) {
        case connectivity_state_1.ConnectivityState.CONNECTING:
            return {
                state: 'CONNECTING',
            };
        case connectivity_state_1.ConnectivityState.IDLE:
            return {
                state: 'IDLE',
            };
        case connectivity_state_1.ConnectivityState.READY:
            return {
                state: 'READY',
            };
        case connectivity_state_1.ConnectivityState.SHUTDOWN:
            return {
                state: 'SHUTDOWN',
            };
        case connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE:
            return {
                state: 'TRANSIENT_FAILURE',
            };
        default:
            return {
                state: 'UNKNOWN',
            };
    }
}
function dateToProtoTimestamp(date) {
    if (!date) {
        return null;
    }
    const millisSinceEpoch = date.getTime();
    return {
        seconds: (millisSinceEpoch / 1000) | 0,
        nanos: (millisSinceEpoch % 1000) * 1000000,
    };
}
function getChannelMessage(channelEntry) {
    const resolvedInfo = channelEntry.getInfo();
    const channelRef = [];
    const subchannelRef = [];
    resolvedInfo.children.channels.forEach(el => {
        channelRef.push(channelRefToMessage(el[1].ref));
    });
    resolvedInfo.children.subchannels.forEach(el => {
        subchannelRef.push(subchannelRefToMessage(el[1].ref));
    });
    return {
        ref: channelRefToMessage(channelEntry.ref),
        data: {
            target: resolvedInfo.target,
            state: connectivityStateToMessage(resolvedInfo.state),
            calls_started: resolvedInfo.callTracker.callsStarted,
            calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
            calls_failed: resolvedInfo.callTracker.callsFailed,
            last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
            trace: resolvedInfo.trace.getTraceMessage(),
        },
        channel_ref: channelRef,
        subchannel_ref: subchannelRef,
    };
}
function GetChannel(call, callback) {
    const channelId = parseInt(call.request.channel_id, 10);
    const channelEntry = entityMaps["channel" /* EntityTypes.channel */].getElementByKey(channelId);
    if (channelEntry === undefined) {
        callback({
            code: constants_1.Status.NOT_FOUND,
            details: 'No channel data found for id ' + channelId,
        });
        return;
    }
    callback(null, { channel: getChannelMessage(channelEntry) });
}
function GetTopChannels(call, callback) {
    const maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    const resultList = [];
    const startId = parseInt(call.request.start_channel_id, 10);
    const channelEntries = entityMaps["channel" /* EntityTypes.channel */];
    let i;
    for (i = channelEntries.lowerBound(startId); !i.equals(channelEntries.end()) && resultList.length < maxResults; i = i.next()) {
        resultList.push(getChannelMessage(i.pointer[1]));
    }
    callback(null, {
        channel: resultList,
        end: i.equals(channelEntries.end()),
    });
}
function getServerMessage(serverEntry) {
    const resolvedInfo = serverEntry.getInfo();
    const listenSocket = [];
    resolvedInfo.listenerChildren.sockets.forEach(el => {
        listenSocket.push(socketRefToMessage(el[1].ref));
    });
    return {
        ref: serverRefToMessage(serverEntry.ref),
        data: {
            calls_started: resolvedInfo.callTracker.callsStarted,
            calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
            calls_failed: resolvedInfo.callTracker.callsFailed,
            last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
            trace: resolvedInfo.trace.getTraceMessage(),
        },
        listen_socket: listenSocket,
    };
}
function GetServer(call, callback) {
    const serverId = parseInt(call.request.server_id, 10);
    const serverEntries = entityMaps["server" /* EntityTypes.server */];
    const serverEntry = serverEntries.getElementByKey(serverId);
    if (serverEntry === undefined) {
        callback({
            code: constants_1.Status.NOT_FOUND,
            details: 'No server data found for id ' + serverId,
        });
        return;
    }
    callback(null, { server: getServerMessage(serverEntry) });
}
function GetServers(call, callback) {
    const maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    const startId = parseInt(call.request.start_server_id, 10);
    const serverEntries = entityMaps["server" /* EntityTypes.server */];
    const resultList = [];
    let i;
    for (i = serverEntries.lowerBound(startId); !i.equals(serverEntries.end()) && resultList.length < maxResults; i = i.next()) {
        resultList.push(getServerMessage(i.pointer[1]));
    }
    callback(null, {
        server: resultList,
        end: i.equals(serverEntries.end()),
    });
}
function GetSubchannel(call, callback) {
    const subchannelId = parseInt(call.request.subchannel_id, 10);
    const subchannelEntry = entityMaps["subchannel" /* EntityTypes.subchannel */].getElementByKey(subchannelId);
    if (subchannelEntry === undefined) {
        callback({
            code: constants_1.Status.NOT_FOUND,
            details: 'No subchannel data found for id ' + subchannelId,
        });
        return;
    }
    const resolvedInfo = subchannelEntry.getInfo();
    const listenSocket = [];
    resolvedInfo.children.sockets.forEach(el => {
        listenSocket.push(socketRefToMessage(el[1].ref));
    });
    const subchannelMessage = {
        ref: subchannelRefToMessage(subchannelEntry.ref),
        data: {
            target: resolvedInfo.target,
            state: connectivityStateToMessage(resolvedInfo.state),
            calls_started: resolvedInfo.callTracker.callsStarted,
            calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
            calls_failed: resolvedInfo.callTracker.callsFailed,
            last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
            trace: resolvedInfo.trace.getTraceMessage(),
        },
        socket_ref: listenSocket,
    };
    callback(null, { subchannel: subchannelMessage });
}
function subchannelAddressToAddressMessage(subchannelAddress) {
    var _a;
    if ((0, subchannel_address_1.isTcpSubchannelAddress)(subchannelAddress)) {
        return {
            address: 'tcpip_address',
            tcpip_address: {
                ip_address: (_a = ipAddressStringToBuffer(subchannelAddress.host)) !== null && _a !== void 0 ? _a : undefined,
                port: subchannelAddress.port,
            },
        };
    }
    else {
        return {
            address: 'uds_address',
            uds_address: {
                filename: subchannelAddress.path,
            },
        };
    }
}
function GetSocket(call, callback) {
    var _a, _b, _c, _d, _e;
    const socketId = parseInt(call.request.socket_id, 10);
    const socketEntry = entityMaps["socket" /* EntityTypes.socket */].getElementByKey(socketId);
    if (socketEntry === undefined) {
        callback({
            code: constants_1.Status.NOT_FOUND,
            details: 'No socket data found for id ' + socketId,
        });
        return;
    }
    const resolvedInfo = socketEntry.getInfo();
    const securityMessage = resolvedInfo.security
        ? {
            model: 'tls',
            tls: {
                cipher_suite: resolvedInfo.security.cipherSuiteStandardName
                    ? 'standard_name'
                    : 'other_name',
                standard_name: (_a = resolvedInfo.security.cipherSuiteStandardName) !== null && _a !== void 0 ? _a : undefined,
                other_name: (_b = resolvedInfo.security.cipherSuiteOtherName) !== null && _b !== void 0 ? _b : undefined,
                local_certificate: (_c = resolvedInfo.security.localCertificate) !== null && _c !== void 0 ? _c : undefined,
                remote_certificate: (_d = resolvedInfo.security.remoteCertificate) !== null && _d !== void 0 ? _d : undefined,
            },
        }
        : null;
    const socketMessage = {
        ref: socketRefToMessage(socketEntry.ref),
        local: resolvedInfo.localAddress
            ? subchannelAddressToAddressMessage(resolvedInfo.localAddress)
            : null,
        remote: resolvedInfo.remoteAddress
            ? subchannelAddressToAddressMessage(resolvedInfo.remoteAddress)
            : null,
        remote_name: (_e = resolvedInfo.remoteName) !== null && _e !== void 0 ? _e : undefined,
        security: securityMessage,
        data: {
            keep_alives_sent: resolvedInfo.keepAlivesSent,
            streams_started: resolvedInfo.streamsStarted,
            streams_succeeded: resolvedInfo.streamsSucceeded,
            streams_failed: resolvedInfo.streamsFailed,
            last_local_stream_created_timestamp: dateToProtoTimestamp(resolvedInfo.lastLocalStreamCreatedTimestamp),
            last_remote_stream_created_timestamp: dateToProtoTimestamp(resolvedInfo.lastRemoteStreamCreatedTimestamp),
            messages_received: resolvedInfo.messagesReceived,
            messages_sent: resolvedInfo.messagesSent,
            last_message_received_timestamp: dateToProtoTimestamp(resolvedInfo.lastMessageReceivedTimestamp),
            last_message_sent_timestamp: dateToProtoTimestamp(resolvedInfo.lastMessageSentTimestamp),
            local_flow_control_window: resolvedInfo.localFlowControlWindow
                ? { value: resolvedInfo.localFlowControlWindow }
                : null,
            remote_flow_control_window: resolvedInfo.remoteFlowControlWindow
                ? { value: resolvedInfo.remoteFlowControlWindow }
                : null,
        },
    };
    callback(null, { socket: socketMessage });
}
function GetServerSockets(call, callback) {
    const serverId = parseInt(call.request.server_id, 10);
    const serverEntry = entityMaps["server" /* EntityTypes.server */].getElementByKey(serverId);
    if (serverEntry === undefined) {
        callback({
            code: constants_1.Status.NOT_FOUND,
            details: 'No server data found for id ' + serverId,
        });
        return;
    }
    const startId = parseInt(call.request.start_socket_id, 10);
    const maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    const resolvedInfo = serverEntry.getInfo();
    // If we wanted to include listener sockets in the result, this line would
    // instead say
    // const allSockets = resolvedInfo.listenerChildren.sockets.concat(resolvedInfo.sessionChildren.sockets).sort((ref1, ref2) => ref1.id - ref2.id);
    const allSockets = resolvedInfo.sessionChildren.sockets;
    const resultList = [];
    let i;
    for (i = allSockets.lowerBound(startId); !i.equals(allSockets.end()) && resultList.length < maxResults; i = i.next()) {
        resultList.push(socketRefToMessage(i.pointer[1].ref));
    }
    callback(null, {
        socket_ref: resultList,
        end: i.equals(allSockets.end()),
    });
}
function getChannelzHandlers() {
    return {
        GetChannel,
        GetTopChannels,
        GetServer,
        GetServers,
        GetSubchannel,
        GetSocket,
        GetServerSockets,
    };
}
let loadedChannelzDefinition = null;
function getChannelzServiceDefinition() {
    if (loadedChannelzDefinition) {
        return loadedChannelzDefinition;
    }
    /* The purpose of this complexity is to avoid loading @grpc/proto-loader at
     * runtime for users who will not use/enable channelz. */
    const loaderLoadSync = require('@grpc/proto-loader')
        .loadSync;
    const loadedProto = loaderLoadSync('channelz.proto', {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [`${__dirname}/../../proto`],
    });
    const channelzGrpcObject = (0, make_client_1.loadPackageDefinition)(loadedProto);
    loadedChannelzDefinition =
        channelzGrpcObject.grpc.channelz.v1.Channelz.service;
    return loadedChannelzDefinition;
}
function setup() {
    (0, admin_1.registerAdminService)(getChannelzServiceDefinition, getChannelzHandlers);
}
//# sourceMappingURL=channelz.js.map