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
exports.deleteSecret = exports.updateSecret = exports.createSecret = exports.getSecret = exports.getSecrets = void 0;
var getSecrets = function (apiRequest, options) { return __awaiter(void 0, void 0, void 0, function () {
    var secrets;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, apiRequest.get('/api/v3/secrets', {
                    params: {
                        workspaceId: options.workspaceId,
                        environment: options.environment,
                        secretPath: options.path
                    }
                })];
            case 1:
                secrets = (_a.sent()).data.secrets;
                return [2 /*return*/, secrets];
        }
    });
}); };
exports.getSecrets = getSecrets;
var getSecret = function (apiRequest, options) { return __awaiter(void 0, void 0, void 0, function () {
    var secret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, apiRequest.get("/api/v3/secrets/".concat(options.secretName), {
                    params: {
                        workspaceId: options.workspaceId,
                        environment: options.environment,
                        type: options.type,
                        secretPath: options.path
                    }
                })];
            case 1:
                secret = (_a.sent()).data.secret;
                return [2 /*return*/, secret];
        }
    });
}); };
exports.getSecret = getSecret;
var createSecret = function (apiRequest, options) { return __awaiter(void 0, void 0, void 0, function () {
    var secret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, apiRequest.post("/api/v3/secrets/".concat(options.secretName), {
                    workspaceId: options.workspaceId,
                    environment: options.environment,
                    type: options.type,
                    secretKeyCiphertext: options.secretKeyCiphertext,
                    secretKeyIV: options.secretKeyIV,
                    secretKeyTag: options.secretKeyTag,
                    secretValueCiphertext: options.secretValueCiphertext,
                    secretValueIV: options.secretValueIV,
                    secretValueTag: options.secretValueTag,
                    secretPath: options.path
                })];
            case 1:
                secret = (_a.sent()).data.secret;
                return [2 /*return*/, secret];
        }
    });
}); };
exports.createSecret = createSecret;
var updateSecret = function (apiRequest, options) { return __awaiter(void 0, void 0, void 0, function () {
    var secret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, apiRequest.patch("/api/v3/secrets/".concat(options.secretName), {
                    workspaceId: options.workspaceId,
                    environment: options.environment,
                    type: options.type,
                    secretValueCiphertext: options.secretValueCiphertext,
                    secretValueIV: options.secretValueIV,
                    secretValueTag: options.secretValueTag
                })];
            case 1:
                secret = (_a.sent()).data.secret;
                return [2 /*return*/, secret];
        }
    });
}); };
exports.updateSecret = updateSecret;
var deleteSecret = function (apiRequest, options) { return __awaiter(void 0, void 0, void 0, function () {
    var secret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, apiRequest.delete("/api/v3/secrets/".concat(options.secretName), {
                    data: {
                        workspaceId: options.workspaceId,
                        environment: options.environment,
                        type: options.type
                    }
                })];
            case 1:
                secret = (_a.sent()).data.secret;
                return [2 /*return*/, secret];
        }
    });
}); };
exports.deleteSecret = deleteSecret;
