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

import { EventEmitter } from 'events';
import { Duplex, Readable, Writable } from 'stream';

import { Status } from './constants';
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
export type ServerReadableStream<RequestType, ResponseType> =
  ServerSurfaceCall & ObjectReadable<RequestType>;
export type ServerWritableStream<RequestType, ResponseType> =
  ServerSurfaceCall &
    ObjectWritable<ResponseType> & {
      request: RequestType;
      end: (metadata?: Metadata) => void;
    };
export type ServerDuplexStream<RequestType, ResponseType> = ServerSurfaceCall &
  ObjectReadable<RequestType> &
  ObjectWritable<ResponseType> & { end: (metadata?: Metadata) => void };

export function serverErrorToStatus(
  error: ServerErrorResponse | ServerStatusResponse,
  overrideTrailers?: Metadata | undefined
): PartialStatusObject {
  const status: PartialStatusObject = {
    code: Status.UNKNOWN,
    details: 'message' in error ? error.message : 'Unknown Error',
    metadata: overrideTrailers ?? error.metadata ?? null,
  };

  if (
    'code' in error &&
    typeof error.code === 'number' &&
    Number.isInteger(error.code)
  ) {
    status.code = error.code;

    if ('details' in error && typeof error.details === 'string') {
      status.details = error.details!;
    }
  }
  return status;
}

export class ServerUnaryCallImpl<RequestType, ResponseType>
  extends EventEmitter
  implements ServerUnaryCall<RequestType, ResponseType>
{
  cancelled: boolean;

  constructor(
    private path: string,
    private call: ServerInterceptingCallInterface,
    public metadata: Metadata,
    public request: RequestType
  ) {
    super();
    this.cancelled = false;
  }

  getPeer(): string {
    return this.call.getPeer();
  }

  sendMetadata(responseMetadata: Metadata): void {
    this.call.sendMetadata(responseMetadata);
  }

  getDeadline(): Deadline {
    return this.call.getDeadline();
  }

  getPath(): string {
    return this.path;
  }

  getHost(): string {
    return this.call.getHost();
  }

  getAuthContext(): AuthContext {
    return this.call.getAuthContext();
  }

  getMetricsRecorder(): PerRequestMetricRecorder {
    return this.call.getMetricsRecorder();
  }
}

export class ServerReadableStreamImpl<RequestType, ResponseType>
  extends Readable
  implements ServerReadableStream<RequestType, ResponseType>
{
  cancelled: boolean;

  constructor(
    private path: string,
    private call: ServerInterceptingCallInterface,
    public metadata: Metadata
  ) {
    super({ objectMode: true });
    this.cancelled = false;
  }

  _read(size: number) {
    this.call.startRead();
  }

  getPeer(): string {
    return this.call.getPeer();
  }

  sendMetadata(responseMetadata: Metadata): void {
    this.call.sendMetadata(responseMetadata);
  }

  getDeadline(): Deadline {
    return this.call.getDeadline();
  }

  getPath(): string {
    return this.path;
  }

  getHost(): string {
    return this.call.getHost();
  }

  getAuthContext(): AuthContext {
    return this.call.getAuthContext();
  }

  getMetricsRecorder(): PerRequestMetricRecorder {
    return this.call.getMetricsRecorder();
  }
}

