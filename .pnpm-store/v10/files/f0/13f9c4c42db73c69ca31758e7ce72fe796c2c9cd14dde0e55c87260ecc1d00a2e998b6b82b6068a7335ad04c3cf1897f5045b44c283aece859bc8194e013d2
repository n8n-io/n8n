"use strict";
/**
 * (C) Copyright IBM Corp. 2024.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamAssumeTokenManager = void 0;
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var iam_request_based_token_manager_1 = require("./iam-request-based-token-manager");
var iam_token_manager_1 = require("./iam-token-manager");
/**
 * The IamAssumeTokenManager takes an api key, along with trusted profile information, and performs
 * the necessary interactions with the IAM token service to obtain and store a suitable bearer token
 * that "assumes" the identify of the trusted profile.
 */
var IamAssumeTokenManager = /** @class */ (function (_super) {
    __extends(IamAssumeTokenManager, _super);
    /**
     *
     * Create a new IamAssumeTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
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
    function IamAssumeTokenManager(options) {
        var _this = _super.call(this, options) || this;
        _this.requiredOptions = ['apikey'];
        // This just verifies that the API key is provided and is free of common issues.
        (0, helpers_1.validateInput)(options, _this.requiredOptions);
        // This validates the assume-specific fields.
        // Only one of the following three options may be specified.
        if (!(0, helpers_1.onlyOne)(options.iamProfileId, options.iamProfileCrn, options.iamProfileName)) {
            throw new Error('Exactly one of `iamProfileName`, `iamProfileCrn`, or `iamProfileId` must be specified.');
        }
        // `iamAccountId` may only be specified if `iamProfileName` is also specified.
        if (Boolean(options.iamProfileName) !== Boolean(options.iamAccountId)) {
            throw new Error('`iamProfileName` and `iamAccountId` must be provided together, or not at all.');
        }
        // Set class variables from options. If they are 'undefined' in options,
        // they won't be changed, as they are 'undefined' to begin with.
        _this.iamProfileId = options.iamProfileId;
        _this.iamProfileCrn = options.iamProfileCrn;
        _this.iamProfileName = options.iamProfileName;
        _this.iamAccountId = options.iamAccountId;
        _this.iamDelegate = options.iamDelegate;
        // Create an instance of the IamTokenManager, which will be used to obtain
        // an IAM access token for use in the "assume" token exchange. Most option
        // names are shared between these token manager, and extraneous options will
        // be ignored, so we can pass the options structure to that constructor as-is.
        _this.iamDelegate = new iam_token_manager_1.IamTokenManager(options);
        // These options are used by the delegate token manager
        // but they are not supported by this token manager.
        _this.clientId = undefined;
        _this.clientSecret = undefined;
        _this.scope = undefined;
        // Set the grant type and user agent for this flavor of authentication.
        _this.formData.grant_type = 'urn:ibm:params:oauth:grant-type:assume';
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('iam-assume-authenticator');
        return _this;
    }
    /**
     * Request an IAM token using a standard access token and a trusted profile.
     */
    IamAssumeTokenManager.prototype.requestToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // First, retrieve a standard IAM access token from the delegate and set it in the form data.
                        _a = this.formData;
                        return [4 /*yield*/, this.iamDelegate.getToken()];
                    case 1:
                        // First, retrieve a standard IAM access token from the delegate and set it in the form data.
                        _a.access_token = _b.sent();
                        if (this.iamProfileCrn) {
                            this.formData.profile_crn = this.iamProfileCrn;
                        }
                        else if (this.iamProfileId) {
                            this.formData.profile_id = this.iamProfileId;
                        }
                        else {
                            this.formData.profile_name = this.iamProfileName;
                            this.formData.account = this.iamAccountId;
                        }
                        return [2 /*return*/, _super.prototype.requestToken.call(this)];
                }
            });
        });
    };
    /**
     * Extend this method from the parent class to erase the refresh token from
     * the class - we do not want to expose it for IAM Assume authentication.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    IamAssumeTokenManager.prototype.saveTokenInfo = function (tokenResponse) {
        _super.prototype.saveTokenInfo.call(this, tokenResponse);
        this.refreshToken = undefined;
    };
    // Override the inherited "setters". This token manager does not store these options
    // but they can adjust properties on the stored IAM delegate.
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter in the IAM delegate request.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    IamAssumeTokenManager.prototype.setScope = function (scope) {
        this.iamDelegate.setScope(scope);
    };
    /**
     * Sets the IAM "clientId" and "clientSecret" values for the IAM delegate.
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    IamAssumeTokenManager.prototype.setClientIdAndSecret = function (clientId, clientSecret) {
        this.iamDelegate.setClientIdAndSecret(clientId, clientSecret);
    };
    /**
     * Sets the "disableSslVerification" property for the IAM delegate.
     *
     * @param value - the new value for the disableSslVerification property
     */
    IamAssumeTokenManager.prototype.setDisableSslVerification = function (value) {
        _super.prototype.setDisableSslVerification.call(this, value);
        this.iamDelegate.setDisableSslVerification(value);
    };
    /**
     * Sets the headers to be included in the IAM delegate's requests.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    IamAssumeTokenManager.prototype.setHeaders = function (headers) {
        _super.prototype.setHeaders.call(this, headers);
        this.iamDelegate.setHeaders(headers);
    };
    return IamAssumeTokenManager;
}(iam_request_based_token_manager_1.IamRequestBasedTokenManager));
exports.IamAssumeTokenManager = IamAssumeTokenManager;
