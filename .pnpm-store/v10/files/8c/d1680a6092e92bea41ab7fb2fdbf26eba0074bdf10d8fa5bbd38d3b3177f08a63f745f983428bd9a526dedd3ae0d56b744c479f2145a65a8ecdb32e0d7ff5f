/// <reference types="node" />
declare type PosthogCoreOptions = {
    host?: string;
    flushAt?: number;
    flushInterval?: number;
    enable?: boolean;
    sendFeatureFlagEvent?: boolean;
    preloadFeatureFlags?: boolean;
    bootstrap?: {
        distinctId?: string;
        isIdentifiedId?: boolean;
        featureFlags?: Record<string, boolean | string>;
        featureFlagPayloads?: Record<string, JsonType>;
    };
    fetchRetryCount?: number;
    fetchRetryDelay?: number;
    requestTimeout?: number;
    sessionExpirationTimeSeconds?: number;
    captureMode?: 'json' | 'form';
    disableGeoip?: boolean;
};
declare enum PostHogPersistedProperty {
    AnonymousId = "anonymous_id",
    DistinctId = "distinct_id",
    Props = "props",
    FeatureFlags = "feature_flags",
    FeatureFlagPayloads = "feature_flag_payloads",
    OverrideFeatureFlags = "override_feature_flags",
    Queue = "queue",
    OptedOut = "opted_out",
    SessionId = "session_id",
    SessionLastTimestamp = "session_timestamp",
    PersonProperties = "person_properties",
    GroupProperties = "group_properties",
    InstalledAppBuild = "installed_app_build",
    InstalledAppVersion = "installed_app_version"
}
declare type PostHogFetchOptions = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    mode?: 'no-cors';
    credentials?: 'omit';
    headers: {
        [key: string]: string;
    };
    body?: string;
    signal?: AbortSignal;
};
declare type PosthogCaptureOptions = {
    timestamp?: Date;
    disableGeoip?: boolean;
};
declare type PostHogFetchResponse = {
    status: number;
    text: () => Promise<string>;
    json: () => Promise<any>;
};
declare type PostHogEventProperties = {
    [key: string]: any;
};
declare type PostHogDecideResponse = {
    config: {
        enable_collect_everything: boolean;
    };
    editorParams: {
        toolbarVersion: string;
        jsURL: string;
    };
    isAuthenticated: true;
    supportedCompression: string[];
    featureFlags: {
        [key: string]: string | boolean;
    };
    featureFlagPayloads: {
        [key: string]: JsonType;
    };
    errorsWhileComputingFlags: boolean;
    sessionRecording: boolean;
};
declare type PosthogFlagsAndPayloadsResponse = {
    featureFlags: PostHogDecideResponse['featureFlags'];
    featureFlagPayloads: PostHogDecideResponse['featureFlagPayloads'];
};
declare type JsonType = string | number | boolean | null | {
    [key: string]: JsonType;
} | Array<JsonType>;

interface RetriableOptions {
    retryCount?: number;
    retryDelay?: number;
    retryCheck?: (err: any) => boolean;
}

declare class SimpleEventEmitter {
    events: {
        [key: string]: ((...args: any[]) => void)[];
    };
    constructor();
    on(event: string, listener: (...args: any[]) => void): () => void;
    emit(event: string, payload: any): void;
}

