import * as http2 from 'http2';
import { PartialStatusObject } from './call-interface';
import { SecureConnector } from './channel-credentials';
import { ChannelOptions } from './channel-options';
import { SocketRef } from './channelz';
import { SubchannelAddress } from './subchannel-address';
import { GrpcUri } from './uri-parser';
import { Http2SubchannelCall, SubchannelCall, SubchannelCallInterceptingListener } from './subchannel-call';
import { Metadata } from './metadata';
export interface CallEventTracker {
    addMessageSent(): void;
    addMessageReceived(): void;
    onCallEnd(status: PartialStatusObject): void;
    onStreamEnd(success: boolean): void;
}
export interface TransportDisconnectListener {
    (tooManyPings: boolean): void;
}
export interface Transport {
    getChannelzRef(): SocketRef;
    getPeerName(): string;
    getOptions(): ChannelOptions;
    createCall(metadata: Metadata, host: string, method: string, listener: SubchannelCallInterceptingListener, subchannelCallStatsTracker: Partial<CallEventTracker>): SubchannelCall;
    addDisconnectListener(listener: TransportDisconnectListener): void;
    shutdown(): void;
}
declare class Http2Transport implements Transport {
    private session;
    private options;
    /**
     * Name of the remote server, if it is not the same as the subchannel
     * address, i.e. if connecting through an HTTP CONNECT proxy.
     */
    private remoteName;
    /**
     * The amount of time in between sending pings
     */
    private readonly keepaliveTimeMs;
    /**
     * The amount of time to wait for an acknowledgement after sending a ping
     */
    private readonly keepaliveTimeoutMs;
    /**
     * Indicates whether keepalive pings should be sent without any active calls
     */
    private readonly keepaliveWithoutCalls;
    /**
     * Timer reference indicating when to send the next ping or when the most recent ping will be considered lost.
     */
    private keepaliveTimer;
    /**
     * Indicates that the keepalive timer ran out while there were no active
     * calls, and a ping should be sent the next time a call starts.
     */
    private pendingSendKeepalivePing;
    private userAgent;
    private activeCalls;
    private subchannelAddressString;
    private disconnectListeners;
    private disconnectHandled;
    private channelzRef;
    private readonly channelzEnabled;
    private streamTracker;
    private keepalivesSent;
    private messagesSent;
    private messagesReceived;
    private lastMessageSentTimestamp;
    private lastMessageReceivedTimestamp;
    constructor(session: http2.ClientHttp2Session, subchannelAddress: SubchannelAddress, options: ChannelOptions, 
    /**
     * Name of the remote server, if it is not the same as the subchannel
     * address, i.e. if connecting through an HTTP CONNECT proxy.
     */
    remoteName: string | null);
    private getChannelzInfo;
    private trace;
    private keepaliveTrace;
    private flowControlTrace;
    private internalsTrace;
    /**
     * Indicate to the owner of this object that this transport should no longer
     * be used. That happens if the connection drops, or if the server sends a
     * GOAWAY.
     * @param tooManyPings If true, this was triggered by a GOAWAY with data
     * indicating that the session was closed becaues the client sent too many
     * pings.
     * @returns
     */
    private reportDisconnectToOwner;
    /**
     * Handle connection drops, but not GOAWAYs.
     */
    private handleDisconnect;
    addDisconnectListener(listener: TransportDisconnectListener): void;
    private canSendPing;
    private maybeSendPing;
    /**
     * Starts the keepalive ping timer if appropriate. If the timer already ran
     * out while there were no active requests, instead send a ping immediately.
     * If the ping timer is already running or a ping is currently in flight,
     * instead do nothing and wait for them to resolve.
     */
    private maybeStartKeepalivePingTimer;
    /**
     * Clears whichever keepalive timeout is currently active, if any.
     */
    private clearKeepaliveTimeout;
    private removeActiveCall;
    private addActiveCall;
    createCall(metadata: Metadata, host: string, method: string, listener: SubchannelCallInterceptingListener, subchannelCallStatsTracker: Partial<CallEventTracker>): Http2SubchannelCall;
    getChannelzRef(): SocketRef;
    getPeerName(): string;
    getOptions(): ChannelOptions;
    shutdown(): void;
}
export interface SubchannelConnector {
    connect(address: SubchannelAddress, secureConnector: SecureConnector, options: ChannelOptions): Promise<Transport>;
    shutdown(): void;
}
export declare class Http2SubchannelConnector implements SubchannelConnector {
    private channelTarget;
    private session;
    private isShutdown;
    constructor(channelTarget: GrpcUri);
    private trace;
    private createSession;
    private tcpConnect;
    connect(address: SubchannelAddress, secureConnector: SecureConnector, options: ChannelOptions): Promise<Http2Transport>;
    shutdown(): void;
}
export {};
