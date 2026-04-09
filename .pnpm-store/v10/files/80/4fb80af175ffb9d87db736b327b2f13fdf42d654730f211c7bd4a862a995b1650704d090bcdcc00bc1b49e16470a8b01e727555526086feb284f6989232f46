import { SubjectTokenSupplier } from './identitypoolclient';
import * as https from 'https';
export declare const CERTIFICATE_CONFIGURATION_ENV_VARIABLE = "GOOGLE_API_CERTIFICATE_CONFIG";
/**
 * Thrown when the certificate source cannot be located or accessed.
 */
export declare class CertificateSourceUnavailableError extends Error {
    constructor(message: string);
}
/**
 * Thrown for invalid configuration that is not related to file availability.
 */
export declare class InvalidConfigurationError extends Error {
    constructor(message: string);
}
/**
 * Defines options for creating a {@link CertificateSubjectTokenSupplier}.
 */
export interface CertificateSubjectTokenSupplierOptions {
    /**
     * If true, uses the default well-known location for the certificate config.
     * Either this or `certificateConfigLocation` must be provided.
     */
    useDefaultCertificateConfig?: boolean;
    /**
     * The file path to the certificate configuration JSON file.
     * Required if `useDefaultCertificateConfig` is not true.
     */
    certificateConfigLocation?: string;
    /**
     * The file path to the trust chain (PEM format).
     */
    trustChainPath?: string;
}
/**
 * A subject token supplier that uses a client certificate for authentication.
 * It provides the certificate chain as the subject token for identity federation.
 */
export declare class CertificateSubjectTokenSupplier implements SubjectTokenSupplier {
    #private;
    private certificateConfigPath;
    private readonly trustChainPath?;
    private cert?;
    private key?;
    /**
     * Initializes a new instance of the CertificateSubjectTokenSupplier.
     * @param opts The configuration options for the supplier.
     */
    constructor(opts: CertificateSubjectTokenSupplierOptions);
    /**
     * Creates an HTTPS agent configured with the client certificate and private key for mTLS.
     * @returns An mTLS-configured https.Agent.
     */
    createMtlsHttpsAgent(): Promise<https.Agent>;
    /**
     * Constructs the subject token, which is the base64-encoded certificate chain.
     * @returns A promise that resolves with the subject token.
     */
    getSubjectToken(): Promise<string>;
}
