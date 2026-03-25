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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_sfc_1 = require("@vue/compiler-sfc");
var path = __importStar(require("path"));
var fs_1 = require("fs");
var util_1 = require("util");
var template_handlers_1 = __importDefault(require("./template-handlers"));
var cacher_1 = __importDefault(require("./utils/cacher"));
var parse_template_1 = __importDefault(require("./parse-template"));
var Documentation_1 = __importDefault(require("./Documentation"));
var parse_script_1 = __importDefault(require("./parse-script"));
var makePathResolver_1 = __importDefault(require("./utils/makePathResolver"));
var script_setup_handlers_1 = __importDefault(require("./script-setup-handlers"));
var read = (0, util_1.promisify)(fs_1.readFile);
function parseSFC(parseFile, initialDoc, source, opt) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var documentation, pathResolver, parts, extTemplSrc, extTemplSrcAbs, extTemplSource, _c, addTemplateHandlers, docsBlocks, docs, displayName, dirName;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    documentation = initialDoc;
                    pathResolver = (0, makePathResolver_1.default)(path.dirname(opt.filePath), opt.alias, opt.modules);
                    parts = (0, cacher_1.default)(function () { return (0, compiler_sfc_1.parse)(source, { pad: 'line' }); }, source).descriptor;
                    if (!parts.template) return [3 /*break*/, 5];
                    extTemplSrc = (_b = (_a = parts === null || parts === void 0 ? void 0 : parts.template) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.src;
                    if (!(extTemplSrc && typeof extTemplSrc === 'string')) return [3 /*break*/, 4];
                    extTemplSrcAbs = pathResolver(extTemplSrc);
                    if (!extTemplSrcAbs) return [3 /*break*/, 2];
                    return [4 /*yield*/, read(extTemplSrcAbs, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    _c = _d.sent();
                    return [3 /*break*/, 3];
                case 2:
                    // leave the template alone
                    _c = false;
                    _d.label = 3;
                case 3:
                    extTemplSource = _c;
                    if (extTemplSource) {
                        parts.template.content = extTemplSource;
                    }
                    _d.label = 4;
                case 4:
                    addTemplateHandlers = opt.addTemplateHandlers || [];
                    documentation = initialDoc || new Documentation_1.default(opt.filePath);
                    (0, parse_template_1.default)(parts.template, documentation, __spreadArray(__spreadArray([], __read(template_handlers_1.default), false), __read(addTemplateHandlers), false), opt);
                    _d.label = 5;
                case 5:
                    if (parts.customBlocks) {
                        documentation = documentation || new Documentation_1.default(opt.filePath);
                        docsBlocks = parts.customBlocks
                            .filter(function (block) { return block.type === 'docs' && block.content && block.content.length; })
                            .map(function (block) { return block.content.trim(); });
                        if (docsBlocks.length) {
                            documentation.setDocsBlocks(docsBlocks);
                        }
                    }
                    docs = documentation ? [documentation] : [];
                    if (!parts.scriptSetup) return [3 /*break*/, 7];
                    return [4 /*yield*/, parseScriptTag(parseFile, parts.scriptSetup, pathResolver, opt, documentation, initialDoc !== undefined, true, parts.script ? parts.script.content : '')];
                case 6:
                    docs = _d.sent();
                    return [3 /*break*/, 9];
                case 7:
                    if (!parts.script) return [3 /*break*/, 9];
                    return [4 /*yield*/, parseScriptTag(parseFile, parts.script, pathResolver, opt, documentation, initialDoc !== undefined)];
                case 8:
                    docs = _d.sent();
                    _d.label = 9;
                case 9:
                    if (documentation && !documentation.get('displayName')) {
                        displayName = path.basename(opt.filePath).replace(/\.\w+$/, '');
                        dirName = path.basename(path.dirname(opt.filePath));
                        documentation.set('displayName', displayName.toLowerCase() === 'index' ? dirName : displayName);
                    }
                    return [2 /*return*/, docs];
            }
        });
    });
}
exports.default = parseSFC;
function parseScriptTag(parseFile, scriptTag, pathResolver, opt, documentation, forceSingleExport, isSetupScript, isSetupScriptOtherScript) {
    if (isSetupScript === void 0) { isSetupScript = false; }
    if (isSetupScriptOtherScript === void 0) { isSetupScriptOtherScript = ''; }
    return __awaiter(this, void 0, void 0, function () {
        var scriptSource, extSrc, extSrcAbs, extSource, _a, docs, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    scriptSource = scriptTag ? scriptTag.content : undefined;
                    extSrc = scriptTag && scriptTag.attrs ? scriptTag.attrs.src : false;
                    if (!(extSrc && typeof extSrc === 'string')) return [3 /*break*/, 4];
                    extSrcAbs = pathResolver(extSrc);
                    if (!extSrcAbs) return [3 /*break*/, 2];
                    return [4 /*yield*/, read(extSrcAbs, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    _a = _c.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = '';
                    _c.label = 3;
                case 3:
                    extSource = _a;
                    if (extSource.length) {
                        scriptSource = extSource;
                        opt.lang =
                            (scriptTag && scriptTag.attrs && /^tsx?$/.test(scriptTag.attrs.lang)) ||
                                /\.tsx?$/i.test(extSrc)
                                ? 'ts'
                                : 'js';
                        if (extSrcAbs) {
                            documentation === null || documentation === void 0 ? void 0 : documentation.sourceFiles.add(extSrcAbs);
                        }
                    }
                    _c.label = 4;
                case 4:
                    opt.lang =
                        (scriptTag && scriptTag.attrs && /^tsx?$/.test(scriptTag.attrs.lang)) ||
                            (typeof extSrc === 'string' && /\.tsx?$/i.test(extSrc))
                            ? 'ts'
                            : 'js';
                    opt = isSetupScript ? __assign(__assign({}, opt), { scriptPreHandlers: [], scriptHandlers: script_setup_handlers_1.default }) : opt;
                    if (!scriptSource) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, parse_script_1.default)(parseFile, isSetupScriptOtherScript + '\n' + scriptSource, opt, documentation, forceSingleExport, isSetupScript)];
                case 5:
                    _b = (_c.sent()) || [];
                    return [3 /*break*/, 7];
                case 6:
                    _b = documentation
                        ? [documentation]
                        : [];
                    _c.label = 7;
                case 7:
                    docs = _b;
                    return [2 /*return*/, docs];
            }
        });
    });
}
