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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
exports.parseSource = exports.parseMulti = exports.parse = exports.getDefaultExample = exports.cleanName = exports.Documentation = exports.getDocblock = exports.getProperties = exports.getDoclets = exports.TemplateHandlers = exports.ScriptHandlers = void 0;
var Documentation_1 = __importDefault(require("./Documentation"));
exports.Documentation = Documentation_1.default;
var parse_1 = require("./parse");
var ScriptHandlers = __importStar(require("./script-handlers"));
exports.ScriptHandlers = ScriptHandlers;
var TemplateHandlers = __importStar(require("./template-handlers"));
exports.TemplateHandlers = TemplateHandlers;
var getDoclets_1 = __importDefault(require("./utils/getDoclets"));
exports.getDoclets = getDoclets_1.default;
var getProperties_1 = __importDefault(require("./script-handlers/utils/getProperties"));
exports.getProperties = getProperties_1.default;
var getDocblock_1 = __importDefault(require("./utils/getDocblock"));
exports.getDocblock = getDocblock_1.default;
var vue_inbrowser_compiler_independent_utils_1 = require("vue-inbrowser-compiler-independent-utils");
Object.defineProperty(exports, "cleanName", { enumerable: true, get: function () { return vue_inbrowser_compiler_independent_utils_1.cleanName; } });
Object.defineProperty(exports, "getDefaultExample", { enumerable: true, get: function () { return vue_inbrowser_compiler_independent_utils_1.getDefaultExample; } });
/**
 * Parse the component at filePath and return props, public methods, events and slots
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parse(filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, parse_1.parseFile)(options)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); }, filePath, opts)];
                case 1: return [2 /*return*/, (_a.sent())[0]];
            }
        });
    });
}
exports.parse = parse;
/**
 * Parse all the components at filePath and returns an array of their
 * props, public methods, events and slot
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parseMulti(filePath, opts) {
    var _this = this;
    return parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, parse_1.parseFile)(options)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    }); }); }, filePath, opts);
}
exports.parseMulti = parseMulti;
/**
 * Parse the `source` assuming that it is located at `filePath` and return props, public methods, events and slots
 * @param source source code to be parsed
 * @param filePath absolute path of the parsed file
 * @param opts
 */
function parseSource(source, filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, parsePrimitive(function (options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, parse_1.parseSource)(source, options)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); }, filePath, opts)];
                case 1: return [2 /*return*/, (_a.sent())[0]];
            }
        });
    });
}
exports.parseSource = parseSource;
function isOptionsObject(opts) {
    return (!!opts &&
        (!!opts.alias ||
            opts.jsx !== undefined ||
            !!opts.addScriptHandlers ||
            !!opts.addTemplateHandlers ||
            !!opts.validExtends ||
            !!opts.nameFilter));
}
function parsePrimitive(createDocs, filePath, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var options, docs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    options = isOptionsObject(opts)
                        ? __assign(__assign({ validExtends: function (fullFilePath) { return !/[\\/]node_modules[\\/]/.test(fullFilePath); } }, opts), { filePath: filePath }) : {
                        filePath: filePath,
                        alias: opts,
                        validExtends: function (fullFilePath) { return !/[\\/]node_modules[\\/]/.test(fullFilePath); }
                    };
                    return [4 /*yield*/, createDocs(options)];
                case 1:
                    docs = _a.sent();
                    return [2 /*return*/, docs.map(function (d) { return d.toObject(); })];
            }
        });
    });
}
