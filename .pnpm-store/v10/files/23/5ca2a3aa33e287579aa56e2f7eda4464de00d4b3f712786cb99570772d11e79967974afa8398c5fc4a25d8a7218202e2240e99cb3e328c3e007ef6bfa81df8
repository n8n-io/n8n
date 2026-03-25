import { PeerCertificate, SecureContext } from 'tls';
import { CallCredentials } from './call-credentials';
import { CertificateProvider } from './certificate-provider';
import { Socket } from 'net';
import { ChannelOptions } from './channel-options';
import { GrpcUri } from './uri-parser';
/**
 * A callback that will receive the expected hostname and presented peer
 * certificate as parameters. The callback should return an error to
 * indicate that the presented certificate is considered invalid and
 * otherwise returned undefined.
 */
export type CheckServerIdentityCallback = (hostname: string, cert: PeerCertificate) => Error | undefined;
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
export declare abstract class ChannelCredentials {
    /**
     * Returns a copy of this object with the included set of per-call credentials
     * expanded to include callCredentials.
     * @param callCredentials A CallCredentials object to associate with this
     * instance.
     */
    compose(callCredentials: CallCredentials): ChannelCredentials;
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
    static createSsl(rootCerts?: Buffer | null, privateKey?: Buffer | null, certChain?: Buffer | null, verifyOptions?: VerifyOptions): ChannelCredentials;
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
    static createFromSecureContext(secureContext: SecureContext, verifyOptions?: VerifyOptions): ChannelCredentials;
    /**
     * Return a new ChannelCredentials instance with no credentials.
     */
    static createInsecure(): ChannelCredentials;
}
declare class CertificateProviderChannelCredentialsImpl extends ChannelCredentials {
    private caCertificateProvider;
    private identityCertificateProvider;
    private verifyOptions;
    private refcount;
    /**
     * `undefined` means that the certificates have not yet been loaded. `null`
     * means that an attempt to load them has completed, and has failed.
     */
    private latestCaUpdate;
    /**
     * `undefined` means that the certificates have not yet been loaded. `null`
     * means that an attempt to load them has completed, and has failed.
     */
    private latestIdentityUpdate;
    private caCertificateUpdateListener;
    private identityCertificateUpdateListener;
    private secureContextWatchers;
    private static SecureConnectorImpl;
    constructor(caCertificateProvider: CertificateProvider, identityCertificateProvider: CertificateProvider | null, verifyOptions: VerifyOptions);
    _isSecure(): boolean;
    _equals(other: ChannelCredentials): boolean;
    private ref;
    private unref;
    _createSecureConnector(channelTarget: GrpcUri, options: ChannelOptions, callCredentials?: CallCredentials): SecureConnector;
    private maybeUpdateWatchers;
    private handleCaCertificateUpdate;
    private handleIdentityCertitificateUpdate;
    private hasReceivedUpdates;
    private getSecureContext;
    private getLatestSecureContext;
}
export declare function createCertificateProviderChannelCredentials(caCertificateProvider: CertificateProvider, identityCertificateProvider: CertificateProvider | null, verifyOptions?: VerifyOptions): CertificateProviderChannelCredentialsImpl;
export {};
