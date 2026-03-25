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

import {
  ConnectionOptions,
  createSecureContext,
  PeerCertificate,
  SecureContext,
  checkServerIdentity,
  connect as tlsConnect
} from 'tls';

import { CallCredentials } from './call-credentials';
import { CIPHER_SUITES, getDefaultRootsData } from './tls-helpers';
import { CaCertificateUpdate, CaCertificateUpdateListener, CertificateProvider, IdentityCertificateUpdate, IdentityCertificateUpdateListener } from './certificate-provider';
import { Socket } from 'net';
import { ChannelOptions } from './channel-options';
import { GrpcUri, parseUri, splitHostPort } from './uri-parser';
import { getDefaultAuthority } from './resolver';
import { log } from './logging';
import { LogVerbosity } from './constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyIsBufferOrNull(obj: any, friendlyName: string): void {
  if (obj && !(obj instanceof Buffer)) {
    throw new TypeError(`${friendlyName}, if provided, must be a Buffer.`);
  }
}

/**
 * A callback that will receive the expected hostname and presented peer
 * certificate as parameters. The callback should return an error to
 * indicate that the presented certificate is considered invalid and
 * otherwise returned undefined.
 */
export type CheckServerIdentityCallback = (
  hostname: string,
  cert: PeerCertificate
) => Error | undefined;

/**
 * Additional peer verification options that can be set when creating
 * SSL credentials.
 */
export interface VerifyOptions {
  /**
   * If set, this callback will be invoked after the usual hostname verification
   * has been performed on the peer certificate.
   */
  checkServerIdentity?: CheckServerIdentityCallback;
  rejectUnauthorized?: boolean;
}

export interface SecureConnectResult {
  socket: Socket;
  secure: boolean;
}

export interface SecureConnector {
  connect(socket: Socket): Promise<SecureConnectResult>;
  waitForReady(): Promise<void>;
  getCallCredentials(): CallCredentials;
  destroy(): void;
}

/**
 * A class that contains credentials for communicating over a channel, as well
 * as a set of per-call credentials, which are applied to every method call made
 * over a channel initialized with an instance of this class.
 */
export abstract class ChannelCredentials {
  /**
   * Returns a copy of this object with the included set of per-call credentials
   * expanded to include callCredentials.
   * @param callCredentials A CallCredentials object to associate with this
   * instance.
   */
  compose(callCredentials: CallCredentials): ChannelCredentials {
    return new ComposedChannelCredentialsImpl(this, callCredentials);
  }

  /**
   * Indicates whether this credentials object creates a secure channel.
   */
  abstract _isSecure(): boolean;

  /**
   * Check whether two channel credentials objects are equal. Two secure
   * credentials are equal if they were constructed with the same parameters.
   * @param other The other ChannelCredentials Object
   */
  abstract _equals(other: ChannelCredentials): boolean;

  abstract _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector;

  /**
   * Return a new ChannelCredentials instance with a given set of credentials.
   * The resulting instance can be used to construct a Channel that communicates
   * over TLS.
   * @param rootCerts The root certificate data.
   * @param privateKey The client certificate private key, if available.
   * @param certChain The client certificate key chain, if available.
   * @param verifyOptions Additional options to modify certificate verification
   */
  static createSsl(
    rootCerts?: Buffer | null,
    privateKey?: Buffer | null,
    certChain?: Buffer | null,
    verifyOptions?: VerifyOptions
  ): ChannelCredentials {
    verifyIsBufferOrNull(rootCerts, 'Root certificate');
    verifyIsBufferOrNull(privateKey, 'Private key');
    verifyIsBufferOrNull(certChain, 'Certificate chain');
    if (privateKey && !certChain) {
      throw new Error(
        'Private key must be given with accompanying certificate chain'
      );
    }
    if (!privateKey && certChain) {
      throw new Error(
        'Certificate chain must be given with accompanying private key'
      );
    }
    const secureContext = createSecureContext({
      ca: rootCerts ?? getDefaultRootsData() ?? undefined,
      key: privateKey ?? undefined,
      cert: certChain ?? undefined,
      ciphers: CIPHER_SUITES,
    });
    return new SecureChannelCredentialsImpl(secureContext, verifyOptions ?? {});
  }

