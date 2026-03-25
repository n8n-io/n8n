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

import { Metadata } from './metadata';
import {
  StatusObject,
  Listener,
  MetadataListener,
  MessageListener,
  StatusListener,
  FullListener,
  InterceptingListener,
  InterceptingListenerImpl,
  isInterceptingListener,
  MessageContext,
  Call,
} from './call-interface';
import { Status } from './constants';
import { Channel } from './channel';
import { CallOptions } from './client';
import { ClientMethodDefinition } from './make-client';
import { getErrorMessage } from './error';

/**
 * Error class associated with passing both interceptors and interceptor
 * providers to a client constructor or as call options.
 */
export class InterceptorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterceptorConfigurationError';
    Error.captureStackTrace(this, InterceptorConfigurationError);
  }
}

export interface MetadataRequester {
  (
    metadata: Metadata,
    listener: InterceptingListener,
    next: (
      metadata: Metadata,
      listener: InterceptingListener | Listener
    ) => void
  ): void;
}

export interface MessageRequester {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: any, next: (message: any) => void): void;
}

export interface CloseRequester {
  (next: () => void): void;
}

export interface CancelRequester {
  (next: () => void): void;
}

/**
 * An object with methods for intercepting and modifying outgoing call operations.
 */
export interface FullRequester {
  start: MetadataRequester;
  sendMessage: MessageRequester;
  halfClose: CloseRequester;
  cancel: CancelRequester;
}

export type Requester = Partial<FullRequester>;

export class ListenerBuilder {
  private metadata: MetadataListener | undefined = undefined;
  private message: MessageListener | undefined = undefined;
  private status: StatusListener | undefined = undefined;

  withOnReceiveMetadata(onReceiveMetadata: MetadataListener): this {
    this.metadata = onReceiveMetadata;
    return this;
  }

  withOnReceiveMessage(onReceiveMessage: MessageListener): this {
    this.message = onReceiveMessage;
    return this;
  }

  withOnReceiveStatus(onReceiveStatus: StatusListener): this {
    this.status = onReceiveStatus;
    return this;
  }

  build(): Listener {
    return {
      onReceiveMetadata: this.metadata,
      onReceiveMessage: this.message,
      onReceiveStatus: this.status,
    };
  }
}

export class RequesterBuilder {
  private start: MetadataRequester | undefined = undefined;
  private message: MessageRequester | undefined = undefined;
  private halfClose: CloseRequester | undefined = undefined;
  private cancel: CancelRequester | undefined = undefined;

  withStart(start: MetadataRequester): this {
    this.start = start;
    return this;
  }

  withSendMessage(sendMessage: MessageRequester): this {
    this.message = sendMessage;
    return this;
  }

  withHalfClose(halfClose: CloseRequester): this {
    this.halfClose = halfClose;
    return this;
  }

  withCancel(cancel: CancelRequester): this {
    this.cancel = cancel;
    return this;
  }

  build(): Requester {
    return {
      start: this.start,
      sendMessage: this.message,
      halfClose: this.halfClose,
      cancel: this.cancel,
    };
  }
}

/**
 * A Listener with a default pass-through implementation of each method. Used
 * for filling out Listeners with some methods omitted.
 */
const defaultListener: FullListener = {
  onReceiveMetadata: (metadata, next) => {
    next(metadata);
  },
  onReceiveMessage: (message, next) => {
    next(message);
  },
  onReceiveStatus: (status, next) => {
    next(status);
  },
};

/**
 * A Requester with a default pass-through implementation of each method. Used
 * for filling out Requesters with some methods omitted.
 */
const defaultRequester: FullRequester = {
  start: (metadata, listener, next) => {
    next(metadata, listener);
  },
  sendMessage: (message, next) => {
    next(message);
  },
  halfClose: next => {
    next();
  },
  cancel: next => {
    next();
  },
};

export interface InterceptorOptions extends CallOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method_definition: ClientMethodDefinition<any, any>;
}

