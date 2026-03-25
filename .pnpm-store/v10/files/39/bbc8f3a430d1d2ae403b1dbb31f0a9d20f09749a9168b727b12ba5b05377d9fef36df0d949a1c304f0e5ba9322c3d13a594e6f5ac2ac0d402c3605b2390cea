"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
* @file binding-redirect.ts
* @author tngan
* @desc Binding-level API, declare the functions using Redirect binding
*/
var utility_1 = __importStar(require("./utility"));
var libsaml_1 = __importDefault(require("./libsaml"));
var url = __importStar(require("url"));
var urn_1 = require("./urn");
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
* @desc Refractored part of URL generation for login/logout request
* @param  {string} type
* @param  {boolean} isSigned
* @param  {string} rawSamlRequest
* @param  {object} entitySetting
* @return {string}
*/
function buildRedirectURL(opts) {
    var baseUrl = opts.baseUrl, type = opts.type, isSigned = opts.isSigned, context = opts.context, entitySetting = opts.entitySetting;
    var _a = opts.relayState, relayState = _a === void 0 ? '' : _a;
    var noParams = (url.parse(baseUrl).query || []).length === 0;
    var queryParam = libsaml_1.default.getQueryParamByType(type);
    // In general, this xmlstring is required to do deflate -> base64 -> urlencode
    var samlRequest = encodeURIComponent(utility_1.default.base64Encode(utility_1.default.deflateString(context)));
    if (relayState !== '') {
        relayState = pvPair(urlParams.relayState, encodeURIComponent(relayState));
    }
    if (isSigned) {
        var sigAlg = pvPair(urlParams.sigAlg, encodeURIComponent(entitySetting.requestSignatureAlgorithm));
        var octetString = samlRequest + relayState + sigAlg;
        return baseUrl
            + pvPair(queryParam, octetString, noParams)
            + pvPair(urlParams.signature, encodeURIComponent(libsaml_1.default.constructMessageSignature(queryParam + '=' + octetString, entitySetting.privateKey, entitySetting.privateKeyPass, undefined, entitySetting.requestSignatureAlgorithm).toString()));
    }
    return baseUrl + pvPair(queryParam, samlRequest + relayState, noParams);
}
/**
* @desc Redirect URL for login request
* @param  {object} entity                       object includes both idp and sp
* @param  {function} customTagReplacement      used when developers have their own login response template
* @return {string} redirect URL
*/
function loginRequestRedirectURL(entity, customTagReplacement) {
    var metadata = { idp: entity.idp.entityMeta, sp: entity.sp.entityMeta };
    var spSetting = entity.sp.entitySetting;
    var id = '';
    if (metadata && metadata.idp && metadata.sp) {
        var base = metadata.idp.getSingleSignOnService(binding.redirect);
        var rawSamlRequest = void 0;
        if (spSetting.loginRequestTemplate && customTagReplacement) {
            var info = customTagReplacement(spSetting.loginRequestTemplate);
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
                NameIDFormat: selectedNameIDFormat,
                AssertionConsumerServiceURL: metadata.sp.getAssertionConsumerService(binding.post),
                EntityID: metadata.sp.getEntityID(),
                AllowCreate: spSetting.allowCreate,
            });
        }
        return {
            id: id,
            context: buildRedirectURL({
                context: rawSamlRequest,
                type: urlParams.samlRequest,
                isSigned: metadata.sp.isAuthnRequestSigned(),
                entitySetting: spSetting,
                baseUrl: base,
                relayState: spSetting.relayState,
            }),
        };
    }
    throw new Error('ERR_GENERATE_REDIRECT_LOGIN_REQUEST_MISSING_METADATA');
}
/**
* @desc Redirect URL for login response
* @param  {object} requestInfo             corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                         current logged user (e.g. req.user)
* @param  {String} relayState                the relaystate sent by sp corresponding request
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function loginResponseRedirectURL(requestInfo, entity, user, relayState, customTagReplacement) {
    if (user === void 0) { user = {}; }
    var idpSetting = entity.idp.entitySetting;
    var spSetting = entity.sp.entitySetting;
    var metadata = {
        idp: entity.idp.entityMeta,
        sp: entity.sp.entityMeta,
    };
    var id = idpSetting.generateID();
    if (metadata && metadata.idp && metadata.sp) {
        var base = metadata.sp.getAssertionConsumerService(binding.redirect);
        var rawSamlResponse = void 0;
        //
        var nameIDFormat = idpSetting.nameIDFormat;
        var selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
        var nowTime = new Date();
        // Five minutes later : nowtime  + 5 * 60 * 1000 (in milliseconds)
        var fiveMinutesLaterTime = new Date(nowTime.getTime() + 300000);
        var tvalue = {
            ID: id,
            AssertionID: idpSetting.generateID(),
            Destination: base,
            SubjectRecipient: base,
            Issuer: metadata.idp.getEntityID(),
            Audience: metadata.sp.getEntityID(),
            EntityID: metadata.sp.getEntityID(),
            IssueInstant: nowTime.toISOString(),
            AssertionConsumerServiceURL: base,
            StatusCode: urn_1.namespace.statusCode.success,
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
            var template = customTagReplacement(idpSetting.loginResponseTemplate.context);
            id = (0, utility_1.get)(template, 'id', null);
            rawSamlResponse = (0, utility_1.get)(template, 'context', null);
        }
        else {
            if (requestInfo !== null) {
                tvalue.InResponseTo = requestInfo.extract.request.id;
            }
            rawSamlResponse = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLoginResponseTemplate.context, tvalue);
        }
        var privateKey = idpSetting.privateKey, privateKeyPass = idpSetting.privateKeyPass, signatureAlgorithm = idpSetting.requestSignatureAlgorithm;
        var config = {
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
        // Like in post binding, SAML response is always signed
        return {
            id: id,
            context: buildRedirectURL({
                baseUrl: base,
                type: urlParams.samlResponse,
                isSigned: true,
                context: rawSamlResponse,
                entitySetting: idpSetting,
                relayState: relayState,
            }),
        };
    }
    throw new Error('ERR_GENERATE_REDIRECT_LOGIN_RESPONSE_MISSING_METADATA');
}
/**
* @desc Redirect URL for logout request
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
* @return {string} redirect URL
*/
function logoutRequestRedirectURL(user, entity, relayState, customTagReplacement) {
    var metadata = { init: entity.init.entityMeta, target: entity.target.entityMeta };
    var initSetting = entity.init.entitySetting;
    var id = initSetting.generateID();
    var nameIDFormat = initSetting.nameIDFormat;
    var selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
    if (metadata && metadata.init && metadata.target) {
        var base = metadata.target.getSingleLogoutService(binding.redirect);
        var rawSamlRequest = '';
        var requiredTags = {
            ID: id,
            Destination: base,
            EntityID: metadata.init.getEntityID(),
            Issuer: metadata.init.getEntityID(),
            IssueInstant: new Date().toISOString(),
            NameIDFormat: selectedNameIDFormat,
            NameID: user.logoutNameID,
            SessionIndex: user.sessionIndex,
        };
        if (initSetting.logoutRequestTemplate && customTagReplacement) {
            var info = customTagReplacement(initSetting.logoutRequestTemplate, requiredTags);
            id = (0, utility_1.get)(info, 'id', null);
            rawSamlRequest = (0, utility_1.get)(info, 'context', null);
        }
        else {
            rawSamlRequest = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLogoutRequestTemplate.context, requiredTags);
        }
        return {
            id: id,
            context: buildRedirectURL({
                context: rawSamlRequest,
                relayState: relayState,
                type: urlParams.logoutRequest,
                isSigned: entity.target.entitySetting.wantLogoutRequestSigned,
                entitySetting: initSetting,
                baseUrl: base,
            }),
        };
    }
    throw new Error('ERR_GENERATE_REDIRECT_LOGOUT_REQUEST_MISSING_METADATA');
}
/**
* @desc Redirect URL for logout response
* @param  {object} requescorresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function logoutResponseRedirectURL(requestInfo, entity, relayState, customTagReplacement) {
    var metadata = {
        init: entity.init.entityMeta,
        target: entity.target.entityMeta,
    };
    var initSetting = entity.init.entitySetting;
    var id = initSetting.generateID();
    if (metadata && metadata.init && metadata.target) {
        var base = metadata.target.getSingleLogoutService(binding.redirect);
        var rawSamlResponse = void 0;
        if (initSetting.logoutResponseTemplate && customTagReplacement) {
            var template = customTagReplacement(initSetting.logoutResponseTemplate);
            id = (0, utility_1.get)(template, 'id', null);
            rawSamlResponse = (0, utility_1.get)(template, 'context', null);
        }
        else {
            var tvalue = {
                ID: id,
                Destination: base,
                Issuer: metadata.init.getEntityID(),
                EntityID: metadata.init.getEntityID(),
                IssueInstant: new Date().toISOString(),
                StatusCode: urn_1.namespace.statusCode.success,
            };
            if (requestInfo && requestInfo.extract && requestInfo.extract.request) {
                tvalue.InResponseTo = requestInfo.extract.request.id;
            }
            rawSamlResponse = libsaml_1.default.replaceTagsByValue(libsaml_1.default.defaultLogoutResponseTemplate.context, tvalue);
        }
        return {
            id: id,
            context: buildRedirectURL({
                baseUrl: base,
                type: urlParams.logoutResponse,
                isSigned: entity.target.entitySetting.wantLogoutResponseSigned,
                context: rawSamlResponse,
                entitySetting: initSetting,
                relayState: relayState,
            }),
        };
    }
    throw new Error('ERR_GENERATE_REDIRECT_LOGOUT_RESPONSE_MISSING_METADATA');
}
var redirectBinding = {
    loginRequestRedirectURL: loginRequestRedirectURL,
    loginResponseRedirectURL: loginResponseRedirectURL,
    logoutRequestRedirectURL: logoutRequestRedirectURL,
    logoutResponseRedirectURL: logoutResponseRedirectURL,
};
exports.default = redirectBinding;
//# sourceMappingURL=binding-redirect.js.map