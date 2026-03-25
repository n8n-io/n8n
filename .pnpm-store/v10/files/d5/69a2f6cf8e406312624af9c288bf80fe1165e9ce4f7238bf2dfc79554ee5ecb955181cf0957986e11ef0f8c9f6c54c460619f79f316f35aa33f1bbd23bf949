import { PostHogFetchOptions, PostHogFetchResponse, PostHogAutocaptureElement, PostHogDecideResponse, PosthogCoreOptions, PostHogEventProperties, PostHogPersistedProperty, PosthogCaptureOptions, JsonType } from './types';
import { RetriableOptions } from './utils';
export * as utils from './utils';
import { LZString } from './lz-string';
import { SimpleEventEmitter } from './eventemitter';
export declare abstract class PostHogCoreStateless {
    private apiKey;
    host: string;
    private flushAt;
    private flushInterval;
    private requestTimeout;
    private captureMode;
    private removeDebugCallback?;
    private debugMode;
    private pendingPromises;
    private disableGeoip;
    private _optoutOverride;
    protected _events: SimpleEventEmitter;
    protected _flushTimer?: any;
    protected _retryOptions: RetriableOptions;
    abstract fetch(url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse>;
    abstract getLibraryId(): string;
    abstract getLibraryVersion(): string;
    abstract getCustomUserAgent(): string | void;
    abstract getPersistedProperty<T>(key: PostHogPersistedProperty): T | undefined;
    abstract setPersistedProperty<T>(key: PostHogPersistedProperty, value: T | null): void;
    constructor(apiKey: string, options?: PosthogCoreOptions);
    protected getCommonEventProperties(): any;
    get optedOut(): boolean;
    optIn(): void;
    optOut(): void;
    on(event: string, cb: (...args: any[]) => void): () => void;
    debug(enabled?: boolean): void;
    private buildPayload;
    /***
     *** TRACKING
     ***/
    protected identifyStateless(distinctId: string, properties?: PostHogEventProperties, options?: PosthogCaptureOptions): this;
    protected captureStateless(distinctId: string, event: string, properties?: {
        [key: string]: any;
    }, options?: PosthogCaptureOptions): this;
    protected aliasStateless(alias: string, distinctId: string, properties?: {
        [key: string]: any;
    }, options?: PosthogCaptureOptions): this;
    /***
     *** GROUPS
     ***/
    protected groupIdentifyStateless(groupType: string, groupKey: string | number, groupProperties?: PostHogEventProperties, options?: PosthogCaptureOptions, distinctId?: string, eventProperties?: PostHogEventProperties): this;
    /***
     *** FEATURE FLAGS
     ***/
    protected getDecide(distinctId: string, groups?: Record<string, string | number>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, extraPayload?: Record<string, any>): Promise<PostHogDecideResponse | undefined>;
    protected getFeatureFlagStateless(key: string, distinctId: string, groups?: Record<string, string>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, disableGeoip?: boolean): Promise<boolean | string | undefined>;
    protected getFeatureFlagPayloadStateless(key: string, distinctId: string, groups?: Record<string, string>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, disableGeoip?: boolean): Promise<JsonType | undefined>;
    protected getFeatureFlagPayloadsStateless(distinctId: string, groups?: Record<string, string>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, disableGeoip?: boolean): Promise<PostHogDecideResponse['featureFlagPayloads'] | undefined>;
    protected _parsePayload(response: any): any;
    protected getFeatureFlagsStateless(distinctId: string, groups?: Record<string, string | number>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, disableGeoip?: boolean): Promise<PostHogDecideResponse['featureFlags'] | undefined>;
    protected getFeatureFlagsAndPayloadsStateless(distinctId: string, groups?: Record<string, string | number>, personProperties?: Record<string, string>, groupProperties?: Record<string, Record<string, string>>, disableGeoip?: boolean): Promise<{
        flags: PostHogDecideResponse['featureFlags'] | undefined;
        payloads: PostHogDecideResponse['featureFlagPayloads'] | undefined;
    }>;
    /***
     *** QUEUEING AND FLUSHING
     ***/
    protected enqueue(type: string, _message: any, options?: PosthogCaptureOptions): void;
    flushAsync(): Promise<any>;
    flush(callback?: (err?: any, data?: any) => void): void;
    private fetchWithRetry;
    shutdownAsync(): Promise<void>;
    shutdown(): void;
}
export declare abstract class PostHogCore extends PostHogCoreStateless {
    private sendFeatureFlagEvent;
    private flagCallReported;
    protected _decideResponsePromise?: Promise<PostHogDecideResponse | undefined>;
    protected _sessionExpirationTimeSeconds: number;
    protected sessionProps: PostHogEventProperties;
    constructor(apiKey: string, options?: PosthogCoreOptions);
    protected setupBootstrap(options?: Partial<PosthogCoreOptions>): void;
    private get props();
    private set props(value);
    private clearProps;
    private _props;
    on(event: string, cb: (...args: any[]) => void): () => void;
    reset(propertiesToKeep?: PostHogPersistedProperty[]): void;
    protected getCommonEventProperties(): any;
    enrichProperties(properties?: PostHogEventProperties): any;
    getSessionId(): string | undefined;
    resetSessionId(): void;
    getAnonymousId(): string;
    getDistinctId(): string;
    unregister(property: string): void;
    register(properties: {
        [key: string]: any;
    }): void;
    registerForSession(properties: {
        [key: string]: any;
    }): void;
    unregisterForSession(property: string): void;
    /***
     *** TRACKING
     ***/
    identify(distinctId?: string, properties?: PostHogEventProperties, options?: PosthogCaptureOptions): this;
    capture(event: string, properties?: {
        [key: string]: any;
    }, options?: PosthogCaptureOptions): this;
    alias(alias: string): this;
    autocapture(eventType: string, elements: PostHogAutocaptureElement[], properties?: PostHogEventProperties, options?: PosthogCaptureOptions): this;
    /***
     *** GROUPS
     ***/
    groups(groups: {
        [type: string]: string | number;
    }): this;
    group(groupType: string, groupKey: string | number, groupProperties?: PostHogEventProperties, options?: PosthogCaptureOptions): this;
    groupIdentify(groupType: string, groupKey: string | number, groupProperties?: PostHogEventProperties, options?: PosthogCaptureOptions): this;
    /***
     * PROPERTIES
     ***/
    setPersonPropertiesForFlags(properties: {
        [type: string]: string;
    }): this;
    resetPersonPropertiesForFlags(): void;
    /** @deprecated - Renamed to setPersonPropertiesForFlags */
    personProperties(properties: {
        [type: string]: string;
    }): this;
    setGroupPropertiesForFlags(properties: {
        [type: string]: Record<string, string>;
    }): this;
    resetGroupPropertiesForFlags(): void;
    /** @deprecated - Renamed to setGroupPropertiesForFlags */
    groupProperties(properties: {
        [type: string]: Record<string, string>;
    }): this;
    /***
     *** FEATURE FLAGS
     ***/
    private decideAsync;
    private _decideAsync;
    private setKnownFeatureFlags;
    private setKnownFeatureFlagPayloads;
    getFeatureFlag(key: string): boolean | string | undefined;
    getFeatureFlagPayload(key: string): JsonType | undefined;
    getFeatureFlagPayloads(): PostHogDecideResponse['featureFlagPayloads'] | undefined;
    getFeatureFlags(): PostHogDecideResponse['featureFlags'] | undefined;
    getFeatureFlagsAndPayloads(): {
        flags: PostHogDecideResponse['featureFlags'] | undefined;
        payloads: PostHogDecideResponse['featureFlagPayloads'] | undefined;
    };
    isFeatureEnabled(key: string): boolean | undefined;
    reloadFeatureFlags(cb?: (err?: Error, flags?: PostHogDecideResponse['featureFlags']) => void): void;
    reloadFeatureFlagsAsync(sendAnonDistinctId?: boolean): Promise<PostHogDecideResponse['featureFlags'] | undefined>;
    onFeatureFlags(cb: (flags: PostHogDecideResponse['featureFlags']) => void): () => void;
    onFeatureFlag(key: string, cb: (value: string | boolean) => void): () => void;
    overrideFeatureFlag(flags: PostHogDecideResponse['featureFlags'] | null): void;
}
export * from './types';
export { LZString };
