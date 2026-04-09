import { APIResource } from "../../resource.js";
import * as Core from "../../core.js";
import * as DownloadsAPI from "./downloads.js";
import { Downloads } from "./downloads.js";
import * as LogsAPI from "./logs.js";
import { LogListResponse, Logs, SessionLog } from "./logs.js";
import * as RecordingAPI from "./recording.js";
import { Recording, RecordingRetrieveResponse, SessionRecording } from "./recording.js";
import * as UploadsAPI from "./uploads.js";
import { UploadCreateParams, UploadCreateResponse, Uploads } from "./uploads.js";
export declare class Sessions extends APIResource {
    downloads: DownloadsAPI.Downloads;
    logs: LogsAPI.Logs;
    recording: RecordingAPI.Recording;
    uploads: UploadsAPI.Uploads;
    /**
     * Create a Session
     */
    create(body?: SessionCreateParams, options?: Core.RequestOptions): Core.APIPromise<SessionCreateResponse>;
    create(options?: Core.RequestOptions): Core.APIPromise<SessionCreateResponse>;
    /**
     * Get a Session
     */
    retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<SessionRetrieveResponse>;
    /**
     * Update a Session
     */
    update(id: string, body: SessionUpdateParams, options?: Core.RequestOptions): Core.APIPromise<Session>;
    /**
     * List Sessions
     */
    list(query?: SessionListParams, options?: Core.RequestOptions): Core.APIPromise<SessionListResponse>;
    list(options?: Core.RequestOptions): Core.APIPromise<SessionListResponse>;
    /**
     * Session Live URLs
     */
    debug(id: string, options?: Core.RequestOptions): Core.APIPromise<SessionLiveURLs>;
}
export interface Session {
    id: string;
    createdAt: string;
    expiresAt: string;
    /**
     * Indicates if the Session was created to be kept alive upon disconnections
     */
    keepAlive: boolean;
    /**
     * The Project ID linked to the Session.
     */
    projectId: string;
    /**
     * Bytes used via the [Proxy](/features/stealth-mode#proxies-and-residential-ips)
     */
    proxyBytes: number;
    /**
     * The region where the Session is running.
     */
    region: 'us-west-2' | 'us-east-1' | 'eu-central-1' | 'ap-southeast-1';
    startedAt: string;
    status: 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';
    updatedAt: string;
    /**
     * Optional. The Context linked to the Session.
     */
    contextId?: string;
    endedAt?: string;
    /**
     * Arbitrary user metadata to attach to the session. To learn more about user
     * metadata, see [User Metadata](/features/sessions#user-metadata).
     */
    userMetadata?: {
        [key: string]: unknown;
    };
}
export interface SessionLiveURLs {
    debuggerFullscreenUrl: string;
    debuggerUrl: string;
    pages: Array<SessionLiveURLs.Page>;
    wsUrl: string;
}
export declare namespace SessionLiveURLs {
    interface Page {
        id: string;
        debuggerFullscreenUrl: string;
        debuggerUrl: string;
        faviconUrl: string;
        title: string;
        url: string;
    }
}
export interface SessionCreateResponse extends Session {
    /**
     * WebSocket URL to connect to the Session.
     */
    connectUrl: string;
    /**
     * HTTP URL to connect to the Session.
     */
    seleniumRemoteUrl: string;
    /**
     * Signing key to use when connecting to the Session via HTTP.
     */
    signingKey: string;
}
export interface SessionRetrieveResponse extends Session {
    /**
     * WebSocket URL to connect to the Session.
     */
    connectUrl?: string;
    /**
     * HTTP URL to connect to the Session.
     */
    seleniumRemoteUrl?: string;
    /**
     * Signing key to use when connecting to the Session via HTTP.
     */
    signingKey?: string;
}
export type SessionListResponse = Array<Session>;
export interface SessionCreateParams {
    browserSettings?: SessionCreateParams.BrowserSettings;
    /**
     * The uploaded Extension ID. See
     * [Upload Extension](/reference/api/upload-an-extension).
     */
    extensionId?: string;
    /**
     * Set to true to keep the session alive even after disconnections. Available on
     * the Hobby Plan and above.
     */
    keepAlive?: boolean;
    /**
     * The Project ID. Can be found in
     * [Settings](https://www.browserbase.com/settings). Optional - if not provided,
     * the project will be inferred from the API key.
     */
    projectId?: string;
    /**
     * Proxy configuration. Can be true for default proxy, or an array of proxy
     * configurations.
     */
    proxies?: Array<SessionCreateParams.BrowserbaseProxyConfig | SessionCreateParams.ExternalProxyConfig | SessionCreateParams.NoneProxyConfig> | boolean;
    /**
     * The region where the Session should run.
     */
    region?: 'us-west-2' | 'us-east-1' | 'eu-central-1' | 'ap-southeast-1';
    /**
     * Duration in seconds after which the session will automatically end. Defaults to
     * the Project's `defaultTimeout`.
     */
    timeout?: number;
    /**
     * Arbitrary user metadata to attach to the session. To learn more about user
     * metadata, see [User Metadata](/features/sessions#user-metadata).
     */
    userMetadata?: {
        [key: string]: unknown;
    };
}
export declare namespace SessionCreateParams {
    interface BrowserSettings {
        /**
         * Advanced Browser Stealth Mode
         */
        advancedStealth?: boolean;
        /**
         * Enable or disable ad blocking in the browser. Defaults to `false`.
         */
        blockAds?: boolean;
        /**
         * Custom selector for captcha image. See
         * [Custom Captcha Solving](/features/stealth-mode#custom-captcha-solving)
         */
        captchaImageSelector?: string;
        /**
         * Custom selector for captcha input. See
         * [Custom Captcha Solving](/features/stealth-mode#custom-captcha-solving)
         */
        captchaInputSelector?: string;
        context?: BrowserSettings.Context;
        /**
         * The uploaded Extension ID. See
         * [Upload Extension](/reference/api/upload-an-extension).
         */
        extensionId?: string;
        /**
         * Enable or disable session logging. Defaults to `true`.
         */
        logSession?: boolean;
        /**
         * Operating system for stealth mode. Valid values: windows, mac, linux, mobile,
         * tablet
         */
        os?: 'windows' | 'mac' | 'linux' | 'mobile' | 'tablet';
        /**
         * Enable or disable session recording. Defaults to `true`.
         */
        recordSession?: boolean;
        /**
         * Enable or disable captcha solving in the browser. Defaults to `true`.
         */
        solveCaptchas?: boolean;
        viewport?: BrowserSettings.Viewport;
    }
    namespace BrowserSettings {
        interface Context {
            /**
             * The Context ID.
             */
            id: string;
            /**
             * Whether or not to persist the context after browsing. Defaults to `false`.
             */
            persist?: boolean;
        }
        interface Viewport {
            /**
             * The height of the browser.
             */
            height?: number;
            /**
             * The width of the browser.
             */
            width?: number;
        }
    }
    interface BrowserbaseProxyConfig {
        /**
         * Type of proxy. Always use 'browserbase' for the Browserbase managed proxy
         * network.
         */
        type: 'browserbase';
        /**
         * Domain pattern for which this proxy should be used. If omitted, defaults to all
         * domains. Optional.
         */
        domainPattern?: string;
        /**
         * Geographic location for the proxy. Optional.
         */
        geolocation?: BrowserbaseProxyConfig.Geolocation;
    }
    namespace BrowserbaseProxyConfig {
        /**
         * Geographic location for the proxy. Optional.
         */
        interface Geolocation {
            /**
             * Country code in ISO 3166-1 alpha-2 format
             */
            country: string;
            /**
             * Name of the city. Use spaces for multi-word city names. Optional.
             */
            city?: string;
            /**
             * US state code (2 characters). Must also specify US as the country. Optional.
             */
            state?: string;
        }
    }
    interface ExternalProxyConfig {
        /**
         * Server URL for external proxy. Required.
         */
        server: string;
        /**
         * Type of proxy. Always 'external' for this config.
         */
        type: 'external';
        /**
         * Domain pattern for which this proxy should be used. If omitted, defaults to all
         * domains. Optional.
         */
        domainPattern?: string;
        /**
         * Password for external proxy authentication. Optional.
         */
        password?: string;
        /**
         * Username for external proxy authentication. Optional.
         */
        username?: string;
    }
    interface NoneProxyConfig {
        /**
         * Type of proxy. Always 'none' for this config.
         */
        type: 'none';
        /**
         * Domain pattern for which this proxy should be used. If omitted, defaults to all
         * domains. Optional.
         */
        domainPattern?: string;
    }
}
export interface SessionUpdateParams {
    /**
     * Set to `REQUEST_RELEASE` to request that the session complete. Use before
     * session's timeout to avoid additional charges.
     */
    status: 'REQUEST_RELEASE';
    /**
     * The Project ID. Can be found in
     * [Settings](https://www.browserbase.com/settings). Optional - if not provided,
     * the project will be inferred from the API key.
     */
    projectId?: string;
}
export interface SessionListParams {
    /**
     * Query sessions by user metadata. See
     * [Querying Sessions by User Metadata](/features/sessions#querying-sessions-by-user-metadata)
     * for the schema of this query.
     */
    q?: string;
    status?: 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';
}
export declare namespace Sessions {
    export { type Session as Session, type SessionLiveURLs as SessionLiveURLs, type SessionCreateResponse as SessionCreateResponse, type SessionRetrieveResponse as SessionRetrieveResponse, type SessionListResponse as SessionListResponse, type SessionCreateParams as SessionCreateParams, type SessionUpdateParams as SessionUpdateParams, type SessionListParams as SessionListParams, };
    export { Downloads as Downloads };
    export { Logs as Logs, type SessionLog as SessionLog, type LogListResponse as LogListResponse };
    export { Recording as Recording, type SessionRecording as SessionRecording, type RecordingRetrieveResponse as RecordingRetrieveResponse, };
    export { Uploads as Uploads, type UploadCreateResponse as UploadCreateResponse, type UploadCreateParams as UploadCreateParams, };
}
//# sourceMappingURL=sessions.d.ts.map