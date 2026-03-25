export interface CaCertificateUpdate {
    caCertificate: Buffer;
}
export interface IdentityCertificateUpdate {
    certificate: Buffer;
    privateKey: Buffer;
}
export interface CaCertificateUpdateListener {
    (update: CaCertificateUpdate | null): void;
}
export interface IdentityCertificateUpdateListener {
    (update: IdentityCertificateUpdate | null): void;
}
export interface CertificateProvider {
    addCaCertificateListener(listener: CaCertificateUpdateListener): void;
    removeCaCertificateListener(listener: CaCertificateUpdateListener): void;
    addIdentityCertificateListener(listener: IdentityCertificateUpdateListener): void;
    removeIdentityCertificateListener(listener: IdentityCertificateUpdateListener): void;
}
export interface FileWatcherCertificateProviderConfig {
    certificateFile?: string | undefined;
    privateKeyFile?: string | undefined;
    caCertificateFile?: string | undefined;
    refreshIntervalMs: number;
}
export declare class FileWatcherCertificateProvider implements CertificateProvider {
    private config;
    private refreshTimer;
    private fileResultPromise;
    private latestCaUpdate;
    private caListeners;
    private latestIdentityUpdate;
    private identityListeners;
    private lastUpdateTime;
    constructor(config: FileWatcherCertificateProviderConfig);
    private updateCertificates;
    private maybeStartWatchingFiles;
    private maybeStopWatchingFiles;
    addCaCertificateListener(listener: CaCertificateUpdateListener): void;
    removeCaCertificateListener(listener: CaCertificateUpdateListener): void;
    addIdentityCertificateListener(listener: IdentityCertificateUpdateListener): void;
    removeIdentityCertificateListener(listener: IdentityCertificateUpdateListener): void;
}
