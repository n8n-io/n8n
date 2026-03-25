"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars, class-methods-use-this */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
var helper_1 = require("../../lib/helper");
var logger_1 = __importDefault(require("../../lib/logger"));
var request_wrapper_1 = require("../../lib/request-wrapper");
var helpers_1 = require("../utils/helpers");
/**
 * A class for shared functionality for storing, and requesting tokens.
 * Intended to be used as a parent to be extended for token request management.
 * Child classes should implement "requestToken()" to retrieve the token
 * from intended sources and "saveTokenInfo(tokenResponse)" to parse and save
 * token information from the response.
 */
var TokenManager = /** @class */ (function () {
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
    function TokenManager(options) {
        // all parameters are optional
        options = options || {};
        if (options.url) {
            this.url = (0, helper_1.stripTrailingSlash)(options.url);
        }
        // request options
        this.disableSslVerification = Boolean(options.disableSslVerification);
        this.headers = options.headers || {};
        // any config options for the internal request library, like `proxy`, will be passed here
        this.requestWrapperInstance = new request_wrapper_1.RequestWrapper(options);
        // Array of requests pending completion of an active token request -- initially empty
        this.pendingRequests = [];
    }
    /**
     * Retrieves a new token using "requestToken()" if there is not a
     * currently stored token from a previous call, or the previous token
     * has expired.
     */
    TokenManager.prototype.getToken = function () {
        var _this = this;
        if (!this.accessToken || this.isTokenExpired()) {
            // 1. Need a new token.
            logger_1.default.debug('Performing synchronous token refresh');
            return this.pacedRequestToken().then(function () { return _this.accessToken; });
        }
        if (this.tokenNeedsRefresh()) {
            // 2. Need to refresh the current (valid) token.
            logger_1.default.debug('Performing background asynchronous token fetch');
            this.requestToken().then(function (tokenResponse) {
                _this.saveTokenInfo(tokenResponse);
            }, function (err) {
                // If the refresh request failed: catch the error, log a message, and return the stored token.
                // The attempt to get a new token will be retried upon the next request.
                var message = 'Attempted token refresh failed. The refresh will be retried with the next request.';
                if (err && err.message) {
                    message += " ".concat(err.message);
                }
                logger_1.default.error(message);
                logger_1.default.debug(err);
            });
        }
        else {
            logger_1.default.debug('Using cached access token');
        }
        return Promise.resolve(this.accessToken);
    };
    /**
     * Sets the "disableSslVerification" property.
     *
     * @param value - the new value for the disableSslVerification property
     */
    TokenManager.prototype.setDisableSslVerification = function (value) {
        // if they try to pass in a non-boolean value,
        // use the "truthy-ness" of the value
        this.disableSslVerification = Boolean(value);
    };
    /**
     * Sets the headers to be included with each outbound request to the token server.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    TokenManager.prototype.setHeaders = function (headers) {
        if (typeof headers !== 'object') {
            // do nothing, for now
            return;
        }
        this.headers = headers;
    };
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
    TokenManager.prototype.pacedRequestToken = function () {
        var _this = this;
        var currentTime = (0, helpers_1.getCurrentTime)();
        if (this.requestTime > currentTime - 60) {
            // token request is active -- queue the promise for this request
            return new Promise(function (resolve, reject) {
                _this.pendingRequests.push({ resolve: resolve, reject: reject });
            });
        }
        this.requestTime = currentTime;
        return this.requestToken()
            .then(function (tokenResponse) {
            _this.saveTokenInfo(tokenResponse);
            _this.pendingRequests.forEach(function (_a) {
                var resolve = _a.resolve;
                resolve();
            });
            _this.pendingRequests = [];
            _this.requestTime = 0;
        })
            .catch(function (err) {
            _this.pendingRequests.forEach(function (_a) {
                var reject = _a.reject;
                reject(err);
            });
            throw err;
        });
    };
    /**
     * Request a token using an API endpoint.
     *
     * @returns Promise
     */
    TokenManager.prototype.requestToken = function () {
        var errMsg = '`requestToken` MUST be overridden by a subclass of TokenManagerV1.';
        var err = new Error(errMsg);
        logger_1.default.error(errMsg);
        return Promise.reject(err);
    };
    /**
     * Parse and save token information from the response.
     * Save the requested token into field `accessToken`.
     * Calculate expiration and refresh time from the received info
     * and store them in fields `expireTime` and `refreshTime`.
     *
     * @param tokenResponse - the response object from a token service request
     */
    TokenManager.prototype.saveTokenInfo = function (tokenResponse) {
        var errMsg = '`saveTokenInfo` MUST be overridden by a subclass of TokenManager.';
        logger_1.default.error(errMsg);
    };
    /**
     * Checks if currently-stored token is expired
     */
    TokenManager.prototype.isTokenExpired = function () {
        var expireTime = this.expireTime;
        if (!expireTime) {
            return true;
        }
        var currentTime = (0, helpers_1.getCurrentTime)();
        return expireTime <= currentTime;
    };
    /**
     * Checks if currently-stored token should be refreshed
     * i.e. past the window to request a new token
     */
    TokenManager.prototype.tokenNeedsRefresh = function () {
        var refreshTime = this.refreshTime;
        var currentTime = (0, helpers_1.getCurrentTime)();
        if (refreshTime && refreshTime > currentTime) {
            return false;
        }
        // Update refreshTime to 60 seconds from now to avoid redundant refreshes
        this.refreshTime = currentTime + 60;
        return true;
    };
    return TokenManager;
}());
exports.TokenManager = TokenManager;
