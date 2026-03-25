"use strict";
/**
* @file binding-post.ts
* @author tngan
* @desc Binding-level API, declare the functions using POST binding
*/
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var urn_1 = require("./urn");
var libsaml_1 = __importDefault(require("./libsaml"));
var utility_1 = __importStar(require("./utility"));
var binding = urn_1.wording.binding;
/**
* @desc Generate a base64 encoded login request
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function base64LoginRequest(referenceTagXPath, entity, customTagReplacement) {
    var metadata = { idp: entity.idp.entityMeta, sp: entity.sp.entityMeta };
    var spSetting = entity.sp.entitySetting;
    var id = '';
    if (metadata && metadata.idp && metadata.sp) {
        var base = metadata.idp.getSingleSignOnService(binding.post);
        var rawSamlRequest = void 0;
        if (spSetting.loginRequestTemplate && customTagReplacement) {
            var info = customTagReplacement(spSetting.loginRequestTemplate.context);
            id = (0, utility_1.get)(info, 'id', null);
            rawSamlRequest = (0, utility_1.get)(info, 'context', null);
        }
        else {
            var nameIDFormat = spSetting.nameIDFormat;
            var selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
            id = spSetting.generateID();
            rawSamlRequest = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLoginRequestTemplate.context, {
                ID: id,
                Destination: base,
                Issuer: metadata.sp.getEntityID(),
                IssueInstant: new Date().toISOString(),
                AssertionConsumerServiceURL: metadata.sp.getAssertionConsumerService(binding.post),
                EntityID: metadata.sp.getEntityID(),
                AllowCreate: spSetting.allowCreate,
                NameIDFormat: selectedNameIDFormat
            });
        }
        if (metadata.idp.isWantAuthnRequestsSigned()) {
            var privateKey = spSetting.privateKey, privateKeyPass = spSetting.privateKeyPass, signatureAlgorithm = spSetting.requestSignatureAlgorithm, transformationAlgorithms = spSetting.transformationAlgorithms;
            return {
                id: id,
                context: libsaml_1.default.constructSAMLSignature({
                    referenceTagXPath: referenceTagXPath,
                    privateKey: privateKey,
                    privateKeyPass: privateKeyPass,
                    signatureAlgorithm: signatureAlgorithm,
                    transformationAlgorithms: transformationAlgorithms,
                    rawSamlMessage: rawSamlRequest,
                    signingCert: metadata.sp.getX509Certificate('signing'),
                    signatureConfig: spSetting.signatureConfig || {
                        prefix: 'ds',
                        location: { reference: "/*[local-name(.)='AuthnRequest']/*[local-name(.)='Issuer']", action: 'after' },
                    }
                }),
            };
        }
        // No need to embeded XML signature
        return {
            id: id,
            context: utility_1.default.base64Encode(rawSamlRequest),
        };
    }
    throw new Error('ERR_GENERATE_POST_LOGIN_REQUEST_MISSING_METADATA');
}
/**
* @desc Generate a base64 encoded login response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {function} customTagReplacement     used when developers have their own login response template
* @param  {boolean}  encryptThenSign           whether or not to encrypt then sign first (if signing). Defaults to sign-then-encrypt
*/
function base64LoginResponse() {
    return __awaiter(this, arguments, void 0, function (requestInfo, entity, user, customTagReplacement, encryptThenSign) {
        var idpSetting, spSetting, id, metadata, nameIDFormat, selectedNameIDFormat, base, rawSamlResponse, nowTime, spEntityID, fiveMinutesLaterTime, fiveMinutesLater, now, acl, tvalue, template, privateKey, privateKeyPass, signatureAlgorithm, config, context;
        if (requestInfo === void 0) { requestInfo = {}; }
        if (user === void 0) { user = {}; }
        if (encryptThenSign === void 0) { encryptThenSign = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idpSetting = entity.idp.entitySetting;
                    spSetting = entity.sp.entitySetting;
                    id = idpSetting.generateID();
                    metadata = {
                        idp: entity.idp.entityMeta,
                        sp: entity.sp.entityMeta,
                    };
                    nameIDFormat = idpSetting.nameIDFormat;
                    selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
                    if (!(metadata && metadata.idp && metadata.sp)) return [3 /*break*/, 3];
                    base = metadata.sp.getAssertionConsumerService(binding.post);
                    rawSamlResponse = void 0;
                    nowTime = new Date();
                    spEntityID = metadata.sp.getEntityID();
                    fiveMinutesLaterTime = new Date(nowTime.getTime());
                    fiveMinutesLaterTime.setMinutes(fiveMinutesLaterTime.getMinutes() + 5);
                    fiveMinutesLater = fiveMinutesLaterTime.toISOString();
                    now = nowTime.toISOString();
                    acl = metadata.sp.getAssertionConsumerService(binding.post);
                    tvalue = {
                        ID: id,
                        AssertionID: idpSetting.generateID(),
                        Destination: base,
                        Audience: spEntityID,
                        EntityID: spEntityID,
                        SubjectRecipient: acl,
                        Issuer: metadata.idp.getEntityID(),
                        IssueInstant: now,
                        AssertionConsumerServiceURL: acl,
                        StatusCode: urn_1.StatusCode.Success,
                        // can be customized
                        ConditionsNotBefore: now,
                        ConditionsNotOnOrAfter: fiveMinutesLater,
                        SubjectConfirmationDataNotOnOrAfter: fiveMinutesLater,
                        NameIDFormat: selectedNameIDFormat,
                        NameID: user.email || '',
                        InResponseTo: (0, utility_1.get)(requestInfo, 'extract.request.id', ''),
                        AuthnStatement: '',
                        AttributeStatement: '',
                    };
                    if (idpSetting.loginResponseTemplate && customTagReplacement) {
                        template = customTagReplacement(idpSetting.loginResponseTemplate.context);
                        rawSamlResponse = (0, utility_1.get)(template, 'context', null);
                    }
                    else {
                        if (requestInfo !== null) {
                            tvalue.InResponseTo = requestInfo.extract.request.id;
                        }
                        rawSamlResponse = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLoginResponseTemplate.context, tvalue);
                    }
                    privateKey = idpSetting.privateKey, privateKeyPass = idpSetting.privateKeyPass, signatureAlgorithm = idpSetting.requestSignatureAlgorithm;
                    config = {
                        privateKey: privateKey,
                        privateKeyPass: privateKeyPass,
                        signatureAlgorithm: signatureAlgorithm,
                        signingCert: metadata.idp.getX509Certificate('signing'),
                        isBase64Output: false,
                    };
                    // step: sign assertion ? -> encrypted ? -> sign message ?
                    if (metadata.sp.isWantAssertionsSigned()) {
                        // console.debug('sp wants assertion signed');
                        rawSamlResponse = libsaml_1.default.constructSAMLSignature(__assign(__assign({}, config), { rawSamlMessage: rawSamlResponse, transformationAlgorithms: spSetting.transformationAlgorithms, referenceTagXPath: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']", signatureConfig: {
                                prefix: 'ds',
                                location: { reference: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: 'after' },
                            } }));
                    }
                    // console.debug('after assertion signed', rawSamlResponse);
                    // SAML response must be signed sign message first, then encrypt
                    if (!encryptThenSign && (spSetting.wantMessageSigned || !metadata.sp.isWantAssertionsSigned())) {
                        // console.debug('sign then encrypt and sign entire message');
                        rawSamlResponse = libsaml_1.default.constructSAMLSignature(__assign(__assign({}, config), { rawSamlMessage: rawSamlResponse, isMessageSigned: true, transformationAlgorithms: spSetting.transformationAlgorithms, signatureConfig: spSetting.signatureConfig || {
                                prefix: 'ds',
                                location: { reference: "/*[local-name(.)='Response']/*[local-name(.)='Issuer']", action: 'after' },
                            } }));
                    }
                    if (!idpSetting.isAssertionEncrypted) return [3 /*break*/, 2];
                    return [4 /*yield*/, libsaml_1.default.encryptAssertion(entity.idp, entity.sp, rawSamlResponse)];
                case 1:
                    context = _a.sent();
                    if (encryptThenSign) {
                        //need to decode it
                        rawSamlResponse = utility_1.default.base64Decode(context);
                    }
                    else {
                        return [2 /*return*/, Promise.resolve({ id: id, context: context })];
                    }
                    _a.label = 2;
                case 2:
                    //sign after encrypting
                    if (encryptThenSign && (spSetting.wantMessageSigned || !metadata.sp.isWantAssertionsSigned())) {
                        rawSamlResponse = libsaml_1.default.constructSAMLSignature(__assign(__assign({}, config), { rawSamlMessage: rawSamlResponse, isMessageSigned: true, transformationAlgorithms: spSetting.transformationAlgorithms, signatureConfig: spSetting.signatureConfig || {
                                prefix: 'ds',
                                location: { reference: "/*[local-name(.)='Response']/*[local-name(.)='Issuer']", action: 'after' },
                            } }));
                    }
                    return [2 /*return*/, Promise.resolve({
                            id: id,
                            context: utility_1.default.base64Encode(rawSamlResponse),
                        })];
                case 3: throw new Error('ERR_GENERATE_POST_LOGIN_RESPONSE_MISSING_METADATA');
            }
        });
    });
}
/**
* @desc Generate a base64 encoded logout request
* @param  {object} user                         current logged user (e.g. req.user)
* @param  {string} referenceTagXPath            reference uri
* @param  {object} entity                       object includes both idp and sp
* @param  {function} customTagReplacement      used when developers have their own login response template
* @return {string} base64 encoded request
*/
function base64LogoutRequest(user, referenceTagXPath, entity, customTagReplacement) {
    var metadata = { init: entity.init.entityMeta, target: entity.target.entityMeta };
    var initSetting = entity.init.entitySetting;
    var nameIDFormat = initSetting.nameIDFormat;
    var selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
    var id = '';
    if (metadata && metadata.init && metadata.target) {
        var rawSamlRequest = void 0;
        if (initSetting.logoutRequestTemplate && customTagReplacement) {
            var template = customTagReplacement(initSetting.logoutRequestTemplate.context);
            id = (0, utility_1.get)(template, 'id', null);
            rawSamlRequest = (0, utility_1.get)(template, 'context', null);
        }
        else {
            id = initSetting.generateID();
            var tvalue = {
                ID: id,
                Destination: metadata.target.getSingleLogoutService(binding.post),
                Issuer: metadata.init.getEntityID(),
                IssueInstant: new Date().toISOString(),
                EntityID: metadata.init.getEntityID(),
                NameIDFormat: selectedNameIDFormat,
                NameID: user.logoutNameID,
            };
            rawSamlRequest = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLogoutRequestTemplate.context, tvalue);
        }
        if (entity.target.entitySetting.wantLogoutRequestSigned) {
            // Need to embeded XML signature
            var privateKey = initSetting.privateKey, privateKeyPass = initSetting.privateKeyPass, signatureAlgorithm = initSetting.requestSignatureAlgorithm, transformationAlgorithms = initSetting.transformationAlgorithms;
            return {
                id: id,
                context: libsaml_1.default.constructSAMLSignature({
                    referenceTagXPath: referenceTagXPath,
                    privateKey: privateKey,
                    privateKeyPass: privateKeyPass,
                    signatureAlgorithm: signatureAlgorithm,
                    transformationAlgorithms: transformationAlgorithms,
                    rawSamlMessage: rawSamlRequest,
                    signingCert: metadata.init.getX509Certificate('signing'),
                    signatureConfig: initSetting.signatureConfig || {
                        prefix: 'ds',
                        location: { reference: "/*[local-name(.)='LogoutRequest']/*[local-name(.)='Issuer']", action: 'after' },
                    }
                }),
            };
        }
        return {
            id: id,
            context: utility_1.default.base64Encode(rawSamlRequest),
        };
    }
    throw new Error('ERR_GENERATE_POST_LOGOUT_REQUEST_MISSING_METADATA');
}
/**
* @desc Generate a base64 encoded logout response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function base64LogoutResponse(requestInfo, entity, customTagReplacement) {
    var metadata = {
        init: entity.init.entityMeta,
        target: entity.target.entityMeta,
    };
    var id = '';
    var initSetting = entity.init.entitySetting;
    if (metadata && metadata.init && metadata.target) {
        var rawSamlResponse = void 0;
        if (initSetting.logoutResponseTemplate) {
            var template = customTagReplacement(initSetting.logoutResponseTemplate.context);
            id = template.id;
            rawSamlResponse = template.context;
        }
        else {
            id = initSetting.generateID();
            var tvalue = {
                ID: id,
                Destination: metadata.target.getSingleLogoutService(binding.post),
                EntityID: metadata.init.getEntityID(),
                Issuer: metadata.init.getEntityID(),
                IssueInstant: new Date().toISOString(),
                StatusCode: urn_1.StatusCode.Success,
                InResponseTo: (0, utility_1.get)(requestInfo, 'extract.request.id', null)
            };
            rawSamlResponse = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLogoutResponseTemplate.context, tvalue);
        }
        if (entity.target.entitySetting.wantLogoutResponseSigned) {
            var privateKey = initSetting.privateKey, privateKeyPass = initSetting.privateKeyPass, signatureAlgorithm = initSetting.requestSignatureAlgorithm, transformationAlgorithms = initSetting.transformationAlgorithms;
            return {
                id: id,
                context: libsaml_1.default.constructSAMLSignature({
                    isMessageSigned: true,
                    transformationAlgorithms: transformationAlgorithms,
                    privateKey: privateKey,
                    privateKeyPass: privateKeyPass,
                    signatureAlgorithm: signatureAlgorithm,
                    rawSamlMessage: rawSamlResponse,
                    signingCert: metadata.init.getX509Certificate('signing'),
                    signatureConfig: {
                        prefix: 'ds',
                        location: {
                            reference: "/*[local-name(.)='LogoutResponse']/*[local-name(.)='Issuer']",
                            action: 'after'
                        }
                    }
                }),
            };
        }
        return {
            id: id,
            context: utility_1.default.base64Encode(rawSamlResponse),
        };
    }
    throw new Error('ERR_GENERATE_POST_LOGOUT_RESPONSE_MISSING_METADATA');
}
var postBinding = {
    base64LoginRequest: base64LoginRequest,
    base64LoginResponse: base64LoginResponse,
    base64LogoutRequest: base64LogoutRequest,
    base64LogoutResponse: base64LogoutResponse,
};
exports.default = postBinding;
//# sourceMappingURL=binding-post.js.map