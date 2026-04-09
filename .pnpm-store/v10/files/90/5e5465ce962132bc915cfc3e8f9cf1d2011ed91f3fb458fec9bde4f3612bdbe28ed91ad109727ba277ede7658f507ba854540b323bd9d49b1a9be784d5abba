import { PartialStatusObject } from './call-interface';
import { ServerMethodDefinition } from './make-client';
import { Metadata } from './metadata';
import { ChannelOptions } from './channel-options';
import { Handler } from './server-call';
import { Deadline } from './deadline';
import * as http2 from 'http2';
import { CallEventTracker } from './transport';
import { AuthContext } from './auth-context';
import { PerRequestMetricRecorder } from './orca';
export interface ServerMetadataListener {
    (metadata: Metadata, next: (metadata: Metadata) => void): void;
}
export interface ServerMessageListener {
    (message: any, next: (message: any) => void): void;
}
export interface ServerHalfCloseListener {
    (next: () => void): void;
}
export interface ServerCancelListener {
    (): void;
}
export interface FullServerListener {
    onReceiveMetadata: ServerMetadataListener;
    onReceiveMessage: ServerMessageListener;
    onReceiveHalfClose: ServerHalfCloseListener;
    onCancel: ServerCancelListener;
}
export type ServerListener = Partial<FullServerListener>;
export declare class ServerListenerBuilder {
    private metadata;
    private message;
    private halfClose;
    private cancel;
    withOnReceiveMetadata(onReceiveMetadata: ServerMetadataListener): this;
    withOnReceiveMessage(onReceiveMessage: ServerMessageListener): this;
    withOnReceiveHalfClose(onReceiveHalfClose: ServerHalfCloseListener): this;
    withOnCancel(onCancel: ServerCancelListener): this;
    build(): ServerListener;
}
export interface InterceptingServerListener {
    onReceiveMetadata(metadata: Metadata): void;
    onReceiveMessage(message: any): void;
    onReceiveHalfClose(): void;
    onCancel(): void;
}
export declare function isInterceptingServerListener(listener: ServerListener | InterceptingServerListener): listener is InterceptingServerListener;
export interface StartResponder {
    (next: (listener?: ServerListener) => void): void;
}
export interface MetadataResponder {
    (metadata: Metadata, next: (metadata: Metadata) => void): void;
}
export interface MessageResponder {
    (message: any, next: (message: any) => void): void;
}
export interface StatusResponder {
    (status: PartialStatusObject, next: (status: PartialStatusObject) => void): void;
}
export interface FullResponder {
    start: StartResponder;
    sendMetadata: MetadataResponder;
    sendMessage: MessageResponder;
    sendStatus: StatusResponder;
}
export type Responder = Partial<FullResponder>;
export declare class ResponderBuilder {
    private start;
    private metadata;
    private message;
    private status;
    withStart(start: StartResponder): this;
    withSendMetadata(sendMetadata: MetadataResponder): this;
    withSendMessage(sendMessage: MessageResponder): this;
    withSendStatus(sendStatus: StatusResponder): this;
    build(): Responder;
}
export interface ConnectionInfo {
    localAddress?: string | undefined;
    localPort?: number | undefined;
    remoteAddress?: string | undefined;
    remotePort?: number | undefined;
}
export interface ServerInterceptingCallInterface {
    /**
     * Register the listener to handle inbound events.
     */
    start(listener: InterceptingServerListener): void;
    /**
     * Send response metadata.
     */
    sendMetadata(metadata: Metadata): void;
    /**
     * Send a response message.
     */
    sendMessage(message: any, callback: () => void): void;
    /**
     * End the call by sending this status.
     */
    sendStatus(status: PartialStatusObject): void;
    /**
     * Start a single read, eventually triggering either listener.onReceiveMessage or listener.onReceiveHalfClose.
     */
    startRead(): void;
    /**
     * Return the peer address of the client making the request, if known, or "unknown" otherwise
     */
    getPeer(): string;
    /**
     * Return the call deadline set by the client. The value is Infinity if there is no deadline.
     */
    getDeadline(): Deadline;
    /**
     * Return the host requested by the client in the ":authority" header.
     */
    getHost(): string;
    /**
     * Return the auth context of the connection the call is associated with.
     */
    getAuthContext(): AuthContext;
    /**
     * Return information about the connection used to make the call.
     */
    getConnectionInfo(): ConnectionInfo;
    /**
     * Get the metrics recorder for this call. Metrics will not be sent unless
     * the server was constructed with the `grpc.server_call_metric_recording`
     * option.
     */
    getMetricsRecorder(): PerRequestMetricRecorder;
}
export declare class ServerInterceptingCall implements ServerInterceptingCallInterface {
    private nextCall;
    private responder;
    private processingMetadata;
    private sentMetadata;
    private processingMessage;
    private pendingMessage;
    private pendingMessageCallback;
    private pendingStatus;
    constructor(nextCall: ServerInterceptingCallInterface, responder?: Responder);
    private processPendingMessage;
    private processPendingStatus;
    start(listener: InterceptingServerListener): void;
    sendMetadata(metadata: Metadata): void;
    sendMessage(message: any, callback: () => void): void;
    sendStatus(status: PartialStatusObject): void;
    startRead(): void;
    getPeer(): string;
    getDeadline(): Deadline;
    getHost(): string;
    getAuthContext(): AuthContext;
    getConnectionInfo(): ConnectionInfo;
    getMetricsRecorder(): PerRequestMetricRecorder;
}
export interface ServerInterceptor {
    (methodDescriptor: ServerMethodDefinition<any, any>, call: ServerInterceptingCallInterface): ServerInterceptingCall;
}
export declare class BaseServerInterceptingCall implements ServerInterceptingCallInterface {
    private readonly stream;
    private readonly callEventTracker;
    private readonly handler;
    private listener;
    private metadata;
    private deadlineTimer;
    private deadline;
    private maxSendMessageSize;
    private maxReceiveMessageSize;
    private cancelled;
    private metadataSent;
    private wantTrailers;
    private cancelNotified;
    private incomingEncoding;
    private decoder;
    private readQueue;
    private isReadPending;
    private receivedHalfClose;
    private streamEnded;
    private host;
    private connectionInfo;
    private metricsRecorder;
    private shouldSendMetrics;
    constructor(stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, callEventTracker: CallEventTracker | null, handler: Handler<any, any>, options: ChannelOptions);
    private handleTimeoutHeader;
    private checkCancelled;
    private notifyOnCancel;
    /**
     * A server handler can start sending messages without explicitly sending
     * metadata. In that case, we need to send headers before sending any
     * messages. This function does that if necessary.
     */
    private maybeSendMetadata;
    /**
     * Serialize a message to a length-delimited byte string.
     * @param value
     * @returns
     */
    private serializeMessage;
    private decompressMessage;
    private decompressAndMaybePush;
    private maybePushNextMessage;
    private handleDataFrame;
    private handleEndEvent;
    start(listener: InterceptingServerListener): void;
    sendMetadata(metadata: Metadata): void;
    sendMessage(message: any, callback: () => void): void;
    sendStatus(status: PartialStatusObject): void;
    startRead(): void;
    getPeer(): string;
    getDeadline(): Deadline;
    getHost(): string;
    getAuthContext(): AuthContext;
    getConnectionInfo(): ConnectionInfo;
    getMetricsRecorder(): PerRequestMetricRecorder;
}
export declare function getServerInterceptingCall(interceptors: ServerInterceptor[], stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, callEventTracker: CallEventTracker | null, handler: Handler<any, any>, options: ChannelOptions): ServerInterceptingCallInterface;
