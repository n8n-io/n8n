"use strict";
/**
 * (C) Copyright IBM Corp. 2021, 2024.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcInstanceTokenManager = void 0;
var logger_1 = __importDefault(require("../../lib/logger"));
var helpers_1 = require("../utils/helpers");
var build_user_agent_1 = require("../../lib/build-user-agent");
var jwt_token_manager_1 = require("./jwt-token-manager");
var DEFAULT_IMS_ENDPOINT = 'http://169.254.169.254';
var METADATA_SERVICE_VERSION = '2022-03-01';
var IAM_EXPIRATION_WINDOW = 10;
/**
 * Token Manager for VPC Instance Authentication.
 */
var VpcInstanceTokenManager = /** @class */ (function (_super) {
    __extends(VpcInstanceTokenManager, _super);
    /**
     * Create a new VpcInstanceTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    function VpcInstanceTokenManager(options) {
        var _this = this;
        // all parameters are optional
        options = options || {};
        _this = _super.call(this, options) || this;
        if (!(0, helpers_1.atMostOne)(options.iamProfileId, options.iamProfileCrn)) {
            throw new Error('At most one of `iamProfileId` or `iamProfileCrn` may be specified.');
        }
        _this.url = options.url || DEFAULT_IMS_ENDPOINT;
        if (options.iamProfileCrn) {
            _this.iamProfileCrn = options.iamProfileCrn;
        }
        if (options.iamProfileId) {
            _this.iamProfileId = options.iamProfileId;
        }
        _this.userAgent = (0, build_user_agent_1.buildUserAgent)('vpc-instance-authenticator');
        return _this;
    }
    /**
     * Sets the CRN of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileCrn - the CRN of the IAM trusted profile
     */
    VpcInstanceTokenManager.prototype.setIamProfileCrn = function (iamProfileCrn) {
        this.iamProfileCrn = iamProfileCrn;
    };
    /**
     * Sets the Id of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    VpcInstanceTokenManager.prototype.setIamProfileId = function (iamProfileId) {
        this.iamProfileId = iamProfileId;
    };
    VpcInstanceTokenManager.prototype.requestToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var instanceIdentityToken, body, parameters;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getInstanceIdentityToken()];
                    case 1:
                        instanceIdentityToken = _a.sent();
                        if (this.iamProfileId) {
                            body = {
                                trusted_profile: { id: this.iamProfileId },
                            };
                        }
                        else if (this.iamProfileCrn) {
                            body = {
                                trusted_profile: { crn: this.iamProfileCrn },
                            };
                        }
                        parameters = {
                            options: {
                                url: "".concat(this.url, "/instance_identity/v1/iam_token"),
                                qs: {
                                    version: METADATA_SERVICE_VERSION,
                                },
                                body: body,
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'User-Agent': this.userAgent,
                                    Accept: 'application/json',
                                    Authorization: "Bearer ".concat(instanceIdentityToken),
                                },
                            },
                        };
                        logger_1.default.debug("Invoking VPC 'create_iam_token' operation: ".concat(parameters.options.url));
                        return [2 /*return*/, this.requestWrapperInstance.sendRequest(parameters).then(function (response) {
                                logger_1.default.debug("Returned from VPC 'create_iam_token' operation");
                                return response;
                            })];
                }
            });
        });
    };
    VpcInstanceTokenManager.prototype.getInstanceIdentityToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var parameters, token, response, responseBody, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parameters = {
                            options: {
                                url: "".concat(this.url, "/instance_identity/v1/token"),
                                qs: {
                                    version: METADATA_SERVICE_VERSION,
                                },
                                body: {
                                    expires_in: 300,
                                },
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'User-Agent': this.userAgent,
                                    Accept: 'application/json',
                                    'Metadata-Flavor': 'ibm',
                                },
                            },
                        };
                        token = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        logger_1.default.debug("Invoking VPC 'create_access_token' operation: ".concat(parameters.options.url));
                        return [4 /*yield*/, this.requestWrapperInstance.sendRequest(parameters)];
                    case 2:
                        response = _a.sent();
                        logger_1.default.debug("Returned from VPC 'create_access_token' operation.");
                        responseBody = response.result || {};
                        token = responseBody.access_token;
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        logger_1.default.debug("Caught exception from VPC 'create_access_token' operation: ".concat(err_1.message));
                        throw err_1;
                    case 4: return [2 /*return*/, token];
                }
            });
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
    VpcInstanceTokenManager.prototype.isTokenExpired = function () {
        var expireTime = this.expireTime;
        if (!expireTime) {
            return true;
        }
        var currentTime = (0, helpers_1.getCurrentTime)();
        return currentTime >= expireTime - IAM_EXPIRATION_WINDOW;
    };
    return VpcInstanceTokenManager;
}(jwt_token_manager_1.JwtTokenManager));
exports.VpcInstanceTokenManager = VpcInstanceTokenManager;
