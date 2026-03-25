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
exports.deleteSecretHelper = exports.updateSecretHelper = exports.createSecretHelper = exports.getAllSecretsHelper = exports.getSecretHelper = void 0;
var services_1 = require("../services");
function getSecretHelper(instance, secretName, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cachedSecret, _b, currentTime, cacheExpiryTime, secretBundle, err_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cacheKey = "".concat(options.type, "-").concat(secretName);
                    cachedSecret = undefined;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, , 7]);
                    if (!instance.clientConfig)
                        throw Error('Failed to find client config');
                    if (!!instance.clientConfig.workspaceConfig) return [3 /*break*/, 3];
                    _b = instance.clientConfig;
                    return [4 /*yield*/, services_1.SecretService.populateClientWorkspaceConfig(instance.clientConfig)];
                case 2:
                    _b.workspaceConfig = _c.sent();
                    _c.label = 3;
                case 3:
                    cachedSecret = instance.cache[cacheKey];
                    if (cachedSecret) {
                        currentTime = new Date();
                        cacheExpiryTime = cachedSecret.lastFetchedAt;
                        cacheExpiryTime.setSeconds(cacheExpiryTime.getSeconds() + instance.clientConfig.cacheTTL);
                        if (currentTime < cacheExpiryTime) {
                            if (instance.debug) {
                                console.log("Returning cached secret: ".concat(cachedSecret.secretName));
                            }
                            return [2 /*return*/, cachedSecret];
                        }
                    }
                    return [4 /*yield*/, services_1.SecretService.getDecryptedSecret({
                            apiRequest: instance.clientConfig.apiRequest,
                            workspaceKey: instance.clientConfig.workspaceConfig.workspaceKey,
                            secretName: secretName,
                            workspaceId: (_a = instance.clientConfig.workspaceConfig) === null || _a === void 0 ? void 0 : _a.workspaceId,
                            environment: options.environment,
                            path: options.path,
                            type: options.type
                        })];
                case 4:
                    secretBundle = _c.sent();
                    instance.cache[secretName] = secretBundle;
                    return [2 /*return*/, secretBundle];
                case 5:
                    err_1 = _c.sent();
                    if (instance.debug)
                        console.error(err_1);
                    if (cachedSecret) {
                        if (instance.debug) {
                            console.log("Returning cached secret: ".concat(cachedSecret));
                        }
                        return [2 /*return*/, cachedSecret];
                    }
                    return [4 /*yield*/, services_1.SecretService.getFallbackSecret({
                            secretName: secretName
                        })];
                case 6: return [2 /*return*/, _c.sent()];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.getSecretHelper = getSecretHelper;
function getAllSecretsHelper(instance, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, secretBundles, err_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 6]);
                    if (!instance.clientConfig)
                        throw Error('Failed to find client config');
                    if (!!instance.clientConfig.workspaceConfig) return [3 /*break*/, 2];
                    _b = instance.clientConfig;
                    return [4 /*yield*/, services_1.SecretService.populateClientWorkspaceConfig(instance.clientConfig)];
                case 1:
                    _b.workspaceConfig = _c.sent();
                    _c.label = 2;
                case 2: return [4 /*yield*/, services_1.SecretService.getDecryptedSecrets({
                        apiRequest: instance.clientConfig.apiRequest,
                        workspaceKey: instance.clientConfig.workspaceConfig.workspaceKey,
                        workspaceId: (_a = instance.clientConfig.workspaceConfig) === null || _a === void 0 ? void 0 : _a.workspaceId,
                        environment: options.environment,
                        path: options.path
                    })];
                case 3:
                    secretBundles = _c.sent();
                    secretBundles.forEach(function (secretBundle) {
                        var cacheKey = "".concat(secretBundle.type, "-").concat(secretBundle.secretName);
                        instance.cache[cacheKey] = secretBundle;
                    });
                    return [2 /*return*/, secretBundles];
                case 4:
                    err_2 = _c.sent();
                    if (instance.debug)
                        console.error(err_2);
                    return [4 /*yield*/, services_1.SecretService.getFallbackSecret({
                            secretName: ''
                        })];
                case 5: return [2 /*return*/, [_c.sent()]];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.getAllSecretsHelper = getAllSecretsHelper;
