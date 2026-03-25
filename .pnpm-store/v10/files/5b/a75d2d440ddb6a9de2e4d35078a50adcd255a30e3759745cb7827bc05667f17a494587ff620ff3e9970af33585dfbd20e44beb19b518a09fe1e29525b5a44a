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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerce = exports.iso = exports.ZodISODuration = exports.ZodISOTime = exports.ZodISODate = exports.ZodISODateTime = exports.locales = exports.TimePrecision = exports.toJSONSchema = exports.flattenError = exports.formatError = exports.prettifyError = exports.treeifyError = exports.regexes = exports.clone = exports.$brand = exports.$input = exports.$output = exports.function = exports.config = exports.registry = exports.globalRegistry = exports.core = void 0;
exports.core = __importStar(require("zod/v4/core"));
__exportStar(require("./schemas.js"), exports);
__exportStar(require("./checks.js"), exports);
__exportStar(require("./errors.js"), exports);
__exportStar(require("./parse.js"), exports);
__exportStar(require("./compat.js"), exports);
// zod-specified
const core_1 = require("zod/v4/core");
const en_js_1 = __importDefault(require("zod/v4/locales/en.js"));
(0, core_1.config)((0, en_js_1.default)());
var core_2 = require("zod/v4/core");
Object.defineProperty(exports, "globalRegistry", { enumerable: true, get: function () { return core_2.globalRegistry; } });
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return core_2.registry; } });
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return core_2.config; } });
Object.defineProperty(exports, "function", { enumerable: true, get: function () { return core_2.function; } });
Object.defineProperty(exports, "$output", { enumerable: true, get: function () { return core_2.$output; } });
Object.defineProperty(exports, "$input", { enumerable: true, get: function () { return core_2.$input; } });
Object.defineProperty(exports, "$brand", { enumerable: true, get: function () { return core_2.$brand; } });
Object.defineProperty(exports, "clone", { enumerable: true, get: function () { return core_2.clone; } });
Object.defineProperty(exports, "regexes", { enumerable: true, get: function () { return core_2.regexes; } });
Object.defineProperty(exports, "treeifyError", { enumerable: true, get: function () { return core_2.treeifyError; } });
Object.defineProperty(exports, "prettifyError", { enumerable: true, get: function () { return core_2.prettifyError; } });
Object.defineProperty(exports, "formatError", { enumerable: true, get: function () { return core_2.formatError; } });
Object.defineProperty(exports, "flattenError", { enumerable: true, get: function () { return core_2.flattenError; } });
Object.defineProperty(exports, "toJSONSchema", { enumerable: true, get: function () { return core_2.toJSONSchema; } });
Object.defineProperty(exports, "TimePrecision", { enumerable: true, get: function () { return core_2.TimePrecision; } });
exports.locales = __importStar(require("../locales/index.js"));
// iso
// must be exported from top-level
// https://github.com/colinhacks/zod/issues/4491
var iso_js_1 = require("./iso.js");
Object.defineProperty(exports, "ZodISODateTime", { enumerable: true, get: function () { return iso_js_1.ZodISODateTime; } });
Object.defineProperty(exports, "ZodISODate", { enumerable: true, get: function () { return iso_js_1.ZodISODate; } });
Object.defineProperty(exports, "ZodISOTime", { enumerable: true, get: function () { return iso_js_1.ZodISOTime; } });
Object.defineProperty(exports, "ZodISODuration", { enumerable: true, get: function () { return iso_js_1.ZodISODuration; } });
exports.iso = __importStar(require("./iso.js"));
exports.coerce = __importStar(require("./coerce.js"));
