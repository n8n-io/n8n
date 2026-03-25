"use strict";
/**
 * (C) Copyright IBM Corp. 2023, 2024.
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
exports.McspTokenManager = void 0;
var extend_1 = __importDefault(require("extend"));
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var jwt_token_manager_1 = require("./jwt-token-manager");
var logger_1 = __importDefault(require("../../lib/logger"));
/**
 * This is the path associated with the operation used to obtain
 * an access token from the MCSP token service.
 */
var OPERATION_PATH = '/siusermgr/api/1.0/apikeys/token';
/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) authenticator.
 *
 * The Token Manager will invoke the MCSP token service's 'POST /siusermgr/api/1.0/apikeys/token'
 * operation to obtain an MCSP access token for a user-supplied apikey.
 */
var McspTokenManager = /** @class */ (function (_super) {
    __extends(McspTokenManager, _super);
    /**
     * Create a new McspTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the base endpoint URL for the MCSP token service
     * - apikey: (required) the API key used to obtain the MCSP access token.
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    function McspTokenManager(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['apikey', 'url'];
        _this.tokenName = 'token';
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        _this.apikey = options.apikey;
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('mcsp-authenticator');
        return _this;
    }
    McspTokenManager.prototype.requestToken = function () {
        var requiredHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
        };
        var parameters = {
            options: {
                url: this.url + OPERATION_PATH,
                body: {
                    apikey: this.apikey,
                },
                method: 'POST',
                headers: (0, extend_1.default)(true, {}, this.headers, requiredHeaders),
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger_1.default.debug("Invoking MCSP token service operation: ".concat(parameters.options.url));
        return this.requestWrapperInstance.sendRequest(parameters).then(function (response) {
            logger_1.default.debug('Returned from MCSP token service operation');
            return response;
        });
    };
    return McspTokenManager;
}(jwt_token_manager_1.JwtTokenManager));
exports.McspTokenManager = McspTokenManager;
