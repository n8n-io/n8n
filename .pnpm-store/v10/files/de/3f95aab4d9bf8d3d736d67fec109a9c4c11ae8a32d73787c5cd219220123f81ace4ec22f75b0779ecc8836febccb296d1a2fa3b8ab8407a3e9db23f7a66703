// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import { isRequestOptions } from '../../core';
import * as Core from '../../core';
import * as DownloadsAPI from './downloads';
import { Downloads } from './downloads';
import * as LogsAPI from './logs';
import { LogListResponse, Logs, SessionLog } from './logs';
import * as RecordingAPI from './recording';
import { Recording, RecordingRetrieveResponse, SessionRecording } from './recording';
import * as UploadsAPI from './uploads';
import { UploadCreateParams, UploadCreateResponse, Uploads } from './uploads';

export class Sessions extends APIResource {
  downloads: DownloadsAPI.Downloads = new DownloadsAPI.Downloads(this._client);
  logs: LogsAPI.Logs = new LogsAPI.Logs(this._client);
  recording: RecordingAPI.Recording = new RecordingAPI.Recording(this._client);
  uploads: UploadsAPI.Uploads = new UploadsAPI.Uploads(this._client);

  /**
   * Create a Session
   */
  create(body: SessionCreateParams, options?: Core.RequestOptions): Core.APIPromise<SessionCreateResponse> {
    return this._client.post('/v1/sessions', { body, ...options });
  }

  /**
   * Session
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<SessionRetrieveResponse> {
    return this._client.get(`/v1/sessions/${id}`, options);
  }

  /**
   * Update Session
   */
  update(id: string, body: SessionUpdateParams, options?: Core.RequestOptions): Core.APIPromise<Session> {
    return this._client.post(`/v1/sessions/${id}`, { body, ...options });
  }

  /**
   * List Sessions
   */
  list(query?: SessionListParams, options?: Core.RequestOptions): Core.APIPromise<SessionListResponse>;
  list(options?: Core.RequestOptions): Core.APIPromise<SessionListResponse>;
  list(
    query: SessionListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.APIPromise<SessionListResponse> {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.get('/v1/sessions', { query, ...options });
  }

  /**
   * Session Live URLs
   */
  debug(id: string, options?: Core.RequestOptions): Core.APIPromise<SessionLiveURLs> {
    return this._client.get(`/v1/sessions/${id}/debug`, options);
  }
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
   * CPU used by the Session
   */
  avgCpuUsage?: number;

  /**
   * Optional. The Context linked to the Session.
   */
  contextId?: string;

  endedAt?: string;

  /**
   * Memory used by the Session
   */
  memoryUsage?: number;

  /**
   * Arbitrary user metadata to attach to the session. To learn more about user
   * metadata, see [User Metadata](/features/sessions#user-metadata).
   */
  userMetadata?: Record<string, unknown>;
}

export interface SessionLiveURLs {
  debuggerFullscreenUrl: string;

  debuggerUrl: string;

  pages: Array<SessionLiveURLs.Page>;

  wsUrl: string;
}

export namespace SessionLiveURLs {
  export interface Page {
    id: string;

    debuggerFullscreenUrl: string;

    debuggerUrl: string;

    faviconUrl: string;

    title: string;

    url: string;
  }
}

export interface SessionCreateResponse {
  id: string;

  /**
   * WebSocket URL to connect to the Session.
   */
  connectUrl: string;

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

  /**
   * HTTP URL to connect to the Session.
   */
  seleniumRemoteUrl: string;

  /**
   * Signing key to use when connecting to the Session via HTTP.
   */
  signingKey: string;

  startedAt: string;

  status: 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';

  updatedAt: string;

  /**
   * CPU used by the Session
   */
  avgCpuUsage?: number;

  /**
   * Optional. The Context linked to the Session.
   */
  contextId?: string;

  endedAt?: string;

  /**
   * Memory used by the Session
   */
  memoryUsage?: number;

  /**
   * Arbitrary user metadata to attach to the session. To learn more about user
   * metadata, see [User Metadata](/features/sessions#user-metadata).
   */
  userMetadata?: Record<string, unknown>;
}

export interface SessionRetrieveResponse {
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
   * CPU used by the Session
   */
  avgCpuUsage?: number;

  /**
   * WebSocket URL to connect to the Session.
   */
  connectUrl?: string;

