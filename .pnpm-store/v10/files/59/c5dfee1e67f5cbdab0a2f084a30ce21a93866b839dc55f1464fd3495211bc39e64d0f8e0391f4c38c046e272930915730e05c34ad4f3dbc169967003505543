"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2024.
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRequestBasedTokenManager = void 0;
var extend_1 = __importDefault(require("extend"));
var logger_1 = __importDefault(require("../../lib/logger"));
var helpers_1 = require("../utils/helpers");
var jwt_token_manager_1 = require("./jwt-token-manager");
var CLIENT_ID_SECRET_WARNING = 'Warning: Client ID and Secret must BOTH be given, or the header will not be included.';
var DEFAULT_IAM_URL = 'https://iam.cloud.ibm.com';
var OPERATION_PATH = '/identity/token';
var IAM_EXPIRATION_WINDOW = 10;
/**
 * The IamRequestBasedTokenManager class contains code relevant to any token manager that
 * interacts with the IAM service to manage a token. It stores information relevant to all
 * IAM requests, such as the client ID and secret, and performs the token request with a set
 * of request options common to any IAM token management scheme. It is intended that this
 * class be extended with specific implementations.
 */
var IamRequestBasedTokenManager = /** @class */ (function (_super) {
    __extends(IamRequestBasedTokenManager, _super);
    /**
     *
     * Create a new IamRequestBasedTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default value: "https://iam.cloud.ibm.com")
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    function IamRequestBasedTokenManager(options) {
        var _this = this;
        // all parameters are optional
        options = options || {};
        _this = _super.call(this, options) || this;
        // Canonicalize the URL by removing the operation path if it was specified by the user.
        _this.url = _this.url ? (0, helpers_1.removeSuffix)(_this.url, OPERATION_PATH) : DEFAULT_IAM_URL;
        if (options.clientId) {
            _this.clientId = options.clientId;
        }
        if (options.clientSecret) {
            _this.clientSecret = options.clientSecret;
        }
        if (options.scope) {
            _this.scope = options.scope;
        }
        if ((0, helpers_1.onlyOne)(options.clientId, options.clientSecret)) {
            // tslint:disable-next-line
            logger_1.default.warn(CLIENT_ID_SECRET_WARNING);
        }
        // initialize the form data object
        _this.formData = {};
        return _this;
    }
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter within the request sent to the IAM token service.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    IamRequestBasedTokenManager.prototype.setScope = function (scope) {
        this.scope = scope;
    };
    /**
     * Sets the IAM "clientId" and "clientSecret" values.
     * These values are used to compute the Authorization header used
     * when retrieving the IAM access token.
     * If these values are not set, no Authorization header will be
     * set on the request (it is not required).
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    IamRequestBasedTokenManager.prototype.setClientIdAndSecret = function (clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        if ((0, helpers_1.onlyOne)(clientId, clientSecret)) {
            // tslint:disable-next-line
            logger_1.default.warn(CLIENT_ID_SECRET_WARNING);
        }
    };
    /**
     * Extend this method from the parent class to extract the refresh token from
     * the request and save it.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    IamRequestBasedTokenManager.prototype.saveTokenInfo = function (tokenResponse) {
        _super.prototype.saveTokenInfo.call(this, tokenResponse);
        var responseBody = tokenResponse.result || {};
        if (responseBody.refresh_token) {
            this.refreshToken = responseBody.refresh_token;
        }
    };
    /**
     * Request an IAM access token using an API key.
     *
     * @returns Promise
     */
    IamRequestBasedTokenManager.prototype.requestToken = function () {
        // these cannot be overwritten
        var requiredHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent,
        };
        // If both the clientId and secret were specified by the user, then use them.
        if (this.clientId && this.clientSecret) {
            requiredHeaders.Authorization = (0, helpers_1.computeBasicAuthHeader)(this.clientId, this.clientSecret);
        }
        if (this.scope) {
            this.formData.scope = this.scope;
        }
        var parameters = {
            options: {
                url: this.url + OPERATION_PATH,
                method: 'POST',
                headers: (0, extend_1.default)(true, {}, this.headers, requiredHeaders),
                form: this.formData,
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger_1.default.debug("Invoking IAM get_token operation: ".concat(parameters.options.url));
        return this.requestWrapperInstance.sendRequest(parameters).then(function (response) {
            logger_1.default.debug('Returned from IAM get_token operation');
            return response;
        });
    };
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    IamRequestBasedTokenManager.prototype.isTokenExpired = function () {
        var expireTime = this.expireTime;
        if (!expireTime) {
            return true;
        }
        var currentTime = (0, helpers_1.getCurrentTime)();
        return currentTime >= expireTime - IAM_EXPIRATION_WINDOW;
    };
    return IamRequestBasedTokenManager;
}(jwt_token_manager_1.JwtTokenManager));
exports.IamRequestBasedTokenManager = IamRequestBasedTokenManager;
