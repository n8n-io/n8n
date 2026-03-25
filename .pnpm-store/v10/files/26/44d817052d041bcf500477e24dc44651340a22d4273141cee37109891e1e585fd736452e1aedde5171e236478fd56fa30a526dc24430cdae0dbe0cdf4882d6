/* eslint-disable @typescript-eslint/no-unused-vars, class-methods-use-this */
import { stripTrailingSlash } from '../../lib/helper';
import logger from '../../lib/logger';
import { RequestWrapper } from '../../lib/request-wrapper';
import { getCurrentTime } from '../utils/helpers';
/**
 * A class for shared functionality for storing, and requesting tokens.
 * Intended to be used as a parent to be extended for token request management.
 * Child classes should implement "requestToken()" to retrieve the token
 * from intended sources and "saveTokenInfo(tokenResponse)" to parse and save
 * token information from the response.
 */
export class TokenManager {
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
    constructor(options) {
        // all parameters are optional
        options = options || {};
        if (options.url) {
            this.url = stripTrailingSlash(options.url);
        }
        // request options
        this.disableSslVerification = Boolean(options.disableSslVerification);
        this.headers = options.headers || {};
        // any config options for the internal request library, like `proxy`, will be passed here
        this.requestWrapperInstance = new RequestWrapper(options);
        // Array of requests pending completion of an active token request -- initially empty
        this.pendingRequests = [];
    }
    /**
     * Retrieves a new token using "requestToken()" if there is not a
     * currently stored token from a previous call, or the previous token
     * has expired.
     */
    getToken() {
        if (!this.accessToken || this.isTokenExpired()) {
            // 1. Need a new token.
            logger.debug('Performing synchronous token refresh');
            return this.pacedRequestToken().then(() => this.accessToken);
        }
        if (this.tokenNeedsRefresh()) {
            // 2. Need to refresh the current (valid) token.
            logger.debug('Performing background asynchronous token fetch');
            this.requestToken().then((tokenResponse) => {
                this.saveTokenInfo(tokenResponse);
            }, (err) => {
                // If the refresh request failed: catch the error, log a message, and return the stored token.
                // The attempt to get a new token will be retried upon the next request.
                let message = 'Attempted token refresh failed. The refresh will be retried with the next request.';
                if (err && err.message) {
                    message += ` ${err.message}`;
                }
                logger.error(message);
                logger.debug(err);
            });
        }
        else {
            logger.debug('Using cached access token');
        }
        return Promise.resolve(this.accessToken);
    }
    /**
     * Sets the "disableSslVerification" property.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value) {
        // if they try to pass in a non-boolean value,
        // use the "truthy-ness" of the value
        this.disableSslVerification = Boolean(value);
    }
    /**
     * Sets the headers to be included with each outbound request to the token server.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers) {
        if (typeof headers !== 'object') {
            // do nothing, for now
            return;
        }
        this.headers = headers;
    }
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
    pacedRequestToken() {
        const currentTime = getCurrentTime();
        if (this.requestTime > currentTime - 60) {
            // token request is active -- queue the promise for this request
            return new Promise((resolve, reject) => {
                this.pendingRequests.push({ resolve, reject });
            });
        }
        this.requestTime = currentTime;
        return this.requestToken()
            .then((tokenResponse) => {
            this.saveTokenInfo(tokenResponse);
            this.pendingRequests.forEach(({ resolve }) => {
                resolve();
            });
            this.pendingRequests = [];
            this.requestTime = 0;
        })
            .catch((err) => {
            this.pendingRequests.forEach(({ reject }) => {
                reject(err);
            });
            throw err;
        });
    }
    /**
     * Request a token using an API endpoint.
     *
     * @returns Promise
     */
    requestToken() {
        const errMsg = '`requestToken` MUST be overridden by a subclass of TokenManagerV1.';
        const err = new Error(errMsg);
        logger.error(errMsg);
        return Promise.reject(err);
    }
    /**
     * Parse and save token information from the response.
     * Save the requested token into field `accessToken`.
     * Calculate expiration and refresh time from the received info
     * and store them in fields `expireTime` and `refreshTime`.
     *
     * @param tokenResponse - the response object from a token service request
     */
    saveTokenInfo(tokenResponse) {
        const errMsg = '`saveTokenInfo` MUST be overridden by a subclass of TokenManager.';
        logger.error(errMsg);
    }
    /**
     * Checks if currently-stored token is expired
     */
    isTokenExpired() {
        const { expireTime } = this;
        if (!expireTime) {
            return true;
        }
        const currentTime = getCurrentTime();
        return expireTime <= currentTime;
    }
    /**
     * Checks if currently-stored token should be refreshed
     * i.e. past the window to request a new token
     */
    tokenNeedsRefresh() {
        const { refreshTime } = this;
        const currentTime = getCurrentTime();
        if (refreshTime && refreshTime > currentTime) {
            return false;
        }
        // Update refreshTime to 60 seconds from now to avoid redundant refreshes
        this.refreshTime = currentTime + 60;
        return true;
    }
}
