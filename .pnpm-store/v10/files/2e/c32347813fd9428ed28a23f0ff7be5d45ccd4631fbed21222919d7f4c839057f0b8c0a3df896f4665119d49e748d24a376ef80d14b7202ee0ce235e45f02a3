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

import * as http2 from 'http2';
import * as util from 'util';

import { ServiceError } from './call';
import { Status, LogVerbosity } from './constants';
import { Deserialize, Serialize, ServiceDefinition } from './make-client';
import { Metadata } from './metadata';
import {
  BidiStreamingHandler,
  ClientStreamingHandler,
  HandleCall,
  Handler,
  HandlerType,
  sendUnaryData,
  ServerDuplexStream,
  ServerDuplexStreamImpl,
  ServerReadableStream,
  ServerStreamingHandler,
  ServerUnaryCall,
  ServerWritableStream,
  ServerWritableStreamImpl,
  UnaryHandler,
  ServerErrorResponse,
  ServerStatusResponse,
  serverErrorToStatus,
} from './server-call';
import { SecureContextWatcher, ServerCredentials } from './server-credentials';
import { ChannelOptions } from './channel-options';
import {
  createResolver,
  ResolverListener,
  mapUriDefaultScheme,
} from './resolver';
import * as logging from './logging';
import {
  SubchannelAddress,
  isTcpSubchannelAddress,
  subchannelAddressToString,
  stringToSubchannelAddress,
} from './subchannel-address';
import {
  GrpcUri,
  combineHostPort,
  parseUri,
  splitHostPort,
  uriToString,
} from './uri-parser';
import {
  ChannelzCallTracker,
  ChannelzCallTrackerStub,
  ChannelzChildrenTracker,
  ChannelzChildrenTrackerStub,
  ChannelzTrace,
  ChannelzTraceStub,
  registerChannelzServer,
  registerChannelzSocket,
  ServerInfo,
  ServerRef,
  SocketInfo,
  SocketRef,
  TlsInfo,
  unregisterChannelzRef,
} from './channelz';
import { CipherNameAndProtocol, TLSSocket } from 'tls';
import {
  ServerInterceptingCallInterface,
  ServerInterceptor,
  getServerInterceptingCall,
} from './server-interceptors';
import { PartialStatusObject } from './call-interface';
import { CallEventTracker } from './transport';
import { Socket } from 'net';
import { Duplex } from 'stream';

const UNLIMITED_CONNECTION_AGE_MS = ~(1 << 31);
const KEEPALIVE_MAX_TIME_MS = ~(1 << 31);
const KEEPALIVE_TIMEOUT_MS = 20000;
const MAX_CONNECTION_IDLE_MS = ~(1 << 31);

const { HTTP2_HEADER_PATH } = http2.constants;

const TRACER_NAME = 'server';
const kMaxAge = Buffer.from('max_age');

function serverCallTrace(text: string) {
  logging.trace(LogVerbosity.DEBUG, 'server_call', text);
}

type AnyHttp2Server = http2.Http2Server | http2.Http2SecureServer;

interface BindResult {
  port: number;
  count: number;
  errors: string[];
}

interface SingleAddressBindResult {
  port: number;
  error?: string;
}

function noop(): void {}

/**
 * Decorator to wrap a class method with util.deprecate
 * @param message The message to output if the deprecated method is called
 * @returns
 */
function deprecate(message: string) {
  return function <This, Args extends any[], Return>(
    target: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Return
    >
  ) {
    return util.deprecate(target, message);
  };
}

