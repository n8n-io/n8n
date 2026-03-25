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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpMetadata = void 0;
exports.default = default_1;
/**
* @file metadata-sp.ts
* @author tngan
* @desc  Metadata of service provider
*/
var metadata_1 = __importDefault(require("./metadata"));
var urn_1 = require("./urn");
var libsaml_1 = __importDefault(require("./libsaml"));
var utility_1 = require("./utility");
var xml_1 = __importDefault(require("xml"));
/*
 * @desc interface function
 */
function default_1(meta) {
    return new SpMetadata(meta);
}
/**
* @desc SP Metadata is for creating Service Provider, provides a set of API to manage the actions in SP.
*/
var SpMetadata = /** @class */ (function (_super) {
    __extends(SpMetadata, _super);
    /**
    * @param  {object/string} meta (either xml string or configuration in object)
    * @return {object} prototypes including public functions
    */
    function SpMetadata(meta) {
        var e_1, _a, e_2, _b;
        var isFile = (0, utility_1.isString)(meta) || meta instanceof Buffer;
        // use object configuration instead of importing metadata file directly
        if (!isFile) {
            var _c = meta, _d = _c.elementsOrder, elementsOrder = _d === void 0 ? urn_1.elementsOrder.default : _d, entityID = _c.entityID, signingCert = _c.signingCert, encryptCert = _c.encryptCert, _e = _c.authnRequestsSigned, authnRequestsSigned = _e === void 0 ? false : _e, _f = _c.wantAssertionsSigned, wantAssertionsSigned = _f === void 0 ? false : _f, _g = _c.wantMessageSigned, wantMessageSigned = _g === void 0 ? false : _g, signatureConfig = _c.signatureConfig, _h = _c.nameIDFormat, nameIDFormat = _h === void 0 ? [] : _h, _j = _c.singleLogoutService, singleLogoutService = _j === void 0 ? [] : _j, _k = _c.assertionConsumerService, assertionConsumerService = _k === void 0 ? [] : _k;
            var descriptors_1 = {
                KeyDescriptor: [],
                NameIDFormat: [],
                SingleLogoutService: [],
                AssertionConsumerService: [],
                AttributeConsumingService: [],
            };
            var SPSSODescriptor_1 = [{
                    _attr: {
                        AuthnRequestsSigned: String(authnRequestsSigned),
                        WantAssertionsSigned: String(wantAssertionsSigned),
                        protocolSupportEnumeration: urn_1.namespace.names.protocol,
                    },
                }];
            if (wantMessageSigned && signatureConfig === undefined) {
                console.warn('Construct service provider - missing signatureConfig');
            }
            try {
                for (var _l = __values((0, utility_1.castArrayOpt)(signingCert)), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var cert = _m.value;
                    descriptors_1.KeyDescriptor.push(libsaml_1.default.createKeySection('signing', cert).KeyDescriptor);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_a = _l.return)) _a.call(_l);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _o = __values((0, utility_1.castArrayOpt)(encryptCert)), _p = _o.next(); !_p.done; _p = _o.next()) {
                    var cert = _p.value;
                    descriptors_1.KeyDescriptor.push(libsaml_1.default.createKeySection('encryption', cert).KeyDescriptor);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_p && !_p.done && (_b = _o.return)) _b.call(_o);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if ((0, utility_1.isNonEmptyArray)(nameIDFormat)) {
                nameIDFormat.forEach(function (f) { return descriptors_1.NameIDFormat.push(f); });
            }
            else {
                // default value
                descriptors_1.NameIDFormat.push(urn_1.namespace.format.emailAddress);
            }
            if ((0, utility_1.isNonEmptyArray)(singleLogoutService)) {
                singleLogoutService.forEach(function (a) {
                    var attr = {
                        Binding: a.Binding,
                        Location: a.Location,
                    };
                    if (a.isDefault) {
                        attr.isDefault = true;
                    }
                    descriptors_1.SingleLogoutService.push([{ _attr: attr }]);
                });
            }
            if ((0, utility_1.isNonEmptyArray)(assertionConsumerService)) {
                var indexCount_1 = 0;
                assertionConsumerService.forEach(function (a) {
                    var attr = {
                        index: String(indexCount_1++),
                        Binding: a.Binding,
                        Location: a.Location,
                    };
                    if (a.isDefault) {
                        attr.isDefault = true;
                    }
                    descriptors_1.AssertionConsumerService.push([{ _attr: attr }]);
                });
            }
            else {
                // console.warn('Missing endpoint of AssertionConsumerService');
            }
            // handle element order
            var existedElements = elementsOrder.filter(function (name) { return (0, utility_1.isNonEmptyArray)(descriptors_1[name]); });
            existedElements.forEach(function (name) {
                descriptors_1[name].forEach(function (e) {
                    var _a;
                    return SPSSODescriptor_1.push((_a = {}, _a[name] = e, _a));
                });
            });
            // Re-assign the meta reference as a XML string|Buffer for use with the parent constructor
            meta = (0, xml_1.default)([{
                    EntityDescriptor: [{
                            _attr: {
                                entityID: entityID,
                                'xmlns': urn_1.namespace.names.metadata,
                                'xmlns:assertion': urn_1.namespace.names.assertion,
                                'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
                            },
                        }, { SPSSODescriptor: SPSSODescriptor_1 }],
                }]);
        }
        // Use the re-assigned meta object reference here
        return _super.call(this, meta, [
            {
                key: 'spSSODescriptor',
                localPath: ['EntityDescriptor', 'SPSSODescriptor'],
                attributes: ['WantAssertionsSigned', 'AuthnRequestsSigned'],
            },
            {
                key: 'assertionConsumerService',
                localPath: ['EntityDescriptor', 'SPSSODescriptor', 'AssertionConsumerService'],
                attributes: ['Binding', 'Location', 'isDefault', 'index'],
            }
        ]) || this;
    }
    /**
    * @desc Get the preference whether it wants a signed assertion response
    * @return {boolean} Wantassertionssigned
    */
    SpMetadata.prototype.isWantAssertionsSigned = function () {
        return this.meta.spSSODescriptor.wantAssertionsSigned === 'true';
    };
    /**
    * @desc Get the preference whether it signs request
    * @return {boolean} Authnrequestssigned
    */
    SpMetadata.prototype.isAuthnRequestSigned = function () {
        return this.meta.spSSODescriptor.authnRequestsSigned === 'true';
    };
    /**
    * @desc Get the entity endpoint for assertion consumer service
    * @param  {string} binding         protocol binding (e.g. redirect, post)
    * @return {string/[string]} URL of endpoint(s)
    */
    SpMetadata.prototype.getAssertionConsumerService = function (binding) {
        if ((0, utility_1.isString)(binding)) {
            var location_1;
            var bindName_1 = urn_1.namespace.binding[binding];
            if ((0, utility_1.isNonEmptyArray)(this.meta.assertionConsumerService)) {
                this.meta.assertionConsumerService.forEach(function (obj) {
                    if (obj.binding === bindName_1) {
                        location_1 = obj.location;
                        return;
                    }
                });
            }
            else {
                if (this.meta.assertionConsumerService.binding === bindName_1) {
                    location_1 = this.meta.assertionConsumerService.location;
                }
            }
            return location_1;
        }
        return this.meta.assertionConsumerService;
    };
    return SpMetadata;
}(metadata_1.default));
exports.SpMetadata = SpMetadata;
//# sourceMappingURL=metadata-sp.js.map