export class ServerWritableStreamImpl<RequestType, ResponseType>
  extends Writable
  implements ServerWritableStream<RequestType, ResponseType>
{
  cancelled: boolean;
  private trailingMetadata: Metadata;
  private pendingStatus: PartialStatusObject = {
    code: Status.OK,
    details: 'OK',
  };

  constructor(
    private path: string,
    private call: ServerInterceptingCallInterface,
    public metadata: Metadata,
    public request: RequestType
  ) {
    super({ objectMode: true });
    this.cancelled = false;
    this.trailingMetadata = new Metadata();

    this.on('error', err => {
      this.pendingStatus = serverErrorToStatus(err);
      this.end();
    });
  }

  getPeer(): string {
    return this.call.getPeer();
  }

  sendMetadata(responseMetadata: Metadata): void {
    this.call.sendMetadata(responseMetadata);
  }

  getDeadline(): Deadline {
    return this.call.getDeadline();
  }

  getPath(): string {
    return this.path;
  }

  getHost(): string {
    return this.call.getHost();
  }

  getAuthContext(): AuthContext {
    return this.call.getAuthContext();
  }

  getMetricsRecorder(): PerRequestMetricRecorder {
    return this.call.getMetricsRecorder();
  }

  _write(
    chunk: ResponseType,
    encoding: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (...args: any[]) => void
  ) {
    this.call.sendMessage(chunk, callback);
  }

  _final(callback: Function): void {
    callback(null);
    this.call.sendStatus({
      ...this.pendingStatus,
      metadata: this.pendingStatus.metadata ?? this.trailingMetadata,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end(metadata?: any) {
    if (metadata) {
      this.trailingMetadata = metadata;
    }

    return super.end();
  }
}

export class ServerDuplexStreamImpl<RequestType, ResponseType>
  extends Duplex
  implements ServerDuplexStream<RequestType, ResponseType>
{
  cancelled: boolean;
  private trailingMetadata: Metadata;
  private pendingStatus: PartialStatusObject = {
    code: Status.OK,
    details: 'OK',
  };

  constructor(
    private path: string,
    private call: ServerInterceptingCallInterface,
    public metadata: Metadata
  ) {
    super({ objectMode: true });
    this.cancelled = false;
    this.trailingMetadata = new Metadata();

    this.on('error', err => {
      this.pendingStatus = serverErrorToStatus(err);
      this.end();
    });
  }

  getPeer(): string {
    return this.call.getPeer();
  }

  sendMetadata(responseMetadata: Metadata): void {
    this.call.sendMetadata(responseMetadata);
  }

  getDeadline(): Deadline {
    return this.call.getDeadline();
  }

  getPath(): string {
    return this.path;
  }

  getHost(): string {
    return this.call.getHost();
  }

  getAuthContext(): AuthContext {
    return this.call.getAuthContext();
  }

  getMetricsRecorder(): PerRequestMetricRecorder {
    return this.call.getMetricsRecorder();
  }

  _read(size: number) {
    this.call.startRead();
  }

  _write(
    chunk: ResponseType,
    encoding: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (...args: any[]) => void
  ) {
    this.call.sendMessage(chunk, callback);
  }

  _final(callback: Function): void {
    callback(null);
    this.call.sendStatus({
      ...this.pendingStatus,
      metadata: this.pendingStatus.metadata ?? this.trailingMetadata,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end(metadata?: any) {
    if (metadata) {
      this.trailingMetadata = metadata;
    }

    return super.end();
  }
}

// Unary response callback signature.
export type sendUnaryData<ResponseType> = (
  error: ServerErrorResponse | ServerStatusResponse | null,
  value?: ResponseType | null,
  trailer?: Metadata,
  flags?: number
) => void;

// User provided handler for unary calls.
export type handleUnaryCall<RequestType, ResponseType> = (
  call: ServerUnaryCall<RequestType, ResponseType>,
  callback: sendUnaryData<ResponseType>
) => void;

// User provided handler for client streaming calls.
export type handleClientStreamingCall<RequestType, ResponseType> = (
  call: ServerReadableStream<RequestType, ResponseType>,
  callback: sendUnaryData<ResponseType>
) => void;

// User provided handler for server streaming calls.
export type handleServerStreamingCall<RequestType, ResponseType> = (
  call: ServerWritableStream<RequestType, ResponseType>
) => void;

// User provided handler for bidirectional streaming calls.
export type handleBidiStreamingCall<RequestType, ResponseType> = (
  call: ServerDuplexStream<RequestType, ResponseType>
) => void;

export type HandleCall<RequestType, ResponseType> =
  | handleUnaryCall<RequestType, ResponseType>
  | handleClientStreamingCall<RequestType, ResponseType>
  | handleServerStreamingCall<RequestType, ResponseType>
  | handleBidiStreamingCall<RequestType, ResponseType>;

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

export type Handler<RequestType, ResponseType> =
  | UnaryHandler<RequestType, ResponseType>
  | ClientStreamingHandler<RequestType, ResponseType>
  | ServerStreamingHandler<RequestType, ResponseType>
  | BidiStreamingHandler<RequestType, ResponseType>;

export type HandlerType = 'bidi' | 'clientStream' | 'serverStream' | 'unary';
