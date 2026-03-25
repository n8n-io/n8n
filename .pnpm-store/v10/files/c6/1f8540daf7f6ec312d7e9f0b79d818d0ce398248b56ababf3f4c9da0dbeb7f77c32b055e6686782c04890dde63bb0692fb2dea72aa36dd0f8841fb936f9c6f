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

import { SecureServerOptions } from 'http2';
import { CIPHER_SUITES, getDefaultRootsData } from './tls-helpers';
import { SecureContextOptions } from 'tls';
import { ServerInterceptor } from '.';
import { CaCertificateUpdate, CaCertificateUpdateListener, CertificateProvider, IdentityCertificateUpdate, IdentityCertificateUpdateListener } from './certificate-provider';

export interface KeyCertPair {
  private_key: Buffer;
  cert_chain: Buffer;
}

export interface SecureContextWatcher {
  (context: SecureContextOptions | null): void;
}

export abstract class ServerCredentials {
  private watchers: Set<SecureContextWatcher> = new Set();
  private latestContextOptions: SecureContextOptions | null = null;
  constructor(private serverConstructorOptions: SecureServerOptions | null, contextOptions?: SecureContextOptions) {
    this.latestContextOptions = contextOptions ?? null;
  }

  _addWatcher(watcher: SecureContextWatcher) {
    this.watchers.add(watcher);
  }
  _removeWatcher(watcher: SecureContextWatcher) {
    this.watchers.delete(watcher);
  }
  protected getWatcherCount() {
    return this.watchers.size;
  }
  protected updateSecureContextOptions(options: SecureContextOptions | null) {
    this.latestContextOptions = options;
    for (const watcher of this.watchers) {
      watcher(this.latestContextOptions);
    }
  }
  _isSecure(): boolean {
    return this.serverConstructorOptions !== null;
  }
  _getSecureContextOptions(): SecureContextOptions | null {
    return this.latestContextOptions;
  }
  _getConstructorOptions(): SecureServerOptions | null {
    return this.serverConstructorOptions;
  }
  _getInterceptors(): ServerInterceptor[] {
    return [];
  }
  abstract _equals(other: ServerCredentials): boolean;

  static createInsecure(): ServerCredentials {
    return new InsecureServerCredentials();
  }

  static createSsl(
    rootCerts: Buffer | null,
    keyCertPairs: KeyCertPair[],
    checkClientCertificate = false
  ): ServerCredentials {
    if (rootCerts !== null && !Buffer.isBuffer(rootCerts)) {
      throw new TypeError('rootCerts must be null or a Buffer');
    }

    if (!Array.isArray(keyCertPairs)) {
      throw new TypeError('keyCertPairs must be an array');
    }

    if (typeof checkClientCertificate !== 'boolean') {
      throw new TypeError('checkClientCertificate must be a boolean');
    }

    const cert: Buffer[] = [];
    const key: Buffer[] = [];

    for (let i = 0; i < keyCertPairs.length; i++) {
      const pair = keyCertPairs[i];

      if (pair === null || typeof pair !== 'object') {
        throw new TypeError(`keyCertPair[${i}] must be an object`);
      }

      if (!Buffer.isBuffer(pair.private_key)) {
        throw new TypeError(`keyCertPair[${i}].private_key must be a Buffer`);
      }

      if (!Buffer.isBuffer(pair.cert_chain)) {
        throw new TypeError(`keyCertPair[${i}].cert_chain must be a Buffer`);
      }

      cert.push(pair.cert_chain);
      key.push(pair.private_key);
    }

    return new SecureServerCredentials({
      requestCert: checkClientCertificate,
      ciphers: CIPHER_SUITES,
    }, {
      ca: rootCerts ?? getDefaultRootsData() ?? undefined,
      cert,
      key,
    });
  }
}

class InsecureServerCredentials extends ServerCredentials {
  constructor() {
    super(null);
  }

  _getSettings(): null {
    return null;
  }

  _equals(other: ServerCredentials): boolean {
    return other instanceof InsecureServerCredentials;
  }
}

class SecureServerCredentials extends ServerCredentials {
  private options: SecureServerOptions;

  constructor(constructorOptions: SecureServerOptions, contextOptions: SecureContextOptions) {
    super(constructorOptions, contextOptions);
    this.options = {...constructorOptions, ...contextOptions};
  }

  /**
   * Checks equality by checking the options that are actually set by
   * createSsl.
   * @param other
   * @returns
   */
  _equals(other: ServerCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof SecureServerCredentials)) {
      return false;
    }
    // options.ca equality check
    if (Buffer.isBuffer(this.options.ca) && Buffer.isBuffer(other.options.ca)) {
      if (!this.options.ca.equals(other.options.ca)) {
        return false;
      }
    } else {
      if (this.options.ca !== other.options.ca) {
        return false;
      }
    }
    // options.cert equality check
    if (Array.isArray(this.options.cert) && Array.isArray(other.options.cert)) {
      if (this.options.cert.length !== other.options.cert.length) {
        return false;
      }
      for (let i = 0; i < this.options.cert.length; i++) {
        const thisCert = this.options.cert[i];
        const otherCert = other.options.cert[i];
        if (Buffer.isBuffer(thisCert) && Buffer.isBuffer(otherCert)) {
          if (!thisCert.equals(otherCert)) {
            return false;
          }
        } else {
          if (thisCert !== otherCert) {
            return false;
          }
        }
      }
    } else {
      if (this.options.cert !== other.options.cert) {
        return false;
      }
    }
    // options.key equality check
    if (Array.isArray(this.options.key) && Array.isArray(other.options.key)) {
      if (this.options.key.length !== other.options.key.length) {
        return false;
      }
      for (let i = 0; i < this.options.key.length; i++) {
        const thisKey = this.options.key[i];
        const otherKey = other.options.key[i];
        if (Buffer.isBuffer(thisKey) && Buffer.isBuffer(otherKey)) {
          if (!thisKey.equals(otherKey)) {
            return false;
          }
        } else {
          if (thisKey !== otherKey) {
            return false;
          }
        }
      }
    } else {
      if (this.options.key !== other.options.key) {
        return false;
      }
    }
    // options.requestCert equality check
    if (this.options.requestCert !== other.options.requestCert) {
      return false;
    }
    /* ciphers is derived from a value that is constant for the process, so no
     * equality check is needed. */
    return true;
  }
}

