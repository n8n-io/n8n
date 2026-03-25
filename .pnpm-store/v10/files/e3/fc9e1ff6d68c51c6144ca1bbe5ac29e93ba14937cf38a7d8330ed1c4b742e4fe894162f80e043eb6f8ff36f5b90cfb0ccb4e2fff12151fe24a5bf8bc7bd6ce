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

import { isIPv4, isIPv6 } from 'net';
import { OrderedMap, type OrderedMapIterator } from '@js-sdsl/ordered-map';
import { ConnectivityState } from './connectivity-state';
import { Status } from './constants';
import { Timestamp } from './generated/google/protobuf/Timestamp';
import { Channel as ChannelMessage } from './generated/grpc/channelz/v1/Channel';
import { ChannelConnectivityState__Output } from './generated/grpc/channelz/v1/ChannelConnectivityState';
import { ChannelRef as ChannelRefMessage } from './generated/grpc/channelz/v1/ChannelRef';
import { ChannelTrace } from './generated/grpc/channelz/v1/ChannelTrace';
import { GetChannelRequest__Output } from './generated/grpc/channelz/v1/GetChannelRequest';
import { GetChannelResponse } from './generated/grpc/channelz/v1/GetChannelResponse';
import { sendUnaryData, ServerUnaryCall } from './server-call';
import { ServerRef as ServerRefMessage } from './generated/grpc/channelz/v1/ServerRef';
import { SocketRef as SocketRefMessage } from './generated/grpc/channelz/v1/SocketRef';
import {
  isTcpSubchannelAddress,
  SubchannelAddress,
} from './subchannel-address';
import { SubchannelRef as SubchannelRefMessage } from './generated/grpc/channelz/v1/SubchannelRef';
import { GetServerRequest__Output } from './generated/grpc/channelz/v1/GetServerRequest';
import { GetServerResponse } from './generated/grpc/channelz/v1/GetServerResponse';
import { Server as ServerMessage } from './generated/grpc/channelz/v1/Server';
import { GetServersRequest__Output } from './generated/grpc/channelz/v1/GetServersRequest';
import { GetServersResponse } from './generated/grpc/channelz/v1/GetServersResponse';
import { GetTopChannelsRequest__Output } from './generated/grpc/channelz/v1/GetTopChannelsRequest';
import { GetTopChannelsResponse } from './generated/grpc/channelz/v1/GetTopChannelsResponse';
import { GetSubchannelRequest__Output } from './generated/grpc/channelz/v1/GetSubchannelRequest';
import { GetSubchannelResponse } from './generated/grpc/channelz/v1/GetSubchannelResponse';
import { Subchannel as SubchannelMessage } from './generated/grpc/channelz/v1/Subchannel';
import { GetSocketRequest__Output } from './generated/grpc/channelz/v1/GetSocketRequest';
import { GetSocketResponse } from './generated/grpc/channelz/v1/GetSocketResponse';
import { Socket as SocketMessage } from './generated/grpc/channelz/v1/Socket';
import { Address } from './generated/grpc/channelz/v1/Address';
import { Security } from './generated/grpc/channelz/v1/Security';
import { GetServerSocketsRequest__Output } from './generated/grpc/channelz/v1/GetServerSocketsRequest';
import { GetServerSocketsResponse } from './generated/grpc/channelz/v1/GetServerSocketsResponse';
import {
  ChannelzDefinition,
  ChannelzHandlers,
} from './generated/grpc/channelz/v1/Channelz';
import { ProtoGrpcType as ChannelzProtoGrpcType } from './generated/channelz';
import type { loadSync } from '@grpc/proto-loader';
import { registerAdminService } from './admin';
import { loadPackageDefinition } from './make-client';

export type TraceSeverity =
  | 'CT_UNKNOWN'
  | 'CT_INFO'
  | 'CT_WARNING'
  | 'CT_ERROR';

interface Ref {
  kind: EntityTypes;
  id: number;
  name: string;
}

export interface ChannelRef extends Ref {
  kind: EntityTypes.channel;
}

