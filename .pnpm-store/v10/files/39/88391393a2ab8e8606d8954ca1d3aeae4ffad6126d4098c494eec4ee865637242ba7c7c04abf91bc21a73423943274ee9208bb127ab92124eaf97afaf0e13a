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
exports.Cp4dTokenManager = void 0;
var extend_1 = __importDefault(require("extend"));
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var jwt_token_manager_1 = require("./jwt-token-manager");
var logger_1 = __importDefault(require("../../lib/logger"));
/**
 * Token Manager of CloudPak for data.
 *
 * The Token Manager performs basic auth with a username and password
 * to acquire CP4D tokens.
 */
var Cp4dTokenManager = /** @class */ (function (_super) {
    __extends(Cp4dTokenManager, _super);
    /**
     * Create a new Cp4dTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - username: (required) the username used to obtain a bearer token
     * - password: (optional) the password used to obtain a bearer token (required if apikey is not specified)
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    function Cp4dTokenManager(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['username', 'url'];
        _this.tokenName = 'token';
        if ((!options.password && !options.apikey) || (options.password && options.apikey)) {
            throw new Error('Exactly one of `apikey` or `password` must be specified.');
        }
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        var tokenApiPath = '/v1/authorize';
        // do not append the path if user already has
        if (_this.url && !_this.url.endsWith(tokenApiPath)) {
            _this.url += tokenApiPath;
        }
        _this.username = options.username;
        _this.password = options.password;
        _this.apikey = options.apikey;
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('cp4d-authenticator');
        return _this;
    }
    Cp4dTokenManager.prototype.requestToken = function () {
        // these cannot be overwritten
        var requiredHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
        };
        var parameters = {
            options: {
                url: this.url,
                body: {
                    username: this.username,
                    password: this.password,
                    api_key: this.apikey,
                },
                method: 'POST',
                headers: (0, extend_1.default)(true, {}, this.headers, requiredHeaders),
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger_1.default.debug("Invoking CP4D token service operation: ".concat(parameters.options.url));
        return this.requestWrapperInstance.sendRequest(parameters).then(function (response) {
            logger_1.default.debug('Returned from CP4D token service operation');
            return response;
        });
    };
    return Cp4dTokenManager;
}(jwt_token_manager_1.JwtTokenManager));
exports.Cp4dTokenManager = Cp4dTokenManager;
