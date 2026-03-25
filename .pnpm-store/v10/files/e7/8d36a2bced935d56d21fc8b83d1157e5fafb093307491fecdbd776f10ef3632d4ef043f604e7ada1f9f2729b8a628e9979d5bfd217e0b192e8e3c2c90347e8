import { ClientDuplexStream, ClientReadableStream, ClientUnaryCall, ClientWritableStream, ServiceError, SurfaceCall } from './call';
import { CallCredentials } from './call-credentials';
import { Channel } from './channel';
import { ChannelCredentials } from './channel-credentials';
import { ChannelOptions } from './channel-options';
import { Metadata } from './metadata';
import { ClientMethodDefinition } from './make-client';
import { Interceptor, InterceptorProvider } from './client-interceptors';
import { ServerUnaryCall, ServerReadableStream, ServerWritableStream, ServerDuplexStream } from './server-call';
import { Deadline } from './deadline';
declare const CHANNEL_SYMBOL: unique symbol;
declare const INTERCEPTOR_SYMBOL: unique symbol;
declare const INTERCEPTOR_PROVIDER_SYMBOL: unique symbol;
declare const CALL_INVOCATION_TRANSFORMER_SYMBOL: unique symbol;
export interface UnaryCallback<ResponseType> {
    (err: ServiceError | null, value?: ResponseType): void;
}
export interface CallOptions {
    deadline?: Deadline;
    host?: string;
    parent?: ServerUnaryCall<any, any> | ServerReadableStream<any, any> | ServerWritableStream<any, any> | ServerDuplexStream<any, any>;
    propagate_flags?: number;
    credentials?: CallCredentials;
    interceptors?: Interceptor[];
    interceptor_providers?: InterceptorProvider[];
}
export interface CallProperties<RequestType, ResponseType> {
    argument?: RequestType;
    metadata: Metadata;
    call: SurfaceCall;
    channel: Channel;
    methodDefinition: ClientMethodDefinition<RequestType, ResponseType>;
    callOptions: CallOptions;
    callback?: UnaryCallback<ResponseType>;
}
export interface CallInvocationTransformer {
    (callProperties: CallProperties<any, any>): CallProperties<any, any>;
}
export type ClientOptions = Partial<ChannelOptions> & {
    channelOverride?: Channel;
    channelFactoryOverride?: (address: string, credentials: ChannelCredentials, options: ClientOptions) => Channel;
    interceptors?: Interceptor[];
    interceptor_providers?: InterceptorProvider[];
    callInvocationTransformer?: CallInvocationTransformer;
};
/**
 * A generic gRPC client. Primarily useful as a base class for all generated
 * clients.
 */
export declare class Client {
    private readonly [CHANNEL_SYMBOL];
    private readonly [INTERCEPTOR_SYMBOL];
    private readonly [INTERCEPTOR_PROVIDER_SYMBOL];
    private readonly [CALL_INVOCATION_TRANSFORMER_SYMBOL]?;
    constructor(address: string, credentials: ChannelCredentials, options?: ClientOptions);
    close(): void;
    getChannel(): Channel;
    waitForReady(deadline: Deadline, callback: (error?: Error) => void): void;
    private checkOptionalUnaryResponseArguments;
    makeUnaryRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, metadata: Metadata, options: CallOptions, callback: UnaryCallback<ResponseType>): ClientUnaryCall;
    makeUnaryRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, metadata: Metadata, callback: UnaryCallback<ResponseType>): ClientUnaryCall;
    makeUnaryRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, options: CallOptions, callback: UnaryCallback<ResponseType>): ClientUnaryCall;
    makeUnaryRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, callback: UnaryCallback<ResponseType>): ClientUnaryCall;
    makeClientStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, metadata: Metadata, options: CallOptions, callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
    makeClientStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, metadata: Metadata, callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
    makeClientStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, options: CallOptions, callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
    makeClientStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, callback: UnaryCallback<ResponseType>): ClientWritableStream<RequestType>;
    private checkMetadataAndOptions;
    makeServerStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, metadata: Metadata, options?: CallOptions): ClientReadableStream<ResponseType>;
    makeServerStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, argument: RequestType, options?: CallOptions): ClientReadableStream<ResponseType>;
    makeBidiStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, metadata: Metadata, options?: CallOptions): ClientDuplexStream<RequestType, ResponseType>;
    makeBidiStreamRequest<RequestType, ResponseType>(method: string, serialize: (value: RequestType) => Buffer, deserialize: (value: Buffer) => ResponseType, options?: CallOptions): ClientDuplexStream<RequestType, ResponseType>;
}
export {};
