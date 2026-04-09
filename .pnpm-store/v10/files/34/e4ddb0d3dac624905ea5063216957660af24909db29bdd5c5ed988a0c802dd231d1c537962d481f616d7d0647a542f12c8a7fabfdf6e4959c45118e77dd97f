/*
 * Copyright 2022 gRPC authors.
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

import { AuthContext } from './auth-context';
import { CallCredentials } from './call-credentials';
import { Status } from './constants';
import { Deadline } from './deadline';
import { Metadata } from './metadata';
import { ServerSurfaceCall } from './server-call';

export interface CallStreamOptions {
  deadline: Deadline;
  flags: number;
  host: string;
  parentCall: ServerSurfaceCall | null;
}

export type PartialCallStreamOptions = Partial<CallStreamOptions>;

export interface StatusObject {
  code: Status;
  details: string;
  metadata: Metadata;
}

export type PartialStatusObject = Pick<StatusObject, 'code' | 'details'> & {
  metadata?: Metadata | null | undefined;
};

export interface StatusOrOk<T> {
  ok: true;
  value: T;
}

export interface StatusOrError {
  ok: false;
  error: StatusObject;
}

export type StatusOr<T> = StatusOrOk<T> | StatusOrError;

export function statusOrFromValue<T>(value: T): StatusOr<T> {
  return {
    ok: true,
    value: value
  };
}

export function statusOrFromError<T>(error: PartialStatusObject): StatusOr<T> {
  return {
    ok: false,
    error: {
      ...error,
      metadata: error.metadata ?? new Metadata()
    }
  };
}

export const enum WriteFlags {
  BufferHint = 1,
  NoCompress = 2,
  WriteThrough = 4,
}

export interface WriteObject {
  message: Buffer;
  flags?: number;
}

export interface MetadataListener {
  (metadata: Metadata, next: (metadata: Metadata) => void): void;
}

export interface MessageListener {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: any, next: (message: any) => void): void;
}

export interface StatusListener {
  (status: StatusObject, next: (status: StatusObject) => void): void;
}

export interface FullListener {
  onReceiveMetadata: MetadataListener;
  onReceiveMessage: MessageListener;
  onReceiveStatus: StatusListener;
}

export type Listener = Partial<FullListener>;

/**
 * An object with methods for handling the responses to a call.
 */
export interface InterceptingListener {
  onReceiveMetadata(metadata: Metadata): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReceiveMessage(message: any): void;
  onReceiveStatus(status: StatusObject): void;
}

export function isInterceptingListener(
  listener: Listener | InterceptingListener
): listener is InterceptingListener {
  return (
    listener.onReceiveMetadata !== undefined &&
    listener.onReceiveMetadata.length === 1
  );
}

export class InterceptingListenerImpl implements InterceptingListener {
  private processingMetadata = false;
  private hasPendingMessage = false;
  private pendingMessage: any;
  private processingMessage = false;
  private pendingStatus: StatusObject | null = null;
  constructor(
    private listener: FullListener,
    private nextListener: InterceptingListener
  ) {}

  private processPendingMessage() {
    if (this.hasPendingMessage) {
      this.nextListener.onReceiveMessage(this.pendingMessage);
      this.pendingMessage = null;
      this.hasPendingMessage = false;
    }
  }

  private processPendingStatus() {
    if (this.pendingStatus) {
      this.nextListener.onReceiveStatus(this.pendingStatus);
    }
  }

  onReceiveMetadata(metadata: Metadata): void {
    this.processingMetadata = true;
    this.listener.onReceiveMetadata(metadata, metadata => {
      this.processingMetadata = false;
      this.nextListener.onReceiveMetadata(metadata);
      this.processPendingMessage();
      this.processPendingStatus();
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReceiveMessage(message: any): void {
    /* If this listener processes messages asynchronously, the last message may
     * be reordered with respect to the status */
    this.processingMessage = true;
    this.listener.onReceiveMessage(message, msg => {
      this.processingMessage = false;
      if (this.processingMetadata) {
        this.pendingMessage = msg;
        this.hasPendingMessage = true;
      } else {
        this.nextListener.onReceiveMessage(msg);
        this.processPendingStatus();
      }
    });
  }
  onReceiveStatus(status: StatusObject): void {
    this.listener.onReceiveStatus(status, processedStatus => {
      if (this.processingMetadata || this.processingMessage) {
        this.pendingStatus = processedStatus;
      } else {
        this.nextListener.onReceiveStatus(processedStatus);
      }
    });
  }
}

export interface WriteCallback {
  (error?: Error | null): void;
}

export interface MessageContext {
  callback?: WriteCallback;
  flags?: number;
}

export interface Call {
  cancelWithStatus(status: Status, details: string): void;
  getPeer(): string;
  start(metadata: Metadata, listener: InterceptingListener): void;
  sendMessageWithContext(context: MessageContext, message: Buffer): void;
  startRead(): void;
  halfClose(): void;
  getCallNumber(): number;
  setCredentials(credentials: CallCredentials): void;
  getAuthContext(): AuthContext | null;
}

export interface DeadlineInfoProvider {
  getDeadlineInfo(): string[];
}