  /**
   * Return a new ChannelCredentials instance with credentials created using
   * the provided secureContext. The resulting instances can be used to
   * construct a Channel that communicates over TLS. gRPC will not override
   * anything in the provided secureContext, so the environment variables
   * GRPC_SSL_CIPHER_SUITES and GRPC_DEFAULT_SSL_ROOTS_FILE_PATH will
   * not be applied.
   * @param secureContext The return value of tls.createSecureContext()
   * @param verifyOptions Additional options to modify certificate verification
   */
  static createFromSecureContext(
    secureContext: SecureContext,
    verifyOptions?: VerifyOptions
  ): ChannelCredentials {
    return new SecureChannelCredentialsImpl(secureContext, verifyOptions ?? {});
  }

  /**
   * Return a new ChannelCredentials instance with no credentials.
   */
  static createInsecure(): ChannelCredentials {
    return new InsecureChannelCredentialsImpl();
  }
}

class InsecureChannelCredentialsImpl extends ChannelCredentials {
  constructor() {
    super();
  }

  override compose(callCredentials: CallCredentials): never {
    throw new Error('Cannot compose insecure credentials');
  }
  _isSecure(): boolean {
    return false;
  }
  _equals(other: ChannelCredentials): boolean {
    return other instanceof InsecureChannelCredentialsImpl;
  }
  _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector {
    return {
      connect(socket) {
        return Promise.resolve({
          socket,
          secure: false
        });
      },
      waitForReady: () => {
        return Promise.resolve();
      },
      getCallCredentials: () => {
        return callCredentials ?? CallCredentials.createEmpty();
      },
      destroy() {}
    }
  }
}

function getConnectionOptions(secureContext: SecureContext, verifyOptions: VerifyOptions, channelTarget: GrpcUri, options: ChannelOptions): ConnectionOptions {
  const connectionOptions: ConnectionOptions = {
    secureContext: secureContext
  };
  if (verifyOptions.checkServerIdentity) {
    connectionOptions.checkServerIdentity = verifyOptions.checkServerIdentity;
  }
  if (verifyOptions.rejectUnauthorized !== undefined) {
    connectionOptions.rejectUnauthorized = verifyOptions.rejectUnauthorized;
  }
  connectionOptions.ALPNProtocols = ['h2'];
  if (options['grpc.ssl_target_name_override']) {
    const sslTargetNameOverride = options['grpc.ssl_target_name_override']!;
    const originalCheckServerIdentity =
      connectionOptions.checkServerIdentity ?? checkServerIdentity;
    connectionOptions.checkServerIdentity = (
      host: string,
      cert: PeerCertificate
    ): Error | undefined => {
      return originalCheckServerIdentity(sslTargetNameOverride, cert);
    };
    connectionOptions.servername = sslTargetNameOverride;
  } else {
    if ('grpc.http_connect_target' in options) {
      /* This is more or less how servername will be set in createSession
       * if a connection is successfully established through the proxy.
       * If the proxy is not used, these connectionOptions are discarded
       * anyway */
      const targetPath = getDefaultAuthority(
        parseUri(options['grpc.http_connect_target'] as string) ?? {
          path: 'localhost',
        }
      );
      const hostPort = splitHostPort(targetPath);
      connectionOptions.servername = hostPort?.host ?? targetPath;
    }
  }
  if (options['grpc-node.tls_enable_trace']) {
    connectionOptions.enableTrace = true;
  }

  let realTarget: GrpcUri = channelTarget;
  if ('grpc.http_connect_target' in options) {
    const parsedTarget = parseUri(options['grpc.http_connect_target']!);
    if (parsedTarget) {
      realTarget = parsedTarget;
    }
  }
  const targetPath = getDefaultAuthority(realTarget);
  const hostPort = splitHostPort(targetPath);
  const remoteHost = hostPort?.host ?? targetPath;
  connectionOptions.host = remoteHost;
  connectionOptions.servername = remoteHost;
  return connectionOptions;
}