function getUnimplementedStatusResponse(
  methodName: string
): PartialStatusObject {
  return {
    code: Status.UNIMPLEMENTED,
    details: `The server does not implement the method ${methodName}`,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type UntypedUnaryHandler = UnaryHandler<any, any>;
type UntypedClientStreamingHandler = ClientStreamingHandler<any, any>;
type UntypedServerStreamingHandler = ServerStreamingHandler<any, any>;
type UntypedBidiStreamingHandler = BidiStreamingHandler<any, any>;
export type UntypedHandleCall = HandleCall<any, any>;
type UntypedHandler = Handler<any, any>;
export interface UntypedServiceImplementation {
  [name: string]: UntypedHandleCall;
}

function getDefaultHandler(handlerType: HandlerType, methodName: string) {
  const unimplementedStatusResponse =
    getUnimplementedStatusResponse(methodName);
  switch (handlerType) {
    case 'unary':
      return (
        call: ServerUnaryCall<any, any>,
        callback: sendUnaryData<any>
      ) => {
        callback(unimplementedStatusResponse as ServiceError, null);
      };
    case 'clientStream':
      return (
        call: ServerReadableStream<any, any>,
        callback: sendUnaryData<any>
      ) => {
        callback(unimplementedStatusResponse as ServiceError, null);
      };
    case 'serverStream':
      return (call: ServerWritableStream<any, any>) => {
        call.emit('error', unimplementedStatusResponse);
      };
    case 'bidi':
      return (call: ServerDuplexStream<any, any>) => {
        call.emit('error', unimplementedStatusResponse);
      };
    default:
      throw new Error(`Invalid handlerType ${handlerType}`);
  }
}

interface ChannelzSessionInfo {
  ref: SocketRef;
  streamTracker: ChannelzCallTracker | ChannelzCallTrackerStub;
  messagesSent: number;
  messagesReceived: number;
  keepAlivesSent: number;
  lastMessageSentTimestamp: Date | null;
  lastMessageReceivedTimestamp: Date | null;
}

/**
 * Information related to a single invocation of bindAsync. This should be
 * tracked in a map keyed by target string, normalized with a pass through
 * parseUri -> mapUriDefaultScheme -> uriToString. If the target has a port
 * number and the port number is 0, the target string is modified with the
 * concrete bound port.
 */
interface BoundPort {
  /**
   * The key used to refer to this object in the boundPorts map.
   */
  mapKey: string;
  /**
   * The target string, passed through parseUri -> mapUriDefaultScheme. Used
   * to determine the final key when the port number is 0.
   */
  originalUri: GrpcUri;
  /**
   * If there is a pending bindAsync operation, this is a promise that resolves
   * with the port number when that operation succeeds. If there is no such
   * operation pending, this is null.
   */
  completionPromise: Promise<number> | null;
  /**
   * The port number that was actually bound. Populated only after
   * completionPromise resolves.
   */
  portNumber: number;
  /**
   * Set by unbind if called while pending is true.
   */
  cancelled: boolean;
  /**
   * The credentials object passed to the original bindAsync call.
   */
  credentials: ServerCredentials;
  /**
   * The set of servers associated with this listening port. A target string
   * that expands to multiple addresses will result in multiple listening
   * servers.
   */
  listeningServers: Set<AnyHttp2Server>;
}

/**
 * Should be in a map keyed by AnyHttp2Server.
 */
interface Http2ServerInfo {
  channelzRef: SocketRef;
  sessions: Set<http2.ServerHttp2Session>;
  ownsChannelzRef: boolean;
}

interface SessionIdleTimeoutTracker {
  activeStreams: number;
  lastIdle: number;
  timeout: NodeJS.Timeout;
  onClose: (session: http2.ServerHttp2Session) => void | null;
}

export interface ServerOptions extends ChannelOptions {
  interceptors?: ServerInterceptor[];
}

export interface ConnectionInjector {
  injectConnection(connection: Duplex): void;
  drain(graceTimeMs: number): void;
  destroy(): void;
}

export class Server {
  private boundPorts: Map<string, BoundPort> = new Map();
  private http2Servers: Map<AnyHttp2Server, Http2ServerInfo> = new Map();
  private sessionIdleTimeouts = new Map<
    http2.ServerHttp2Session,
    SessionIdleTimeoutTracker
  >();

  private handlers: Map<string, UntypedHandler> = new Map<
    string,
    UntypedHandler
  >();
  private sessions = new Map<http2.ServerHttp2Session, ChannelzSessionInfo>();
  /**
   * This field only exists to ensure that the start method throws an error if
   * it is called twice, as it did previously.
   */
  private started = false;
  private shutdown = false;
  private options: ServerOptions;
  private serverAddressString = 'null';

  // Channelz Info
  private readonly channelzEnabled: boolean = true;
  private channelzRef: ServerRef;
  private channelzTrace: ChannelzTrace | ChannelzTraceStub;
  private callTracker: ChannelzCallTracker | ChannelzCallTrackerStub;
  private listenerChildrenTracker:
    | ChannelzChildrenTracker
    | ChannelzChildrenTrackerStub;
  private sessionChildrenTracker:
    | ChannelzChildrenTracker
    | ChannelzChildrenTrackerStub;

  private readonly maxConnectionAgeMs: number;
  private readonly maxConnectionAgeGraceMs: number;

  private readonly keepaliveTimeMs: number;
  private readonly keepaliveTimeoutMs: number;

  private readonly sessionIdleTimeout: number;

  private readonly interceptors: ServerInterceptor[];

  /**
   * Options that will be used to construct all Http2Server instances for this
   * Server.
   */
  private commonServerOptions: http2.ServerOptions;

  constructor(options?: ServerOptions) {
    this.options = options ?? {};
    if (this.options['grpc.enable_channelz'] === 0) {
      this.channelzEnabled = false;
      this.channelzTrace = new ChannelzTraceStub();
      this.callTracker = new ChannelzCallTrackerStub();
      this.listenerChildrenTracker = new ChannelzChildrenTrackerStub();
      this.sessionChildrenTracker = new ChannelzChildrenTrackerStub();
    } else {
      this.channelzTrace = new ChannelzTrace();
      this.callTracker = new ChannelzCallTracker();
      this.listenerChildrenTracker = new ChannelzChildrenTracker();
      this.sessionChildrenTracker = new ChannelzChildrenTracker();
    }

    this.channelzRef = registerChannelzServer(
      'server',
      () => this.getChannelzInfo(),
      this.channelzEnabled
    );

    this.channelzTrace.addTrace('CT_INFO', 'Server created');
    this.maxConnectionAgeMs =
      this.options['grpc.max_connection_age_ms'] ?? UNLIMITED_CONNECTION_AGE_MS;
    this.maxConnectionAgeGraceMs =
      this.options['grpc.max_connection_age_grace_ms'] ??
      UNLIMITED_CONNECTION_AGE_MS;
    this.keepaliveTimeMs =
      this.options['grpc.keepalive_time_ms'] ?? KEEPALIVE_MAX_TIME_MS;
    this.keepaliveTimeoutMs =
      this.options['grpc.keepalive_timeout_ms'] ?? KEEPALIVE_TIMEOUT_MS;
    this.sessionIdleTimeout =
      this.options['grpc.max_connection_idle_ms'] ?? MAX_CONNECTION_IDLE_MS;

    this.commonServerOptions = {
      maxSendHeaderBlockLength: Number.MAX_SAFE_INTEGER,
    };
    if ('grpc-node.max_session_memory' in this.options) {
      this.commonServerOptions.maxSessionMemory =
        this.options['grpc-node.max_session_memory'];
    } else {
      /* By default, set a very large max session memory limit, to effectively
       * disable enforcement of the limit. Some testing indicates that Node's
       * behavior degrades badly when this limit is reached, so we solve that
       * by disabling the check entirely. */
      this.commonServerOptions.maxSessionMemory = Number.MAX_SAFE_INTEGER;
    }
    if ('grpc.max_concurrent_streams' in this.options) {
      this.commonServerOptions.settings = {
        maxConcurrentStreams: this.options['grpc.max_concurrent_streams'],
      };
    }
    this.interceptors = this.options.interceptors ?? [];
    this.trace('Server constructed');
  }

  private getChannelzInfo(): ServerInfo {
    return {
      trace: this.channelzTrace,
      callTracker: this.callTracker,
      listenerChildren: this.listenerChildrenTracker.getChildLists(),
      sessionChildren: this.sessionChildrenTracker.getChildLists(),
    };
  }

  private getChannelzSessionInfo(
    session: http2.ServerHttp2Session
  ): SocketInfo {
    const sessionInfo = this.sessions.get(session)!;
    const sessionSocket = session.socket;
    const remoteAddress = sessionSocket.remoteAddress
      ? stringToSubchannelAddress(
          sessionSocket.remoteAddress,
          sessionSocket.remotePort
        )
      : null;
    const localAddress = sessionSocket.localAddress
      ? stringToSubchannelAddress(
          sessionSocket.localAddress!,
          sessionSocket.localPort
        )
      : null;
    let tlsInfo: TlsInfo | null;
    if (session.encrypted) {
      const tlsSocket: TLSSocket = sessionSocket as TLSSocket;
      const cipherInfo: CipherNameAndProtocol & { standardName?: string } =
        tlsSocket.getCipher();
      const certificate = tlsSocket.getCertificate();
      const peerCertificate = tlsSocket.getPeerCertificate();
      tlsInfo = {
        cipherSuiteStandardName: cipherInfo.standardName ?? null,
        cipherSuiteOtherName: cipherInfo.standardName ? null : cipherInfo.name,
        localCertificate:
          certificate && 'raw' in certificate ? certificate.raw : null,
        remoteCertificate:
          peerCertificate && 'raw' in peerCertificate
            ? peerCertificate.raw
            : null,
      };
    } else {
      tlsInfo = null;
    }
    const socketInfo: SocketInfo = {
      remoteAddress: remoteAddress,
      localAddress: localAddress,
      security: tlsInfo,
      remoteName: null,
      streamsStarted: sessionInfo.streamTracker.callsStarted,
      streamsSucceeded: sessionInfo.streamTracker.callsSucceeded,
      streamsFailed: sessionInfo.streamTracker.callsFailed,
      messagesSent: sessionInfo.messagesSent,
      messagesReceived: sessionInfo.messagesReceived,
      keepAlivesSent: sessionInfo.keepAlivesSent,
      lastLocalStreamCreatedTimestamp: null,
      lastRemoteStreamCreatedTimestamp:
        sessionInfo.streamTracker.lastCallStartedTimestamp,
      lastMessageSentTimestamp: sessionInfo.lastMessageSentTimestamp,
      lastMessageReceivedTimestamp: sessionInfo.lastMessageReceivedTimestamp,
      localFlowControlWindow: session.state.localWindowSize ?? null,
      remoteFlowControlWindow: session.state.remoteWindowSize ?? null,
    };
    return socketInfo;
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '(' + this.channelzRef.id + ') ' + text
    );
  }

  private keepaliveTrace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      'keepalive',
      '(' + this.channelzRef.id + ') ' + text
    );
  }

  addProtoService(): never {
    throw new Error('Not implemented. Use addService() instead');
  }

  addService(
    service: ServiceDefinition,
    implementation: UntypedServiceImplementation
  ): void {
    if (
      service === null ||
      typeof service !== 'object' ||
      implementation === null ||
      typeof implementation !== 'object'
    ) {
      throw new Error('addService() requires two objects as arguments');
    }

    const serviceKeys = Object.keys(service);

    if (serviceKeys.length === 0) {
      throw new Error('Cannot add an empty service to a server');
    }

    serviceKeys.forEach(name => {
      const attrs = service[name];
      let methodType: HandlerType;

      if (attrs.requestStream) {
        if (attrs.responseStream) {
          methodType = 'bidi';
        } else {
          methodType = 'clientStream';
        }
      } else {
        if (attrs.responseStream) {
          methodType = 'serverStream';
        } else {
          methodType = 'unary';
        }
      }

      let implFn = implementation[name];
      let impl;

      if (implFn === undefined && typeof attrs.originalName === 'string') {
        implFn = implementation[attrs.originalName];
      }

      if (implFn !== undefined) {
        impl = implFn.bind(implementation);
      } else {
        impl = getDefaultHandler(methodType, name);
      }

      const success = this.register(
        attrs.path,
        impl as UntypedHandleCall,
        attrs.responseSerialize,
        attrs.requestDeserialize,
        methodType
      );

      if (success === false) {
        throw new Error(`Method handler for ${attrs.path} already provided.`);
      }
    });
  }

  removeService(service: ServiceDefinition): void {
    if (service === null || typeof service !== 'object') {
      throw new Error('removeService() requires object as argument');
    }

    const serviceKeys = Object.keys(service);
    serviceKeys.forEach(name => {
      const attrs = service[name];
      this.unregister(attrs.path);
    });
  }

  bind(port: string, creds: ServerCredentials): never {
    throw new Error('Not implemented. Use bindAsync() instead');
  }

  /**
   * This API is experimental, so API stability is not guaranteed across minor versions.
   * @param boundAddress
   * @returns
   */
  protected experimentalRegisterListenerToChannelz(boundAddress: SubchannelAddress) {
    return registerChannelzSocket(
      subchannelAddressToString(boundAddress),
      () => {
        return {
          localAddress: boundAddress,
          remoteAddress: null,
          security: null,
          remoteName: null,
          streamsStarted: 0,
          streamsSucceeded: 0,
          streamsFailed: 0,
          messagesSent: 0,
          messagesReceived: 0,
          keepAlivesSent: 0,
          lastLocalStreamCreatedTimestamp: null,
          lastRemoteStreamCreatedTimestamp: null,
          lastMessageSentTimestamp: null,
          lastMessageReceivedTimestamp: null,
          localFlowControlWindow: null,
          remoteFlowControlWindow: null,
        };
      },
      this.channelzEnabled
    );
  }

  protected experimentalUnregisterListenerFromChannelz(channelzRef: SocketRef) {
    unregisterChannelzRef(channelzRef);
  }

  private createHttp2Server(credentials: ServerCredentials) {
    let http2Server: http2.Http2Server | http2.Http2SecureServer;
    if (credentials._isSecure()) {
      const constructorOptions = credentials._getConstructorOptions();
      const contextOptions = credentials._getSecureContextOptions();
      const secureServerOptions: http2.SecureServerOptions = {
        ...this.commonServerOptions,
        ...constructorOptions,
        ...contextOptions,
        enableTrace: this.options['grpc-node.tls_enable_trace'] === 1
      };
      let areCredentialsValid = contextOptions !== null;
      this.trace('Initial credentials valid: ' + areCredentialsValid);
      http2Server = http2.createSecureServer(secureServerOptions);
      http2Server.prependListener('connection', (socket: Socket) => {
        if (!areCredentialsValid) {
          this.trace('Dropped connection from ' + JSON.stringify(socket.address()) + ' due to unloaded credentials');
          socket.destroy();
        }
      });
      http2Server.on('secureConnection', (socket: TLSSocket) => {
        /* These errors need to be handled by the user of Http2SecureServer,
         * according to https://github.com/nodejs/node/issues/35824 */
        socket.on('error', (e: Error) => {
          this.trace(
            'An incoming TLS connection closed with error: ' + e.message
          );
        });
      });
      const credsWatcher: SecureContextWatcher = options => {
        if (options) {
          const secureServer = http2Server as http2.Http2SecureServer;
          try {
            secureServer.setSecureContext(options);
          } catch (e) {
            logging.log(LogVerbosity.ERROR, 'Failed to set secure context with error ' + (e as Error).message);
            options = null;
          }
        }
        areCredentialsValid = options !== null;
        this.trace('Post-update credentials valid: ' + areCredentialsValid);
      }
      credentials._addWatcher(credsWatcher);
      http2Server.on('close', () => {
        credentials._removeWatcher(credsWatcher);
      });
    } else {
      http2Server = http2.createServer(this.commonServerOptions);
    }

    http2Server.setTimeout(0, noop);
    this._setupHandlers(http2Server, credentials._getInterceptors());
    return http2Server;
  }

  private bindOneAddress(
    address: SubchannelAddress,
    boundPortObject: BoundPort
  ): Promise<SingleAddressBindResult> {
    this.trace('Attempting to bind ' + subchannelAddressToString(address));
    const http2Server = this.createHttp2Server(boundPortObject.credentials);
    return new Promise<SingleAddressBindResult>((resolve, reject) => {
      const onError = (err: Error) => {
        this.trace(
          'Failed to bind ' +
            subchannelAddressToString(address) +
            ' with error ' +
            err.message
        );
        resolve({
          port: 'port' in address ? address.port : 1,
          error: err.message,
        });
      };

      http2Server.once('error', onError);

      http2Server.listen(address, () => {
        const boundAddress = http2Server.address()!;
        let boundSubchannelAddress: SubchannelAddress;
        if (typeof boundAddress === 'string') {
          boundSubchannelAddress = {
            path: boundAddress,
          };
        } else {
          boundSubchannelAddress = {
            host: boundAddress.address,
            port: boundAddress.port,
          };
        }

        const channelzRef = this.experimentalRegisterListenerToChannelz(
          boundSubchannelAddress
        );
        this.listenerChildrenTracker.refChild(channelzRef);

        this.http2Servers.set(http2Server, {
          channelzRef: channelzRef,
          sessions: new Set(),
          ownsChannelzRef: true
        });
        boundPortObject.listeningServers.add(http2Server);
        this.trace(
          'Successfully bound ' +
            subchannelAddressToString(boundSubchannelAddress)
        );
        resolve({
          port:
            'port' in boundSubchannelAddress ? boundSubchannelAddress.port : 1,
        });
        http2Server.removeListener('error', onError);
      });
    });
  }

  private async bindManyPorts(
    addressList: SubchannelAddress[],
    boundPortObject: BoundPort
  ): Promise<BindResult> {
    if (addressList.length === 0) {
      return {
        count: 0,
        port: 0,
        errors: [],
      };
    }
    if (isTcpSubchannelAddress(addressList[0]) && addressList[0].port === 0) {
      /* If binding to port 0, first try to bind the first address, then bind
       * the rest of the address list to the specific port that it binds. */
      const firstAddressResult = await this.bindOneAddress(
        addressList[0],
        boundPortObject
      );
      if (firstAddressResult.error) {
        /* If the first address fails to bind, try the same operation starting
         * from the second item in the list. */
        const restAddressResult = await this.bindManyPorts(
          addressList.slice(1),
          boundPortObject
        );
        return {
          ...restAddressResult,
          errors: [firstAddressResult.error, ...restAddressResult.errors],
        };
      } else {
        const restAddresses = addressList
          .slice(1)
          .map(address =>
            isTcpSubchannelAddress(address)
              ? { host: address.host, port: firstAddressResult.port }
              : address
          );
        const restAddressResult = await Promise.all(
          restAddresses.map(address =>
            this.bindOneAddress(address, boundPortObject)
          )
        );
        const allResults = [firstAddressResult, ...restAddressResult];
        return {
          count: allResults.filter(result => result.error === undefined).length,
          port: firstAddressResult.port,
          errors: allResults
            .filter(result => result.error)
            .map(result => result.error!),
        };
      }
    } else {
      const allResults = await Promise.all(
        addressList.map(address =>
          this.bindOneAddress(address, boundPortObject)
        )
      );
      return {
        count: allResults.filter(result => result.error === undefined).length,
        port: allResults[0].port,
        errors: allResults
          .filter(result => result.error)
          .map(result => result.error!),
      };
    }
  }

  private async bindAddressList(
    addressList: SubchannelAddress[],
    boundPortObject: BoundPort
  ): Promise<number> {
    const bindResult = await this.bindManyPorts(addressList, boundPortObject);
    if (bindResult.count > 0) {
      if (bindResult.count < addressList.length) {
        logging.log(
          LogVerbosity.INFO,
          `WARNING Only ${bindResult.count} addresses added out of total ${addressList.length} resolved`
        );
      }
      return bindResult.port;
    } else {
      const errorString = `No address added out of total ${addressList.length} resolved`;
      logging.log(LogVerbosity.ERROR, errorString);
      throw new Error(
        `${errorString} errors: [${bindResult.errors.join(',')}]`
      );
    }
  }

  private resolvePort(port: GrpcUri): Promise<SubchannelAddress[]> {
    return new Promise<SubchannelAddress[]>((resolve, reject) => {
      const resolverListener: ResolverListener = {
        onSuccessfulResolution: (
          endpointList,
          serviceConfig,
          serviceConfigError
        ) => {
          // We only want one resolution result. Discard all future results
          resolverListener.onSuccessfulResolution = () => {};
          const addressList = ([] as SubchannelAddress[]).concat(
            ...endpointList.map(endpoint => endpoint.addresses)
          );
          if (addressList.length === 0) {
            reject(new Error(`No addresses resolved for port ${port}`));
            return;
          }
          resolve(addressList);
        },
        onError: error => {
          reject(new Error(error.details));
        },
      };
      const resolver = createResolver(port, resolverListener, this.options);
      resolver.updateResolution();
    });
  }

  private async bindPort(
    port: GrpcUri,
    boundPortObject: BoundPort
  ): Promise<number> {
    const addressList = await this.resolvePort(port);
    if (boundPortObject.cancelled) {
      this.completeUnbind(boundPortObject);
      throw new Error('bindAsync operation cancelled by unbind call');
    }
    const portNumber = await this.bindAddressList(addressList, boundPortObject);
    if (boundPortObject.cancelled) {
      this.completeUnbind(boundPortObject);
      throw new Error('bindAsync operation cancelled by unbind call');
    }
    return portNumber;
  }

  private normalizePort(port: string): GrpcUri {
    const initialPortUri = parseUri(port);
    if (initialPortUri === null) {
      throw new Error(`Could not parse port "${port}"`);
    }
    const portUri = mapUriDefaultScheme(initialPortUri);
    if (portUri === null) {
      throw new Error(`Could not get a default scheme for port "${port}"`);
    }
    return portUri;
  }

  bindAsync(
    port: string,
    creds: ServerCredentials,
    callback: (error: Error | null, port: number) => void
  ): void {
    if (this.shutdown) {
      throw new Error('bindAsync called after shutdown');
    }
    if (typeof port !== 'string') {
      throw new TypeError('port must be a string');
    }

    if (creds === null || !(creds instanceof ServerCredentials)) {
      throw new TypeError('creds must be a ServerCredentials object');
    }

    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }

    this.trace('bindAsync port=' + port);

    const portUri = this.normalizePort(port);

    const deferredCallback = (error: Error | null, port: number) => {
      process.nextTick(() => callback(error, port));
    };

    /* First, if this port is already bound or that bind operation is in
     * progress, use that result. */
    let boundPortObject = this.boundPorts.get(uriToString(portUri));
    if (boundPortObject) {
      if (!creds._equals(boundPortObject.credentials)) {
        deferredCallback(
          new Error(`${port} already bound with incompatible credentials`),
          0
        );
        return;
      }
      /* If that operation has previously been cancelled by an unbind call,
       * uncancel it. */
      boundPortObject.cancelled = false;
      if (boundPortObject.completionPromise) {
        boundPortObject.completionPromise.then(
          portNum => callback(null, portNum),
          error => callback(error as Error, 0)
        );
      } else {
        deferredCallback(null, boundPortObject.portNumber);
      }
      return;
    }
    boundPortObject = {
      mapKey: uriToString(portUri),
      originalUri: portUri,
      completionPromise: null,
      cancelled: false,
      portNumber: 0,
      credentials: creds,
      listeningServers: new Set(),
    };
    const splitPort = splitHostPort(portUri.path);
    const completionPromise = this.bindPort(portUri, boundPortObject);
    boundPortObject.completionPromise = completionPromise;
    /* If the port number is 0, defer populating the map entry until after the
     * bind operation completes and we have a specific port number. Otherwise,
     * populate it immediately. */
    if (splitPort?.port === 0) {
      completionPromise.then(
        portNum => {
          const finalUri: GrpcUri = {
            scheme: portUri.scheme,
            authority: portUri.authority,
            path: combineHostPort({ host: splitPort.host, port: portNum }),
          };
          boundPortObject!.mapKey = uriToString(finalUri);
          boundPortObject!.completionPromise = null;
          boundPortObject!.portNumber = portNum;
          this.boundPorts.set(boundPortObject!.mapKey, boundPortObject!);
          callback(null, portNum);
        },
        error => {
          callback(error, 0);
        }
      );
    } else {
      this.boundPorts.set(boundPortObject.mapKey, boundPortObject);
      completionPromise.then(
        portNum => {
          boundPortObject!.completionPromise = null;
          boundPortObject!.portNumber = portNum;
          callback(null, portNum);
        },
        error => {
          callback(error, 0);
        }
      );
    }
  }

  private registerInjectorToChannelz() {
    return registerChannelzSocket(
      'injector',
      () => {
        return {
          localAddress: null,
          remoteAddress: null,
          security: null,
          remoteName: null,
          streamsStarted: 0,
          streamsSucceeded: 0,
          streamsFailed: 0,
          messagesSent: 0,
          messagesReceived: 0,
          keepAlivesSent: 0,
          lastLocalStreamCreatedTimestamp: null,
          lastRemoteStreamCreatedTimestamp: null,
          lastMessageSentTimestamp: null,
          lastMessageReceivedTimestamp: null,
          localFlowControlWindow: null,
          remoteFlowControlWindow: null,
        };
      },
      this.channelzEnabled
    );
  }

  /**
   * This API is experimental, so API stability is not guaranteed across minor versions.
   * @param credentials
   * @param channelzRef
   * @returns
   */
  protected experimentalCreateConnectionInjectorWithChannelzRef(credentials: ServerCredentials, channelzRef: SocketRef, ownsChannelzRef=false) {
    if (credentials === null || !(credentials instanceof ServerCredentials)) {
      throw new TypeError('creds must be a ServerCredentials object');
    }
    if (this.channelzEnabled) {
      this.listenerChildrenTracker.refChild(channelzRef);
    }
    const server = this.createHttp2Server(credentials);
    const sessionsSet: Set<http2.ServerHttp2Session> = new Set();
    this.http2Servers.set(server, {
      channelzRef: channelzRef,
      sessions: sessionsSet,
      ownsChannelzRef
    });
    return {
      injectConnection: (connection: Duplex) => {
        server.emit('connection', connection);
      },
      drain: (graceTimeMs: number) => {
        for (const session of sessionsSet) {
          this.closeSession(session);
        }
        setTimeout(() => {
          for (const session of sessionsSet) {
            session.destroy(http2.constants.NGHTTP2_CANCEL as any);
          }
        }, graceTimeMs).unref?.();
      },
      destroy: () => {
        this.closeServer(server)
        for (const session of sessionsSet) {
          this.closeSession(session);
        }
      }
    };
  }

  createConnectionInjector(credentials: ServerCredentials): ConnectionInjector {
    if (credentials === null || !(credentials instanceof ServerCredentials)) {
      throw new TypeError('creds must be a ServerCredentials object');
    }
    const channelzRef = this.registerInjectorToChannelz();
    return this.experimentalCreateConnectionInjectorWithChannelzRef(credentials, channelzRef, true);
  }

  private closeServer(server: AnyHttp2Server, callback?: () => void) {
    this.trace(
      'Closing server with address ' + JSON.stringify(server.address())
    );
    const serverInfo = this.http2Servers.get(server);
    server.close(() => {
      if (serverInfo && serverInfo.ownsChannelzRef) {
        this.listenerChildrenTracker.unrefChild(serverInfo.channelzRef);
        unregisterChannelzRef(serverInfo.channelzRef);
      }
      this.http2Servers.delete(server);
      callback?.();
    });
  }

  private closeSession(
    session: http2.ServerHttp2Session,
    callback?: () => void
  ) {
    this.trace('Closing session initiated by ' + session.socket?.remoteAddress);
    const sessionInfo = this.sessions.get(session);
    const closeCallback = () => {
      if (sessionInfo) {
        this.sessionChildrenTracker.unrefChild(sessionInfo.ref);
        unregisterChannelzRef(sessionInfo.ref);
      }
      callback?.();
    };
    if (session.closed) {
      queueMicrotask(closeCallback);
    } else {
      session.close(closeCallback);
    }
  }

  private completeUnbind(boundPortObject: BoundPort) {
    for (const server of boundPortObject.listeningServers) {
      const serverInfo = this.http2Servers.get(server);
      this.closeServer(server, () => {
        boundPortObject.listeningServers.delete(server);
      });
      if (serverInfo) {
        for (const session of serverInfo.sessions) {
          this.closeSession(session);
        }
      }
    }
    this.boundPorts.delete(boundPortObject.mapKey);
  }

  /**
   * Unbind a previously bound port, or cancel an in-progress bindAsync
   * operation. If port 0 was bound, only the actual bound port can be
   * unbound. For example, if bindAsync was called with "localhost:0" and the
   * bound port result was 54321, it can be unbound as "localhost:54321".
   * @param port
   */
  unbind(port: string): void {
    this.trace('unbind port=' + port);
    const portUri = this.normalizePort(port);
    const splitPort = splitHostPort(portUri.path);
    if (splitPort?.port === 0) {
      throw new Error('Cannot unbind port 0');
    }
    const boundPortObject = this.boundPorts.get(uriToString(portUri));
    if (boundPortObject) {
      this.trace(
        'unbinding ' +
          boundPortObject.mapKey +
          ' originally bound as ' +
          uriToString(boundPortObject.originalUri)
      );
      /* If the bind operation is pending, the cancelled flag will trigger
       * the unbind operation later. */
      if (boundPortObject.completionPromise) {
        boundPortObject.cancelled = true;
      } else {
        this.completeUnbind(boundPortObject);
      }
    }
  }

  /**
   * Gracefully close all connections associated with a previously bound port.
   * After the grace time, forcefully close all remaining open connections.
   *
   * If port 0 was bound, only the actual bound port can be
   * drained. For example, if bindAsync was called with "localhost:0" and the
   * bound port result was 54321, it can be drained as "localhost:54321".
   * @param port
   * @param graceTimeMs
   * @returns
   */
  drain(port: string, graceTimeMs: number): void {
    this.trace('drain port=' + port + ' graceTimeMs=' + graceTimeMs);
    const portUri = this.normalizePort(port);
    const splitPort = splitHostPort(portUri.path);
    if (splitPort?.port === 0) {
      throw new Error('Cannot drain port 0');
    }
    const boundPortObject = this.boundPorts.get(uriToString(portUri));
    if (!boundPortObject) {
      return;
    }
    const allSessions: Set<http2.Http2Session> = new Set();
    for (const http2Server of boundPortObject.listeningServers) {
      const serverEntry = this.http2Servers.get(http2Server);
      if (serverEntry) {
        for (const session of serverEntry.sessions) {
          allSessions.add(session);
          this.closeSession(session, () => {
            allSessions.delete(session);
          });
        }
      }
    }
    /* After the grace time ends, send another goaway to all remaining sessions
     * with the CANCEL code. */
    setTimeout(() => {
      for (const session of allSessions) {
        session.destroy(http2.constants.NGHTTP2_CANCEL as any);
      }
    }, graceTimeMs).unref?.();
  }

  forceShutdown(): void {
    for (const boundPortObject of this.boundPorts.values()) {
      boundPortObject.cancelled = true;
    }
    this.boundPorts.clear();
    // Close the server if it is still running.
    for (const server of this.http2Servers.keys()) {
      this.closeServer(server);
    }

    // Always destroy any available sessions. It's possible that one or more
    // tryShutdown() calls are in progress. Don't wait on them to finish.
    this.sessions.forEach((channelzInfo, session) => {
      this.closeSession(session);
      // Cast NGHTTP2_CANCEL to any because TypeScript doesn't seem to
      // recognize destroy(code) as a valid signature.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.destroy(http2.constants.NGHTTP2_CANCEL as any);
    });
    this.sessions.clear();
    unregisterChannelzRef(this.channelzRef);

    this.shutdown = true;
  }

  register<RequestType, ResponseType>(
    name: string,
    handler: HandleCall<RequestType, ResponseType>,
    serialize: Serialize<ResponseType>,
    deserialize: Deserialize<RequestType>,
    type: string
  ): boolean {
    if (this.handlers.has(name)) {
      return false;
    }

    this.handlers.set(name, {
      func: handler,
      serialize,
      deserialize,
      type,
      path: name,
    } as UntypedHandler);
    return true;
  }

  unregister(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * @deprecated No longer needed as of version 1.10.x
   */
  @deprecate(
    'Calling start() is no longer necessary. It can be safely omitted.'
  )
  start(): void {
    if (
      this.http2Servers.size === 0 ||
      [...this.http2Servers.keys()].every(server => !server.listening)
    ) {
      throw new Error('server must be bound in order to start');
    }

    if (this.started === true) {
      throw new Error('server is already started');
    }
    this.started = true;
  }

  tryShutdown(callback: (error?: Error) => void): void {
    const wrappedCallback = (error?: Error) => {
      unregisterChannelzRef(this.channelzRef);
      callback(error);
    };
    let pendingChecks = 0;

    function maybeCallback(): void {
      pendingChecks--;

      if (pendingChecks === 0) {
        wrappedCallback();
      }
    }
    this.shutdown = true;

    for (const [serverKey, server] of this.http2Servers.entries()) {
      pendingChecks++;
      const serverString = server.channelzRef.name;
      this.trace('Waiting for server ' + serverString + ' to close');
      this.closeServer(serverKey, () => {
        this.trace('Server ' + serverString + ' finished closing');
        maybeCallback();
      });

      for (const session of server.sessions.keys()) {
        pendingChecks++;
        const sessionString = session.socket?.remoteAddress;
        this.trace('Waiting for session ' + sessionString + ' to close');
        this.closeSession(session, () => {
          this.trace('Session ' + sessionString + ' finished closing');
          maybeCallback();
        });
      }
    }

    if (pendingChecks === 0) {
      wrappedCallback();
    }
  }

  addHttp2Port(): never {
    throw new Error('Not yet implemented');
  }

  /**
   * Get the channelz reference object for this server. The returned value is
   * garbage if channelz is disabled for this server.
   * @returns
   */
  getChannelzRef() {
    return this.channelzRef;
  }

  private _verifyContentType(
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  ): boolean {
    const contentType = headers[http2.constants.HTTP2_HEADER_CONTENT_TYPE];

    if (
      typeof contentType !== 'string' ||
      !contentType.startsWith('application/grpc')
    ) {
      stream.respond(
        {
          [http2.constants.HTTP2_HEADER_STATUS]:
            http2.constants.HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
        },
        { endStream: true }
      );
      return false;
    }

    return true;
  }

  private _retrieveHandler(path: string): Handler<any, any> | null {
    serverCallTrace(
      'Received call to method ' +
        path +
        ' at address ' +
        this.serverAddressString
    );

    const handler = this.handlers.get(path);

    if (handler === undefined) {
      serverCallTrace(
        'No handler registered for method ' +
          path +
          '. Sending UNIMPLEMENTED status.'
      );
      return null;
    }

    return handler;
  }

  private _respondWithError(
    err: PartialStatusObject,
    stream: http2.ServerHttp2Stream,
    channelzSessionInfo: ChannelzSessionInfo | null = null
  ) {
    const trailersToSend = {
      'grpc-status': err.code ?? Status.INTERNAL,
      'grpc-message': err.details,
      [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_OK,
      [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/grpc+proto',
      ...err.metadata?.toHttp2Headers(),
    };
    stream.respond(trailersToSend, { endStream: true });

    this.callTracker.addCallFailed();
    channelzSessionInfo?.streamTracker.addCallFailed();
  }

  private _channelzHandler(
    extraInterceptors: ServerInterceptor[],
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  ) {
    // for handling idle timeout
    this.onStreamOpened(stream);

    const channelzSessionInfo = this.sessions.get(
      stream.session as http2.ServerHttp2Session
    );

    this.callTracker.addCallStarted();
    channelzSessionInfo?.streamTracker.addCallStarted();

    if (!this._verifyContentType(stream, headers)) {
      this.callTracker.addCallFailed();
      channelzSessionInfo?.streamTracker.addCallFailed();
      return;
    }

    const path = headers[HTTP2_HEADER_PATH] as string;

    const handler = this._retrieveHandler(path);
    if (!handler) {
      this._respondWithError(
        getUnimplementedStatusResponse(path),
        stream,
        channelzSessionInfo
      );
      return;
    }

    const callEventTracker: CallEventTracker = {
      addMessageSent: () => {
        if (channelzSessionInfo) {
          channelzSessionInfo.messagesSent += 1;
          channelzSessionInfo.lastMessageSentTimestamp = new Date();
        }
      },
      addMessageReceived: () => {
        if (channelzSessionInfo) {
          channelzSessionInfo.messagesReceived += 1;
          channelzSessionInfo.lastMessageReceivedTimestamp = new Date();
        }
      },
      onCallEnd: status => {
        if (status.code === Status.OK) {
          this.callTracker.addCallSucceeded();
        } else {
          this.callTracker.addCallFailed();
        }
      },
      onStreamEnd: success => {
        if (channelzSessionInfo) {
          if (success) {
            channelzSessionInfo.streamTracker.addCallSucceeded();
          } else {
            channelzSessionInfo.streamTracker.addCallFailed();
          }
        }
      },
    };

    const call = getServerInterceptingCall(
      [...extraInterceptors, ...this.interceptors],
      stream,
      headers,
      callEventTracker,
      handler,
      this.options
    );

    if (!this._runHandlerForCall(call, handler)) {
      this.callTracker.addCallFailed();
      channelzSessionInfo?.streamTracker.addCallFailed();

      call.sendStatus({
        code: Status.INTERNAL,
        details: `Unknown handler type: ${handler.type}`,
      });
    }
  }

  private _streamHandler(
    extraInterceptors: ServerInterceptor[],
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  ) {
    // for handling idle timeout
    this.onStreamOpened(stream);

    if (this._verifyContentType(stream, headers) !== true) {
      return;
    }

    const path = headers[HTTP2_HEADER_PATH] as string;

    const handler = this._retrieveHandler(path);
    if (!handler) {
      this._respondWithError(
        getUnimplementedStatusResponse(path),
        stream,
        null
      );
      return;
    }

    const call = getServerInterceptingCall(
      [...extraInterceptors, ...this.interceptors],
      stream,
      headers,
      null,
      handler,
      this.options
    );

    if (!this._runHandlerForCall(call, handler)) {
      call.sendStatus({
        code: Status.INTERNAL,
        details: `Unknown handler type: ${handler.type}`,
      });
    }
  }

  private _runHandlerForCall(
    call: ServerInterceptingCallInterface,
    handler:
      | UntypedUnaryHandler
      | UntypedClientStreamingHandler
      | UntypedServerStreamingHandler
      | UntypedBidiStreamingHandler
  ): boolean {
    const { type } = handler;
    if (type === 'unary') {
      handleUnary(call, handler);
    } else if (type === 'clientStream') {
      handleClientStreaming(call, handler);
    } else if (type === 'serverStream') {
      handleServerStreaming(call, handler);
    } else if (type === 'bidi') {
      handleBidiStreaming(call, handler);
    } else {
      return false;
    }

    return true;
  }

  private _setupHandlers(
    http2Server: http2.Http2Server | http2.Http2SecureServer,
    extraInterceptors: ServerInterceptor[]
  ): void {
    if (http2Server === null) {
      return;
    }

    const serverAddress = http2Server.address();
    let serverAddressString = 'null';
    if (serverAddress) {
      if (typeof serverAddress === 'string') {
        serverAddressString = serverAddress;
      } else {
        serverAddressString = serverAddress.address + ':' + serverAddress.port;
      }
    }
    this.serverAddressString = serverAddressString;

    const handler = this.channelzEnabled
      ? this._channelzHandler
      : this._streamHandler;

    const sessionHandler = this.channelzEnabled
      ? this._channelzSessionHandler(http2Server)
      : this._sessionHandler(http2Server);

    http2Server.on('stream', handler.bind(this, extraInterceptors));
    http2Server.on('session', sessionHandler);
  }

  private _sessionHandler(
    http2Server: http2.Http2Server | http2.Http2SecureServer
  ) {
    return (session: http2.ServerHttp2Session) => {
      this.http2Servers.get(http2Server)?.sessions.add(session);

      let connectionAgeTimer: NodeJS.Timeout | null = null;
      let connectionAgeGraceTimer: NodeJS.Timeout | null = null;
      let keepaliveTimer: NodeJS.Timeout | null = null;
      let sessionClosedByServer = false;

      const idleTimeoutObj = this.enableIdleTimeout(session);

      if (this.maxConnectionAgeMs !== UNLIMITED_CONNECTION_AGE_MS) {
        // Apply a random jitter within a +/-10% range
        const jitterMagnitude = this.maxConnectionAgeMs / 10;
        const jitter = Math.random() * jitterMagnitude * 2 - jitterMagnitude;

        connectionAgeTimer = setTimeout(() => {
          sessionClosedByServer = true;

          this.trace(
            'Connection dropped by max connection age: ' +
              session.socket?.remoteAddress
          );

          try {
            session.goaway(
              http2.constants.NGHTTP2_NO_ERROR,
              ~(1 << 31),
              kMaxAge
            );
          } catch (e) {
            // The goaway can't be sent because the session is already closed
            session.destroy();
            return;
          }
          session.close();

          /* Allow a grace period after sending the GOAWAY before forcibly
           * closing the connection. */
          if (this.maxConnectionAgeGraceMs !== UNLIMITED_CONNECTION_AGE_MS) {
            connectionAgeGraceTimer = setTimeout(() => {
              session.destroy();
            }, this.maxConnectionAgeGraceMs);
            connectionAgeGraceTimer.unref?.();
          }
        }, this.maxConnectionAgeMs + jitter);
        connectionAgeTimer.unref?.();
      }

      const clearKeepaliveTimeout = () => {
        if (keepaliveTimer) {
          clearTimeout(keepaliveTimer);
          keepaliveTimer = null;
        }
      };

      const canSendPing = () => {
        return (
          !session.destroyed &&
          this.keepaliveTimeMs < KEEPALIVE_MAX_TIME_MS &&
          this.keepaliveTimeMs > 0
        );
      };

      /* eslint-disable-next-line prefer-const */
      let sendPing: () => void; // hoisted for use in maybeStartKeepalivePingTimer

      const maybeStartKeepalivePingTimer = () => {
        if (!canSendPing()) {
          return;
        }
        this.keepaliveTrace(
          'Starting keepalive timer for ' + this.keepaliveTimeMs + 'ms'
        );
        keepaliveTimer = setTimeout(() => {
          clearKeepaliveTimeout();
          sendPing();
        }, this.keepaliveTimeMs);
        keepaliveTimer.unref?.();
      };

      sendPing = () => {
        if (!canSendPing()) {
          return;
        }
        this.keepaliveTrace(
          'Sending ping with timeout ' + this.keepaliveTimeoutMs + 'ms'
        );
        let pingSendError = '';
        try {
          const pingSentSuccessfully = session.ping(
            (err: Error | null, duration: number, payload: Buffer) => {
              clearKeepaliveTimeout();
              if (err) {
                this.keepaliveTrace('Ping failed with error: ' + err.message);
                sessionClosedByServer = true;
                session.close();
              } else {
                this.keepaliveTrace('Received ping response');
                maybeStartKeepalivePingTimer();
              }
            }
          );
          if (!pingSentSuccessfully) {
            pingSendError = 'Ping returned false';
          }
        } catch (e) {
          // grpc/grpc-node#2139
          pingSendError =
            (e instanceof Error ? e.message : '') || 'Unknown error';
        }

        if (pingSendError) {
          this.keepaliveTrace('Ping send failed: ' + pingSendError);
          this.trace(
            'Connection dropped due to ping send error: ' + pingSendError
          );
          sessionClosedByServer = true;
          session.close();
          return;
        }

        keepaliveTimer = setTimeout(() => {
          clearKeepaliveTimeout();
          this.keepaliveTrace('Ping timeout passed without response');
          this.trace('Connection dropped by keepalive timeout');
          sessionClosedByServer = true;
          session.close();
        }, this.keepaliveTimeoutMs);
        keepaliveTimer.unref?.();
      };

      maybeStartKeepalivePingTimer();

      session.on('close', () => {
        if (!sessionClosedByServer) {
          this.trace(
            `Connection dropped by client ${session.socket?.remoteAddress}`
          );
        }

        if (connectionAgeTimer) {
          clearTimeout(connectionAgeTimer);
        }

        if (connectionAgeGraceTimer) {
          clearTimeout(connectionAgeGraceTimer);
        }

        clearKeepaliveTimeout();

        if (idleTimeoutObj !== null) {
          clearTimeout(idleTimeoutObj.timeout);
          this.sessionIdleTimeouts.delete(session);
        }

        this.http2Servers.get(http2Server)?.sessions.delete(session);
      });
    };
  }

  private _channelzSessionHandler(
    http2Server: http2.Http2Server | http2.Http2SecureServer
  ) {
    return (session: http2.ServerHttp2Session) => {
      const channelzRef = registerChannelzSocket(
        session.socket?.remoteAddress ?? 'unknown',
        this.getChannelzSessionInfo.bind(this, session),
        this.channelzEnabled
      );

      const channelzSessionInfo: ChannelzSessionInfo = {
        ref: channelzRef,
        streamTracker: new ChannelzCallTracker(),
        messagesSent: 0,
        messagesReceived: 0,
        keepAlivesSent: 0,
        lastMessageSentTimestamp: null,
        lastMessageReceivedTimestamp: null,
      };

      this.http2Servers.get(http2Server)?.sessions.add(session);
      this.sessions.set(session, channelzSessionInfo);
      const clientAddress = `${session.socket.remoteAddress}:${session.socket.remotePort}`;

      this.channelzTrace.addTrace(
        'CT_INFO',
        'Connection established by client ' + clientAddress
      );
      this.trace('Connection established by client ' + clientAddress);
      this.sessionChildrenTracker.refChild(channelzRef);

      let connectionAgeTimer: NodeJS.Timeout | null = null;
      let connectionAgeGraceTimer: NodeJS.Timeout | null = null;
      let keepaliveTimeout: NodeJS.Timeout | null = null;
      let sessionClosedByServer = false;

      const idleTimeoutObj = this.enableIdleTimeout(session);

      if (this.maxConnectionAgeMs !== UNLIMITED_CONNECTION_AGE_MS) {
        // Apply a random jitter within a +/-10% range
        const jitterMagnitude = this.maxConnectionAgeMs / 10;
        const jitter = Math.random() * jitterMagnitude * 2 - jitterMagnitude;

        connectionAgeTimer = setTimeout(() => {
          sessionClosedByServer = true;
          this.channelzTrace.addTrace(
            'CT_INFO',
            'Connection dropped by max connection age from ' + clientAddress
          );

          try {
            session.goaway(
              http2.constants.NGHTTP2_NO_ERROR,
              ~(1 << 31),
              kMaxAge
            );
          } catch (e) {
            // The goaway can't be sent because the session is already closed
            session.destroy();
            return;
          }
          session.close();

          /* Allow a grace period after sending the GOAWAY before forcibly
           * closing the connection. */
          if (this.maxConnectionAgeGraceMs !== UNLIMITED_CONNECTION_AGE_MS) {
            connectionAgeGraceTimer = setTimeout(() => {
              session.destroy();
            }, this.maxConnectionAgeGraceMs);
            connectionAgeGraceTimer.unref?.();
          }
        }, this.maxConnectionAgeMs + jitter);
        connectionAgeTimer.unref?.();
      }

      const clearKeepaliveTimeout = () => {
        if (keepaliveTimeout) {
          clearTimeout(keepaliveTimeout);
          keepaliveTimeout = null;
        }
      };

      const canSendPing = () => {
        return (
          !session.destroyed &&
          this.keepaliveTimeMs < KEEPALIVE_MAX_TIME_MS &&
          this.keepaliveTimeMs > 0
        );
      };

      /* eslint-disable-next-line prefer-const */
      let sendPing: () => void; // hoisted for use in maybeStartKeepalivePingTimer

      const maybeStartKeepalivePingTimer = () => {
        if (!canSendPing()) {
          return;
        }
        this.keepaliveTrace(
          'Starting keepalive timer for ' + this.keepaliveTimeMs + 'ms'
        );
        keepaliveTimeout = setTimeout(() => {
          clearKeepaliveTimeout();
          sendPing();
        }, this.keepaliveTimeMs);
        keepaliveTimeout.unref?.();
      };

      sendPing = () => {
        if (!canSendPing()) {
          return;
        }
        this.keepaliveTrace(
          'Sending ping with timeout ' + this.keepaliveTimeoutMs + 'ms'
        );
        let pingSendError = '';
        try {
          const pingSentSuccessfully = session.ping(
            (err: Error | null, duration: number, payload: Buffer) => {
              clearKeepaliveTimeout();
              if (err) {
                this.keepaliveTrace('Ping failed with error: ' + err.message);
                this.channelzTrace.addTrace(
                  'CT_INFO',
                  'Connection dropped due to error of a ping frame ' +
                    err.message +
                    ' return in ' +
                    duration
                );
                sessionClosedByServer = true;
                session.close();
              } else {
                this.keepaliveTrace('Received ping response');
                maybeStartKeepalivePingTimer();
              }
            }
          );
          if (!pingSentSuccessfully) {
            pingSendError = 'Ping returned false';
          }
        } catch (e) {
          // grpc/grpc-node#2139
          pingSendError =
            (e instanceof Error ? e.message : '') || 'Unknown error';
        }

        if (pingSendError) {
          this.keepaliveTrace('Ping send failed: ' + pingSendError);
          this.channelzTrace.addTrace(
            'CT_INFO',
            'Connection dropped due to ping send error: ' + pingSendError
          );
          sessionClosedByServer = true;
          session.close();
          return;
        }

        channelzSessionInfo.keepAlivesSent += 1;

        keepaliveTimeout = setTimeout(() => {
          clearKeepaliveTimeout();
          this.keepaliveTrace('Ping timeout passed without response');
          this.channelzTrace.addTrace(
            'CT_INFO',
            'Connection dropped by keepalive timeout from ' + clientAddress
          );
          sessionClosedByServer = true;
          session.close();
        }, this.keepaliveTimeoutMs);
        keepaliveTimeout.unref?.();
      };

      maybeStartKeepalivePingTimer();

      session.on('close', () => {
        if (!sessionClosedByServer) {
          this.channelzTrace.addTrace(
            'CT_INFO',
            'Connection dropped by client ' + clientAddress
          );
        }

        this.sessionChildrenTracker.unrefChild(channelzRef);
        unregisterChannelzRef(channelzRef);

        if (connectionAgeTimer) {
          clearTimeout(connectionAgeTimer);
        }

        if (connectionAgeGraceTimer) {
          clearTimeout(connectionAgeGraceTimer);
        }

        clearKeepaliveTimeout();

        if (idleTimeoutObj !== null) {
          clearTimeout(idleTimeoutObj.timeout);
          this.sessionIdleTimeouts.delete(session);
        }

        this.http2Servers.get(http2Server)?.sessions.delete(session);
        this.sessions.delete(session);
      });
    };
  }

  private enableIdleTimeout(
    session: http2.ServerHttp2Session
  ): SessionIdleTimeoutTracker | null {
    if (this.sessionIdleTimeout >= MAX_CONNECTION_IDLE_MS) {
      return null;
    }

    const idleTimeoutObj: SessionIdleTimeoutTracker = {
      activeStreams: 0,
      lastIdle: Date.now(),
      onClose: this.onStreamClose.bind(this, session),
      timeout: setTimeout(
        this.onIdleTimeout,
        this.sessionIdleTimeout,
        this,
        session
      ),
    };
    idleTimeoutObj.timeout.unref?.();
    this.sessionIdleTimeouts.set(session, idleTimeoutObj);

    const { socket } = session;
    this.trace(
      'Enable idle timeout for ' +
        socket.remoteAddress +
        ':' +
        socket.remotePort
    );

    return idleTimeoutObj;
  }

  private onIdleTimeout(
    this: undefined,
    ctx: Server,
    session: http2.ServerHttp2Session
  ) {
    const { socket } = session;
    const sessionInfo = ctx.sessionIdleTimeouts.get(session);

    // if it is called while we have activeStreams - timer will not be rescheduled
    // until last active stream is closed, then it will call .refresh() on the timer
    // important part is to not clearTimeout(timer) or it becomes unusable
    // for future refreshes
    if (
      sessionInfo !== undefined &&
      sessionInfo.activeStreams === 0
    ) {
      if (Date.now() - sessionInfo.lastIdle >= ctx.sessionIdleTimeout) {
        ctx.trace(
          'Session idle timeout triggered for ' +
            socket?.remoteAddress +
            ':' +
            socket?.remotePort +
            ' last idle at ' +
            sessionInfo.lastIdle
        );

        ctx.closeSession(session);
      } else {
        sessionInfo.timeout.refresh();
      }
    }
  }

  private onStreamOpened(stream: http2.ServerHttp2Stream) {
    const session = stream.session as http2.ServerHttp2Session;

    const idleTimeoutObj = this.sessionIdleTimeouts.get(session);
    if (idleTimeoutObj) {
      idleTimeoutObj.activeStreams += 1;
      stream.once('close', idleTimeoutObj.onClose);
    }
  }

  private onStreamClose(session: http2.ServerHttp2Session) {
    const idleTimeoutObj = this.sessionIdleTimeouts.get(session);

    if (idleTimeoutObj) {
      idleTimeoutObj.activeStreams -= 1;
      if (idleTimeoutObj.activeStreams === 0) {
        idleTimeoutObj.lastIdle = Date.now();
        idleTimeoutObj.timeout.refresh();

        this.trace(
          'Session onStreamClose' +
            session.socket?.remoteAddress +
            ':' +
            session.socket?.remotePort +
            ' at ' +
            idleTimeoutObj.lastIdle
        );
      }
    }
  }
}

async function handleUnary<RequestType, ResponseType>(
  call: ServerInterceptingCallInterface,
  handler: UnaryHandler<RequestType, ResponseType>
): Promise<void> {
  let stream: ServerUnaryCall<RequestType, ResponseType>;

  function respond(
    err: ServerErrorResponse | ServerStatusResponse | null,
    value?: ResponseType | null,
    trailer?: Metadata,
    flags?: number
  ) {
    if (err) {
      call.sendStatus(serverErrorToStatus(err, trailer));
      return;
    }
    call.sendMessage(value, () => {
      call.sendStatus({
        code: Status.OK,
        details: 'OK',
        metadata: trailer ?? null,
      });
    });
  }

  let requestMetadata: Metadata;
  let requestMessage: RequestType | null = null;
  call.start({
    onReceiveMetadata(metadata) {
      requestMetadata = metadata;
      call.startRead();
    },
    onReceiveMessage(message) {
      if (requestMessage) {
        call.sendStatus({
          code: Status.UNIMPLEMENTED,
          details: `Received a second request message for server streaming method ${handler.path}`,
          metadata: null,
        });
        return;
      }
      requestMessage = message;
      call.startRead();
    },
    onReceiveHalfClose() {
      if (!requestMessage) {
        call.sendStatus({
          code: Status.UNIMPLEMENTED,
          details: `Received no request message for server streaming method ${handler.path}`,
          metadata: null,
        });
        return;
      }
      stream = new ServerWritableStreamImpl(
        handler.path,
        call,
        requestMetadata,
        requestMessage
      );
      try {
        handler.func(stream, respond);
      } catch (err) {
        call.sendStatus({
          code: Status.UNKNOWN,
          details: `Server method handler threw error ${
            (err as Error).message
          }`,
          metadata: null,
        });
      }
    },
    onCancel() {
      if (stream) {
        stream.cancelled = true;
        stream.emit('cancelled', 'cancelled');
      }
    },
  });
}

function handleClientStreaming<RequestType, ResponseType>(
  call: ServerInterceptingCallInterface,
  handler: ClientStreamingHandler<RequestType, ResponseType>
): void {
  let stream: ServerReadableStream<RequestType, ResponseType>;

  function respond(
    err: ServerErrorResponse | ServerStatusResponse | null,
    value?: ResponseType | null,
    trailer?: Metadata,
    flags?: number
  ) {
    if (err) {
      call.sendStatus(serverErrorToStatus(err, trailer));
      return;
    }
    call.sendMessage(value, () => {
      call.sendStatus({
        code: Status.OK,
        details: 'OK',
        metadata: trailer ?? null,
      });
    });
  }

  call.start({
    onReceiveMetadata(metadata) {
      stream = new ServerDuplexStreamImpl(handler.path, call, metadata);
      try {
        handler.func(stream, respond);
      } catch (err) {
        call.sendStatus({
          code: Status.UNKNOWN,
          details: `Server method handler threw error ${
            (err as Error).message
          }`,
          metadata: null,
        });
      }
    },
    onReceiveMessage(message) {
      stream.push(message);
    },
    onReceiveHalfClose() {
      stream.push(null);
    },
    onCancel() {
      if (stream) {
        stream.cancelled = true;
        stream.emit('cancelled', 'cancelled');
        stream.destroy();
      }
    },
  });
}

function handleServerStreaming<RequestType, ResponseType>(
  call: ServerInterceptingCallInterface,
  handler: ServerStreamingHandler<RequestType, ResponseType>
): void {
  let stream: ServerWritableStream<RequestType, ResponseType>;

  let requestMetadata: Metadata;
  let requestMessage: RequestType | null = null;
  call.start({
    onReceiveMetadata(metadata) {
      requestMetadata = metadata;
      call.startRead();
    },
    onReceiveMessage(message) {
      if (requestMessage) {
        call.sendStatus({
          code: Status.UNIMPLEMENTED,
          details: `Received a second request message for server streaming method ${handler.path}`,
          metadata: null,
        });
        return;
      }
      requestMessage = message;
      call.startRead();
    },
    onReceiveHalfClose() {
      if (!requestMessage) {
        call.sendStatus({
          code: Status.UNIMPLEMENTED,
          details: `Received no request message for server streaming method ${handler.path}`,
          metadata: null,
        });
        return;
      }
      stream = new ServerWritableStreamImpl(
        handler.path,
        call,
        requestMetadata,
        requestMessage
      );
      try {
        handler.func(stream);
      } catch (err) {
        call.sendStatus({
          code: Status.UNKNOWN,
          details: `Server method handler threw error ${
            (err as Error).message
          }`,
          metadata: null,
        });
      }
    },
    onCancel() {
      if (stream) {
        stream.cancelled = true;
        stream.emit('cancelled', 'cancelled');
        stream.destroy();
      }
    },
  });
}

function handleBidiStreaming<RequestType, ResponseType>(
  call: ServerInterceptingCallInterface,
  handler: BidiStreamingHandler<RequestType, ResponseType>
): void {
  let stream: ServerDuplexStream<RequestType, ResponseType>;

  call.start({
    onReceiveMetadata(metadata) {
      stream = new ServerDuplexStreamImpl(handler.path, call, metadata);
      try {
        handler.func(stream);
      } catch (err) {
        call.sendStatus({
          code: Status.UNKNOWN,
          details: `Server method handler threw error ${
            (err as Error).message
          }`,
          metadata: null,
        });
      }
    },
    onReceiveMessage(message) {
      stream.push(message);
    },
    onReceiveHalfClose() {
      stream.push(null);
    },
    onCancel() {
      if (stream) {
        stream.cancelled = true;
        stream.emit('cancelled', 'cancelled');
        stream.destroy();
      }
    },
  });
}
