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
exports.deleteSecretHelper = exports.updateSecretHelper = exports.createSecretHelper = exports.getDecryptedSecretHelper = exports.getDecryptedSecretsHelper = exports.getFallbackSecretHelper = void 0;
var api_1 = require("../api");
var crypto_1 = require("../utils/crypto");
/**
 * Transform a raw secret returned from the API plus [secretName]
 * and [secretValue] into secret to be returned from SDK.
 * @param param0
 * @returns
 */
var transformSecretToSecretBundle = function (_a) {
    var secret = _a.secret, secretName = _a.secretName, secretValue = _a.secretValue;
    return ({
        secretName: secretName,
        secretValue: secretValue,
        version: secret.version,
        workspace: secret.workspace,
        environment: secret.environment,
        type: secret.type,
        updatedAt: secret.updatedAt,
        createdAt: secret.createdAt,
        isFallback: false,
        lastFetchedAt: new Date()
    });
};
/**
 * Get fallback secret on [process.env]
 */
var getFallbackSecretHelper = function (_a) {
    var secretName = _a.secretName;
    return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2 /*return*/, ({
                    secretName: secretName,
                    secretValue: process.env[secretName],
                    isFallback: true,
                    lastFetchedAt: new Date()
                })];
        });
    });
};
exports.getFallbackSecretHelper = getFallbackSecretHelper;
/**
 * Get (decrypted) secrets from a project and environment
 * @param {GetDecryptedSecretsParams} getDecryptedSecretsParams
 * @returns {Secret} secrets
 */
var getDecryptedSecretsHelper = function (_a) {
    var apiRequest = _a.apiRequest, workspaceId = _a.workspaceId, environment = _a.environment, workspaceKey = _a.workspaceKey, path = _a.path;
    return __awaiter(void 0, void 0, void 0, function () {
        var secrets;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, api_1.getSecrets)(apiRequest, {
                        workspaceId: workspaceId,
                        environment: environment,
                        path: path
                    })];
                case 1:
                    secrets = _b.sent();
                    return [2 /*return*/, secrets.map(function (secret) {
                            var secretName = (0, crypto_1.decryptSymmetric128BitHexKeyUTF8)({
                                ciphertext: secret.secretKeyCiphertext,
                                iv: secret.secretKeyIV,
                                tag: secret.secretKeyTag,
                                key: workspaceKey
                            });
                            var secretValue = (0, crypto_1.decryptSymmetric128BitHexKeyUTF8)({
                                ciphertext: secret.secretValueCiphertext,
                                iv: secret.secretValueIV,
                                tag: secret.secretValueTag,
                                key: workspaceKey
                            });
                            return transformSecretToSecretBundle({
                                secret: secret,
                                secretName: secretName,
                                secretValue: secretValue
                            });
                        })];
            }
        });
    });
};
exports.getDecryptedSecretsHelper = getDecryptedSecretsHelper;
/**
 * Get a (decrypted) secret
 * @param {GetDecryptedSecretParams} getDecryptedSecretParams
 * @returns
 */
var getDecryptedSecretHelper = function (_a) {
    var apiRequest = _a.apiRequest, secretName = _a.secretName, workspaceId = _a.workspaceId, environment = _a.environment, workspaceKey = _a.workspaceKey, type = _a.type, path = _a.path;
    return __awaiter(void 0, void 0, void 0, function () {
        var secret, secretValue;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, api_1.getSecret)(apiRequest, {
                        secretName: secretName,
                        workspaceId: workspaceId,
                        environment: environment,
                        type: type,
                        path: path
                    })];
                case 1:
                    secret = _b.sent();
                    secretValue = (0, crypto_1.decryptSymmetric128BitHexKeyUTF8)({
                        ciphertext: secret.secretValueCiphertext,
                        iv: secret.secretValueIV,
                        tag: secret.secretValueTag,
                        key: workspaceKey
                    });
                    return [2 /*return*/, transformSecretToSecretBundle({
                            secret: secret,
                            secretName: secretName,
                            secretValue: secretValue
                        })];
            }
        });
    });
};
exports.getDecryptedSecretHelper = getDecryptedSecretHelper;
/**
 * Create a secret
 * @param {CreateSecretParams} createSecretParams
 * @returns
 */