class SecureConnectorImpl implements SecureConnector {
  constructor(private connectionOptions: ConnectionOptions, private callCredentials: CallCredentials) {
  }
  connect(socket: Socket): Promise<SecureConnectResult> {
    const tlsConnectOptions: ConnectionOptions = {
      socket: socket,
      ...this.connectionOptions
    };
    return new Promise<SecureConnectResult>((resolve, reject) => {
      const tlsSocket = tlsConnect(tlsConnectOptions, () => {
        if ((this.connectionOptions.rejectUnauthorized ?? true) && !tlsSocket.authorized) {
          reject(tlsSocket.authorizationError);
          return;
        }
        resolve({
          socket: tlsSocket,
          secure: true
        })
      });
      tlsSocket.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
  waitForReady(): Promise<void> {
    return Promise.resolve();
  }
  getCallCredentials(): CallCredentials {
    return this.callCredentials;
  }
  destroy() {}
}

class SecureChannelCredentialsImpl extends ChannelCredentials {
  constructor(
    private secureContext: SecureContext,
    private verifyOptions: VerifyOptions
  ) {
    super();
  }

  _isSecure(): boolean {
    return true;
  }
  _equals(other: ChannelCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof SecureChannelCredentialsImpl) {
      return (
        this.secureContext === other.secureContext &&
        this.verifyOptions.checkServerIdentity ===
          other.verifyOptions.checkServerIdentity
      );
    } else {
      return false;
    }
  }
  _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector {
    const connectionOptions = getConnectionOptions(this.secureContext, this.verifyOptions, channelTarget, options);
    return new SecureConnectorImpl(connectionOptions, callCredentials ?? CallCredentials.createEmpty());
  }
}

class CertificateProviderChannelCredentialsImpl extends ChannelCredentials {
  private refcount: number = 0;
  /**
   * `undefined` means that the certificates have not yet been loaded. `null`
   * means that an attempt to load them has completed, and has failed.
   */
  private latestCaUpdate: CaCertificateUpdate | null | undefined = undefined;
  /**
   * `undefined` means that the certificates have not yet been loaded. `null`
   * means that an attempt to load them has completed, and has failed.
   */
  private latestIdentityUpdate: IdentityCertificateUpdate | null | undefined = undefined;
  private caCertificateUpdateListener: CaCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
  private identityCertificateUpdateListener: IdentityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
  private secureContextWatchers: ((context: SecureContext | null) => void)[] = [];
  private static SecureConnectorImpl = class implements SecureConnector {
    constructor(private parent: CertificateProviderChannelCredentialsImpl, private channelTarget: GrpcUri, private options: ChannelOptions, private callCredentials: CallCredentials) {}

    connect(socket: Socket): Promise<SecureConnectResult> {
      return new Promise((resolve, reject) => {
        const secureContext = this.parent.getLatestSecureContext();
        if (!secureContext) {
          reject(new Error('Failed to load credentials'));
          return;
        }
        if (socket.closed) {
          reject(new Error('Socket closed while loading credentials'));
        }
        const connnectionOptions = getConnectionOptions(secureContext, this.parent.verifyOptions, this.channelTarget, this.options);
        const tlsConnectOptions: ConnectionOptions = {
          socket: socket,
          ...connnectionOptions
        }
        const closeCallback = () => {
          reject(new Error('Socket closed'));
        };
        const errorCallback = (error: Error) => {
          reject(error);
        }
        const tlsSocket = tlsConnect(tlsConnectOptions, () => {
          tlsSocket.removeListener('close', closeCallback);
          tlsSocket.removeListener('error', errorCallback);
          if ((this.parent.verifyOptions.rejectUnauthorized ?? true) && !tlsSocket.authorized) {
            reject(tlsSocket.authorizationError);
            return;
          }
          resolve({
            socket: tlsSocket,
            secure: true
          });
        });
        tlsSocket.once('close', closeCallback);
        tlsSocket.once('error', errorCallback);
      });
    }

    async waitForReady(): Promise<void> {
      await this.parent.getSecureContext();
    }

    getCallCredentials(): CallCredentials {
      return this.callCredentials;
    }

    destroy() {
      this.parent.unref();
    }
  }
  constructor(
    private caCertificateProvider: CertificateProvider,
    private identityCertificateProvider: CertificateProvider | null,
    private verifyOptions: VerifyOptions
  ) {
    super();
  }
  _isSecure(): boolean {
    return true;
  }
  _equals(other: ChannelCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof CertificateProviderChannelCredentialsImpl) {
      return this.caCertificateProvider === other.caCertificateProvider &&
        this.identityCertificateProvider === other.identityCertificateProvider &&
        this.verifyOptions?.checkServerIdentity === other.verifyOptions?.checkServerIdentity;
    } else {
      return false;
    }
  }
  private ref(): void {
    if (this.refcount === 0) {
      this.caCertificateProvider.addCaCertificateListener(this.caCertificateUpdateListener);
      this.identityCertificateProvider?.addIdentityCertificateListener(this.identityCertificateUpdateListener);
    }
    this.refcount += 1;
  }
  private unref(): void {
    this.refcount -= 1;
    if (this.refcount === 0) {
      this.caCertificateProvider.removeCaCertificateListener(this.caCertificateUpdateListener);
      this.identityCertificateProvider?.removeIdentityCertificateListener(this.identityCertificateUpdateListener);
    }
  }
  _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector {
    this.ref();
    return new CertificateProviderChannelCredentialsImpl.SecureConnectorImpl(this, channelTarget, options, callCredentials ?? CallCredentials.createEmpty());
  }

  private maybeUpdateWatchers() {
    if (this.hasReceivedUpdates()) {
      for (const watcher of this.secureContextWatchers) {
        watcher(this.getLatestSecureContext());
      }
      this.secureContextWatchers = [];
    }
  }

  private handleCaCertificateUpdate(update: CaCertificateUpdate | null) {
    this.latestCaUpdate = update;
    this.maybeUpdateWatchers();
  }

  private handleIdentityCertitificateUpdate(update: IdentityCertificateUpdate | null) {
    this.latestIdentityUpdate = update;
    this.maybeUpdateWatchers();
  }

  private hasReceivedUpdates(): boolean {
    if (this.latestCaUpdate === undefined) {
      return false;
    }
    if (this.identityCertificateProvider && this.latestIdentityUpdate === undefined) {
      return false;
    }
    return true;
  }

  private getSecureContext(): Promise<SecureContext | null> {
    if (this.hasReceivedUpdates()) {
      return Promise.resolve(this.getLatestSecureContext());
    } else {
      return new Promise(resolve => {
        this.secureContextWatchers.push(resolve);
      });
    }
  }

  private getLatestSecureContext(): SecureContext | null {
    if (!this.latestCaUpdate) {
      return null;
    }
    if (this.identityCertificateProvider !== null && !this.latestIdentityUpdate) {
      return null;
    }
    try {
      return createSecureContext({
        ca: this.latestCaUpdate.caCertificate,
        key: this.latestIdentityUpdate?.privateKey,
        cert: this.latestIdentityUpdate?.certificate,
        ciphers: CIPHER_SUITES
      });
    } catch (e) {
      log(LogVerbosity.ERROR, 'Failed to createSecureContext with error ' + (e as Error).message);
      return null;
    }
  }
}

export function createCertificateProviderChannelCredentials(caCertificateProvider: CertificateProvider, identityCertificateProvider: CertificateProvider | null, verifyOptions?: VerifyOptions) {
  return new CertificateProviderChannelCredentialsImpl(caCertificateProvider, identityCertificateProvider, verifyOptions ?? {});
}

class ComposedChannelCredentialsImpl extends ChannelCredentials {
  constructor(
    private channelCredentials: ChannelCredentials,
    private callCredentials: CallCredentials
  ) {
    super();
    if (!channelCredentials._isSecure()) {
      throw new Error('Cannot compose insecure credentials');
    }
  }
  compose(callCredentials: CallCredentials) {
    const combinedCallCredentials =
      this.callCredentials.compose(callCredentials);
    return new ComposedChannelCredentialsImpl(
      this.channelCredentials,
      combinedCallCredentials
    );
  }
  _isSecure(): boolean {
    return true;
  }
  _equals(other: ChannelCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof ComposedChannelCredentialsImpl) {
      return (
        this.channelCredentials._equals(other.channelCredentials) &&
        this.callCredentials._equals(other.callCredentials)
      );
    } else {
      return false;
    }
  }
  _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector {
    const combinedCallCredentials = this.callCredentials.compose(callCredentials ?? CallCredentials.createEmpty());
    return this.channelCredentials._createSecureConnector(channelTarget, options, combinedCallCredentials);
  }
}
