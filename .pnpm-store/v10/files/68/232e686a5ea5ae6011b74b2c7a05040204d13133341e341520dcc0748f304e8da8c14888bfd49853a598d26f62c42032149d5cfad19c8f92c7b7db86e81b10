"use strict";
/* eslint-disable class-methods-use-this */
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtTokenManager = void 0;
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
var jsonwebtoken_1 = require("jsonwebtoken");
var logger_1 = __importDefault(require("../../lib/logger"));
var token_manager_1 = require("./token-manager");
/**
 * A class for shared functionality for parsing, storing, and requesting
 * JWT tokens. Intended to be used as a parent to be extended for token
 * request management. Child classes should implement `requestToken()`
 * to retrieve the bearer token from intended sources.
 */
var JwtTokenManager = /** @class */ (function (_super) {
    __extends(JwtTokenManager, _super);
    /**
     * Create a new JwtTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    function JwtTokenManager(options) {
        var _this = this;
        // all parameters are optional
        options = options || {};
        _this = _super.call(this, options) || this;
        _this.tokenName = 'access_token';
        _this.tokenInfo = {};
        return _this;
    }
    /**
     * Request a JWT using an API key.
     *
     * @returns Promise
     */
    JwtTokenManager.prototype.requestToken = function () {
        var errMsg = '`requestToken` MUST be overridden by a subclass of JwtTokenManagerV1.';
        var err = new Error(errMsg);
        logger_1.default.error(errMsg);
        return Promise.reject(err);
    };
    /**
     * Save the JWT service response and the calculated expiration time to the object's state.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    JwtTokenManager.prototype.saveTokenInfo = function (tokenResponse) {
        var responseBody = tokenResponse.result || {};
        this.accessToken = responseBody[this.tokenName];
        if (!this.accessToken) {
            var err = 'Access token not present in response';
            logger_1.default.error(err);
            throw new Error(err);
        }
        var decodedResponse = (0, jsonwebtoken_1.decode)(this.accessToken);
        if (!decodedResponse) {
            var err = 'Access token received is not a valid JWT';
            logger_1.default.error(err);
            throw new Error(err);
        }
        // the time of expiration is found by decoding the JWT access token
        // 'exp' is the time of expire and 'iat' is the time of token retrieval
        var exp = decodedResponse.exp, iat = decodedResponse.iat;
        // There are no required claims in JWT
        if (!exp || !iat) {
            this.expireTime = 0;
            this.refreshTime = 0;
        }
        else {
            var fractionOfTtl = 0.8;
            var timeToLive = exp - iat;
            this.expireTime = exp;
            this.refreshTime = exp - timeToLive * (1.0 - fractionOfTtl);
        }
        this.tokenInfo = __assign({}, responseBody);
    };
    return JwtTokenManager;
}(token_manager_1.TokenManager));
exports.JwtTokenManager = JwtTokenManager;
