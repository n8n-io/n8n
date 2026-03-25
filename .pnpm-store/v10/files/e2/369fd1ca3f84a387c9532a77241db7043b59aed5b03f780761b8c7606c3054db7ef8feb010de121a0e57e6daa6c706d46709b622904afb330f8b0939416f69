import { SecureServerOptions } from 'http2';
import { SecureContextOptions } from 'tls';
import { ServerInterceptor } from '.';
import { CertificateProvider } from './certificate-provider';
export interface KeyCertPair {
    private_key: Buffer;
    cert_chain: Buffer;
}
export interface SecureContextWatcher {
    (context: SecureContextOptions | null): void;
}
export declare abstract class ServerCredentials {
    private serverConstructorOptions;
    private watchers;
    private latestContextOptions;
    constructor(serverConstructorOptions: SecureServerOptions | null, contextOptions?: SecureContextOptions);
    _addWatcher(watcher: SecureContextWatcher): void;
    _removeWatcher(watcher: SecureContextWatcher): void;
    protected getWatcherCount(): number;
    protected updateSecureContextOptions(options: SecureContextOptions | null): void;
    _isSecure(): boolean;
    _getSecureContextOptions(): SecureContextOptions | null;
    _getConstructorOptions(): SecureServerOptions | null;
    _getInterceptors(): ServerInterceptor[];
    abstract _equals(other: ServerCredentials): boolean;
    static createInsecure(): ServerCredentials;
    static createSsl(rootCerts: Buffer | null, keyCertPairs: KeyCertPair[], checkClientCertificate?: boolean): ServerCredentials;
}
declare class CertificateProviderServerCredentials extends ServerCredentials {
    private identityCertificateProvider;
    private caCertificateProvider;
    private requireClientCertificate;
    private latestCaUpdate;
    private latestIdentityUpdate;
    private caCertificateUpdateListener;
    private identityCertificateUpdateListener;
    constructor(identityCertificateProvider: CertificateProvider, caCertificateProvider: CertificateProvider | null, requireClientCertificate: boolean);
    _addWatcher(watcher: SecureContextWatcher): void;
    _removeWatcher(watcher: SecureContextWatcher): void;
    _equals(other: ServerCredentials): boolean;
    private calculateSecureContextOptions;
    private finalizeUpdate;
    private handleCaCertificateUpdate;
    private handleIdentityCertitificateUpdate;
}
export declare function createCertificateProviderServerCredentials(caCertificateProvider: CertificateProvider, identityCertificateProvider: CertificateProvider | null, requireClientCertificate: boolean): CertificateProviderServerCredentials;
export declare function createServerCredentialsWithInterceptors(credentials: ServerCredentials, interceptors: ServerInterceptor[]): ServerCredentials;
export {};