var createSecretHelper = function (_a) {
    var apiRequest = _a.apiRequest, workspaceKey = _a.workspaceKey, workspaceId = _a.workspaceId, environment = _a.environment, type = _a.type, secretName = _a.secretName, secretValue = _a.secretValue, path = _a.path;
    return __awaiter(void 0, void 0, void 0, function () {
        var _b, secretKeyCiphertext, secretKeyIV, secretKeyTag, _c, secretValueCiphertext, secretValueIV, secretValueTag, secret;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (0, crypto_1.encryptSymmetric128BitHexKeyUTF8)({
                        plaintext: secretName,
                        key: workspaceKey
                    }), secretKeyCiphertext = _b.ciphertext, secretKeyIV = _b.iv, secretKeyTag = _b.tag;
                    _c = (0, crypto_1.encryptSymmetric128BitHexKeyUTF8)({
                        plaintext: secretValue,
                        key: workspaceKey
                    }), secretValueCiphertext = _c.ciphertext, secretValueIV = _c.iv, secretValueTag = _c.tag;
                    return [4 /*yield*/, (0, api_1.createSecret)(apiRequest, {
                            secretName: secretName,
                            workspaceId: workspaceId,
                            environment: environment,
                            type: type,
                            secretKeyCiphertext: secretKeyCiphertext,
                            secretKeyIV: secretKeyIV,
                            secretKeyTag: secretKeyTag,
                            secretValueCiphertext: secretValueCiphertext,
                            secretValueIV: secretValueIV,
                            secretValueTag: secretValueTag,
                            path: path
                        })];
                case 1:
                    secret = _d.sent();
                    return [2 /*return*/, transformSecretToSecretBundle({
                            secret: secret,
                            secretName: secretName,
                            secretValue: secretValue
                        })];
            }
        });
    });
};
exports.createSecretHelper = createSecretHelper;
/**
 * Update a secret
 * @param {UpdateSecretParams} updateSecretParams
 * @returns
 */
var updateSecretHelper = function (_a) {
    var apiRequest = _a.apiRequest, workspaceKey = _a.workspaceKey, workspaceId = _a.workspaceId, environment = _a.environment, type = _a.type, path = _a.path, secretName = _a.secretName, secretValue = _a.secretValue;
    return __awaiter(void 0, void 0, void 0, function () {
        var _b, secretValueCiphertext, secretValueIV, secretValueTag, secret;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (0, crypto_1.encryptSymmetric128BitHexKeyUTF8)({
                        plaintext: secretValue,
                        key: workspaceKey
                    }), secretValueCiphertext = _b.ciphertext, secretValueIV = _b.iv, secretValueTag = _b.tag;
                    return [4 /*yield*/, (0, api_1.updateSecret)(apiRequest, {
                            secretName: secretName,
                            workspaceId: workspaceId,
                            environment: environment,
                            type: type,
                            path: path,
                            secretValueCiphertext: secretValueCiphertext,
                            secretValueIV: secretValueIV,
                            secretValueTag: secretValueTag
                        })];
                case 1:
                    secret = _c.sent();
                    return [2 /*return*/, transformSecretToSecretBundle({
                            secret: secret,
                            secretName: secretName,
                            secretValue: secretValue
                        })];
            }
        });
    });
};
exports.updateSecretHelper = updateSecretHelper;
/**
 * Delete a secret
 * @param {DeleteSecretParams} deleteSecretParams
 * @returns
 */
var deleteSecretHelper = function (_a) {
    var apiRequest = _a.apiRequest, secretName = _a.secretName, workspaceId = _a.workspaceId, environment = _a.environment, type = _a.type, workspaceKey = _a.workspaceKey;
    return __awaiter(void 0, void 0, void 0, function () {
        var secret, secretValue;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, api_1.deleteSecret)(apiRequest, {
                        secretName: secretName,
                        workspaceId: workspaceId,
                        environment: environment,
                        type: type
                    })];
                case 1:
                    secret = _b.sent();
                    secretValue = (0, crypto_1.decryptSymmetric128BitHexKeyUTF8)({
                        ciphertext: secret.secretValueCiphertext,
                        iv: secret.secretValueIV,
                        tag: secret.secretValueTag,
                        key: workspaceKey
                    });
                    return [2 /*return*/, transformSecretToSecretBundle({
                            secret: secret,
                            secretName: secretName,
                            secretValue: secretValue
                        })];
            }
        });
    });
};
exports.deleteSecretHelper = deleteSecretHelper;
