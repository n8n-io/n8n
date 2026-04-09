/*
 * Copyright 2023 gRPC authors.
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
import {
  CipherNameAndProtocol,
  TLSSocket,
} from 'tls';
import { PartialStatusObject } from './call-interface';
import { SecureConnector, SecureConnectResult } from './channel-credentials';
import { ChannelOptions } from './channel-options';
import {
  ChannelzCallTracker,
  ChannelzCallTrackerStub,
  registerChannelzSocket,
  SocketInfo,
  SocketRef,
  TlsInfo,
  unregisterChannelzRef,
} from './channelz';
import { LogVerbosity } from './constants';
import { getProxiedConnection } from './http_proxy';
import * as logging from './logging';
import { getDefaultAuthority } from './resolver';
import {
  stringToSubchannelAddress,
  SubchannelAddress,
  subchannelAddressToString,
} from './subchannel-address';
import { GrpcUri, parseUri, uriToString } from './uri-parser';
import * as net from 'net';
import {
  Http2SubchannelCall,
  SubchannelCall,
  SubchannelCallInterceptingListener,
} from './subchannel-call';
import { Metadata } from './metadata';
import { getNextCallNumber } from './call-number';
import { Socket } from 'net';
import { AuthContext } from './auth-context';

const TRACER_NAME = 'transport';
const FLOW_CONTROL_TRACER_NAME = 'transport_flowctrl';

const clientVersion = require('../../package.json').version;

const {
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_TE,
  HTTP2_HEADER_USER_AGENT,
} = http2.constants;

const KEEPALIVE_TIMEOUT_MS = 20000;

export interface CallEventTracker {
  addMessageSent(): void;
  addMessageReceived(): void;
  onCallEnd(status: PartialStatusObject): void;
  onStreamEnd(success: boolean): void;
}

export interface TransportDisconnectListener {
  (tooManyPings: boolean): void;
}

export interface Transport {
  getChannelzRef(): SocketRef;
  getPeerName(): string;
  getOptions(): ChannelOptions;
  getAuthContext(): AuthContext;
  createCall(
    metadata: Metadata,
    host: string,
    method: string,
    listener: SubchannelCallInterceptingListener,
    subchannelCallStatsTracker: Partial<CallEventTracker>
  ): SubchannelCall;
  addDisconnectListener(listener: TransportDisconnectListener): void;
  shutdown(): void;
}

const tooManyPingsData: Buffer = Buffer.from('too_many_pings', 'ascii');

class Http2Transport implements Transport {
  /**
   * The amount of time in between sending pings
   */
  private readonly keepaliveTimeMs: number;
  /**
   * The amount of time to wait for an acknowledgement after sending a ping
   */
  private readonly keepaliveTimeoutMs: number;
  /**
   * Indicates whether keepalive pings should be sent without any active calls
   */
  private readonly keepaliveWithoutCalls: boolean;
  /**
   * Timer reference indicating when to send the next ping or when the most recent ping will be considered lost.
   */
  private keepaliveTimer: NodeJS.Timeout | null = null;
  /**
   * Indicates that the keepalive timer ran out while there were no active
   * calls, and a ping should be sent the next time a call starts.
   */
  private pendingSendKeepalivePing = false;

  private userAgent: string;

  private activeCalls: Set<Http2SubchannelCall> = new Set();

  private subchannelAddressString: string;

  private disconnectListeners: TransportDisconnectListener[] = [];

  private disconnectHandled = false;

  private authContext: AuthContext;

  // Channelz info
  private channelzRef: SocketRef;
  private readonly channelzEnabled: boolean = true;
  private streamTracker: ChannelzCallTracker | ChannelzCallTrackerStub;
  private keepalivesSent = 0;
  private messagesSent = 0;
  private messagesReceived = 0;
  private lastMessageSentTimestamp: Date | null = null;
  private lastMessageReceivedTimestamp: Date | null = null;

  constructor(
    private session: http2.ClientHttp2Session,
    subchannelAddress: SubchannelAddress,
    private options: ChannelOptions,
    /**
     * Name of the remote server, if it is not the same as the subchannel
     * address, i.e. if connecting through an HTTP CONNECT proxy.
     */
    private remoteName: string | null
  ) {
    /* Populate subchannelAddressString and channelzRef before doing anything
     * else, because they are used in the trace methods. */
    this.subchannelAddressString = subchannelAddressToString(subchannelAddress);

    if (options['grpc.enable_channelz'] === 0) {
      this.channelzEnabled = false;
      this.streamTracker = new ChannelzCallTrackerStub();
    } else {
      this.streamTracker = new ChannelzCallTracker();
    }

    this.channelzRef = registerChannelzSocket(
      this.subchannelAddressString,
      () => this.getChannelzInfo(),
      this.channelzEnabled
    );

    // Build user-agent string.
    this.userAgent = [
      options['grpc.primary_user_agent'],
      `grpc-node-js/${clientVersion}`,
      options['grpc.secondary_user_agent'],
    ]
      .filter(e => e)
      .join(' '); // remove falsey values first

    if ('grpc.keepalive_time_ms' in options) {
      this.keepaliveTimeMs = options['grpc.keepalive_time_ms']!;
    } else {
      this.keepaliveTimeMs = -1;
    }
    if ('grpc.keepalive_timeout_ms' in options) {
      this.keepaliveTimeoutMs = options['grpc.keepalive_timeout_ms']!;
    } else {
      this.keepaliveTimeoutMs = KEEPALIVE_TIMEOUT_MS;
    }
    if ('grpc.keepalive_permit_without_calls' in options) {
      this.keepaliveWithoutCalls =
        options['grpc.keepalive_permit_without_calls'] === 1;
    } else {
      this.keepaliveWithoutCalls = false;
    }

    session.once('close', () => {
      this.trace('session closed');
      this.handleDisconnect();
    });

    session.once(
      'goaway',
      (errorCode: number, lastStreamID: number, opaqueData?: Buffer) => {
        let tooManyPings = false;
        /* See the last paragraph of
         * https://github.com/grpc/proposal/blob/master/A8-client-side-keepalive.md#basic-keepalive */
        if (
          errorCode === http2.constants.NGHTTP2_ENHANCE_YOUR_CALM &&
          opaqueData &&
          opaqueData.equals(tooManyPingsData)
        ) {
          tooManyPings = true;
        }
        this.trace(
          'connection closed by GOAWAY with code ' +
            errorCode +
            ' and data ' +
            opaqueData?.toString()
        );
        this.reportDisconnectToOwner(tooManyPings);
      }
    );

    session.once('error', error => {
      this.trace('connection closed with error ' + (error as Error).message);
      this.handleDisconnect();
    });

    session.socket.once('close', (hadError) => {
      this.trace('connection closed. hadError=' + hadError);
      this.handleDisconnect();
    });

    if (logging.isTracerEnabled(TRACER_NAME)) {
      session.on('remoteSettings', (settings: http2.Settings) => {
        this.trace(
          'new settings received' +
            (this.session !== session ? ' on the old connection' : '') +
            ': ' +
            JSON.stringify(settings)
        );
      });
      session.on('localSettings', (settings: http2.Settings) => {
        this.trace(
          'local settings acknowledged by remote' +
            (this.session !== session ? ' on the old connection' : '') +
            ': ' +
            JSON.stringify(settings)
        );
      });
    }

    /* Start the keepalive timer last, because this can trigger trace logs,
     * which should only happen after everything else is set up. */
    if (this.keepaliveWithoutCalls) {
      this.maybeStartKeepalivePingTimer();
    }

    if (session.socket instanceof TLSSocket) {
      this.authContext = {
        transportSecurityType: 'ssl',
        sslPeerCertificate: session.socket.getPeerCertificate()
      };
    } else {
      this.authContext = {};
    }
  }

  private getChannelzInfo(): SocketInfo {
    const sessionSocket = this.session.socket;
    const remoteAddress = sessionSocket.remoteAddress
      ? stringToSubchannelAddress(
          sessionSocket.remoteAddress,
          sessionSocket.remotePort
        )
      : null;
    const localAddress = sessionSocket.localAddress
      ? stringToSubchannelAddress(
          sessionSocket.localAddress,
          sessionSocket.localPort
        )
      : null;
    let tlsInfo: TlsInfo | null;
    if (this.session.encrypted) {
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
      remoteName: this.remoteName,
      streamsStarted: this.streamTracker.callsStarted,
      streamsSucceeded: this.streamTracker.callsSucceeded,
      streamsFailed: this.streamTracker.callsFailed,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      keepAlivesSent: this.keepalivesSent,
      lastLocalStreamCreatedTimestamp:
        this.streamTracker.lastCallStartedTimestamp,
      lastRemoteStreamCreatedTimestamp: null,
      lastMessageSentTimestamp: this.lastMessageSentTimestamp,
      lastMessageReceivedTimestamp: this.lastMessageReceivedTimestamp,
      localFlowControlWindow: this.session.state.localWindowSize ?? null,
      remoteFlowControlWindow: this.session.state.remoteWindowSize ?? null,
    };
    return socketInfo;
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  private keepaliveTrace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      'keepalive',
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  private flowControlTrace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      FLOW_CONTROL_TRACER_NAME,
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  private internalsTrace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      'transport_internals',
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  /**
   * Indicate to the owner of this object that this transport should no longer
   * be used. That happens if the connection drops, or if the server sends a
   * GOAWAY.
   * @param tooManyPings If true, this was triggered by a GOAWAY with data
   * indicating that the session was closed becaues the client sent too many
   * pings.
   * @returns
   */
  private reportDisconnectToOwner(tooManyPings: boolean) {
    if (this.disconnectHandled) {
      return;
    }
    this.disconnectHandled = true;
    this.disconnectListeners.forEach(listener => listener(tooManyPings));
  }

  /**
   * Handle connection drops, but not GOAWAYs.
   */
  private handleDisconnect() {
    this.clearKeepaliveTimeout();
    this.reportDisconnectToOwner(false);
    for (const call of this.activeCalls) {
      call.onDisconnect();
    }
    // Wait an event loop cycle before destroying the connection
    setImmediate(() => {
      this.session.destroy();
    });
  }

  addDisconnectListener(listener: TransportDisconnectListener): void {
    this.disconnectListeners.push(listener);
  }

  private canSendPing() {
    return (
      !this.session.destroyed &&
      this.keepaliveTimeMs > 0 &&
      (this.keepaliveWithoutCalls || this.activeCalls.size > 0)
    );
  }

  private maybeSendPing() {
    if (!this.canSendPing()) {
      this.pendingSendKeepalivePing = true;
      return;
    }
    if (this.keepaliveTimer) {
      console.error('keepaliveTimeout is not null');
      return;
    }
    if (this.channelzEnabled) {
      this.keepalivesSent += 1;
    }
    this.keepaliveTrace(
      'Sending ping with timeout ' + this.keepaliveTimeoutMs + 'ms'
    );
    this.keepaliveTimer = setTimeout(() => {
      this.keepaliveTimer = null;
      this.keepaliveTrace('Ping timeout passed without response');
      this.handleDisconnect();
    }, this.keepaliveTimeoutMs);
    this.keepaliveTimer.unref?.();
    let pingSendError = '';
    try {
      const pingSentSuccessfully = this.session.ping(
        (err: Error | null, duration: number, payload: Buffer) => {
          this.clearKeepaliveTimeout();
          if (err) {
            this.keepaliveTrace('Ping failed with error ' + err.message);
            this.handleDisconnect();
          } else {
            this.keepaliveTrace('Received ping response');
            this.maybeStartKeepalivePingTimer();
          }
        }
      );
      if (!pingSentSuccessfully) {
        pingSendError = 'Ping returned false';
      }
    } catch (e) {
      // grpc/grpc-node#2139
      pingSendError = (e instanceof Error ? e.message : '') || 'Unknown error';
    }
    if (pingSendError) {
      this.keepaliveTrace('Ping send failed: ' + pingSendError);
      this.handleDisconnect();
    }
  }

  /**
   * Starts the keepalive ping timer if appropriate. If the timer already ran
   * out while there were no active requests, instead send a ping immediately.
   * If the ping timer is already running or a ping is currently in flight,
   * instead do nothing and wait for them to resolve.
   */
  private maybeStartKeepalivePingTimer() {
    if (!this.canSendPing()) {
      return;
    }
    if (this.pendingSendKeepalivePing) {
      this.pendingSendKeepalivePing = false;
      this.maybeSendPing();
    } else if (!this.keepaliveTimer) {
      this.keepaliveTrace(
        'Starting keepalive timer for ' + this.keepaliveTimeMs + 'ms'
      );
      this.keepaliveTimer = setTimeout(() => {
        this.keepaliveTimer = null;
        this.maybeSendPing();
      }, this.keepaliveTimeMs);
      this.keepaliveTimer.unref?.();
    }
    /* Otherwise, there is already either a keepalive timer or a ping pending,
     * wait for those to resolve. */
  }

  /**
   * Clears whichever keepalive timeout is currently active, if any.
   */
  private clearKeepaliveTimeout() {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private removeActiveCall(call: Http2SubchannelCall) {
    this.activeCalls.delete(call);
    if (this.activeCalls.size === 0) {
      this.session.unref();
    }
  }

  private addActiveCall(call: Http2SubchannelCall) {
    this.activeCalls.add(call);
    if (this.activeCalls.size === 1) {
      this.session.ref();
      if (!this.keepaliveWithoutCalls) {
        this.maybeStartKeepalivePingTimer();
      }
    }
  }

  createCall(
    metadata: Metadata,
    host: string,
    method: string,
    listener: SubchannelCallInterceptingListener,
    subchannelCallStatsTracker: Partial<CallEventTracker>
  ): Http2SubchannelCall {
    const headers = metadata.toHttp2Headers();
    headers[HTTP2_HEADER_AUTHORITY] = host;
    headers[HTTP2_HEADER_USER_AGENT] = this.userAgent;
    headers[HTTP2_HEADER_CONTENT_TYPE] = 'application/grpc';
    headers[HTTP2_HEADER_METHOD] = 'POST';
    headers[HTTP2_HEADER_PATH] = method;
    headers[HTTP2_HEADER_TE] = 'trailers';
    let http2Stream: http2.ClientHttp2Stream;
    /* In theory, if an error is thrown by session.request because session has
     * become unusable (e.g. because it has received a goaway), this subchannel
     * should soon see the corresponding close or goaway event anyway and leave
     * READY. But we have seen reports that this does not happen
     * (https://github.com/googleapis/nodejs-firestore/issues/1023#issuecomment-653204096)
     * so for defense in depth, we just discard the session when we see an
     * error here.
     */
    try {
      http2Stream = this.session.request(headers);
    } catch (e) {
      this.handleDisconnect();
      throw e;
    }
    this.flowControlTrace(
      'local window size: ' +
        this.session.state.localWindowSize +
        ' remote window size: ' +
        this.session.state.remoteWindowSize
    );
    this.internalsTrace(
      'session.closed=' +
        this.session.closed +
        ' session.destroyed=' +
        this.session.destroyed +
        ' session.socket.destroyed=' +
        this.session.socket.destroyed
    );
    let eventTracker: CallEventTracker;
    // eslint-disable-next-line prefer-const
    let call: Http2SubchannelCall;
    if (this.channelzEnabled) {
      this.streamTracker.addCallStarted();
      eventTracker = {
        addMessageSent: () => {
          this.messagesSent += 1;
          this.lastMessageSentTimestamp = new Date();
          subchannelCallStatsTracker.addMessageSent?.();
        },
        addMessageReceived: () => {
          this.messagesReceived += 1;
          this.lastMessageReceivedTimestamp = new Date();
          subchannelCallStatsTracker.addMessageReceived?.();
        },
        onCallEnd: status => {
          subchannelCallStatsTracker.onCallEnd?.(status);
          this.removeActiveCall(call);
        },
        onStreamEnd: success => {
          if (success) {
            this.streamTracker.addCallSucceeded();
          } else {
            this.streamTracker.addCallFailed();
          }
          subchannelCallStatsTracker.onStreamEnd?.(success);
        },
      };
    } else {
      eventTracker = {
        addMessageSent: () => {
          subchannelCallStatsTracker.addMessageSent?.();
        },
        addMessageReceived: () => {
          subchannelCallStatsTracker.addMessageReceived?.();
        },
        onCallEnd: status => {
          subchannelCallStatsTracker.onCallEnd?.(status);
          this.removeActiveCall(call);
        },
        onStreamEnd: success => {
          subchannelCallStatsTracker.onStreamEnd?.(success);
        },
      };
    }
    call = new Http2SubchannelCall(
      http2Stream,
      eventTracker,
      listener,
      this,
      getNextCallNumber()
    );
    this.addActiveCall(call);
    return call;
  }

  getChannelzRef(): SocketRef {
    return this.channelzRef;
  }

  getPeerName() {
    return this.subchannelAddressString;
  }

  getOptions() {
    return this.options;
  }

  getAuthContext(): AuthContext {
    return this.authContext;
  }

  shutdown() {
    this.session.close();
    unregisterChannelzRef(this.channelzRef);
  }
}

export interface SubchannelConnector {
  connect(
    address: SubchannelAddress,
    secureConnector: SecureConnector,
    options: ChannelOptions
  ): Promise<Transport>;
  shutdown(): void;
}

export class Http2SubchannelConnector implements SubchannelConnector {
  private session: http2.ClientHttp2Session | null = null;
  private isShutdown = false;
  constructor(private channelTarget: GrpcUri) {}

  private trace(text: string) {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      uriToString(this.channelTarget) + ' ' + text
    );
  }

  private createSession(
    secureConnectResult: SecureConnectResult,
    address: SubchannelAddress,
    options: ChannelOptions
  ): Promise<Http2Transport> {
    if (this.isShutdown) {
      return Promise.reject();
    }

    if (secureConnectResult.socket.closed) {
      return Promise.reject('Connection closed before starting HTTP/2 handshake');
    }

    return new Promise<Http2Transport>((resolve, reject) => {
      let remoteName: string | null = null;
      let realTarget: GrpcUri = this.channelTarget;
      if ('grpc.http_connect_target' in options) {
        const parsedTarget = parseUri(options['grpc.http_connect_target']!);
        if (parsedTarget) {
          realTarget = parsedTarget;
          remoteName = uriToString(parsedTarget);
        }
      }
      const scheme = secureConnectResult.secure ? 'https' : 'http';
      const targetPath = getDefaultAuthority(realTarget);
      const closeHandler = () => {
        this.session?.destroy();
        this.session = null;
        // Leave time for error event to happen before rejecting
        setImmediate(() => {
          if (!reportedError) {
            reportedError = true;
            reject(`${errorMessage.trim()} (${new Date().toISOString()})`);
          }
        });
      };
      const errorHandler = (error: Error) => {
        this.session?.destroy();
        errorMessage = (error as Error).message;
        this.trace('connection failed with error ' + errorMessage);
        if (!reportedError) {
          reportedError = true;
          reject(`${errorMessage} (${new Date().toISOString()})`);
        }
      };
      const sessionOptions: http2.ClientSessionOptions = {
        createConnection: (authority, option) => {
          return secureConnectResult.socket;
        },
        settings: {
          initialWindowSize:
            options['grpc-node.flow_control_window'] ??
            http2.getDefaultSettings?.()?.initialWindowSize ?? 65535,
        },
        maxSendHeaderBlockLength: Number.MAX_SAFE_INTEGER,
        /* By default, set a very large max session memory limit, to effectively
         * disable enforcement of the limit. Some testing indicates that Node's
         * behavior degrades badly when this limit is reached, so we solve that
         * by disabling the check entirely. */
        maxSessionMemory: options['grpc-node.max_session_memory'] ?? Number.MAX_SAFE_INTEGER
      };
      const session = http2.connect(`${scheme}://${targetPath}`, sessionOptions);
      // Prepare window size configuration for remoteSettings handler
      const defaultWin = http2.getDefaultSettings?.()?.initialWindowSize ?? 65535; // 65 535 B
      const connWin = options[
        'grpc-node.flow_control_window'
      ] as number | undefined;

      this.session = session;
      let errorMessage = 'Failed to connect';
      let reportedError = false;
      session.unref();
      session.once('remoteSettings', () => {
        // Send WINDOW_UPDATE now to avoid 65 KB start-window stall.
        if (connWin && connWin > defaultWin) {
          try {
            // Node ≥ 14.18
            (session as any).setLocalWindowSize(connWin);
          } catch {
            // Older Node: bump by the delta
            const delta = connWin - (session.state.localWindowSize ?? defaultWin);
            if (delta > 0) (session as any).incrementWindowSize(delta);
          }
        }

        session.removeAllListeners();
        secureConnectResult.socket.removeListener('close', closeHandler);
        secureConnectResult.socket.removeListener('error', errorHandler);
        resolve(new Http2Transport(session, address, options, remoteName));
        this.session = null;
      });
      session.once('close', closeHandler);
      session.once('error', errorHandler);
      secureConnectResult.socket.once('close', closeHandler);
      secureConnectResult.socket.once('error', errorHandler);
    });
  }

  private tcpConnect(address: SubchannelAddress, options: ChannelOptions): Promise<Socket> {
    return getProxiedConnection(address, options).then(proxiedSocket => {
      if (proxiedSocket) {
        return proxiedSocket;
      } else {
        return new Promise<Socket>((resolve, reject) => {
          const closeCallback = () => {
            reject(new Error('Socket closed'));
          };
          const errorCallback = (error: Error) => {
            reject(error);
          }
          const socket = net.connect(address, () => {
            socket.removeListener('close', closeCallback);
            socket.removeListener('error', errorCallback);
            resolve(socket);
          });
          socket.once('close', closeCallback);
          socket.once('error', errorCallback);
        });
      }
    });
  }

  async connect(
    address: SubchannelAddress,
    secureConnector: SecureConnector,
    options: ChannelOptions
  ): Promise<Http2Transport> {
    if (this.isShutdown) {
      return Promise.reject();
    }
    let tcpConnection: net.Socket | null = null;
    let secureConnectResult: SecureConnectResult | null  = null;
    const addressString = subchannelAddressToString(address);
    try {
      this.trace(addressString + ' Waiting for secureConnector to be ready');
      await secureConnector.waitForReady();
      this.trace(addressString + ' secureConnector is ready');
      tcpConnection = await this.tcpConnect(address, options);
      tcpConnection.setNoDelay();
      this.trace(addressString + ' Established TCP connection');
      secureConnectResult = await secureConnector.connect(tcpConnection);
      this.trace(addressString + ' Established secure connection');
      return this.createSession(secureConnectResult, address, options);
    } catch (e) {
      tcpConnection?.destroy();
      secureConnectResult?.socket.destroy();
      throw e;
    }
  }

  shutdown(): void {
    this.isShutdown = true;
    this.session?.close();
    this.session = null;
  }
}
