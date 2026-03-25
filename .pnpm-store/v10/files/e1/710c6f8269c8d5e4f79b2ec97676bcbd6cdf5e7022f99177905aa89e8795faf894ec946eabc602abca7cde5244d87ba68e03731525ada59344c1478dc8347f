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
var ts_map_1 = __importDefault(require("ts-map"));
var path = __importStar(require("path"));
var recursiveResolveIEV_1 = __importDefault(require("../utils/recursiveResolveIEV"));
var makePathResolver_1 = __importDefault(require("./makePathResolver"));
/**
 * Document all components in varToFilePath in documentation
 * Instead of giving it only one component file, here we give it a whole set of variable -> file
 *
 * @param documentation if omitted (undefined), it will return all docs in an array
 * @param varToFilePath variable of object to document
 * @param originObject to build the origin flag
 * @param opt parsing options
 */
function documentRequiredComponents(parseFile, documentation, varToFilePath, originObject, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var originalDirName, pathResolver, files, _loop_1, _a, _b, varName, docsArray;
        var e_1, _c;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    originalDirName = path.dirname(opt.filePath);
                    pathResolver = (0, makePathResolver_1.default)(originalDirName, opt.alias, opt.modules);
                    // resolve where components are through immediately exported variables
                    return [4 /*yield*/, (0, recursiveResolveIEV_1.default)(pathResolver, varToFilePath, opt.validExtends)
                        // if we are in a mixin or an extend we want to add
                        // all props on the current doc, instead of creating another one
                    ];
                case 1:
                    // resolve where components are through immediately exported variables
                    _d.sent();
                    if (!(originObject && documentation)) return [3 /*break*/, 3];
                    return [4 /*yield*/, enrichDocumentation(parseFile, documentation, varToFilePath, originObject, opt, pathResolver)];
                case 2: return [2 /*return*/, [
                        _d.sent()
                    ]];
                case 3:
                    files = new ts_map_1.default();
                    _loop_1 = function (varName) {
                        var _e = varToFilePath[varName], filePath = _e.filePath, exportName = _e.exportName;
                        filePath.forEach(function (p) {
                            var fullFilePath = pathResolver(p);
                            if (fullFilePath && opt.validExtends(fullFilePath)) {
                                var vars = files.get(fullFilePath) || [];
                                vars.push({ exportName: exportName, varName: varName });
                                files.set(fullFilePath, vars);
                            }
                        });
                    };
                    try {
                        for (_a = __values(Object.keys(varToFilePath)), _b = _a.next(); !_b.done; _b = _a.next()) {
                            varName = _b.value;
                            _loop_1(varName);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [4 /*yield*/, Promise.all(files.keys().map(function (fullFilePath) { return __awaiter(_this, void 0, void 0, function () {
                            var vars, temporaryDocs;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        vars = files.get(fullFilePath) || [];
                                        return [4 /*yield*/, parseFile(__assign(__assign({}, opt), { filePath: fullFilePath, nameFilter: vars.map(function (v) { return v.exportName; }) }), documentation)
                                            // then assign each doc in one to the correct exported varname in the root file
                                        ];
                                    case 1:
                                        temporaryDocs = _a.sent();
                                        // then assign each doc in one to the correct exported varname in the root file
                                        temporaryDocs.forEach(function (d) {
                                            return d.set('exportName', (vars.find(function (v) { return v.exportName === d.get('exportName'); }) || {}).varName);
                                        });
                                        return [2 /*return*/, temporaryDocs];
                                }
                            });
                        }); }))
                        // flatten array of docs
                    ];
                case 4:
                    docsArray = _d.sent();
                    // flatten array of docs
                    return [2 /*return*/, docsArray.reduce(function (a, i) { return a.concat(i); }, [])];
            }
        });
    });
}
exports.default = documentRequiredComponents;
function enrichDocumentation(parseFile, documentation, varToFilePath, originObject, opt, pathResolver) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Object.keys(varToFilePath).reduce(function (_, varName) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, filePath, exportName;
                        var _this = this;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, _];
                                case 1:
                                    _b.sent();
                                    _a = varToFilePath[varName], filePath = _a.filePath, exportName = _a.exportName;
                                    // If there is more than one filepath for a variable, only one
                                    // will be valid. if not the parser of the browser will shout.
                                    // We therefore do not care in which order the filepath go as
                                    // long as we follow the variables order
                                    return [4 /*yield*/, Promise.all(filePath.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                                            var fullFilePath, originVar, e_2;
                                            var _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        fullFilePath = pathResolver(p);
                                                        if (!(fullFilePath && opt.validExtends(fullFilePath))) return [3 /*break*/, 4];
                                                        _b.label = 1;
                                                    case 1:
                                                        _b.trys.push([1, 3, , 4]);
                                                        originVar = (_a = {},
                                                            _a[originObject] = {
                                                                name: '-',
                                                                path: path.relative(path.dirname(documentation.componentFullfilePath), fullFilePath)
                                                            },
                                                            _a);
                                                        return [4 /*yield*/, parseFile(__assign(__assign(__assign({}, opt), { filePath: fullFilePath, nameFilter: [exportName] }), originVar), documentation)];
                                                    case 2:
                                                        _b.sent();
                                                        documentation.sourceFiles.add(fullFilePath);
                                                        if (documentation && originVar[originObject]) {
                                                            originVar[originObject].name =
                                                                documentation.get('displayName') || documentation.get('exportName');
                                                            documentation.set('displayName', null);
                                                        }
                                                        return [3 /*break*/, 4];
                                                    case 3:
                                                        e_2 = _b.sent();
                                                        return [3 /*break*/, 4];
                                                    case 4: return [2 /*return*/];
                                                }
                                            });
                                        }); }))];
                                case 2:
                                    // If there is more than one filepath for a variable, only one
                                    // will be valid. if not the parser of the browser will shout.
                                    // We therefore do not care in which order the filepath go as
                                    // long as we follow the variables order
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, Promise.resolve())];
                case 1:
                    _a.sent();
                    return [2 /*return*/, documentation];
            }
        });
    });
}
