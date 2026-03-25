import { EventEmitter } from 'events';
import { Duplex, Readable, Writable } from 'stream';
import { StatusObject } from './call-interface';
import { EmitterAugmentation1 } from './events';
import { Metadata } from './metadata';
import { ObjectReadable, ObjectWritable, WriteCallback } from './object-stream';
import { InterceptingCallInterface } from './client-interceptors';
/**
 * A type extending the built-in Error object with additional fields.
 */
export type ServiceError = StatusObject & Error;
/**
 * A base type for all user-facing values returned by client-side method calls.
 */
export type SurfaceCall = {
    call?: InterceptingCallInterface;
    cancel(): void;
    getPeer(): string;
} & EmitterAugmentation1<'metadata', Metadata> & EmitterAugmentation1<'status', StatusObject> & EventEmitter;
/**
 * A type representing the return value of a unary method call.
 */
export type ClientUnaryCall = SurfaceCall;
/**
 * A type representing the return value of a server stream method call.
 */
export type ClientReadableStream<ResponseType> = {
    deserialize: (chunk: Buffer) => ResponseType;
} & SurfaceCall & ObjectReadable<ResponseType>;
/**
 * A type representing the return value of a client stream method call.
 */
export type ClientWritableStream<RequestType> = {
    serialize: (value: RequestType) => Buffer;
} & SurfaceCall & ObjectWritable<RequestType>;
/**
 * A type representing the return value of a bidirectional stream method call.
 */
export type ClientDuplexStream<RequestType, ResponseType> = ClientWritableStream<RequestType> & ClientReadableStream<ResponseType>;
/**
 * Construct a ServiceError from a StatusObject. This function exists primarily
 * as an attempt to make the error stack trace clearly communicate that the
 * error is not necessarily a problem in gRPC itself.
 * @param status
 */
export declare function callErrorFromStatus(status: StatusObject, callerStack: string): ServiceError;
export declare class ClientUnaryCallImpl extends EventEmitter implements ClientUnaryCall {
    call?: InterceptingCallInterface;
    constructor();
    cancel(): void;
    getPeer(): string;
}
export declare class ClientReadableStreamImpl<ResponseType> extends Readable implements ClientReadableStream<ResponseType> {
    readonly deserialize: (chunk: Buffer) => ResponseType;
    call?: InterceptingCallInterface;
    constructor(deserialize: (chunk: Buffer) => ResponseType);
    cancel(): void;
    getPeer(): string;
    _read(_size: number): void;
}
export declare class ClientWritableStreamImpl<RequestType> extends Writable implements ClientWritableStream<RequestType> {
    readonly serialize: (value: RequestType) => Buffer;
    call?: InterceptingCallInterface;
    constructor(serialize: (value: RequestType) => Buffer);
    cancel(): void;
    getPeer(): string;
    _write(chunk: RequestType, encoding: string, cb: WriteCallback): void;
    _final(cb: Function): void;
}
export declare class ClientDuplexStreamImpl<RequestType, ResponseType> extends Duplex implements ClientDuplexStream<RequestType, ResponseType> {
    readonly serialize: (value: RequestType) => Buffer;
    readonly deserialize: (chunk: Buffer) => ResponseType;
    call?: InterceptingCallInterface;
    constructor(serialize: (value: RequestType) => Buffer, deserialize: (chunk: Buffer) => ResponseType);
    cancel(): void;
    getPeer(): string;
    _read(_size: number): void;
    _write(chunk: RequestType, encoding: string, cb: WriteCallback): void;
    _final(cb: Function): void;
}
