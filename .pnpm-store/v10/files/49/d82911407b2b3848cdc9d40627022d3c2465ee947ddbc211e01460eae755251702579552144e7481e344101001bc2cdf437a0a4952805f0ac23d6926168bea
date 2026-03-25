/// <reference types="node" />
export declare type PosthogCoreOptions = {
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
export declare enum PostHogPersistedProperty {
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
export declare type PostHogFetchOptions = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    mode?: 'no-cors';
    credentials?: 'omit';
    headers: {
        [key: string]: string;
    };
    body?: string;
    signal?: AbortSignal;
};
export declare type PosthogCaptureOptions = {
    timestamp?: Date;
    disableGeoip?: boolean;
};
export declare type PostHogFetchResponse = {
    status: number;
    text: () => Promise<string>;
    json: () => Promise<any>;
};
export declare type PostHogQueueItem = {
    message: any;
    callback?: (err: any) => void;
};
export declare type PostHogEventProperties = {
    [key: string]: any;
};
export declare type PostHogAutocaptureElement = {
    $el_text?: string;
    tag_name: string;
    href?: string;
    nth_child?: number;
    nth_of_type?: number;
    order?: number;
} & {
    [key: string]: any;
};
export declare type PostHogDecideResponse = {
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
export declare type PosthogFlagsAndPayloadsResponse = {
    featureFlags: PostHogDecideResponse['featureFlags'];
    featureFlagPayloads: PostHogDecideResponse['featureFlagPayloads'];
};
export declare type JsonType = string | number | boolean | null | {
    [key: string]: JsonType;
} | Array<JsonType>;
