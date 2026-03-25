import { ClientDuplexStream, ClientReadableStream, ClientUnaryCall, ClientWritableStream, ServiceError } from './call';
import { CallCredentials, OAuth2Client } from './call-credentials';
import { StatusObject } from './call-interface';
import { Channel, ChannelImplementation } from './channel';
import { CompressionAlgorithms } from './compression-algorithms';
import { ConnectivityState } from './connectivity-state';
import { ChannelCredentials, VerifyOptions } from './channel-credentials';
import { CallOptions, Client, ClientOptions, CallInvocationTransformer, CallProperties, UnaryCallback } from './client';
import { LogVerbosity, Status, Propagate } from './constants';
import { Deserialize, loadPackageDefinition, makeClientConstructor, MethodDefinition, Serialize, ServerMethodDefinition, ServiceDefinition } from './make-client';
import { Metadata, MetadataOptions, MetadataValue } from './metadata';
import { ConnectionInjector, Server, ServerOptions, UntypedHandleCall, UntypedServiceImplementation } from './server';
import { KeyCertPair, ServerCredentials } from './server-credentials';
import { StatusBuilder } from './status-builder';
import { handleBidiStreamingCall, handleServerStreamingCall, handleClientStreamingCall, handleUnaryCall, sendUnaryData, ServerUnaryCall, ServerReadableStream, ServerWritableStream, ServerDuplexStream, ServerErrorResponse } from './server-call';
export { OAuth2Client };
/**** Client Credentials ****/
export declare const credentials: {
    /**
     * Combine a ChannelCredentials with any number of CallCredentials into a
     * single ChannelCredentials object.
     * @param channelCredentials The ChannelCredentials object.
     * @param callCredentials Any number of CallCredentials objects.
     * @return The resulting ChannelCredentials object.
     */
    combineChannelCredentials: (channelCredentials: ChannelCredentials, ...callCredentials: CallCredentials[]) => ChannelCredentials;
    /**
     * Combine any number of CallCredentials into a single CallCredentials
     * object.
     * @param first The first CallCredentials object.
     * @param additional Any number of additional CallCredentials objects.
     * @return The resulting CallCredentials object.
     */
    combineCallCredentials: (first: CallCredentials, ...additional: CallCredentials[]) => CallCredentials;
    createInsecure: typeof ChannelCredentials.createInsecure;
    createSsl: typeof ChannelCredentials.createSsl;
    createFromSecureContext: typeof ChannelCredentials.createFromSecureContext;
    createFromMetadataGenerator: typeof CallCredentials.createFromMetadataGenerator;
    createFromGoogleCredential: typeof CallCredentials.createFromGoogleCredential;
    createEmpty: typeof CallCredentials.createEmpty;
};
/**** Metadata ****/
export { Metadata, MetadataOptions, MetadataValue };
/**** Constants ****/
export { LogVerbosity as logVerbosity, Status as status, ConnectivityState as connectivityState, Propagate as propagate, CompressionAlgorithms as compressionAlgorithms, };
/**** Client ****/
export { Client, ClientOptions, loadPackageDefinition, makeClientConstructor, makeClientConstructor as makeGenericClientConstructor, CallProperties, CallInvocationTransformer, ChannelImplementation as Channel, Channel as ChannelInterface, UnaryCallback as requestCallback, };
/**
 * Close a Client object.
 * @param client The client to close.
 */
export declare const closeClient: (client: Client) => void;
export declare const waitForClientReady: (client: Client, deadline: Date | number, callback: (error?: Error) => void) => void;
export { sendUnaryData, ChannelCredentials, CallCredentials, Deadline, Serialize as serialize, Deserialize as deserialize, ClientUnaryCall, ClientReadableStream, ClientWritableStream, ClientDuplexStream, CallOptions, MethodDefinition, StatusObject, ServiceError, ServerUnaryCall, ServerReadableStream, ServerWritableStream, ServerDuplexStream, ServerErrorResponse, ServerMethodDefinition, ServiceDefinition, UntypedHandleCall, UntypedServiceImplementation, VerifyOptions, };
/**** Server ****/
export { handleBidiStreamingCall, handleServerStreamingCall, handleUnaryCall, handleClientStreamingCall, };
export type Call = ClientUnaryCall | ClientReadableStream<any> | ClientWritableStream<any> | ClientDuplexStream<any, any>;
/**** Unimplemented function stubs ****/
export declare const loadObject: (value: any, options: any) => never;
export declare const load: (filename: any, format: any, options: any) => never;
export declare const setLogger: (logger: Partial<Console>) => void;
export declare const setLogVerbosity: (verbosity: LogVerbosity) => void;
export { ConnectionInjector, Server, ServerOptions };
export { ServerCredentials };
export { KeyCertPair };
export declare const getClientChannel: (client: Client) => Channel;
export { StatusBuilder };
export { Listener, InterceptingListener } from './call-interface';
export { Requester, ListenerBuilder, RequesterBuilder, Interceptor, InterceptorOptions, InterceptorProvider, InterceptingCall, InterceptorConfigurationError, NextCall, } from './client-interceptors';
export { GrpcObject, ServiceClientConstructor, ProtobufTypeDefinition, } from './make-client';
export { ChannelOptions } from './channel-options';
export { getChannelzServiceDefinition, getChannelzHandlers } from './channelz';
export { addAdminServicesToServer } from './admin';
export { ServiceConfig, LoadBalancingConfig, MethodConfig, RetryPolicy, } from './service-config';
export { ServerListener, FullServerListener, ServerListenerBuilder, Responder, FullResponder, ResponderBuilder, ServerInterceptingCallInterface, ServerInterceptingCall, ServerInterceptor, } from './server-interceptors';
import * as experimental from './experimental';
export { experimental };
import { Deadline } from './deadline';
