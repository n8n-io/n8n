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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flow = flow;
var utility_1 = require("./utility");
var validator_1 = require("./validator");
var libsaml_1 = __importDefault(require("./libsaml"));
var extractor_1 = require("./extractor");
var urn_1 = require("./urn");
var bindDict = urn_1.wording.binding;
var urlParams = urn_1.wording.urlParams;
// get the default extractor fields based on the parserType
function getDefaultExtractorFields(parserType, assertion) {
    switch (parserType) {
        case urn_1.ParserType.SAMLRequest:
            return extractor_1.loginRequestFields;
        case urn_1.ParserType.SAMLResponse:
            if (!assertion) {
                // unexpected hit
                throw new Error('ERR_EMPTY_ASSERTION');
            }
            return (0, extractor_1.loginResponseFields)(assertion);
        case urn_1.ParserType.LogoutRequest:
            return extractor_1.logoutRequestFields;
        case urn_1.ParserType.LogoutResponse:
            return extractor_1.logoutResponseFields;
        default:
            throw new Error('ERR_UNDEFINED_PARSERTYPE');
    }
}
// proceed the redirect binding flow
function redirectFlow(options) {
    return __awaiter(this, void 0, void 0, function () {
        var request, parserType, self, _a, checkSignature, from, query, octetString, sigAlg, signature, targetEntityMetadata, direction, content, xmlString, e_1, assertion, verifiedDoc, extractorFields, parseResult, base64Signature, decodeSigAlg, verified, issuer, extractedProperties;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    request = options.request, parserType = options.parserType, self = options.self, _a = options.checkSignature, checkSignature = _a === void 0 ? true : _a, from = options.from;
                    query = request.query, octetString = request.octetString;
                    sigAlg = query.SigAlg, signature = query.Signature;
                    targetEntityMetadata = from.entityMeta;
                    direction = libsaml_1.default.getQueryParamByType(parserType);
                    content = query[direction];
                    // query must contain the saml content
                    if (content === undefined) {
                        return [2 /*return*/, Promise.reject('ERR_REDIRECT_FLOW_BAD_ARGS')];
                    }
                    xmlString = (0, utility_1.inflateString)(decodeURIComponent(content));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, libsaml_1.default.isValidXml(xmlString)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [2 /*return*/, Promise.reject('ERR_INVALID_XML')];
                case 4: 
                // check status based on different scenarios
                return [4 /*yield*/, checkStatus(xmlString, parserType)];
                case 5:
                    // check status based on different scenarios
                    _b.sent();
                    assertion = '';
                    if (parserType === urlParams.samlResponse) {
                        verifiedDoc = (0, extractor_1.extract)(xmlString, [{
                                key: 'assertion',
                                localPath: ['~Response', 'Assertion'],
                                attributes: [],
                                context: true
                            }]);
                        if (verifiedDoc && verifiedDoc.assertion) {
                            assertion = verifiedDoc.assertion;
                        }
                    }
                    extractorFields = getDefaultExtractorFields(parserType, assertion.length > 0 ? assertion : null);
                    parseResult = {
                        samlContent: xmlString,
                        sigAlg: null,
                        extract: (0, extractor_1.extract)(xmlString, extractorFields),
                    };
                    // see if signature check is required
                    // only verify message signature is enough
                    if (checkSignature) {
                        if (!signature || !sigAlg) {
                            return [2 /*return*/, Promise.reject('ERR_MISSING_SIG_ALG')];
                        }
                        base64Signature = Buffer.from(decodeURIComponent(signature), 'base64');
                        decodeSigAlg = decodeURIComponent(sigAlg);
                        verified = libsaml_1.default.verifyMessageSignature(targetEntityMetadata, octetString, base64Signature, sigAlg);
                        if (!verified) {
                            // Fail to verify message signature
                            return [2 /*return*/, Promise.reject('ERR_FAILED_MESSAGE_SIGNATURE_VERIFICATION')];
                        }
                        parseResult.sigAlg = decodeSigAlg;
                    }
                    issuer = targetEntityMetadata.getEntityID();
                    extractedProperties = parseResult.extract;
                    // unmatched issuer
                    if ((parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
                        && extractedProperties
                        && extractedProperties.issuer !== issuer) {
                        return [2 /*return*/, Promise.reject('ERR_UNMATCH_ISSUER')];
                    }
                    // invalid session time
                    // only run the verifyTime when `SessionNotOnOrAfter` exists
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.sessionIndex.sessionNotOnOrAfter
                        && !(0, validator_1.verifyTime)(undefined, extractedProperties.sessionIndex.sessionNotOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_EXPIRED_SESSION')];
                    }
                    // invalid time
                    // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.conditions
                        && !(0, validator_1.verifyTime)(extractedProperties.conditions.notBefore, extractedProperties.conditions.notOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_SUBJECT_UNCONFIRMED')];
                    }
                    return [2 /*return*/, Promise.resolve(parseResult)];
            }
        });
    });
}
// proceed the post flow
function postFlow(options) {
    return __awaiter(this, void 0, void 0, function () {
        var request, from, self, parserType, _a, checkSignature, body, direction, encodedRequest, samlContent, verificationOptions, decryptRequired, extractorFields, _b, verified, verifiedAssertionNode, result, _c, verified, verifiedAssertionNode, parseResult, targetEntityMetadata, issuer, extractedProperties;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    request = options.request, from = options.from, self = options.self, parserType = options.parserType, _a = options.checkSignature, checkSignature = _a === void 0 ? true : _a;
                    body = request.body;
                    direction = libsaml_1.default.getQueryParamByType(parserType);
                    encodedRequest = body[direction];
                    samlContent = String((0, utility_1.base64Decode)(encodedRequest));
                    verificationOptions = {
                        metadata: from.entityMeta,
                        signatureAlgorithm: from.entitySetting.requestSignatureAlgorithm,
                    };
                    decryptRequired = from.entitySetting.isAssertionEncrypted;
                    extractorFields = [];
                    // validate the xml first
                    return [4 /*yield*/, libsaml_1.default.isValidXml(samlContent)];
                case 1:
                    // validate the xml first
                    _d.sent();
                    if (parserType !== urlParams.samlResponse) {
                        extractorFields = getDefaultExtractorFields(parserType, null);
                    }
                    // check status based on different scenarios
                    return [4 /*yield*/, checkStatus(samlContent, parserType)];
                case 2:
                    // check status based on different scenarios
                    _d.sent();
                    // verify the signatures (the response is encrypted then signed, then verify first then decrypt)
                    if (checkSignature &&
                        from.entitySetting.messageSigningOrder === urn_1.MessageSignatureOrder.ETS) {
                        _b = __read(libsaml_1.default.verifySignature(samlContent, verificationOptions), 2), verified = _b[0], verifiedAssertionNode = _b[1];
                        if (!verified) {
                            return [2 /*return*/, Promise.reject('ERR_FAIL_TO_VERIFY_ETS_SIGNATURE')];
                        }
                        if (!decryptRequired) {
                            extractorFields = getDefaultExtractorFields(parserType, verifiedAssertionNode);
                        }
                    }
                    if (!(parserType === 'SAMLResponse' && decryptRequired)) return [3 /*break*/, 4];
                    return [4 /*yield*/, libsaml_1.default.decryptAssertion(self, samlContent)];
                case 3:
                    result = _d.sent();
                    samlContent = result[0];
                    extractorFields = getDefaultExtractorFields(parserType, result[1]);
                    _d.label = 4;
                case 4:
                    // verify the signatures (the response is signed then encrypted, then decrypt first then verify)
                    if (checkSignature &&
                        from.entitySetting.messageSigningOrder === urn_1.MessageSignatureOrder.STE) {
                        _c = __read(libsaml_1.default.verifySignature(samlContent, verificationOptions), 2), verified = _c[0], verifiedAssertionNode = _c[1];
                        if (verified) {
                            extractorFields = getDefaultExtractorFields(parserType, verifiedAssertionNode);
                        }
                        else {
                            return [2 /*return*/, Promise.reject('ERR_FAIL_TO_VERIFY_STE_SIGNATURE')];
                        }
                    }
                    parseResult = {
                        samlContent: samlContent,
                        extract: (0, extractor_1.extract)(samlContent, extractorFields),
                    };
                    targetEntityMetadata = from.entityMeta;
                    issuer = targetEntityMetadata.getEntityID();
                    extractedProperties = parseResult.extract;
                    // unmatched issuer
                    if ((parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
                        && extractedProperties
                        && extractedProperties.issuer !== issuer) {
                        return [2 /*return*/, Promise.reject('ERR_UNMATCH_ISSUER')];
                    }
                    // invalid session time
                    // only run the verifyTime when `SessionNotOnOrAfter` exists
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.sessionIndex.sessionNotOnOrAfter
                        && !(0, validator_1.verifyTime)(undefined, extractedProperties.sessionIndex.sessionNotOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_EXPIRED_SESSION')];
                    }
                    // invalid time
                    // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.conditions
                        && !(0, validator_1.verifyTime)(extractedProperties.conditions.notBefore, extractedProperties.conditions.notOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_SUBJECT_UNCONFIRMED')];
                    }
                    return [2 /*return*/, Promise.resolve(parseResult)];
            }
        });
    });
}
// proceed the post simple sign binding flow
function postSimpleSignFlow(options) {
    return __awaiter(this, void 0, void 0, function () {
        var request, parserType, self, _a, checkSignature, from, body, octetString, targetEntityMetadata, direction, encodedRequest, sigAlg, signature, xmlString, e_2, assertion, verifiedDoc, extractorFields, parseResult, base64Signature, verified, issuer, extractedProperties;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    request = options.request, parserType = options.parserType, self = options.self, _a = options.checkSignature, checkSignature = _a === void 0 ? true : _a, from = options.from;
                    body = request.body, octetString = request.octetString;
                    targetEntityMetadata = from.entityMeta;
                    direction = libsaml_1.default.getQueryParamByType(parserType);
                    encodedRequest = body[direction];
                    sigAlg = body['SigAlg'];
                    signature = body['Signature'];
                    // query must contain the saml content
                    if (encodedRequest === undefined) {
                        return [2 /*return*/, Promise.reject('ERR_SIMPLESIGN_FLOW_BAD_ARGS')];
                    }
                    xmlString = String((0, utility_1.base64Decode)(encodedRequest));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, libsaml_1.default.isValidXml(xmlString)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _b.sent();
                    return [2 /*return*/, Promise.reject('ERR_INVALID_XML')];
                case 4: 
                // check status based on different scenarios
                return [4 /*yield*/, checkStatus(xmlString, parserType)];
                case 5:
                    // check status based on different scenarios
                    _b.sent();
                    assertion = '';
                    if (parserType === urlParams.samlResponse) {
                        verifiedDoc = (0, extractor_1.extract)(xmlString, [{
                                key: 'assertion',
                                localPath: ['~Response', 'Assertion'],
                                attributes: [],
                                context: true
                            }]);
                        if (verifiedDoc && verifiedDoc.assertion) {
                            assertion = verifiedDoc.assertion;
                        }
                    }
                    extractorFields = getDefaultExtractorFields(parserType, assertion.length > 0 ? assertion : null);
                    parseResult = {
                        samlContent: xmlString,
                        sigAlg: null,
                        extract: (0, extractor_1.extract)(xmlString, extractorFields),
                    };
                    // see if signature check is required
                    // only verify message signature is enough
                    if (checkSignature) {
                        if (!signature || !sigAlg) {
                            return [2 /*return*/, Promise.reject('ERR_MISSING_SIG_ALG')];
                        }
                        base64Signature = Buffer.from(signature, 'base64');
                        verified = libsaml_1.default.verifyMessageSignature(targetEntityMetadata, octetString, base64Signature, sigAlg);
                        if (!verified) {
                            // Fail to verify message signature
                            return [2 /*return*/, Promise.reject('ERR_FAILED_MESSAGE_SIGNATURE_VERIFICATION')];
                        }
                        parseResult.sigAlg = sigAlg;
                    }
                    issuer = targetEntityMetadata.getEntityID();
                    extractedProperties = parseResult.extract;
                    // unmatched issuer
                    if ((parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
                        && extractedProperties
                        && extractedProperties.issuer !== issuer) {
                        return [2 /*return*/, Promise.reject('ERR_UNMATCH_ISSUER')];
                    }
                    // invalid session time
                    // only run the verifyTime when `SessionNotOnOrAfter` exists
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.sessionIndex.sessionNotOnOrAfter
                        && !(0, validator_1.verifyTime)(undefined, extractedProperties.sessionIndex.sessionNotOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_EXPIRED_SESSION')];
                    }
                    // invalid time
                    // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
                    if (parserType === 'SAMLResponse'
                        && extractedProperties.conditions
                        && !(0, validator_1.verifyTime)(extractedProperties.conditions.notBefore, extractedProperties.conditions.notOnOrAfter, self.entitySetting.clockDrifts)) {
                        return [2 /*return*/, Promise.reject('ERR_SUBJECT_UNCONFIRMED')];
                    }
                    return [2 /*return*/, Promise.resolve(parseResult)];
            }
        });
    });
}
function checkStatus(content, parserType) {
    // only check response parser
    if (parserType !== urlParams.samlResponse && parserType !== urlParams.logoutResponse) {
        return Promise.resolve('SKIPPED');
    }
    var fields = parserType === urlParams.samlResponse
        ? extractor_1.loginResponseStatusFields
        : extractor_1.logoutResponseStatusFields;
    var _a = (0, extractor_1.extract)(content, fields), top = _a.top, second = _a.second;
    // only resolve when top-tier status code is success
    if (top === urn_1.StatusCode.Success) {
        return Promise.resolve('OK');
    }
    if (!top) {
        throw new Error('ERR_UNDEFINED_STATUS');
    }
    // returns a detailed error for two-tier error code
    throw new Error("ERR_FAILED_STATUS with top tier code: ".concat(top, ", second tier code: ").concat(second));
}
function flow(options) {
    var binding = options.binding;
    var parserType = options.parserType;
    options.supportBindings = [urn_1.BindingNamespace.Redirect, urn_1.BindingNamespace.Post, urn_1.BindingNamespace.SimpleSign];
    // saml response  allows POST, REDIRECT
    if (parserType === urn_1.ParserType.SAMLResponse) {
        options.supportBindings = [urn_1.BindingNamespace.Post, urn_1.BindingNamespace.Redirect, urn_1.BindingNamespace.SimpleSign];
    }
    if (binding === bindDict.post) {
        return postFlow(options);
    }
    if (binding === bindDict.redirect) {
        return redirectFlow(options);
    }
    if (binding === bindDict.simpleSign) {
        return postSimpleSignFlow(options);
    }
    return Promise.reject('ERR_UNEXPECTED_FLOW');
}
//# sourceMappingURL=flow.js.map