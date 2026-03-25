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
* @file entity.ts
* @author tngan
* @desc  An abstraction for identity provider and service provider.
*/
var utility_1 = require("./utility");
var urn_1 = require("./urn");
var uuid = __importStar(require("uuid"));
var metadata_idp_1 = __importDefault(require("./metadata-idp"));
var metadata_sp_1 = __importDefault(require("./metadata-sp"));
var binding_redirect_1 = __importDefault(require("./binding-redirect"));
var binding_post_1 = __importDefault(require("./binding-post"));
var flow_1 = require("./flow");
var dataEncryptionAlgorithm = urn_1.algorithms.encryption.data;
var keyEncryptionAlgorithm = urn_1.algorithms.encryption.key;
var signatureAlgorithms = urn_1.algorithms.signature;
var messageSigningOrders = urn_1.messageConfigurations.signingOrder;
var defaultEntitySetting = {
    wantLogoutResponseSigned: false,
    messageSigningOrder: messageSigningOrders.SIGN_THEN_ENCRYPT,
    wantLogoutRequestSigned: false,
    allowCreate: false,
    isAssertionEncrypted: false,
    requestSignatureAlgorithm: signatureAlgorithms.RSA_SHA256,
    dataEncryptionAlgorithm: dataEncryptionAlgorithm.AES_256,
    keyEncryptionAlgorithm: keyEncryptionAlgorithm.RSA_OAEP_MGF1P,
    generateID: function () { return ('_' + uuid.v4()); },
    relayState: '',
};
var Entity = /** @class */ (function () {
    /**
    * @param entitySetting
    * @param entityMeta is the entity metadata, deprecated after 2.0
    */
    function Entity(entitySetting, entityType) {
        this.entitySetting = Object.assign({}, defaultEntitySetting, entitySetting);
        var metadata = entitySetting.metadata || entitySetting;
        switch (entityType) {
            case 'idp':
                this.entityMeta = (0, metadata_idp_1.default)(metadata);
                // setting with metadata has higher precedence 
                this.entitySetting.wantAuthnRequestsSigned = this.entityMeta.isWantAuthnRequestsSigned();
                this.entitySetting.nameIDFormat = this.entityMeta.getNameIDFormat() || this.entitySetting.nameIDFormat;
                break;
            case 'sp':
                this.entityMeta = (0, metadata_sp_1.default)(metadata);
                // setting with metadata has higher precedence 
                this.entitySetting.authnRequestsSigned = this.entityMeta.isAuthnRequestSigned();
                this.entitySetting.wantAssertionsSigned = this.entityMeta.isWantAssertionsSigned();
                this.entitySetting.nameIDFormat = this.entityMeta.getNameIDFormat() || this.entitySetting.nameIDFormat;
                break;
            default:
                throw new Error('ERR_UNDEFINED_ENTITY_TYPE');
        }
    }
    /**
    * @desc  Returns the setting of entity
    * @return {object}
    */
    Entity.prototype.getEntitySetting = function () {
        return this.entitySetting;
    };
    /**
    * @desc  Returns the xml string of entity metadata
    * @return {string}
    */
    Entity.prototype.getMetadata = function () {
        return this.entityMeta.getMetadata();
    };
    /**
    * @desc  Exports the entity metadata into specified folder
    * @param  {string} exportFile indicates the file name
    */
    Entity.prototype.exportMetadata = function (exportFile) {
        return this.entityMeta.exportMetadata(exportFile);
    };
    /** * @desc  Verify fields with the one specified in metadata
    * @param  {string/[string]} field is a string or an array of string indicating the field value in SAML message
    * @param  {string} metaField is a string indicating the same field specified in metadata
    * @return {boolean} True/False
    */
    Entity.prototype.verifyFields = function (field, metaField) {
        if ((0, utility_1.isString)(field)) {
            return field === metaField;
        }
        if ((0, utility_1.isNonEmptyArray)(field)) {
            var res_1 = true;
            field.forEach(function (f) {
                if (f !== metaField) {
                    res_1 = false;
                    return;
                }
            });
            return res_1;
        }
        return false;
    };
    /** @desc   Generates the logout request for developers to design their own method
    * @param  {ServiceProvider} sp     object of service provider
    * @param  {string}   binding       protocol binding
    * @param  {object}   user          current logged user (e.g. user)
    * @param  {string} relayState      the URL to which to redirect the user when logout is complete
    * @param  {function} customTagReplacement     used when developers have their own login response template
    */
    Entity.prototype.createLogoutRequest = function (targetEntity, binding, user, relayState, customTagReplacement) {
        if (relayState === void 0) { relayState = ''; }
        if (binding === urn_1.wording.binding.redirect) {
            return binding_redirect_1.default.logoutRequestRedirectURL(user, {
                init: this,
                target: targetEntity,
            }, relayState, customTagReplacement);
        }
        if (binding === urn_1.wording.binding.post) {
            var entityEndpoint = targetEntity.entityMeta.getSingleLogoutService(binding);
            var context = binding_post_1.default.base64LogoutRequest(user, "/*[local-name(.)='LogoutRequest']", { init: this, target: targetEntity }, customTagReplacement);
            return __assign(__assign({}, context), { relayState: relayState, entityEndpoint: entityEndpoint, type: 'SAMLRequest' });
        }
        // Will support artifact in the next release
        throw new Error('ERR_UNDEFINED_BINDING');
    };
    /**
    * @desc  Generates the logout response for developers to design their own method
    * @param  {IdentityProvider} idp               object of identity provider
    * @param  {object} requestInfo                 corresponding request, used to obtain the id
    * @param  {string} relayState                  the URL to which to redirect the user when logout is complete.
    * @param  {string} binding                     protocol binding
    * @param  {function} customTagReplacement                 used when developers have their own login response template
    */
    Entity.prototype.createLogoutResponse = function (target, requestInfo, binding, relayState, customTagReplacement) {
        if (relayState === void 0) { relayState = ''; }
        var protocol = urn_1.namespace.binding[binding];
        if (protocol === urn_1.namespace.binding.redirect) {
            return binding_redirect_1.default.logoutResponseRedirectURL(requestInfo, {
                init: this,
                target: target,
            }, relayState, customTagReplacement);
        }
        if (protocol === urn_1.namespace.binding.post) {
            var context = binding_post_1.default.base64LogoutResponse(requestInfo, {
                init: this,
                target: target,
            }, customTagReplacement);
            return __assign(__assign({}, context), { relayState: relayState, entityEndpoint: target.entityMeta.getSingleLogoutService(binding), type: 'SAMLResponse' });
        }
        throw new Error('ERR_CREATE_LOGOUT_RESPONSE_UNDEFINED_BINDING');
    };
    /**
    * @desc   Validation of the parsed the URL parameters
    * @param  {IdentityProvider}   idp             object of identity provider
    * @param  {string}   binding                   protocol binding
    * @param  {request}   req                      request
    * @return {Promise}
    */
    Entity.prototype.parseLogoutRequest = function (from, binding, request) {
        var self = this;
        return (0, flow_1.flow)({
            from: from,
            self: self,
            type: 'logout',
            parserType: 'LogoutRequest',
            checkSignature: this.entitySetting.wantLogoutRequestSigned,
            binding: binding,
            request: request,
        });
    };
    /**
    * @desc   Validation of the parsed the URL parameters
    * @param  {object} config                      config for the parser
    * @param  {string}   binding                   protocol binding
    * @param  {request}   req                      request
    * @return {Promise}
    */
    Entity.prototype.parseLogoutResponse = function (from, binding, request) {
        var self = this;
        return (0, flow_1.flow)({
            from: from,
            self: self,
            type: 'logout',
            parserType: 'LogoutResponse',
            checkSignature: self.entitySetting.wantLogoutResponseSigned,
            binding: binding,
            request: request
        });
    };
    return Entity;
}());
exports.default = Entity;
//# sourceMappingURL=entity.js.map