class CertificateProviderServerCredentials extends ServerCredentials {
  private latestCaUpdate: CaCertificateUpdate | null = null;
  private latestIdentityUpdate: IdentityCertificateUpdate | null = null;
  private caCertificateUpdateListener: CaCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
  private identityCertificateUpdateListener: IdentityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
  constructor(
    private identityCertificateProvider: CertificateProvider,
    private caCertificateProvider: CertificateProvider | null,
    private requireClientCertificate: boolean
  ) {
    super({
      requestCert: caCertificateProvider !== null,
      rejectUnauthorized: requireClientCertificate,
      ciphers: CIPHER_SUITES
    });
  }
  _addWatcher(watcher: SecureContextWatcher): void {
    if (this.getWatcherCount() === 0) {
      this.caCertificateProvider?.addCaCertificateListener(this.caCertificateUpdateListener);
      this.identityCertificateProvider.addIdentityCertificateListener(this.identityCertificateUpdateListener);
    }
    super._addWatcher(watcher);
  }
  _removeWatcher(watcher: SecureContextWatcher): void {
    super._removeWatcher(watcher);
    if (this.getWatcherCount() === 0) {
      this.caCertificateProvider?.removeCaCertificateListener(this.caCertificateUpdateListener);
      this.identityCertificateProvider.removeIdentityCertificateListener(this.identityCertificateUpdateListener);
    }
  }
  _equals(other: ServerCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof CertificateProviderServerCredentials)) {
      return false;
    }
    return (
      this.caCertificateProvider === other.caCertificateProvider &&
      this.identityCertificateProvider === other.identityCertificateProvider &&
      this.requireClientCertificate === other.requireClientCertificate
    )
  }

  private calculateSecureContextOptions(): SecureContextOptions | null {
    if (this.latestIdentityUpdate === null) {
      return null;
    }
    if (this.caCertificateProvider !== null && this.latestCaUpdate === null) {
      return null;
    }
    return {
      ca: this.latestCaUpdate?.caCertificate,
      cert: [this.latestIdentityUpdate.certificate],
      key: [this.latestIdentityUpdate.privateKey],
    };
  }

  private finalizeUpdate() {
    const secureContextOptions = this.calculateSecureContextOptions();
    this.updateSecureContextOptions(secureContextOptions);
  }

  private handleCaCertificateUpdate(update: CaCertificateUpdate | null) {
    this.latestCaUpdate = update;
    this.finalizeUpdate();
  }

  private handleIdentityCertitificateUpdate(update: IdentityCertificateUpdate | null) {
    this.latestIdentityUpdate = update;
    this.finalizeUpdate();
  }
}

export function createCertificateProviderServerCredentials(
  caCertificateProvider: CertificateProvider,
  identityCertificateProvider: CertificateProvider | null,
  requireClientCertificate: boolean
) {
  return new CertificateProviderServerCredentials(
    caCertificateProvider,
    identityCertificateProvider,
    requireClientCertificate);
}

class InterceptorServerCredentials extends ServerCredentials {
  constructor(private readonly childCredentials: ServerCredentials, private readonly interceptors: ServerInterceptor[]) {
    super({});
  }
  _isSecure(): boolean {
    return this.childCredentials._isSecure();
  }
  _equals(other: ServerCredentials): boolean {
    if (!(other instanceof InterceptorServerCredentials)) {
      return false;
    }
    if (!(this.childCredentials._equals(other.childCredentials))) {
      return false;
    }
    if (this.interceptors.length !== other.interceptors.length) {
      return false;
    }
    for (let i = 0; i < this.interceptors.length; i++) {
      if (this.interceptors[i] !== other.interceptors[i]) {
        return false;
      }
    }
    return true;
  }
  override _getInterceptors(): ServerInterceptor[] {
    return this.interceptors;
  }
  override _addWatcher(watcher: SecureContextWatcher): void {
    this.childCredentials._addWatcher(watcher);
  }
  override _removeWatcher(watcher: SecureContextWatcher): void {
    this.childCredentials._removeWatcher(watcher);
  }
  override _getConstructorOptions(): SecureServerOptions | null {
    return this.childCredentials._getConstructorOptions();
  }
  override _getSecureContextOptions(): SecureContextOptions | null {
    return this.childCredentials._getSecureContextOptions();
  }
}

export function createServerCredentialsWithInterceptors(credentials: ServerCredentials, interceptors: ServerInterceptor[]): ServerCredentials {
  return new InterceptorServerCredentials(credentials, interceptors);
}
