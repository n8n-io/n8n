import { X509Certificate } from 'node:crypto';

/** How often to consider periodic license renewal (in ms) */
export declare const AUTORENEWAL_INTERVAL: number;

export declare function computeDeviceFingerprint(): Promise<string>;

export declare const default_alias: {
    postRequest: typeof postRequest;
};

export declare function generateCertContainerStr(options?: {}): Promise<string>;

export declare function generateTamperedCert(options?: Object): Promise<string>;

export declare class LicenseManager {
    config: TLicenseManagerConfig;
    private initializationPromise?;
    private key?;
    private logger;
    protected licenseCert?: TLicenseCertObj;
    private x509Cert?;
    private x509IssuerCert;
    private deviceFingerprint?;
    private renewalTimer?;
    private upcomingEntitlementChangesCheckTimer?;
    private entitlementChangeTimer?;
    private expirySoonTimer?;
    private expirySoonCallbackFired;
    private currentFeatures?;
    private isShuttingDown;
    get isInitialized(): boolean;
    constructor(config: TLicenseManagerConfig);
    log(msg: string, logLevel: LogLevel): void;
    initialize(): Promise<void>;
    private isInitialRenewalRequired;
    /** Initializes the license manager */
    private _doInitialization;
    private setupSingleTimer;
    clearSingleTimer(timer: SingleTimer | undefined): void;
    setupRepeatingTimer(callback: () => void, interval: number): RepeatingTimer;
    clearRepeatingTimer(timer: RepeatingTimer | undefined): void;
    private isOlderThan;
    reload(): Promise<void>;
    reset(): Promise<void>;
    computeDeviceFingerprint(): Promise<string>;
    activate(reservationId: string, options?: {
        eulaUri?: string;
        email?: string;
    }): Promise<void>;
    renew(): Promise<void>;
    _renew({ detachFloatingEntitlements, cause, }?: {
        detachFloatingEntitlements?: Boolean;
        cause?: 'startup' | 'shutdown' | 'request' | 'auto' | 'unknown';
    }): Promise<void>;
    private hasCert;
    isTerminated(): boolean;
    getExpiryDate(): Date;
    getTerminationDate(): Date;
    isValid(useLogger?: boolean): boolean;
    hasFeatureEnabled(feature: string, requireValidCert?: boolean): boolean;
    hasFeatureDefined(feature: string, requireValidCert?: boolean): boolean;
    hasQuotaLeft(quotaFeatureName: string, currentConsumption: number): boolean;
    getFeatureValue(feature: string, requireValidCert?: boolean): undefined | boolean | number | string;
    private updateCurrentFeatures;
    getFeatures(): TFeatures;
    getCurrentEntitlements(): TEntitlement[];
    getManagementJwt(): string;
    getCertStr(): Promise<TLicenseBlock>;
    getConsumerId(): string | undefined;
    isRenewalDue(): boolean;
    private formatDuration;
    toString(): string;
    private triggerOnFeatureChangeCallback;
    private setTimerForNextEntitlementChange;
    private checkAndTriggerExpirySoonCallback;
    private renewalCron;
    private initCert;
    private stringifyCertContainer;
    private parseLicenseCertContainerStr;
    private parseLicenseKeyStr;
    private validateLicenseKey;
    getIssuerCert(): X509Certificate;
    /**
     * Detaches any floating entitlements and clears the local license cert.
     */
    clear(): Promise<void>;
    shutdown(): Promise<void>;
    private detachFloatingEntitlements;
    /** Enable periodical renewal of the license. */
    enableAutoRenewals(): void;
    /** Disable periodical renewal of the license. */
    disableAutoRenewals(): void;
}

export declare function licenseManagerFactory(config?: {}, mockLogger?: TLogger): LicenseManager;

declare const enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}

export declare function makeEntitlement({ validFrom, validTo, features, featureOverrides, productId, isFloatable, }: {
    validFrom?: Date;
    validTo?: Date;
    features?: TFeatures;
    featureOverrides?: TFeatures;
    productId?: string;
    isFloatable?: boolean;
}): {
    id: string;
    productId: string;
    productMetadata: {
        metadataKey1: string;
    };
    features: TFeatures;
    featureOverrides: TFeatures;
    validFrom: Date;
    validTo: Date;
    isFloatable: boolean;
};

export declare function makeRelativeDate(offsetInMinutes: number): Date;

export declare function postRequest<T>(url: string, data: Record<string, unknown>, options?: {
    timeoutInMs?: number;
    productIdentifier?: string;
}): Promise<{
    status: number;
    data: T;
}>;

declare type RepeatingTimer = NodeJS.Timeout;

export declare const SDK_VERSION = "2.25.0";

declare type SingleTimer = NodeJS.Timeout;

export declare type TEntitlement = {
    id: string;
    productId: string;
    productMetadata: TMetadata;
    features: TFeatures;
    featureOverrides: TFeatures;
    validFrom: Date;
    validTo: Date;
    isFloatable: boolean;
};

export declare type TFeatures = {
    [key: string]: boolean | number | string;
};

export declare type TLicenseBlock = string;

export declare type TLicenseCertObj = {
    consumerId: string;
    consumerRef?: string;
    version: number;
    tenantId: number;
    renewalToken: string;
    deviceLock: boolean;
    deviceFingerprint: string;
    createdAt: Date;
    issuedAt: Date;
    expiresAt: Date;
    terminatesAt: Date;
    entitlements: TEntitlement[];
    /**
     * Indicates the number of floating entitlements that are not attached to the consumer
     * because they are in use elsewhere at the time of renewal.
     */
    detachedEntitlementsCount: number;
    managementJwt: string;
    /**
     * Specifies whether the license is ephemeral and therefore does not have corresponding entries in the license server DB.
     */
    isEphemeral: boolean;
};

export declare type TLicenseContainer = {
    licenseKey: string;
    x509: string;
};

export declare type TLicenseManagerConfig = {
    server?: string;
    tenantId: number;
    productIdentifier: string;
    /**
     * Whether to renew the license periodically.
     *
     * @default true
     */
    autoRenewEnabled?: boolean;
    /**
     * Whether to return any floatable entitlements to the pool on SDK shutdown.
     *
     * @default true
     */
    detachFloatingOnShutdown?: boolean;
    offlineMode?: boolean;
    renewOnInit?: boolean;
    autoRenewOffset?: number;
    loadCertStr: () => Promise<TLicenseBlock>;
    saveCertStr: (cert: TLicenseBlock) => Promise<void>;
    collectUsageMetrics?: () => Promise<Array<TUsageMetric>>;
    collectPassthroughData?: () => Promise<TPassthroughData>;
    deviceFingerprint?: () => string | Promise<string>;
    onFeatureChange?: (features: TFeatures) => any;
    onLicenseRenewed?: () => void;
    /**
     * Callback to fire when the license is within `expirySoonOffsetMins` minutes of expiry.
     * Fires only one time per license cert and resets on renewal. Sync callbacks only.
     */
    onExpirySoon?: () => void;
    /** The `onExpirySoon` callback will fire when the license is within this many minutes of expiry. */
    expirySoonOffsetMins?: number;
    logger?: TLogger;
};

export declare type TLogger = {
    error: Function;
    warn: Function;
    info: Function;
    debug: Function;
};

export declare type TMetadata = {
    [key: string]: boolean | number | string | Array<any> | {};
};

export declare type TPassthroughData = Record<string, unknown>;

export declare type TUsageMetric = {
    name: string;
    value: number;
};

export { }
