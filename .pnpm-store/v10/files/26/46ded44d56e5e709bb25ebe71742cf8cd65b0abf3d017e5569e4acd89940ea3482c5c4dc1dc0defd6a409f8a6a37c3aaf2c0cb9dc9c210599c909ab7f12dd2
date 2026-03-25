"use strict";
/**
* @file binding-simplesign.ts
* @author Orange
* @desc Binding-level API, declare the functions using POST SimpleSign binding
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
var urlParams = urn_1.wording.urlParams;
/**
* @private
* @desc Helper of generating URL param/value pair
* @param  {string} param     key
* @param  {string} value     value of key
* @param  {boolean} first    determine whether the param is the starting one in order to add query header '?'
* @return {string}
*/
function pvPair(param, value, first) {
    return (first === true ? '?' : '&') + param + '=' + value;
}
/**
* @private
* @desc Refactored part of simple signature generation for login/logout request
* @param  {string} type
* @param  {string} rawSamlRequest
* @param  {object} entitySetting
* @return {string}
*/
function buildSimpleSignature(opts) {
    var type = opts.type, context = opts.context, entitySetting = opts.entitySetting;
    var _a = opts.relayState, relayState = _a === void 0 ? '' : _a;
    var queryParam = libsaml_1.default.getQueryParamByType(type);
    if (relayState !== '') {
        relayState = pvPair(urlParams.relayState, relayState);
    }
    var sigAlg = pvPair(urlParams.sigAlg, entitySetting.requestSignatureAlgorithm);
    var octetString = context + relayState + sigAlg;
    return libsaml_1.default.constructMessageSignature(queryParam + '=' + octetString, entitySetting.privateKey, entitySetting.privateKeyPass, undefined, entitySetting.requestSignatureAlgorithm).toString();
}
/**
* @desc Generate a base64 encoded login request
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function base64LoginRequest(entity, customTagReplacement) {
    var metadata = { idp: entity.idp.entityMeta, sp: entity.sp.entityMeta };
    var spSetting = entity.sp.entitySetting;
    var id = '';
    if (metadata && metadata.idp && metadata.sp) {
        var base = metadata.idp.getSingleSignOnService(binding.simpleSign);
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
                AssertionConsumerServiceURL: metadata.sp.getAssertionConsumerService(binding.simpleSign),
                EntityID: metadata.sp.getEntityID(),
                AllowCreate: spSetting.allowCreate,
                NameIDFormat: selectedNameIDFormat
            });
        }
        var simpleSignatureContext = null;
        if (metadata.idp.isWantAuthnRequestsSigned()) {
            var simpleSignature = buildSimpleSignature({
                type: urlParams.samlRequest,
                context: rawSamlRequest,
                entitySetting: spSetting,
                relayState: spSetting.relayState,
            });
            simpleSignatureContext = {
                signature: simpleSignature,
                sigAlg: spSetting.requestSignatureAlgorithm,
            };
        }
        // No need to embeded XML signature
        return __assign({ id: id, context: utility_1.default.base64Encode(rawSamlRequest) }, simpleSignatureContext);
    }
    throw new Error('ERR_GENERATE_POST_SIMPLESIGN_LOGIN_REQUEST_MISSING_METADATA');
}
/**
* @desc Generate a base64 encoded login response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {string}  relayState               the relay state
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function base64LoginResponse() {
    return __awaiter(this, arguments, void 0, function (requestInfo, entity, user, relayState, customTagReplacement) {
        var idpSetting, spSetting, id, metadata, nameIDFormat, selectedNameIDFormat, base, rawSamlResponse, nowTime, fiveMinutesLaterTime, tvalue, template, privateKey, privateKeyPass, signatureAlgorithm, config, simpleSignature;
        if (requestInfo === void 0) { requestInfo = {}; }
        if (user === void 0) { user = {}; }
        return __generator(this, function (_a) {
            idpSetting = entity.idp.entitySetting;
            spSetting = entity.sp.entitySetting;
            id = idpSetting.generateID();
            metadata = {
                idp: entity.idp.entityMeta,
                sp: entity.sp.entityMeta,
            };
            nameIDFormat = idpSetting.nameIDFormat;
            selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
            if (metadata && metadata.idp && metadata.sp) {
                base = metadata.sp.getAssertionConsumerService(binding.simpleSign);
                rawSamlResponse = void 0;
                nowTime = new Date();
                fiveMinutesLaterTime = new Date(nowTime.getTime() + 300000);
                tvalue = {
                    ID: id,
                    AssertionID: idpSetting.generateID(),
                    Destination: base,
                    Audience: metadata.sp.getEntityID(),
                    EntityID: metadata.sp.getEntityID(),
                    SubjectRecipient: base,
                    Issuer: metadata.idp.getEntityID(),
                    IssueInstant: nowTime.toISOString(),
                    AssertionConsumerServiceURL: base,
                    StatusCode: urn_1.StatusCode.Success,
                    // can be customized
                    ConditionsNotBefore: nowTime.toISOString(),
                    ConditionsNotOnOrAfter: fiveMinutesLaterTime.toISOString(),
                    SubjectConfirmationDataNotOnOrAfter: fiveMinutesLaterTime.toISOString(),
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
                    rawSamlResponse = libsaml_1.default.constructSAMLSignature(__assign(__assign({}, config), { rawSamlMessage: rawSamlResponse, transformationAlgorithms: spSetting.transformationAlgorithms, referenceTagXPath: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']", signatureConfig: {
                            prefix: 'ds',
                            location: { reference: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: 'after' },
                        } }));
                }
                simpleSignature = '';
                // like in post and redirect bindings, login response is always signed.
                simpleSignature = buildSimpleSignature({
                    type: urlParams.samlResponse,
                    context: rawSamlResponse,
                    entitySetting: idpSetting,
                    relayState: relayState,
                });
                return [2 /*return*/, Promise.resolve({
                        id: id,
                        context: utility_1.default.base64Encode(rawSamlResponse),
                        signature: simpleSignature,
                        sigAlg: idpSetting.requestSignatureAlgorithm,
                    })];
            }
            throw new Error('ERR_GENERATE_POST_SIMPLESIGN_LOGIN_RESPONSE_MISSING_METADATA');
        });
    });
}
var simpleSignBinding = {
    base64LoginRequest: base64LoginRequest,
    base64LoginResponse: base64LoginResponse,
};
exports.default = simpleSignBinding;
//# sourceMappingURL=binding-simplesign.js.map