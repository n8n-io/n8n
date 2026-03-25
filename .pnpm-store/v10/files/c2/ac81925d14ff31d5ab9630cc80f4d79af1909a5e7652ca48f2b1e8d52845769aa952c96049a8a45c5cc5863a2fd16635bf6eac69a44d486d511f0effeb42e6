import * as http2 from 'http2';
import { Status } from './constants';
import { InterceptingListener, MessageContext, StatusObject } from './call-interface';
import { CallEventTracker, Transport } from './transport';
export interface SubchannelCall {
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    sendMessageWithContext(context: MessageContext, message: Buffer): void;
    startRead(): void;
    halfClose(): void;
    getCallNumber(): number;
    getDeadlineInfo(): string[];
}
export interface StatusObjectWithRstCode extends StatusObject {
    rstCode?: number;
}
export interface SubchannelCallInterceptingListener extends InterceptingListener {
    onReceiveStatus(status: StatusObjectWithRstCode): void;
}
export declare class Http2SubchannelCall implements SubchannelCall {
    private readonly http2Stream;
    private readonly callEventTracker;
    private readonly listener;
    private readonly transport;
    private readonly callId;
    private decoder;
    private isReadFilterPending;
    private isPushPending;
    private canPush;
    /**
     * Indicates that an 'end' event has come from the http2 stream, so there
     * will be no more data events.
     */
    private readsClosed;
    private statusOutput;
    private unpushedReadMessages;
    private httpStatusCode;
    private finalStatus;
    private internalError;
    private serverEndedCall;
    private connectionDropped;
    constructor(http2Stream: http2.ClientHttp2Stream, callEventTracker: CallEventTracker, listener: SubchannelCallInterceptingListener, transport: Transport, callId: number);
    getDeadlineInfo(): string[];
    onDisconnect(): void;
    private outputStatus;
    private trace;
    /**
     * On first call, emits a 'status' event with the given StatusObject.
     * Subsequent calls are no-ops.
     * @param status The status of the call.
     */
    private endCall;
    private maybeOutputStatus;
    private push;
    private tryPush;
    private handleTrailers;
    private destroyHttp2Stream;
    cancelWithStatus(status: Status, details: string): void;
    getStatus(): StatusObject | null;
    getPeer(): string;
    getCallNumber(): number;
    startRead(): void;
    sendMessageWithContext(context: MessageContext, message: Buffer): void;
    halfClose(): void;
}