function createSecretHelper(instance, secretName, secretValue, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, secretBundle, cacheKey, err_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 6]);
                    if (!instance.clientConfig)
                        throw Error('Failed to find client config');
                    if (!!instance.clientConfig.workspaceConfig) return [3 /*break*/, 2];
                    _b = instance.clientConfig;
                    return [4 /*yield*/, services_1.SecretService.populateClientWorkspaceConfig(instance.clientConfig)];
                case 1:
                    _b.workspaceConfig = _c.sent();
                    _c.label = 2;
                case 2: return [4 /*yield*/, services_1.SecretService.createSecret({
                        apiRequest: instance.clientConfig.apiRequest,
                        workspaceKey: instance.clientConfig.workspaceConfig.workspaceKey,
                        workspaceId: (_a = instance.clientConfig.workspaceConfig) === null || _a === void 0 ? void 0 : _a.workspaceId,
                        environment: options.environment,
                        path: options.path,
                        type: options.type,
                        secretName: secretName,
                        secretValue: secretValue
                    })];
                case 3:
                    secretBundle = _c.sent();
                    cacheKey = "".concat(options.type, "-").concat(secretName);
                    instance.cache[cacheKey] = secretBundle;
                    return [2 /*return*/, secretBundle];
                case 4:
                    err_3 = _c.sent();
                    if (instance.debug)
                        console.error(err_3);
                    return [4 /*yield*/, services_1.SecretService.getFallbackSecret({
                            secretName: secretName
                        })];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.createSecretHelper = createSecretHelper;
function updateSecretHelper(instance, secretName, secretValue, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, secretBundle, cacheKey, err_4;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 6]);
                    if (!instance.clientConfig)
                        throw Error('Failed to find client config');
                    if (!!instance.clientConfig.workspaceConfig) return [3 /*break*/, 2];
                    _b = instance.clientConfig;
                    return [4 /*yield*/, services_1.SecretService.populateClientWorkspaceConfig(instance.clientConfig)];
                case 1:
                    _b.workspaceConfig = _c.sent();
                    _c.label = 2;
                case 2: return [4 /*yield*/, services_1.SecretService.updateSecret({
                        apiRequest: instance.clientConfig.apiRequest,
                        workspaceKey: instance.clientConfig.workspaceConfig.workspaceKey,
                        workspaceId: (_a = instance.clientConfig.workspaceConfig) === null || _a === void 0 ? void 0 : _a.workspaceId,
                        environment: options.environment,
                        type: options.type,
                        path: options.path,
                        secretName: secretName,
                        secretValue: secretValue
                    })];
                case 3:
                    secretBundle = _c.sent();
                    cacheKey = "".concat(options.type, "-").concat(secretName);
                    instance.cache[cacheKey] = secretBundle;
                    return [2 /*return*/, secretBundle];
                case 4:
                    err_4 = _c.sent();
                    if (instance.debug)
                        console.error(err_4);
                    return [4 /*yield*/, services_1.SecretService.getFallbackSecret({
                            secretName: secretName
                        })];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.updateSecretHelper = updateSecretHelper;
function deleteSecretHelper(instance, secretName, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, secretBundle, cacheKey, err_5;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 6]);
                    if (!instance.clientConfig)
                        throw Error('Failed to find client config');
                    if (!!instance.clientConfig.workspaceConfig) return [3 /*break*/, 2];
                    _b = instance.clientConfig;
                    return [4 /*yield*/, services_1.SecretService.populateClientWorkspaceConfig(instance.clientConfig)];
                case 1:
                    _b.workspaceConfig = _c.sent();
                    _c.label = 2;
                case 2: return [4 /*yield*/, services_1.SecretService.deleteSecret({
                        apiRequest: instance.clientConfig.apiRequest,
                        workspaceKey: instance.clientConfig.workspaceConfig.workspaceKey,
                        workspaceId: (_a = instance.clientConfig.workspaceConfig) === null || _a === void 0 ? void 0 : _a.workspaceId,
                        environment: options.environment,
                        type: options.type,
                        secretName: secretName
                    })];
                case 3:
                    secretBundle = _c.sent();
                    cacheKey = "".concat(options.type, "-").concat(secretName);
                    delete instance.cache[cacheKey];
                    return [2 /*return*/, secretBundle];
                case 4:
                    err_5 = _c.sent();
                    if (instance.debug)
                        console.error(err_5);
                    return [4 /*yield*/, services_1.SecretService.getFallbackSecret({
                            secretName: secretName
                        })];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.deleteSecretHelper = deleteSecretHelper;