export interface SubchannelRef extends Ref {
  kind: EntityTypes.subchannel;
}

export interface ServerRef extends Ref {
  kind: EntityTypes.server;
}

export interface SocketRef extends Ref {
  kind: EntityTypes.socket;
}

function channelRefToMessage(ref: ChannelRef): ChannelRefMessage {
  return {
    channel_id: ref.id,
    name: ref.name,
  };
}

function subchannelRefToMessage(ref: SubchannelRef): SubchannelRefMessage {
  return {
    subchannel_id: ref.id,
    name: ref.name,
  };
}

function serverRefToMessage(ref: ServerRef): ServerRefMessage {
  return {
    server_id: ref.id,
  };
}

function socketRefToMessage(ref: SocketRef): SocketRefMessage {
  return {
    socket_id: ref.id,
    name: ref.name,
  };
}

interface TraceEvent {
  description: string;
  severity: TraceSeverity;
  timestamp: Date;
  childChannel?: ChannelRef;
  childSubchannel?: SubchannelRef;
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

export class ChannelzTraceStub {
  readonly events: TraceEvent[] = [];
  readonly creationTimestamp: Date = new Date();
  readonly eventsLogged = 0;

  addTrace(): void {}
  getTraceMessage(): ChannelTrace {
    return {
      creation_timestamp: dateToProtoTimestamp(this.creationTimestamp),
      num_events_logged: this.eventsLogged,
      events: [],
    };
  }
}

export class ChannelzTrace {
  events: TraceEvent[] = [];
  creationTimestamp: Date;
  eventsLogged = 0;

  constructor() {
    this.creationTimestamp = new Date();
  }

  addTrace(
    severity: TraceSeverity,
    description: string,
    child?: ChannelRef | SubchannelRef
  ) {
    const timestamp = new Date();
    this.events.push({
      description: description,
      severity: severity,
      timestamp: timestamp,
      childChannel: child?.kind === 'channel' ? child : undefined,
      childSubchannel: child?.kind === 'subchannel' ? child : undefined,
    });
    // Whenever the trace array gets too large, discard the first half
    if (this.events.length >= TARGET_RETAINED_TRACES * 2) {
      this.events = this.events.slice(TARGET_RETAINED_TRACES);
    }
    this.eventsLogged += 1;
  }

