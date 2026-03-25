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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceProvider = void 0;
exports.default = default_1;
/**
* @file entity-sp.ts
* @author tngan
* @desc  Declares the actions taken by service provider
*/
var entity_1 = __importDefault(require("./entity"));
var urn_1 = require("./urn");
var binding_redirect_1 = __importDefault(require("./binding-redirect"));
var binding_post_1 = __importDefault(require("./binding-post"));
var binding_simplesign_1 = __importDefault(require("./binding-simplesign"));
var flow_1 = require("./flow");
/*
 * @desc interface function
 */
function default_1(props) {
    return new ServiceProvider(props);
}
/**
* @desc Service provider can be configured using either metadata importing or spSetting
* @param  {object} spSettingimport { FlowResult } from '../types/src/flow.d';

*/
var ServiceProvider = /** @class */ (function (_super) {
    __extends(ServiceProvider, _super);
    /**
    * @desc  Inherited from Entity
    * @param {object} spSetting    setting of service provider
    */
    function ServiceProvider(spSetting) {
        var entitySetting = Object.assign({
            authnRequestsSigned: false,
            wantAssertionsSigned: false,
            wantMessageSigned: false,
        }, spSetting);
        return _super.call(this, entitySetting, 'sp') || this;
    }
    /**
    * @desc  Generates the login request for developers to design their own method
    * @param  {IdentityProvider} idp               object of identity provider
    * @param  {string}   binding                   protocol binding
    * @param  {function} customTagReplacement     used when developers have their own login response template
    */
    ServiceProvider.prototype.createLoginRequest = function (idp, binding, customTagReplacement) {
        if (binding === void 0) { binding = 'redirect'; }
        var nsBinding = urn_1.namespace.binding;
        var protocol = nsBinding[binding];
        if (this.entityMeta.isAuthnRequestSigned() !== idp.entityMeta.isWantAuthnRequestsSigned()) {
            throw new Error('ERR_METADATA_CONFLICT_REQUEST_SIGNED_FLAG');
        }
        var context = null;
        switch (protocol) {
            case nsBinding.redirect:
                return binding_redirect_1.default.loginRequestRedirectURL({ idp: idp, sp: this }, customTagReplacement);
            case nsBinding.post:
                context = binding_post_1.default.base64LoginRequest("/*[local-name(.)='AuthnRequest']", { idp: idp, sp: this }, customTagReplacement);
                break;
            case nsBinding.simpleSign:
                // Object context = {id, context, signature, sigAlg}
                context = binding_simplesign_1.default.base64LoginRequest({ idp: idp, sp: this }, customTagReplacement);
                break;
            default:
                // Will support artifact in the next release
                throw new Error('ERR_SP_LOGIN_REQUEST_UNDEFINED_BINDING');
        }
        return __assign(__assign({}, context), { relayState: this.entitySetting.relayState, entityEndpoint: idp.entityMeta.getSingleSignOnService(binding), type: 'SAMLRequest' });
    };
    /**
    * @desc   Validation of the parsed the URL parameters
    * @param  {IdentityProvider}   idp             object of identity provider
    * @param  {string}   binding                   protocol binding
    * @param  {request}   req                      request
    */
    ServiceProvider.prototype.parseLoginResponse = function (idp, binding, request) {
        var self = this;
        return (0, flow_1.flow)({
            from: idp,
            self: self,
            checkSignature: true, // saml response must have signature
            parserType: 'SAMLResponse',
            type: 'login',
            binding: binding,
            request: request
        });
    };
    return ServiceProvider;
}(entity_1.default));
exports.ServiceProvider = ServiceProvider;
//# sourceMappingURL=entity-sp.js.map