import { OrderedMap } from '@js-sdsl/ordered-map';
import { ConnectivityState } from './connectivity-state';
import { ChannelTrace } from './generated/grpc/channelz/v1/ChannelTrace';
import { SubchannelAddress } from './subchannel-address';
import { ChannelzDefinition, ChannelzHandlers } from './generated/grpc/channelz/v1/Channelz';
export type TraceSeverity = 'CT_UNKNOWN' | 'CT_INFO' | 'CT_WARNING' | 'CT_ERROR';
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
interface TraceEvent {
    description: string;
    severity: TraceSeverity;
    timestamp: Date;
    childChannel?: ChannelRef;
    childSubchannel?: SubchannelRef;
}
export declare class ChannelzTraceStub {
    readonly events: TraceEvent[];
    readonly creationTimestamp: Date;
    readonly eventsLogged = 0;
    addTrace(): void;
    getTraceMessage(): ChannelTrace;
}
export declare class ChannelzTrace {
    events: TraceEvent[];
    creationTimestamp: Date;
    eventsLogged: number;
    constructor();
    addTrace(severity: TraceSeverity, description: string, child?: ChannelRef | SubchannelRef): void;
    getTraceMessage(): ChannelTrace;
}
export declare class ChannelzChildrenTracker {
    private channelChildren;
    private subchannelChildren;
    private socketChildren;
    private trackerMap;
    refChild(child: ChannelRef | SubchannelRef | SocketRef): void;
    unrefChild(child: ChannelRef | SubchannelRef | SocketRef): void;
    getChildLists(): ChannelzChildren;
}
export declare class ChannelzChildrenTrackerStub extends ChannelzChildrenTracker {
    refChild(): void;
    unrefChild(): void;
}
export declare class ChannelzCallTracker {
    callsStarted: number;
    callsSucceeded: number;
    callsFailed: number;
    lastCallStartedTimestamp: Date | null;
    addCallStarted(): void;
    addCallSucceeded(): void;
    addCallFailed(): void;
}
export declare class ChannelzCallTrackerStub extends ChannelzCallTracker {
    addCallStarted(): void;
    addCallSucceeded(): void;
    addCallFailed(): void;
}
export interface ChannelzChildren {
    channels: OrderedMap<number, {
        ref: ChannelRef;
        count: number;
    }>;
    subchannels: OrderedMap<number, {
        ref: SubchannelRef;
        count: number;
    }>;
    sockets: OrderedMap<number, {
        ref: SocketRef;
        count: number;
    }>;
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
export declare const enum EntityTypes {
    channel = "channel",
    subchannel = "subchannel",
    server = "server",
    socket = "socket"
}
export type RefByType<T extends EntityTypes> = T extends EntityTypes.channel ? ChannelRef : T extends EntityTypes.server ? ServerRef : T extends EntityTypes.socket ? SocketRef : T extends EntityTypes.subchannel ? SubchannelRef : never;
export type EntryByType<T extends EntityTypes> = T extends EntityTypes.channel ? ChannelEntry : T extends EntityTypes.server ? ServerEntry : T extends EntityTypes.socket ? SocketEntry : T extends EntityTypes.subchannel ? SubchannelEntry : never;
export type InfoByType<T extends EntityTypes> = T extends EntityTypes.channel ? ChannelInfo : T extends EntityTypes.subchannel ? SubchannelInfo : T extends EntityTypes.server ? ServerInfo : T extends EntityTypes.socket ? SocketInfo : never;
export declare const registerChannelzChannel: (name: string, getInfo: () => ChannelInfo, channelzEnabled: boolean) => ChannelRef;
export declare const registerChannelzSubchannel: (name: string, getInfo: () => ChannelInfo, channelzEnabled: boolean) => SubchannelRef;
export declare const registerChannelzServer: (name: string, getInfo: () => ServerInfo, channelzEnabled: boolean) => ServerRef;
export declare const registerChannelzSocket: (name: string, getInfo: () => SocketInfo, channelzEnabled: boolean) => SocketRef;
export declare function unregisterChannelzRef(ref: ChannelRef | SubchannelRef | ServerRef | SocketRef): void;
export declare function getChannelzHandlers(): ChannelzHandlers;
export declare function getChannelzServiceDefinition(): ChannelzDefinition;
export declare function setup(): void;
export {};