  getTraceMessage(): ChannelTrace {
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

type RefOrderedMap = OrderedMap<
  number,
  { ref: { id: number; kind: EntityTypes; name: string }; count: number }
>;

export class ChannelzChildrenTracker {
  private channelChildren: RefOrderedMap = new OrderedMap();
  private subchannelChildren: RefOrderedMap = new OrderedMap();
  private socketChildren: RefOrderedMap = new OrderedMap();
  private trackerMap = {
    [EntityTypes.channel]: this.channelChildren,
    [EntityTypes.subchannel]: this.subchannelChildren,
    [EntityTypes.socket]: this.socketChildren,
  } as const;

  refChild(child: ChannelRef | SubchannelRef | SocketRef) {
    const tracker = this.trackerMap[child.kind];
    const trackedChild = tracker.find(child.id);

    if (trackedChild.equals(tracker.end())) {
      tracker.setElement(
        child.id,
        {
          ref: child,
          count: 1,
        },
        trackedChild
      );
    } else {
      trackedChild.pointer[1].count += 1;
    }
  }

  unrefChild(child: ChannelRef | SubchannelRef | SocketRef) {
    const tracker = this.trackerMap[child.kind];
    const trackedChild = tracker.getElementByKey(child.id);
    if (trackedChild !== undefined) {
      trackedChild.count -= 1;
      if (trackedChild.count === 0) {
        tracker.eraseElementByKey(child.id);
      }
    }
  }

  getChildLists(): ChannelzChildren {
    return {
      channels: this.channelChildren as ChannelzChildren['channels'],
      subchannels: this.subchannelChildren as ChannelzChildren['subchannels'],
      sockets: this.socketChildren as ChannelzChildren['sockets'],
    };
  }
}

export class ChannelzChildrenTrackerStub extends ChannelzChildrenTracker {
  override refChild(): void {}
  override unrefChild(): void {}
}

export class ChannelzCallTracker {
  callsStarted = 0;
  callsSucceeded = 0;
  callsFailed = 0;
  lastCallStartedTimestamp: Date | null = null;

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

export class ChannelzCallTrackerStub extends ChannelzCallTracker {
  override addCallStarted() {}
  override addCallSucceeded() {}
  override addCallFailed() {}
}

export interface ChannelzChildren {
  channels: OrderedMap<number, { ref: ChannelRef; count: number }>;
  subchannels: OrderedMap<number, { ref: SubchannelRef; count: number }>;
  sockets: OrderedMap<number, { ref: SocketRef; count: number }>;
}

export interface ChannelInfo {
  target: string;
  state: ConnectivityState;
  trace: ChannelzTrace | ChannelzTraceStub;
  callTracker: ChannelzCallTracker | ChannelzCallTrackerStub;
  children: ChannelzChildren;
}

export type SubchannelInfo = ChannelInfo;

export interface ServerInfo {
  trace: ChannelzTrace;
  callTracker: ChannelzCallTracker;
  listenerChildren: ChannelzChildren;
  sessionChildren: ChannelzChildren;
}

export interface TlsInfo {
  cipherSuiteStandardName: string | null;
  cipherSuiteOtherName: string | null;
  localCertificate: Buffer | null;
  remoteCertificate: Buffer | null;
}

export interface SocketInfo {
  localAddress: SubchannelAddress | null;
  remoteAddress: SubchannelAddress | null;
  security: TlsInfo | null;
  remoteName: string | null;
  streamsStarted: number;
  streamsSucceeded: number;
  streamsFailed: number;
  messagesSent: number;
  messagesReceived: number;
  keepAlivesSent: number;
  lastLocalStreamCreatedTimestamp: Date | null;
  lastRemoteStreamCreatedTimestamp: Date | null;
  lastMessageSentTimestamp: Date | null;
  lastMessageReceivedTimestamp: Date | null;
  localFlowControlWindow: number | null;
  remoteFlowControlWindow: number | null;
}

interface ChannelEntry {
  ref: ChannelRef;
  getInfo(): ChannelInfo;
}

interface SubchannelEntry {
  ref: SubchannelRef;
  getInfo(): SubchannelInfo;
}

interface ServerEntry {
  ref: ServerRef;
  getInfo(): ServerInfo;
}

interface SocketEntry {
  ref: SocketRef;
  getInfo(): SocketInfo;
}

export const enum EntityTypes {
  channel = 'channel',
  subchannel = 'subchannel',
  server = 'server',
  socket = 'socket',
}

type EntryOrderedMap = OrderedMap<number, { ref: Ref; getInfo: () => any }>;

const entityMaps = {
  [EntityTypes.channel]: new OrderedMap<number, ChannelEntry>(),
  [EntityTypes.subchannel]: new OrderedMap<number, SubchannelEntry>(),
  [EntityTypes.server]: new OrderedMap<number, ServerEntry>(),
  [EntityTypes.socket]: new OrderedMap<number, SocketEntry>(),
} as const;

export type RefByType<T extends EntityTypes> = T extends EntityTypes.channel
  ? ChannelRef
  : T extends EntityTypes.server
  ? ServerRef
  : T extends EntityTypes.socket
  ? SocketRef
  : T extends EntityTypes.subchannel
  ? SubchannelRef
  : never;

export type EntryByType<T extends EntityTypes> = T extends EntityTypes.channel
  ? ChannelEntry
  : T extends EntityTypes.server
  ? ServerEntry
  : T extends EntityTypes.socket
  ? SocketEntry
  : T extends EntityTypes.subchannel
  ? SubchannelEntry
  : never;

export type InfoByType<T extends EntityTypes> = T extends EntityTypes.channel
  ? ChannelInfo
  : T extends EntityTypes.subchannel
  ? SubchannelInfo
  : T extends EntityTypes.server
  ? ServerInfo
  : T extends EntityTypes.socket
  ? SocketInfo
  : never;

const generateRegisterFn = <R extends EntityTypes>(kind: R) => {
  let nextId = 1;
  function getNextId(): number {
    return nextId++;
  }

  const entityMap: EntryOrderedMap = entityMaps[kind];

  return (
    name: string,
    getInfo: () => InfoByType<R>,
    channelzEnabled: boolean
  ): RefByType<R> => {
    const id = getNextId();
    const ref = { id, name, kind } as RefByType<R>;
    if (channelzEnabled) {
      entityMap.setElement(id, { ref, getInfo });
    }
    return ref;
  };
};

export const registerChannelzChannel = generateRegisterFn(EntityTypes.channel);
export const registerChannelzSubchannel = generateRegisterFn(
  EntityTypes.subchannel
);
export const registerChannelzServer = generateRegisterFn(EntityTypes.server);
export const registerChannelzSocket = generateRegisterFn(EntityTypes.socket);

export function unregisterChannelzRef(
  ref: ChannelRef | SubchannelRef | ServerRef | SocketRef
) {
  entityMaps[ref.kind].eraseElementByKey(ref.id);
}

/**
 * Parse a single section of an IPv6 address as two bytes
 * @param addressSection A hexadecimal string of length up to 4
 * @returns The pair of bytes representing this address section
 */
function parseIPv6Section(addressSection: string): [number, number] {
  const numberValue = Number.parseInt(addressSection, 16);
  return [(numberValue / 256) | 0, numberValue % 256];
}

/**
 * Parse a chunk of an IPv6 address string to some number of bytes
 * @param addressChunk Some number of segments of up to 4 hexadecimal
 *   characters each, joined by colons.
 * @returns The list of bytes representing this address chunk
 */
function parseIPv6Chunk(addressChunk: string): number[] {
  if (addressChunk === '') {
    return [];
  }
  const bytePairs = addressChunk
    .split(':')
    .map(section => parseIPv6Section(section));
  const result: number[] = [];
  return result.concat(...bytePairs);
}

function isIPv6MappedIPv4(ipAddress: string) {
  return isIPv6(ipAddress) && ipAddress.toLowerCase().startsWith('::ffff:') && isIPv4(ipAddress.substring(7));
}

/**
 * Prerequisite: isIPv4(ipAddress)
 * @param ipAddress
 * @returns
 */
function ipv4AddressStringToBuffer(ipAddress: string): Buffer {
  return Buffer.from(
    Uint8Array.from(
      ipAddress.split('.').map(segment => Number.parseInt(segment))
    )
  );
}

/**
 * Converts an IPv4 or IPv6 address from string representation to binary
 * representation
 * @param ipAddress an IP address in standard IPv4 or IPv6 text format
 * @returns
 */
function ipAddressStringToBuffer(ipAddress: string): Buffer | null {
  if (isIPv4(ipAddress)) {
    return ipv4AddressStringToBuffer(ipAddress);
  } else if (isIPv6MappedIPv4(ipAddress)) {
    return ipv4AddressStringToBuffer(ipAddress.substring(7));
  } else if (isIPv6(ipAddress)) {
    let leftSection: string;
    let rightSection: string;
    const doubleColonIndex = ipAddress.indexOf('::');
    if (doubleColonIndex === -1) {
      leftSection = ipAddress;
      rightSection = '';
    } else {
      leftSection = ipAddress.substring(0, doubleColonIndex);
      rightSection = ipAddress.substring(doubleColonIndex + 2);
    }
    const leftBuffer = Buffer.from(parseIPv6Chunk(leftSection));
    const rightBuffer = Buffer.from(parseIPv6Chunk(rightSection));
    const middleBuffer = Buffer.alloc(
      16 - leftBuffer.length - rightBuffer.length,
      0
    );
    return Buffer.concat([leftBuffer, middleBuffer, rightBuffer]);
  } else {
    return null;
  }
}

function connectivityStateToMessage(
  state: ConnectivityState
): ChannelConnectivityState__Output {
  switch (state) {
    case ConnectivityState.CONNECTING:
      return {
        state: 'CONNECTING',
      };
    case ConnectivityState.IDLE:
      return {
        state: 'IDLE',
      };
    case ConnectivityState.READY:
      return {
        state: 'READY',
      };
    case ConnectivityState.SHUTDOWN:
      return {
        state: 'SHUTDOWN',
      };
    case ConnectivityState.TRANSIENT_FAILURE:
      return {
        state: 'TRANSIENT_FAILURE',
      };
    default:
      return {
        state: 'UNKNOWN',
      };
  }
}

function dateToProtoTimestamp(date?: Date | null): Timestamp | null {
  if (!date) {
    return null;
  }
  const millisSinceEpoch = date.getTime();
  return {
    seconds: (millisSinceEpoch / 1000) | 0,
    nanos: (millisSinceEpoch % 1000) * 1_000_000,
  };
}

function getChannelMessage(channelEntry: ChannelEntry): ChannelMessage {
  const resolvedInfo = channelEntry.getInfo();
  const channelRef: ChannelRefMessage[] = [];
  const subchannelRef: SubchannelRefMessage[] = [];

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
      last_call_started_timestamp: dateToProtoTimestamp(
        resolvedInfo.callTracker.lastCallStartedTimestamp
      ),
      trace: resolvedInfo.trace.getTraceMessage(),
    },
    channel_ref: channelRef,
    subchannel_ref: subchannelRef,
  };
}

function GetChannel(
  call: ServerUnaryCall<GetChannelRequest__Output, GetChannelResponse>,
  callback: sendUnaryData<GetChannelResponse>
): void {
  const channelId = parseInt(call.request.channel_id, 10);
  const channelEntry =
    entityMaps[EntityTypes.channel].getElementByKey(channelId);
  if (channelEntry === undefined) {
    callback({
      code: Status.NOT_FOUND,
      details: 'No channel data found for id ' + channelId,
    });
    return;
  }
  callback(null, { channel: getChannelMessage(channelEntry) });
}

function GetTopChannels(
  call: ServerUnaryCall<GetTopChannelsRequest__Output, GetTopChannelsResponse>,
  callback: sendUnaryData<GetTopChannelsResponse>
): void {
  const maxResults =
    parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
  const resultList: ChannelMessage[] = [];
  const startId = parseInt(call.request.start_channel_id, 10);
  const channelEntries = entityMaps[EntityTypes.channel];

  let i: OrderedMapIterator<number, ChannelEntry>;
  for (
    i = channelEntries.lowerBound(startId);
    !i.equals(channelEntries.end()) && resultList.length < maxResults;
    i = i.next()
  ) {
    resultList.push(getChannelMessage(i.pointer[1]));
  }

  callback(null, {
    channel: resultList,
    end: i.equals(channelEntries.end()),
  });
}

function getServerMessage(serverEntry: ServerEntry): ServerMessage {
  const resolvedInfo = serverEntry.getInfo();
  const listenSocket: SocketRefMessage[] = [];

  resolvedInfo.listenerChildren.sockets.forEach(el => {
    listenSocket.push(socketRefToMessage(el[1].ref));
  });

  return {
    ref: serverRefToMessage(serverEntry.ref),
    data: {
      calls_started: resolvedInfo.callTracker.callsStarted,
      calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
      calls_failed: resolvedInfo.callTracker.callsFailed,
      last_call_started_timestamp: dateToProtoTimestamp(
        resolvedInfo.callTracker.lastCallStartedTimestamp
      ),
      trace: resolvedInfo.trace.getTraceMessage(),
    },
    listen_socket: listenSocket,
  };
}

function GetServer(
  call: ServerUnaryCall<GetServerRequest__Output, GetServerResponse>,
  callback: sendUnaryData<GetServerResponse>
): void {
  const serverId = parseInt(call.request.server_id, 10);
  const serverEntries = entityMaps[EntityTypes.server];
  const serverEntry = serverEntries.getElementByKey(serverId);
  if (serverEntry === undefined) {
    callback({
      code: Status.NOT_FOUND,
      details: 'No server data found for id ' + serverId,
    });
    return;
  }
  callback(null, { server: getServerMessage(serverEntry) });
}

function GetServers(
  call: ServerUnaryCall<GetServersRequest__Output, GetServersResponse>,
  callback: sendUnaryData<GetServersResponse>
): void {
  const maxResults =
    parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
  const startId = parseInt(call.request.start_server_id, 10);
  const serverEntries = entityMaps[EntityTypes.server];
  const resultList: ServerMessage[] = [];

  let i: OrderedMapIterator<number, ServerEntry>;
  for (
    i = serverEntries.lowerBound(startId);
    !i.equals(serverEntries.end()) && resultList.length < maxResults;
    i = i.next()
  ) {
    resultList.push(getServerMessage(i.pointer[1]));
  }

  callback(null, {
    server: resultList,
    end: i.equals(serverEntries.end()),
  });
}

function GetSubchannel(
  call: ServerUnaryCall<GetSubchannelRequest__Output, GetSubchannelResponse>,
  callback: sendUnaryData<GetSubchannelResponse>
): void {
  const subchannelId = parseInt(call.request.subchannel_id, 10);
  const subchannelEntry =
    entityMaps[EntityTypes.subchannel].getElementByKey(subchannelId);
  if (subchannelEntry === undefined) {
    callback({
      code: Status.NOT_FOUND,
      details: 'No subchannel data found for id ' + subchannelId,
    });
    return;
  }
  const resolvedInfo = subchannelEntry.getInfo();
  const listenSocket: SocketRefMessage[] = [];

  resolvedInfo.children.sockets.forEach(el => {
    listenSocket.push(socketRefToMessage(el[1].ref));
  });

  const subchannelMessage: SubchannelMessage = {
    ref: subchannelRefToMessage(subchannelEntry.ref),
    data: {
      target: resolvedInfo.target,
      state: connectivityStateToMessage(resolvedInfo.state),
      calls_started: resolvedInfo.callTracker.callsStarted,
      calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
      calls_failed: resolvedInfo.callTracker.callsFailed,
      last_call_started_timestamp: dateToProtoTimestamp(
        resolvedInfo.callTracker.lastCallStartedTimestamp
      ),
      trace: resolvedInfo.trace.getTraceMessage(),
    },
    socket_ref: listenSocket,
  };
  callback(null, { subchannel: subchannelMessage });
}

function subchannelAddressToAddressMessage(
  subchannelAddress: SubchannelAddress
): Address {
  if (isTcpSubchannelAddress(subchannelAddress)) {
    return {
      address: 'tcpip_address',
      tcpip_address: {
        ip_address:
          ipAddressStringToBuffer(subchannelAddress.host) ?? undefined,
        port: subchannelAddress.port,
      },
    };
  } else {
    return {
      address: 'uds_address',
      uds_address: {
        filename: subchannelAddress.path,
      },
    };
  }
}

function GetSocket(
  call: ServerUnaryCall<GetSocketRequest__Output, GetSocketResponse>,
  callback: sendUnaryData<GetSocketResponse>
): void {
  const socketId = parseInt(call.request.socket_id, 10);
  const socketEntry = entityMaps[EntityTypes.socket].getElementByKey(socketId);
  if (socketEntry === undefined) {
    callback({
      code: Status.NOT_FOUND,
      details: 'No socket data found for id ' + socketId,
    });
    return;
  }
  const resolvedInfo = socketEntry.getInfo();
  const securityMessage: Security | null = resolvedInfo.security
    ? {
        model: 'tls',
        tls: {
          cipher_suite: resolvedInfo.security.cipherSuiteStandardName
            ? 'standard_name'
            : 'other_name',
          standard_name:
            resolvedInfo.security.cipherSuiteStandardName ?? undefined,
          other_name: resolvedInfo.security.cipherSuiteOtherName ?? undefined,
          local_certificate:
            resolvedInfo.security.localCertificate ?? undefined,
          remote_certificate:
            resolvedInfo.security.remoteCertificate ?? undefined,
        },
      }
    : null;
  const socketMessage: SocketMessage = {
    ref: socketRefToMessage(socketEntry.ref),
    local: resolvedInfo.localAddress
      ? subchannelAddressToAddressMessage(resolvedInfo.localAddress)
      : null,
    remote: resolvedInfo.remoteAddress
      ? subchannelAddressToAddressMessage(resolvedInfo.remoteAddress)
      : null,
    remote_name: resolvedInfo.remoteName ?? undefined,
    security: securityMessage,
    data: {
      keep_alives_sent: resolvedInfo.keepAlivesSent,
      streams_started: resolvedInfo.streamsStarted,
      streams_succeeded: resolvedInfo.streamsSucceeded,
      streams_failed: resolvedInfo.streamsFailed,
      last_local_stream_created_timestamp: dateToProtoTimestamp(
        resolvedInfo.lastLocalStreamCreatedTimestamp
      ),
      last_remote_stream_created_timestamp: dateToProtoTimestamp(
        resolvedInfo.lastRemoteStreamCreatedTimestamp
      ),
      messages_received: resolvedInfo.messagesReceived,
      messages_sent: resolvedInfo.messagesSent,
      last_message_received_timestamp: dateToProtoTimestamp(
        resolvedInfo.lastMessageReceivedTimestamp
      ),
      last_message_sent_timestamp: dateToProtoTimestamp(
        resolvedInfo.lastMessageSentTimestamp
      ),
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

function GetServerSockets(
  call: ServerUnaryCall<
    GetServerSocketsRequest__Output,
    GetServerSocketsResponse
  >,
  callback: sendUnaryData<GetServerSocketsResponse>
): void {
  const serverId = parseInt(call.request.server_id, 10);
  const serverEntry = entityMaps[EntityTypes.server].getElementByKey(serverId);

  if (serverEntry === undefined) {
    callback({
      code: Status.NOT_FOUND,
      details: 'No server data found for id ' + serverId,
    });
    return;
  }

  const startId = parseInt(call.request.start_socket_id, 10);
  const maxResults =
    parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
  const resolvedInfo = serverEntry.getInfo();
  // If we wanted to include listener sockets in the result, this line would
  // instead say
  // const allSockets = resolvedInfo.listenerChildren.sockets.concat(resolvedInfo.sessionChildren.sockets).sort((ref1, ref2) => ref1.id - ref2.id);
  const allSockets = resolvedInfo.sessionChildren.sockets;
  const resultList: SocketRefMessage[] = [];

  let i: OrderedMapIterator<number, { ref: SocketRef }>;
  for (
    i = allSockets.lowerBound(startId);
    !i.equals(allSockets.end()) && resultList.length < maxResults;
    i = i.next()
  ) {
    resultList.push(socketRefToMessage(i.pointer[1].ref));
  }

  callback(null, {
    socket_ref: resultList,
    end: i.equals(allSockets.end()),
  });
}

export function getChannelzHandlers(): ChannelzHandlers {
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

let loadedChannelzDefinition: ChannelzDefinition | null = null;

export function getChannelzServiceDefinition(): ChannelzDefinition {
  if (loadedChannelzDefinition) {
    return loadedChannelzDefinition;
  }
  /* The purpose of this complexity is to avoid loading @grpc/proto-loader at
   * runtime for users who will not use/enable channelz. */
  const loaderLoadSync = require('@grpc/proto-loader')
    .loadSync as typeof loadSync;
  const loadedProto = loaderLoadSync('channelz.proto', {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [`${__dirname}/../../proto`],
  });
  const channelzGrpcObject = loadPackageDefinition(
    loadedProto
  ) as unknown as ChannelzProtoGrpcType;
  loadedChannelzDefinition =
    channelzGrpcObject.grpc.channelz.v1.Channelz.service;
  return loadedChannelzDefinition;
}

export function setup() {
  registerAdminService(getChannelzServiceDefinition, getChannelzHandlers);
}
