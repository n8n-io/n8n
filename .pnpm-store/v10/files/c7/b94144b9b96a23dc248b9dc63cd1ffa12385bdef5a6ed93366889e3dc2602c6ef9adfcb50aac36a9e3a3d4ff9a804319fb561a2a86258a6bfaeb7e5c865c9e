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
exports.parseSource = exports.parseFile = void 0;
var fs_1 = require("fs");
var path = __importStar(require("path"));
var util_1 = require("util");
var parse_script_1 = __importDefault(require("./parse-script"));
var parseSFC_1 = __importDefault(require("./parseSFC"));
var read = (0, util_1.promisify)(fs_1.readFile);
var ERROR_EMPTY_DOCUMENT = 'The passed source is empty';
/**
 * parses the source at filePath and returns the doc
 * @param opt ParseOptions containing the filePath and the rest of the options
 * @param documentation documentation to be enriched if needed
 * @returns {object} documentation object
 */
function parseFile(opt, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var source, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, read(opt.filePath, {
                            encoding: 'utf-8'
                        })];
                case 1:
                    source = _a.sent();
                    return [2 /*return*/, parseSource(source, opt, documentation)];
                case 2:
                    e_1 = _a.sent();
                    throw Error("Could not read file ".concat(opt.filePath));
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.parseFile = parseFile;
/**
 * parses the source and returns the doc
 * @param {string} source code whose documentation is parsed
 * @param {string} opt path of the current file against whom to resolve the mixins
 * @returns {object} documentation object
 */
function parseSource(source, opt, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var singleFileComponent, docs, displayName, dirName, dIndex, d, exportName, displayName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // if jsx option is not mentionned, parse jsx in components
                    opt.jsx = opt.jsx === undefined ? true : opt.jsx;
                    singleFileComponent = /\.vue$/i.test(path.extname(opt.filePath));
                    if (source === '') {
                        throw new Error(ERROR_EMPTY_DOCUMENT);
                    }
                    // if the parsed component is the result of a mixin or an extends
                    if (documentation) {
                        documentation.setOrigin(opt);
                    }
                    if (!singleFileComponent) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, parseSFC_1.default)(parseFile, documentation, source, opt)];
                case 1:
                    docs = _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    opt.lang = /\.tsx?$/i.test(path.extname(opt.filePath)) ? 'ts' : 'js';
                    return [4 /*yield*/, (0, parse_script_1.default)(parseFile, source, opt, documentation, documentation !== undefined)];
                case 3:
                    docs =
                        (_a.sent()) || [];
                    if (docs.length === 1) {
                        if (!docs[0].get('displayName')) {
                            displayName = path.basename(opt.filePath).replace(/\.\w+$/, '');
                            dirName = path.basename(path.dirname(opt.filePath));
                            docs[0].set('displayName', displayName.toLowerCase() === 'index' ? dirName : displayName);
                        }
                    }
                    else {
                        for (dIndex in docs) {
                            d = docs[dIndex];
                            exportName = d.get('exportName');
                            if (!d.get('displayName') && exportName && exportName !== 'default') {
                                displayName = exportName !== null && exportName !== void 0 ? exportName : "".concat(path.basename(opt.filePath).replace(/\.\w+$/, ''), "_").concat(dIndex + 1);
                                d.set('displayName', displayName);
                            }
                        }
                    }
                    _a.label = 4;
                case 4:
                    if (documentation) {
                        documentation.setOrigin({});
                    }
                    return [2 /*return*/, docs];
            }
        });
    });
}
exports.parseSource = parseSource;
