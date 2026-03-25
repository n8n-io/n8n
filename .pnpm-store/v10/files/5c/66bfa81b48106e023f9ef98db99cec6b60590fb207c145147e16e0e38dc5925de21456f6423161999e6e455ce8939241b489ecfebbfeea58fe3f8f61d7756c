"use strict";
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
var variables_1 = require("../variables");
var api_1 = require("../api");
var client_1 = require("../helpers/client");
var crypto_1 = require("../utils/crypto");
var InfisicalClient = /** @class */ (function () {
    /**
     * Create an instance of the Infisical client
     * @param {Object} obj
     * @param {String} obj.token - an Infisical Token scoped to a project and environment
     * @param {Boolean} debug - whether debug is on
     * @param {Number} cacheTTL - time-to-live (in seconds) for refreshing cached secrets.
     */
    function InfisicalClient(_a) {
        var _b = _a.token, token = _b === void 0 ? undefined : _b, _c = _a.siteURL, siteURL = _c === void 0 ? variables_1.INFISICAL_URL : _c, _d = _a.debug, debug = _d === void 0 ? false : _d, _e = _a.cacheTTL, cacheTTL = _e === void 0 ? 300 : _e;
        this.cache = {};
        this.clientConfig = undefined;
        this.debug = false;
        if (token && token !== '') {
            var lastDotIdx = token.lastIndexOf('.');
            var serviceToken = token.substring(0, lastDotIdx);
            this.clientConfig = {
                authMode: variables_1.AUTH_MODE_SERVICE_TOKEN,
                credentials: {
                    serviceTokenKey: token.substring(lastDotIdx + 1)
                },
                apiRequest: (0, api_1.createApiRequestWithAuthInterceptor)({
                    baseURL: siteURL,
                    serviceToken: serviceToken
                }),
                cacheTTL: cacheTTL
            };
        }
        this.debug = debug;
    }
    /**
    * Return all the secrets accessible by the instance of Infisical
    */
    InfisicalClient.prototype.getAllSecrets = function (options) {
        if (options === void 0) { options = {
            environment: "dev",
            path: "/"
        }; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, client_1.getAllSecretsHelper)(this, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Return secret with name [secretName]
     * @returns {ISecretBundle} secretBundle - secret bundle
     * @param secretName name of the secret
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous get
     */
    InfisicalClient.prototype.getSecret = function (secretName, options) {
        if (options === void 0) { options = {
            type: "personal",
            environment: "dev",
            path: "/"
        }; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, client_1.getSecretHelper)(this, secretName, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Create secret with name [secretName] and value [secretValue]
     * @param secretName - name of secret to create
     * @param secretValue - value of secret to create
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous creation
     */
    InfisicalClient.prototype.createSecret = function (secretName, secretValue, options) {
        if (options === void 0) { options = {
            environment: "dev",
            type: "shared",
            path: "/"
        }; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, client_1.createSecretHelper)(this, secretName, secretValue, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Update secret with name [secretName] and value [secretValue]
     * @param secretName - name of secret to update
     * @param secretValue - new value for secret
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous update
     */
    InfisicalClient.prototype.updateSecret = function (secretName, secretValue, options) {
        if (options === void 0) { options = {
            type: "shared",
            environment: "dev",
            path: "/"
        }; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, client_1.updateSecretHelper)(this, secretName, secretValue, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Delete secret with name [secretName]
     * @param secretName - name of secret to delete
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous deletion
     */
    InfisicalClient.prototype.deleteSecret = function (secretName, options) {
        if (options === void 0) { options = {
            environment: "dev",
            type: "shared",
            path: "/"
        }; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, client_1.deleteSecretHelper)(this, secretName, options)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Create a base64-encoded, 256-bit symmetric key
     * @returns {String} key - the symmetric key
     */
    InfisicalClient.prototype.createSymmetricKey = function () {
        return (0, crypto_1.createSymmetricKey)();
    };
    /**
     * Encrypt the plaintext [plaintext] with the (base64) 256-bit
     * secret key [key]
     * @param plaintext
     * @param key - base64-encoded, 256-bit symmetric key
     * @returns {IEncryptSymmetricOutput} - an object containing the base64-encoded ciphertext, iv, and tag
     */
    InfisicalClient.prototype.encryptSymmetric = function (plaintext, key) {
        return (0, crypto_1.encryptSymmetric)({
            plaintext: plaintext,
            key: key,
        });
    };
    /**
     * Decrypt the ciphertext [ciphertext] with the (base64) 256-bit
     * secret key [key], provided [iv] and [tag]
     * @param ciphertext - base64-encoded ciphertext
     * @param key - base64-encoded, 256-bit symmetric key
     * @param iv - base64-encoded initialization vector
     * @param tag - base64-encoded authentication tag
     * @returns {String} - the decrypted [ciphertext] or cleartext
     */
    InfisicalClient.prototype.decryptSymmetric = function (ciphertext, key, iv, tag) {
        return (0, crypto_1.decryptSymmetric)({
            ciphertext: ciphertext,
            iv: iv,
            tag: tag,
            key: key
        });
    };
    return InfisicalClient;
}());
exports.default = InfisicalClient;