  /**
   * Optional. The Context linked to the Session.
   */
  contextId?: string;

  endedAt?: string;

  /**
   * Memory used by the Session
   */
  memoryUsage?: number;

  /**
   * HTTP URL to connect to the Session.
   */
  seleniumRemoteUrl?: string;

  /**
   * Signing key to use when connecting to the Session via HTTP.
   */
  signingKey?: string;

  /**
   * Arbitrary user metadata to attach to the session. To learn more about user
   * metadata, see [User Metadata](/features/sessions#user-metadata).
   */
  userMetadata?: Record<string, unknown>;
}

export type SessionListResponse = Array<Session>;

export interface SessionCreateParams {
  /**
   * The Project ID. Can be found in
   * [Settings](https://www.browserbase.com/settings).
   */
  projectId: string;

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
   * Proxy configuration. Can be true for default proxy, or an array of proxy
   * configurations.
   */
  proxies?:
    | boolean
    | Array<SessionCreateParams.BrowserbaseProxyConfig | SessionCreateParams.ExternalProxyConfig>;

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
  userMetadata?: Record<string, unknown>;
}

export namespace SessionCreateParams {
  export interface BrowserSettings {
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
     * See usage examples
     * [in the Stealth Mode page](/features/stealth-mode#fingerprinting).
     */
    fingerprint?: BrowserSettings.Fingerprint;

    /**
     * Enable or disable session logging. Defaults to `true`.
     */
    logSession?: boolean;

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

  export namespace BrowserSettings {
    export interface Context {
      /**
       * The Context ID.
       */
      id: string;

      /**
       * Whether or not to persist the context after browsing. Defaults to `false`.
       */
      persist?: boolean;
    }

    /**
     * See usage examples
     * [in the Stealth Mode page](/features/stealth-mode#fingerprinting).
     */
    export interface Fingerprint {
      browsers?: Array<'chrome' | 'edge' | 'firefox' | 'safari'>;

      devices?: Array<'desktop' | 'mobile'>;

      httpVersion?: '1' | '2';

      /**
       * Full list of locales is available
       * [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language).
       */
      locales?: Array<string>;

      /**
       * Note: `operatingSystems` set to `ios` or `android` requires `devices` to include
       * `"mobile"`.
       */
      operatingSystems?: Array<'android' | 'ios' | 'linux' | 'macos' | 'windows'>;

      screen?: Fingerprint.Screen;
    }

    export namespace Fingerprint {
      export interface Screen {
        maxHeight?: number;

        maxWidth?: number;

        minHeight?: number;

        minWidth?: number;
      }
    }

    export interface Viewport {
      height?: number;

      width?: number;
    }
  }

  export interface BrowserbaseProxyConfig {
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
     * Configuration for geolocation
     */
    geolocation?: BrowserbaseProxyConfig.Geolocation;
  }

  export namespace BrowserbaseProxyConfig {
    /**
     * Configuration for geolocation
     */
    export interface Geolocation {
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

  export interface ExternalProxyConfig {
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
}

export interface SessionUpdateParams {
  /**
   * The Project ID. Can be found in
   * [Settings](https://www.browserbase.com/settings).
   */
  projectId: string;

  /**
   * Set to `REQUEST_RELEASE` to request that the session complete. Use before
   * session's timeout to avoid additional charges.
   */
  status: 'REQUEST_RELEASE';
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

Sessions.Downloads = Downloads;
Sessions.Logs = Logs;
Sessions.Recording = Recording;
Sessions.Uploads = Uploads;

export declare namespace Sessions {
  export {
    type Session as Session,
    type SessionLiveURLs as SessionLiveURLs,
    type SessionCreateResponse as SessionCreateResponse,
    type SessionRetrieveResponse as SessionRetrieveResponse,
    type SessionListResponse as SessionListResponse,
    type SessionCreateParams as SessionCreateParams,
    type SessionUpdateParams as SessionUpdateParams,
    type SessionListParams as SessionListParams,
  };

  export { Downloads as Downloads };

  export { Logs as Logs, type SessionLog as SessionLog, type LogListResponse as LogListResponse };

  export {
    Recording as Recording,
    type SessionRecording as SessionRecording,
    type RecordingRetrieveResponse as RecordingRetrieveResponse,
  };

  export {
    Uploads as Uploads,
    type UploadCreateResponse as UploadCreateResponse,
    type UploadCreateParams as UploadCreateParams,
  };
}
