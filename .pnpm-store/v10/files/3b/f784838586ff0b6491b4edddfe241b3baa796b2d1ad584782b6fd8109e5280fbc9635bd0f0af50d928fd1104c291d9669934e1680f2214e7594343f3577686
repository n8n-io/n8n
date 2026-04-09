import { EventEmitter } from 'events';
import { Duplex, Readable, Writable } from 'stream';
import type { Deserialize, Serialize } from './make-client';
import { Metadata } from './metadata';
import type { ObjectReadable, ObjectWritable } from './object-stream';
import type { StatusObject, PartialStatusObject } from './call-interface';
import type { Deadline } from './deadline';
import type { ServerInterceptingCallInterface } from './server-interceptors';
import { AuthContext } from './auth-context';
import { PerRequestMetricRecorder } from './orca';
export type ServerStatusResponse = Partial<StatusObject>;
export type ServerErrorResponse = ServerStatusResponse & Error;
export type ServerSurfaceCall = {
    cancelled: boolean;
    readonly metadata: Metadata;
    getPeer(): string;
    sendMetadata(responseMetadata: Metadata): void;
    getDeadline(): Deadline;
    getPath(): string;
    getHost(): string;
    getAuthContext(): AuthContext;
    getMetricsRecorder(): PerRequestMetricRecorder;
} & EventEmitter;
export type ServerUnaryCall<RequestType, ResponseType> = ServerSurfaceCall & {
    request: RequestType;
};
export type ServerReadableStream<RequestType, ResponseType> = ServerSurfaceCall & ObjectReadable<RequestType>;
export type ServerWritableStream<RequestType, ResponseType> = ServerSurfaceCall & ObjectWritable<ResponseType> & {
    request: RequestType;
    end: (metadata?: Metadata) => void;
};
export type ServerDuplexStream<RequestType, ResponseType> = ServerSurfaceCall & ObjectReadable<RequestType> & ObjectWritable<ResponseType> & {
    end: (metadata?: Metadata) => void;
};
export declare function serverErrorToStatus(error: ServerErrorResponse | ServerStatusResponse, overrideTrailers?: Metadata | undefined): PartialStatusObject;
export declare class ServerUnaryCallImpl<RequestType, ResponseType> extends EventEmitter implements ServerUnaryCall<RequestType, ResponseType> {
    private path;
    private call;
    metadata: Metadata;
    request: RequestType;
    cancelled: boolean;
    constructor(path: string, call: ServerInterceptingCallInterface, metadata: Metadata, request: RequestType);
    getPeer(): string;
    sendMetadata(responseMetadata: Metadata): void;
    getDeadline(): Deadline;
    getPath(): string;
    getHost(): string;
    getAuthContext(): AuthContext;
    getMetricsRecorder(): PerRequestMetricRecorder;
}
export declare class ServerReadableStreamImpl<RequestType, ResponseType> extends Readable implements ServerReadableStream<RequestType, ResponseType> {
    private path;
    private call;
    metadata: Metadata;
    cancelled: boolean;
    constructor(path: string, call: ServerInterceptingCallInterface, metadata: Metadata);
    _read(size: number): void;
    getPeer(): string;
    sendMetadata(responseMetadata: Metadata): void;
    getDeadline(): Deadline;
    getPath(): string;
    getHost(): string;
    getAuthContext(): AuthContext;
    getMetricsRecorder(): PerRequestMetricRecorder;
}
export declare class ServerWritableStreamImpl<RequestType, ResponseType> extends Writable implements ServerWritableStream<RequestType, ResponseType> {
    private path;
    private call;
    metadata: Metadata;
    request: RequestType;
    cancelled: boolean;
    private trailingMetadata;
    private pendingStatus;
    constructor(path: string, call: ServerInterceptingCallInterface, metadata: Metadata, request: RequestType);
    getPeer(): string;
    sendMetadata(responseMetadata: Metadata): void;
    getDeadline(): Deadline;
    getPath(): string;
    getHost(): string;
    getAuthContext(): AuthContext;
    getMetricsRecorder(): PerRequestMetricRecorder;
    _write(chunk: ResponseType, encoding: string, callback: (...args: any[]) => void): void;
    _final(callback: Function): void;
    end(metadata?: any): this;
}
export declare class ServerDuplexStreamImpl<RequestType, ResponseType> extends Duplex implements ServerDuplexStream<RequestType, ResponseType> {
    private path;
    private call;
    metadata: Metadata;
    cancelled: boolean;
    private trailingMetadata;
    private pendingStatus;
    constructor(path: string, call: ServerInterceptingCallInterface, metadata: Metadata);
    getPeer(): string;
    sendMetadata(responseMetadata: Metadata): void;
    getDeadline(): Deadline;
    getPath(): string;
    getHost(): string;
    getAuthContext(): AuthContext;
    getMetricsRecorder(): PerRequestMetricRecorder;
    _read(size: number): void;
    _write(chunk: ResponseType, encoding: string, callback: (...args: any[]) => void): void;
    _final(callback: Function): void;
    end(metadata?: any): this;
}
export type sendUnaryData<ResponseType> = (error: ServerErrorResponse | ServerStatusResponse | null, value?: ResponseType | null, trailer?: Metadata, flags?: number) => void;
export type handleUnaryCall<RequestType, ResponseType> = (call: ServerUnaryCall<RequestType, ResponseType>, callback: sendUnaryData<ResponseType>) => void;
export type handleClientStreamingCall<RequestType, ResponseType> = (call: ServerReadableStream<RequestType, ResponseType>, callback: sendUnaryData<ResponseType>) => void;
export type handleServerStreamingCall<RequestType, ResponseType> = (call: ServerWritableStream<RequestType, ResponseType>) => void;
export type handleBidiStreamingCall<RequestType, ResponseType> = (call: ServerDuplexStream<RequestType, ResponseType>) => void;
export type HandleCall<RequestType, ResponseType> = handleUnaryCall<RequestType, ResponseType> | handleClientStreamingCall<RequestType, ResponseType> | handleServerStreamingCall<RequestType, ResponseType> | handleBidiStreamingCall<RequestType, ResponseType>;
export interface UnaryHandler<RequestType, ResponseType> {
    func: handleUnaryCall<RequestType, ResponseType>;
    serialize: Serialize<ResponseType>;
    deserialize: Deserialize<RequestType>;
    type: 'unary';
    path: string;
}
export interface ClientStreamingHandler<RequestType, ResponseType> {
    func: handleClientStreamingCall<RequestType, ResponseType>;
    serialize: Serialize<ResponseType>;
    deserialize: Deserialize<RequestType>;
    type: 'clientStream';
    path: string;
}
export interface ServerStreamingHandler<RequestType, ResponseType> {
    func: handleServerStreamingCall<RequestType, ResponseType>;
    serialize: Serialize<ResponseType>;
    deserialize: Deserialize<RequestType>;
    type: 'serverStream';
    path: string;
}
export interface BidiStreamingHandler<RequestType, ResponseType> {
    func: handleBidiStreamingCall<RequestType, ResponseType>;
    serialize: Serialize<ResponseType>;
    deserialize: Deserialize<RequestType>;
    type: 'bidi';
    path: string;
}
export type Handler<RequestType, ResponseType> = UnaryHandler<RequestType, ResponseType> | ClientStreamingHandler<RequestType, ResponseType> | ServerStreamingHandler<RequestType, ResponseType> | BidiStreamingHandler<RequestType, ResponseType>;
export type HandlerType = 'bidi' | 'clientStream' | 'serverStream' | 'unary';
