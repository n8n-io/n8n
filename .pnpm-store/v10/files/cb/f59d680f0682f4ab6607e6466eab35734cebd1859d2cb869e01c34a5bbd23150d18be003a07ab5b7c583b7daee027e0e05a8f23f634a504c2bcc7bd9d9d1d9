"use strict";
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
exports.IdentityProvider = void 0;
exports.default = default_1;
/**
* @file entity-idp.ts
* @author tngan
* @desc  Declares the actions taken by identity provider
*/
var entity_1 = __importDefault(require("./entity"));
var libsaml_1 = __importDefault(require("./libsaml"));
var urn_1 = require("./urn");
var binding_post_1 = __importDefault(require("./binding-post"));
var binding_redirect_1 = __importDefault(require("./binding-redirect"));
var binding_simplesign_1 = __importDefault(require("./binding-simplesign"));
var flow_1 = require("./flow");
var utility_1 = require("./utility");
/**
 * Identity provider can be configured using either metadata importing or idpSetting
 */
function default_1(props) {
    return new IdentityProvider(props);
}
/**
 * Identity provider can be configured using either metadata importing or idpSetting
 */
var IdentityProvider = /** @class */ (function (_super) {
    __extends(IdentityProvider, _super);
    function IdentityProvider(idpSetting) {
        var defaultIdpEntitySetting = {
            wantAuthnRequestsSigned: false,
            tagPrefix: {
                encryptedAssertion: 'saml',
            },
        };
        var entitySetting = Object.assign(defaultIdpEntitySetting, idpSetting);
        // build attribute part
        if (idpSetting.loginResponseTemplate) {
            if ((0, utility_1.isString)(idpSetting.loginResponseTemplate.context) && Array.isArray(idpSetting.loginResponseTemplate.attributes)) {
                var attributeStatementTemplate = void 0;
                var attributeTemplate = void 0;
                if (!idpSetting.loginResponseTemplate.additionalTemplates || !idpSetting.loginResponseTemplate.additionalTemplates.attributeStatementTemplate) {
                    attributeStatementTemplate = libsaml_1.default.defaultAttributeStatementTemplate;
                }
                else {
                    attributeStatementTemplate = idpSetting.loginResponseTemplate.additionalTemplates.attributeStatementTemplate;
                }
                if (!idpSetting.loginResponseTemplate.additionalTemplates || !idpSetting.loginResponseTemplate.additionalTemplates.attributeTemplate) {
                    attributeTemplate = libsaml_1.default.defaultAttributeTemplate;
                }
                else {
                    attributeTemplate = idpSetting.loginResponseTemplate.additionalTemplates.attributeTemplate;
                }
                var replacement = {
                    AttributeStatement: libsaml_1.default.attributeStatementBuilder(idpSetting.loginResponseTemplate.attributes, attributeTemplate, attributeStatementTemplate),
                };
                entitySetting.loginResponseTemplate = __assign(__assign({}, entitySetting.loginResponseTemplate), { context: libsaml_1.default.replaceTagsByValue(entitySetting.loginResponseTemplate.context, replacement) });
            }
            else {
                console.warn('Invalid login response template');
            }
        }
        return _super.call(this, entitySetting, 'idp') || this;
    }
    /**
    * @desc  Generates the login response for developers to design their own method
    * @param  sp                        object of service provider
    * @param  requestInfo               corresponding request, used to obtain the id
    * @param  binding                   protocol binding
    * @param  user                      current logged user (e.g. req.user)
    * @param  customTagReplacement      used when developers have their own login response template
    * @param  encryptThenSign           whether or not to encrypt then sign first (if signing)
    * @param  relayState             the relayState from corresponding request
    */
    IdentityProvider.prototype.createLoginResponse = function (sp, requestInfo, binding, user, customTagReplacement, encryptThenSign, relayState) {
        return __awaiter(this, void 0, void 0, function () {
            var protocol, context, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        protocol = urn_1.namespace.binding[binding];
                        context = null;
                        _a = protocol;
                        switch (_a) {
                            case urn_1.namespace.binding.post: return [3 /*break*/, 1];
                            case urn_1.namespace.binding.simpleSign: return [3 /*break*/, 3];
                            case urn_1.namespace.binding.redirect: return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, binding_post_1.default.base64LoginResponse(requestInfo, {
                            idp: this,
                            sp: sp,
                        }, user, customTagReplacement, encryptThenSign)];
                    case 2:
                        context = _b.sent();
                        return [3 /*break*/, 7];
                    case 3: return [4 /*yield*/, binding_simplesign_1.default.base64LoginResponse(requestInfo, {
                            idp: this,
                            sp: sp,
                        }, user, relayState, customTagReplacement)];
                    case 4:
                        context = _b.sent();
                        return [3 /*break*/, 7];
                    case 5: return [2 /*return*/, binding_redirect_1.default.loginResponseRedirectURL(requestInfo, {
                            idp: this,
                            sp: sp,
                        }, user, relayState, customTagReplacement)];
                    case 6: throw new Error('ERR_CREATE_RESPONSE_UNDEFINED_BINDING');
                    case 7: return [2 /*return*/, __assign(__assign({}, context), { relayState: relayState, entityEndpoint: sp.entityMeta.getAssertionConsumerService(binding), type: 'SAMLResponse' })];
                }
            });
        });
    };
    /**
     * Validation of the parsed URL parameters
     * @param sp ServiceProvider instance
     * @param binding Protocol binding
     * @param req RequesmessageSigningOrderst
     */
    IdentityProvider.prototype.parseLoginRequest = function (sp, binding, req) {
        var self = this;
        return (0, flow_1.flow)({
            from: sp,
            self: self,
            checkSignature: self.entityMeta.isWantAuthnRequestsSigned(),
            parserType: 'SAMLRequest',
            type: 'login',
            binding: binding,
            request: req
        });
    };
    return IdentityProvider;
}(entity_1.default));
exports.IdentityProvider = IdentityProvider;
//# sourceMappingURL=entity-idp.js.map