"use strict";
/**
 * (C) Copyright IBM Corp. 2025.
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
exports.McspV2TokenManager = void 0;
var extend_1 = __importDefault(require("extend"));
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var jwt_token_manager_1 = require("./jwt-token-manager");
var logger_1 = __importDefault(require("../../lib/logger"));
/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) V2 authentication.
 *
 * The McspV2TokenManager will invoke the MCSP token service's 'POST /api/2.0/\{scopeCollectionType\}/\{scopeId\}/apikeys/token'
 * operation to obtain an MCSP access token for an apikey.
 */
var McspV2TokenManager = /** @class */ (function (_super) {
    __extends(McspV2TokenManager, _super);
    /**
     * Create a new McspV2TokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service.
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified).
     * - scopeCollectionType: (required) The scope collection type of item(s). Valid values are: "accounts", "subscriptions", "services".
     * - scopeId: (required) the scope identifier of item(s).
     * - includeBuiltinActions: (optional) a flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     * - includeCustomActions: (optional) a flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     * - includeRoles: (optional) a flag to include the "roles" claim in the MCSP access token (default: true).
     * - prefixRoles: (optional) a flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     * - callerExtClaim: (optional) a map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     *     The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     *     This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     * - disableSslVerification: (optional) a flag to disable verification of the token server's SSL certificate; defaults to false.
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service.
     *
     * @throws Error: the input configuration failed validation
     */
    function McspV2TokenManager(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['apikey', 'url', 'scopeCollectionType', 'scopeId'];
        // This is the path associated with the operation used to obtain
        // an access token from the MCSP token service (v2).
        // The path parameter references must match the keys used in pathParams below.
        _this.PATH_TEMPLATE = '/api/2.0/{scopeCollectionType}/{scopeId}/apikeys/token';
        // The name of the field (within the token-exchange operation's responseBody)
        // that contains the access token.
        _this.tokenName = 'token';
        // Validate the required properties.
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        _this.url = options.url;
        _this.apikey = options.apikey;
        _this.scopeCollectionType = options.scopeCollectionType;
        _this.scopeId = options.scopeId;
        // Now parse/validate the optional properties.
        _this.includeBuiltinActions = McspV2TokenManager.parseBoolean(options, 'includeBuiltinActions', false);
        _this.includeCustomActions = McspV2TokenManager.parseBoolean(options, 'includeCustomActions', false);
        _this.includeRoles = McspV2TokenManager.parseBoolean(options, 'includeRoles', true);
        _this.prefixRoles = McspV2TokenManager.parseBoolean(options, 'prefixRoles', false);
        if ('callerExtClaim' in options) {
            var value = options.callerExtClaim;
            if (typeof value === 'string') {
                try {
                    _this.callerExtClaim = JSON.parse(value);
                }
                catch (err) {
                    throw new Error("An error occurred while parsing the callerExtClaim value '".concat(value, "': ").concat(err.message));
                }
            }
            else if (typeof value === 'object') {
                _this.callerExtClaim = value;
            }
            else {
                throw new Error("callerExtClaim must be a string or object, but was '".concat(typeof value, "'"));
            }
        }
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('mcspv2-authenticator');
        return _this;
    }
    McspV2TokenManager.prototype.requestToken = function () {
        var requiredHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
        };
        var requestHeaders = (0, extend_1.default)(true, {}, this.headers, requiredHeaders);
        // The keys used here must match the path parameter references in PATH_TEMPLATE above.
        var pathParams = {
            scopeCollectionType: this.scopeCollectionType,
            scopeId: this.scopeId,
        };
        // The keys used here must match the operation's query parameter names.
        var queryParams = {
            includeBuiltinActions: this.includeBuiltinActions,
            includeCustomActions: this.includeCustomActions,
            includeRoles: this.includeRoles,
            prefixRolesWithDefinitionScope: this.prefixRoles,
        };
        var requestBody = {
            apikey: this.apikey,
            callerExtClaim: this.callerExtClaim || undefined,
        };
        var request = {
            options: {
                method: 'POST',
                url: this.url + this.PATH_TEMPLATE,
                body: requestBody,
                path: pathParams,
                qs: queryParams,
                headers: requestHeaders,
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger_1.default.debug("Invoking MCSP v2 token service operation: ".concat(request.options.url));
        return this.requestWrapperInstance.sendRequest(request).then(function (response) {
            logger_1.default.debug('Returned from MCSP v2 token service operation');
            return response;
        });
    };
    /**
     * Parses the Options configuration property named by 'fieldName' as a boolean value.
     * The value in the Options object could be either boolean or string and this function
     * will do its best to parse it correctly.
     * @param options - the Options object containing the configuration
     * @param fieldName - the name of the field to parse as a boolean
     * @param defaultValue - the default value to use in case the specified field is not present in Options
     * @returns boolean the boolean value to be used for the configuration property
     */
    McspV2TokenManager.parseBoolean = function (options, fieldName, defaultValue) {
        var result = defaultValue;
        if (fieldName in options) {
            var value = options[fieldName];
            if (typeof value === 'boolean') {
                result = value;
            }
            else if (typeof value === 'string') {
                result = value.toLowerCase() === 'true';
            }
        }
        return result;
    };
    return McspV2TokenManager;
}(jwt_token_manager_1.JwtTokenManager));
exports.McspV2TokenManager = McspV2TokenManager;