export interface InterceptingCallInterface {
  cancelWithStatus(status: Status, details: string): void;
  getPeer(): string;
  start(metadata: Metadata, listener?: Partial<InterceptingListener>): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessageWithContext(context: MessageContext, message: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage(message: any): void;
  startRead(): void;
  halfClose(): void;
}

export class InterceptingCall implements InterceptingCallInterface {
  /**
   * The requester that this InterceptingCall uses to modify outgoing operations
   */
  private requester: FullRequester;
  /**
   * Indicates that metadata has been passed to the requester's start
   * method but it has not been passed to the corresponding next callback
   */
  private processingMetadata = false;
  /**
   * Message context for a pending message that is waiting for
   */
  private pendingMessageContext: MessageContext | null = null;
  private pendingMessage: any;
  /**
   * Indicates that a message has been passed to the requester's sendMessage
   * method but it has not been passed to the corresponding next callback
   */
  private processingMessage = false;
  /**
   * Indicates that a status was received but could not be propagated because
   * a message was still being processed.
   */
  private pendingHalfClose = false;
  constructor(
    private nextCall: InterceptingCallInterface,
    requester?: Requester
  ) {
    if (requester) {
      this.requester = {
        start: requester.start ?? defaultRequester.start,
        sendMessage: requester.sendMessage ?? defaultRequester.sendMessage,
        halfClose: requester.halfClose ?? defaultRequester.halfClose,
        cancel: requester.cancel ?? defaultRequester.cancel,
      };
    } else {
      this.requester = defaultRequester;
    }
  }

  cancelWithStatus(status: Status, details: string) {
    this.requester.cancel(() => {
      this.nextCall.cancelWithStatus(status, details);
    });
  }

  getPeer() {
    return this.nextCall.getPeer();
  }

  private processPendingMessage() {
    if (this.pendingMessageContext) {
      this.nextCall.sendMessageWithContext(
        this.pendingMessageContext,
        this.pendingMessage
      );
      this.pendingMessageContext = null;
      this.pendingMessage = null;
    }
  }

  private processPendingHalfClose() {
    if (this.pendingHalfClose) {
      this.nextCall.halfClose();
    }
  }

