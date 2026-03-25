"use strict";
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
exports.setDOMParserOptions = exports.setSchemaValidator = exports.ServiceProviderInstance = exports.ServiceProvider = exports.IdentityProviderInstance = exports.IdentityProvider = exports.Extractor = exports.Constants = exports.SamlLib = exports.Utility = exports.SPMetadata = exports.IdPMetadata = void 0;
// version <= 1.25
var entity_idp_1 = __importStar(require("./src/entity-idp"));
exports.IdentityProvider = entity_idp_1.default;
Object.defineProperty(exports, "IdentityProviderInstance", { enumerable: true, get: function () { return entity_idp_1.IdentityProvider; } });
var entity_sp_1 = __importStar(require("./src/entity-sp"));
exports.ServiceProvider = entity_sp_1.default;
Object.defineProperty(exports, "ServiceProviderInstance", { enumerable: true, get: function () { return entity_sp_1.ServiceProvider; } });
var metadata_idp_1 = require("./src/metadata-idp");
Object.defineProperty(exports, "IdPMetadata", { enumerable: true, get: function () { return __importDefault(metadata_idp_1).default; } });
var metadata_sp_1 = require("./src/metadata-sp");
Object.defineProperty(exports, "SPMetadata", { enumerable: true, get: function () { return __importDefault(metadata_sp_1).default; } });
var utility_1 = require("./src/utility");
Object.defineProperty(exports, "Utility", { enumerable: true, get: function () { return __importDefault(utility_1).default; } });
var libsaml_1 = require("./src/libsaml");
Object.defineProperty(exports, "SamlLib", { enumerable: true, get: function () { return __importDefault(libsaml_1).default; } });
// roadmap
// new name convention in version >= 3.0
var Constants = __importStar(require("./src/urn"));
exports.Constants = Constants;
var Extractor = __importStar(require("./src/extractor"));
exports.Extractor = Extractor;
// exposed methods for customizing samlify
var api_1 = require("./src/api");
Object.defineProperty(exports, "setSchemaValidator", { enumerable: true, get: function () { return api_1.setSchemaValidator; } });
Object.defineProperty(exports, "setDOMParserOptions", { enumerable: true, get: function () { return api_1.setDOMParserOptions; } });
//# sourceMappingURL=index.js.map