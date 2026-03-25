import { Metadata } from './metadata';
import { Listener, MetadataListener, MessageListener, StatusListener, InterceptingListener, MessageContext } from './call-interface';
import { Status } from './constants';
import { Channel } from './channel';
import { CallOptions } from './client';
import { ClientMethodDefinition } from './make-client';
/**
 * Error class associated with passing both interceptors and interceptor
 * providers to a client constructor or as call options.
 */
export declare class InterceptorConfigurationError extends Error {
    constructor(message: string);
}
export interface MetadataRequester {
    (metadata: Metadata, listener: InterceptingListener, next: (metadata: Metadata, listener: InterceptingListener | Listener) => void): void;
}
export interface MessageRequester {
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
export declare class ListenerBuilder {
    private metadata;
    private message;
    private status;
    withOnReceiveMetadata(onReceiveMetadata: MetadataListener): this;
    withOnReceiveMessage(onReceiveMessage: MessageListener): this;
    withOnReceiveStatus(onReceiveStatus: StatusListener): this;
    build(): Listener;
}
export declare class RequesterBuilder {
    private start;
    private message;
    private halfClose;
    private cancel;
    withStart(start: MetadataRequester): this;
    withSendMessage(sendMessage: MessageRequester): this;
    withHalfClose(halfClose: CloseRequester): this;
    withCancel(cancel: CancelRequester): this;
    build(): Requester;
}
export interface InterceptorOptions extends CallOptions {
    method_definition: ClientMethodDefinition<any, any>;
}
export interface InterceptingCallInterface {
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    start(metadata: Metadata, listener?: Partial<InterceptingListener>): void;
    sendMessageWithContext(context: MessageContext, message: any): void;
    sendMessage(message: any): void;
    startRead(): void;
    halfClose(): void;
}
export declare class InterceptingCall implements InterceptingCallInterface {
    private nextCall;
    /**
     * The requester that this InterceptingCall uses to modify outgoing operations
     */
    private requester;
    /**
     * Indicates that metadata has been passed to the requester's start
     * method but it has not been passed to the corresponding next callback
     */
    private processingMetadata;
    /**
     * Message context for a pending message that is waiting for
     */
    private pendingMessageContext;
    private pendingMessage;
    /**
     * Indicates that a message has been passed to the requester's sendMessage
     * method but it has not been passed to the corresponding next callback
     */
    private processingMessage;
    /**
     * Indicates that a status was received but could not be propagated because
     * a message was still being processed.
     */
    private pendingHalfClose;
    constructor(nextCall: InterceptingCallInterface, requester?: Requester);
    cancelWithStatus(status: Status, details: string): void;
    getPeer(): string;
    private processPendingMessage;
    private processPendingHalfClose;
    start(metadata: Metadata, interceptingListener?: Partial<InterceptingListener>): void;
    sendMessageWithContext(context: MessageContext, message: any): void;
    sendMessage(message: any): void;
    startRead(): void;
    halfClose(): void;
}
export interface NextCall {
    (options: InterceptorOptions): InterceptingCallInterface;
}
export interface Interceptor {
    (options: InterceptorOptions, nextCall: NextCall): InterceptingCall;
}
export interface InterceptorProvider {
    (methodDefinition: ClientMethodDefinition<any, any>): Interceptor;
}
export interface InterceptorArguments {
    clientInterceptors: Interceptor[];
    clientInterceptorProviders: InterceptorProvider[];
    callInterceptors: Interceptor[];
    callInterceptorProviders: InterceptorProvider[];
}
export declare function getInterceptingCall(interceptorArgs: InterceptorArguments, methodDefinition: ClientMethodDefinition<any, any>, options: CallOptions, channel: Channel): InterceptingCallInterface;