  start(
    metadata: Metadata,
    interceptingListener?: Partial<InterceptingListener>
  ): void {
    const fullInterceptingListener: InterceptingListener = {
      onReceiveMetadata:
        interceptingListener?.onReceiveMetadata?.bind(interceptingListener) ??
        (metadata => {}),
      onReceiveMessage:
        interceptingListener?.onReceiveMessage?.bind(interceptingListener) ??
        (message => {}),
      onReceiveStatus:
        interceptingListener?.onReceiveStatus?.bind(interceptingListener) ??
        (status => {}),
    };
    this.processingMetadata = true;
    this.requester.start(metadata, fullInterceptingListener, (md, listener) => {
      this.processingMetadata = false;
      let finalInterceptingListener: InterceptingListener;
      if (isInterceptingListener(listener)) {
        finalInterceptingListener = listener;
      } else {
        const fullListener: FullListener = {
          onReceiveMetadata:
            listener.onReceiveMetadata ?? defaultListener.onReceiveMetadata,
          onReceiveMessage:
            listener.onReceiveMessage ?? defaultListener.onReceiveMessage,
          onReceiveStatus:
            listener.onReceiveStatus ?? defaultListener.onReceiveStatus,
        };
        finalInterceptingListener = new InterceptingListenerImpl(
          fullListener,
          fullInterceptingListener
        );
      }
      this.nextCall.start(md, finalInterceptingListener);
      this.processPendingMessage();
      this.processPendingHalfClose();
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessageWithContext(context: MessageContext, message: any): void {
    this.processingMessage = true;
    this.requester.sendMessage(message, finalMessage => {
      this.processingMessage = false;
      if (this.processingMetadata) {
        this.pendingMessageContext = context;
        this.pendingMessage = message;
      } else {
        this.nextCall.sendMessageWithContext(context, finalMessage);
        this.processPendingHalfClose();
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage(message: any): void {
    this.sendMessageWithContext({}, message);
  }
  startRead(): void {
    this.nextCall.startRead();
  }
  halfClose(): void {
    this.requester.halfClose(() => {
      if (this.processingMetadata || this.processingMessage) {
        this.pendingHalfClose = true;
      } else {
        this.nextCall.halfClose();
      }
    });
  }
}

function getCall(channel: Channel, path: string, options: CallOptions): Call {
  const deadline = options.deadline ?? Infinity;
  const host = options.host;
  const parent = options.parent ?? null;
  const propagateFlags = options.propagate_flags;
  const credentials = options.credentials;
  const call = channel.createCall(path, deadline, host, parent, propagateFlags);
  if (credentials) {
    call.setCredentials(credentials);
  }
  return call;
}

/**
 * InterceptingCall implementation that directly owns the underlying Call
 * object and handles serialization and deseraizliation.
 */
class BaseInterceptingCall implements InterceptingCallInterface {
  constructor(
    protected call: Call,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected methodDefinition: ClientMethodDefinition<any, any>
  ) {}
  cancelWithStatus(status: Status, details: string): void {
    this.call.cancelWithStatus(status, details);
  }
  getPeer(): string {
    return this.call.getPeer();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessageWithContext(context: MessageContext, message: any): void {
    let serialized: Buffer;
    try {
      serialized = this.methodDefinition.requestSerialize(message);
    } catch (e) {
      this.call.cancelWithStatus(
        Status.INTERNAL,
        `Request message serialization failure: ${getErrorMessage(e)}`
      );
      return;
    }
    this.call.sendMessageWithContext(context, serialized);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage(message: any) {
    this.sendMessageWithContext({}, message);
  }
  start(
    metadata: Metadata,
    interceptingListener?: Partial<InterceptingListener>
  ): void {
    let readError: StatusObject | null = null;
    this.call.start(metadata, {
      onReceiveMetadata: metadata => {
        interceptingListener?.onReceiveMetadata?.(metadata);
      },
      onReceiveMessage: message => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let deserialized: any;
        try {
          deserialized = this.methodDefinition.responseDeserialize(message);
        } catch (e) {
          readError = {
            code: Status.INTERNAL,
            details: `Response message parsing error: ${getErrorMessage(e)}`,
            metadata: new Metadata(),
          };
          this.call.cancelWithStatus(readError.code, readError.details);
          return;
        }
        interceptingListener?.onReceiveMessage?.(deserialized);
      },
      onReceiveStatus: status => {
        if (readError) {
          interceptingListener?.onReceiveStatus?.(readError);
        } else {
          interceptingListener?.onReceiveStatus?.(status);
        }
      },
    });
  }
  startRead() {
    this.call.startRead();
  }
  halfClose(): void {
    this.call.halfClose();
  }
}

/**
 * BaseInterceptingCall with special-cased behavior for methods with unary
 * responses.
 */
class BaseUnaryInterceptingCall
  extends BaseInterceptingCall
  implements InterceptingCallInterface
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(call: Call, methodDefinition: ClientMethodDefinition<any, any>) {
    super(call, methodDefinition);
  }
  start(metadata: Metadata, listener?: Partial<InterceptingListener>): void {
    let receivedMessage = false;
    const wrapperListener: InterceptingListener = {
      onReceiveMetadata:
        listener?.onReceiveMetadata?.bind(listener) ?? (metadata => {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onReceiveMessage: (message: any) => {
        receivedMessage = true;
        listener?.onReceiveMessage?.(message);
      },
      onReceiveStatus: (status: StatusObject) => {
        if (!receivedMessage) {
          listener?.onReceiveMessage?.(null);
        }
        listener?.onReceiveStatus?.(status);
      },
    };
    super.start(metadata, wrapperListener);
    this.call.startRead();
  }
}

/**
 * BaseInterceptingCall with special-cased behavior for methods with streaming
 * responses.
 */
class BaseStreamingInterceptingCall
  extends BaseInterceptingCall
  implements InterceptingCallInterface {}

function getBottomInterceptingCall(
  channel: Channel,
  options: InterceptorOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodDefinition: ClientMethodDefinition<any, any>
) {
  const call = getCall(channel, methodDefinition.path, options);
  if (methodDefinition.responseStream) {
    return new BaseStreamingInterceptingCall(call, methodDefinition);
  } else {
    return new BaseUnaryInterceptingCall(call, methodDefinition);
  }
}

export interface NextCall {
  (options: InterceptorOptions): InterceptingCallInterface;
}

export interface Interceptor {
  (options: InterceptorOptions, nextCall: NextCall): InterceptingCall;
}

export interface InterceptorProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (methodDefinition: ClientMethodDefinition<any, any>): Interceptor;
}

export interface InterceptorArguments {
  clientInterceptors: Interceptor[];
  clientInterceptorProviders: InterceptorProvider[];
  callInterceptors: Interceptor[];
  callInterceptorProviders: InterceptorProvider[];
}

export function getInterceptingCall(
  interceptorArgs: InterceptorArguments,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodDefinition: ClientMethodDefinition<any, any>,
  options: CallOptions,
  channel: Channel
): InterceptingCallInterface {
  if (
    interceptorArgs.clientInterceptors.length > 0 &&
    interceptorArgs.clientInterceptorProviders.length > 0
  ) {
    throw new InterceptorConfigurationError(
      'Both interceptors and interceptor_providers were passed as options ' +
        'to the client constructor. Only one of these is allowed.'
    );
  }
  if (
    interceptorArgs.callInterceptors.length > 0 &&
    interceptorArgs.callInterceptorProviders.length > 0
  ) {
    throw new InterceptorConfigurationError(
      'Both interceptors and interceptor_providers were passed as call ' +
        'options. Only one of these is allowed.'
    );
  }
  let interceptors: Interceptor[] = [];
  // Interceptors passed to the call override interceptors passed to the client constructor
  if (
    interceptorArgs.callInterceptors.length > 0 ||
    interceptorArgs.callInterceptorProviders.length > 0
  ) {
    interceptors = ([] as Interceptor[])
      .concat(
        interceptorArgs.callInterceptors,
        interceptorArgs.callInterceptorProviders.map(provider =>
          provider(methodDefinition)
        )
      )
      .filter(interceptor => interceptor);
    // Filter out falsy values when providers return nothing
  } else {
    interceptors = ([] as Interceptor[])
      .concat(
        interceptorArgs.clientInterceptors,
        interceptorArgs.clientInterceptorProviders.map(provider =>
          provider(methodDefinition)
        )
      )
      .filter(interceptor => interceptor);
    // Filter out falsy values when providers return nothing
  }
  const interceptorOptions = Object.assign({}, options, {
    method_definition: methodDefinition,
  });
  /* For each interceptor in the list, the nextCall function passed to it is
   * based on the next interceptor in the list, using a nextCall function
   * constructed with the following interceptor in the list, and so on. The
   * initialValue, which is effectively at the end of the list, is a nextCall
   * function that invokes getBottomInterceptingCall, the result of which
   * handles (de)serialization and also gets the underlying call from the
   * channel. */
  const getCall: NextCall = interceptors.reduceRight<NextCall>(
    (nextCall: NextCall, nextInterceptor: Interceptor) => {
      return currentOptions => nextInterceptor(currentOptions, nextCall);
    },
    (finalOptions: InterceptorOptions) =>
      getBottomInterceptingCall(channel, finalOptions, methodDefinition)
  );
  return getCall(interceptorOptions);
}
