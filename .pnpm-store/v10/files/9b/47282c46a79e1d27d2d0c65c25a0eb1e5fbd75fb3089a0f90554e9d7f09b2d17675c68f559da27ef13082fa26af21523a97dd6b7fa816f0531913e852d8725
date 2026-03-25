/// <reference types="node" />
/**
 * (C) Copyright IBM Corp. 2020, 2024.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { OutgoingHttpHeaders } from 'http';
import { RequestWrapper } from '../../lib/request-wrapper';
/** Configuration options for token retrieval. */
export type TokenManagerOptions = {
    /** The endpoint for token requests. */
    url?: string;
    /** Headers to be sent with every service token request. */
    headers?: OutgoingHttpHeaders;
    /**
     * A flag that indicates whether verification of
     *   the server's SSL certificate should be disabled or not.
     */
    disableSslVerification?: boolean;
    /** Allow additional request config parameters */
    [propName: string]: any;
};
/**
 * A class for shared functionality for storing, and requesting tokens.
 * Intended to be used as a parent to be extended for token request management.
 * Child classes should implement "requestToken()" to retrieve the token
 * from intended sources and "saveTokenInfo(tokenResponse)" to parse and save
 * token information from the response.
 */
export declare class TokenManager {
    protected url: string;
    protected userAgent: string;
    protected disableSslVerification: boolean;
    protected headers: OutgoingHttpHeaders;
    protected requestWrapperInstance: RequestWrapper;
    protected accessToken: string;
    protected expireTime: number;
    protected refreshTime: number;
    private requestTime;
    private pendingRequests;
    /**
     * Create a new TokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: TokenManagerOptions);
    /**
     * Retrieves a new token using "requestToken()" if there is not a
     * currently stored token from a previous call, or the previous token
     * has expired.
     */
    getToken(): Promise<any>;
    /**
     * Sets the "disableSslVerification" property.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Sets the headers to be included with each outbound request to the token server.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
    /**
     * Paces requests to requestToken().
     *
     * This method pseudo-serializes requests for an access_token
     * when the current token is undefined or expired.
     * The first caller to this method records its `requestTime` and
     * then issues the token request. Subsequent callers will check the
     * `requestTime` to see if a request is active (has been issued within
     * the past 60 seconds), and if so will queue their promise for the
     * active requestor to resolve when that request completes.
     */
    protected pacedRequestToken(): Promise<any>;
    /**
     * Request a token using an API endpoint.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Parse and save token information from the response.
     * Save the requested token into field `accessToken`.
     * Calculate expiration and refresh time from the received info
     * and store them in fields `expireTime` and `refreshTime`.
     *
     * @param tokenResponse - the response object from a token service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Checks if currently-stored token is expired
     */
    protected isTokenExpired(): boolean;
    /**
     * Checks if currently-stored token should be refreshed
     * i.e. past the window to request a new token
     */
    private tokenNeedsRefresh;
}