declare abstract class PostHogCoreStateless {
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

interface IdentifyMessageV1 {
    distinctId: string;
    properties?: Record<string | number, any>;
    disableGeoip?: boolean;
}
interface EventMessageV1 extends IdentifyMessageV1 {
    event: string;
    groups?: Record<string, string | number>;
    sendFeatureFlags?: boolean;
    timestamp?: Date;
}
interface GroupIdentifyMessage {
    groupType: string;
    groupKey: string;
    properties?: Record<string | number, any>;
    distinctId?: string;
    disableGeoip?: boolean;
}
declare type PostHogNodeV1 = {
    /**
     * @description Capture allows you to capture anything a user does within your system,
     * which you can later use in PostHog to find patterns in usage,
     * work out which features to improve or where people are giving up.
     * A capture call requires:
     * @param distinctId which uniquely identifies your user
     * @param event We recommend using [verb] [noun], like movie played or movie updated to easily identify what your events mean later on.
     * @param properties OPTIONAL | which can be a object with any information you'd like to add
     * @param groups OPTIONAL | object of what groups are related to this event, example: { company: 'id:5' }. Can be used to analyze companies instead of users.
     * @param sendFeatureFlags OPTIONAL | Used with experiments. Determines whether to send feature flag values with the event.
     */
    capture({ distinctId, event, properties, groups, sendFeatureFlags }: EventMessageV1): void;
    /**
     * @description Identify lets you add metadata on your users so you can more easily identify who they are in PostHog,
     * and even do things like segment users by these properties.
     * An identify call requires:
     * @param distinctId which uniquely identifies your user
     * @param properties with a dict with any key: value pairs
     */
    identify({ distinctId, properties }: IdentifyMessageV1): void;
    /**
     * @description To marry up whatever a user does before they sign up or log in with what they do after you need to make an alias call.
     * This will allow you to answer questions like "Which marketing channels leads to users churning after a month?"
     * or "What do users do on our website before signing up?"
     * In a purely back-end implementation, this means whenever an anonymous user does something, you'll want to send a session ID with the capture call.
     * Then, when that users signs up, you want to do an alias call with the session ID and the newly created user ID.
     * The same concept applies for when a user logs in. If you're using PostHog in the front-end and back-end,
     *  doing the identify call in the frontend will be enough.:
     * @param distinctId the current unique id
     * @param alias the unique ID of the user before
     */
    alias(data: {
        distinctId: string;
        alias: string;
    }): void;
    /**
     * @description PostHog feature flags (https://posthog.com/docs/features/feature-flags)
     * allow you to safely deploy and roll back new features. Once you've created a feature flag in PostHog,
     * you can use this method to check if the flag is on for a given user, allowing you to create logic to turn
     * features on and off for different user groups or individual users.
     * @param key the unique key of your feature flag
     * @param distinctId the current unique id
     * @param options: dict with optional parameters below
     * @param groups optional - what groups are currently active (group analytics). Required if the flag depends on groups.
     * @param personProperties optional - what person properties are known. Used to compute flags locally, if personalApiKey is present.
     * @param groupProperties optional - what group properties are known. Used to compute flags locally, if personalApiKey is present.
     * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
     * @param sendFeatureFlagEvents optional - whether to send feature flag events. Used for Experiments. Defaults to true.
     *
     * @returns true if the flag is on, false if the flag is off, undefined if there was an error.
     */
    isFeatureEnabled(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
    }): Promise<boolean | undefined>;
    /**
     * @description PostHog feature flags (https://posthog.com/docs/features/feature-flags)
     * allow you to safely deploy and roll back new features. Once you've created a feature flag in PostHog,
     * you can use this method to check if the flag is on for a given user, allowing you to create logic to turn
     * features on and off for different user groups or individual users.
     * @param key the unique key of your feature flag
     * @param distinctId the current unique id
     * @param options: dict with optional parameters below
     * @param groups optional - what groups are currently active (group analytics). Required if the flag depends on groups.
     * @param personProperties optional - what person properties are known. Used to compute flags locally, if personalApiKey is present.
     * @param groupProperties optional - what group properties are known. Used to compute flags locally, if personalApiKey is present.
     * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
     * @param sendFeatureFlagEvents optional - whether to send feature flag events. Used for Experiments. Defaults to true.
     *
     * @returns true or string(for multivariates) if the flag is on, false if the flag is off, undefined if there was an error.
     */
    getFeatureFlag(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
    }): Promise<string | boolean | undefined>;
    /**
     * @description Retrieves payload associated with the specified flag and matched value that is passed in.
     * (Expected to be used in conjuction with getFeatureFlag but allows for manual lookup).
     * If matchValue isn't passed, getFeatureFlag is called implicitly.
     * Will try to evaluate for payload locally first otherwise default to network call if allowed
     *
     * @param key the unique key of your feature flag
     * @param distinctId the current unique id
     * @param matchValue optional- the matched flag string or boolean
     * @param options: dict with optional parameters below
     * @param onlyEvaluateLocally optional - whether to only evaluate the flag locally. Defaults to false.
     *
     * @returns payload of a json type object
     */
    getFeatureFlagPayload(key: string, distinctId: string, matchValue?: string | boolean, options?: {
        onlyEvaluateLocally?: boolean;
    }): Promise<JsonType | undefined>;
    /**
     * @description Sets a groups properties, which allows asking questions like "Who are the most active companies"
     * using my product in PostHog.
     *
     * @param groupType Type of group (ex: 'company'). Limited to 5 per project
     * @param groupKey Unique identifier for that type of group (ex: 'id:5')
     * @param properties OPTIONAL | which can be a object with any information you'd like to add
     */
    groupIdentify({ groupType, groupKey, properties }: GroupIdentifyMessage): void;
    /**
     * @description Force an immediate reload of the polled feature flags. Please note that they are
     * already polled automatically at a regular interval.
     */
    reloadFeatureFlags(): Promise<void>;
    /**
     * @description Flushes the events still in the queue and clears the feature flags poller to allow for
     * a clean shutdown.
     */
    shutdown(): void;
};

declare type PostHogOptions = PosthogCoreOptions & {
    persistence?: 'memory';
    personalApiKey?: string;
    featureFlagsPollingInterval?: number;
    requestTimeout?: number;
    maxCacheSize?: number;
    fetch?: (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>;
};
declare class PostHog extends PostHogCoreStateless implements PostHogNodeV1 {
    private _memoryStorage;
    private featureFlagsPoller?;
    private maxCacheSize;
    private options;
    distinctIdHasSentFlagCalls: Record<string, string[]>;
    constructor(apiKey: string, options?: PostHogOptions);
    getPersistedProperty(key: PostHogPersistedProperty): any | undefined;
    setPersistedProperty(key: PostHogPersistedProperty, value: any | null): void;
    fetch(url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse>;
    getLibraryId(): string;
    getLibraryVersion(): string;
    getCustomUserAgent(): string;
    enable(): void;
    disable(): void;
    debug(enabled?: boolean): void;
    capture({ distinctId, event, properties, groups, sendFeatureFlags, timestamp, disableGeoip }: EventMessageV1): void;
    identify({ distinctId, properties, disableGeoip }: IdentifyMessageV1): void;
    alias(data: {
        distinctId: string;
        alias: string;
        disableGeoip?: boolean;
    }): void;
    getFeatureFlag(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<string | boolean | undefined>;
    getFeatureFlagPayload(key: string, distinctId: string, matchValue?: string | boolean, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<JsonType | undefined>;
    isFeatureEnabled(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<boolean | undefined>;
    getAllFlags(distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        disableGeoip?: boolean;
    }): Promise<Record<string, string | boolean>>;
    getAllFlagsAndPayloads(distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        disableGeoip?: boolean;
    }): Promise<PosthogFlagsAndPayloadsResponse>;
    groupIdentify({ groupType, groupKey, properties, distinctId, disableGeoip }: GroupIdentifyMessage): void;
    reloadFeatureFlags(): Promise<void>;
    shutdown(): void;
    shutdownAsync(): Promise<void>;
}

export { PostHog, PostHogOptions };
