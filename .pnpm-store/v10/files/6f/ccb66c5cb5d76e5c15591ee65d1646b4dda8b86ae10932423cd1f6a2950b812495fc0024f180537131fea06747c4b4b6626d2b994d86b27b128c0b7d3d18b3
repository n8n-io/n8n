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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIEV = void 0;
var fs_1 = require("fs");
var path = __importStar(require("path"));
var recast_1 = require("recast");
var ts_map_1 = __importDefault(require("ts-map"));
var hash_sum_1 = __importDefault(require("hash-sum"));
var babel_parser_1 = __importDefault(require("../babel-parser"));
var cacher_1 = __importDefault(require("./cacher"));
var resolveImmediatelyExported_1 = __importDefault(require("./resolveImmediatelyExported"));
/**
 * Recursively resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
function recursiveResolveIEV(pathResolver, varToFilePath, validExtends) {
    return __awaiter(this, void 0, void 0, function () {
        var hashes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hashes = new Set();
                    _a.label = 1;
                case 1: 
                // in this case I need to resolve IEV in sequence in case they are defined multiple times
                // eslint-disable-next-line no-await-in-loop
                return [4 /*yield*/, resolveIEV(pathResolver, varToFilePath, validExtends)
                    // we iterate until there is no change in the set of variables or there is a loop
                ];
                case 2:
                    // in this case I need to resolve IEV in sequence in case they are defined multiple times
                    // eslint-disable-next-line no-await-in-loop
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (!hashes.has((0, hash_sum_1.default)(varToFilePath)) && hashes.add((0, hash_sum_1.default)(varToFilePath))) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.default = recursiveResolveIEV;
/**
 * Resolves specified variables to their actual files
 * Useful when using intermediary files like this
 *
 * ```js
 * export mixin from "path/to/mixin"
 * export * from "path/to/another/mixin"
 * ```
 *
 * @param pathResolver function to resolve relative to absolute path
 * @param varToFilePath set of variables to be resolved (will be mutated into the final mapping)
 */
function resolveIEV(pathResolver, varToFilePath, validExtends) {
    return __awaiter(this, void 0, void 0, function () {
        var filePathToVars;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePathToVars = new ts_map_1.default();
                    Object.keys(varToFilePath).forEach(function (k) {
                        // the only way a variable can be exported by multiple files
                        // is if one of those files is exported as follows
                        // export * from 'path/to/file'
                        var exportedVariable = varToFilePath[k];
                        exportedVariable.filePath.forEach(function (filePath, i) {
                            var exportToLocalMap = filePathToVars.get(filePath) || new ts_map_1.default();
                            exportToLocalMap.set(k, exportedVariable.exportName);
                            filePathToVars.set(filePath, exportToLocalMap);
                        });
                    });
                    // then roll though this map and replace varToFilePath elements with their final destinations
                    // {
                    //	nameOfVariable: { filePath:['filesWhereToFindIt'], exportedName:'nameUsedInExportThatCanBeUsedForFiltering' }
                    // }
                    return [4 /*yield*/, Promise.all(filePathToVars.entries().map(function (_a) {
                            var _b = __read(_a, 2), filePath = _b[0], exportToLocal = _b[1];
                            return __awaiter(_this, void 0, void 0, function () {
                                var exportedVariableNames_1, fullFilePath_1, source_1, astRemote, returnedVariables_1, e_1;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            if (!(filePath && exportToLocal)) return [3 /*break*/, 4];
                                            exportedVariableNames_1 = [];
                                            exportToLocal.forEach(function (exportedName) {
                                                if (exportedName) {
                                                    exportedVariableNames_1.push(exportedName);
                                                }
                                            });
                                            _c.label = 1;
                                        case 1:
                                            _c.trys.push([1, 3, , 4]);
                                            fullFilePath_1 = pathResolver(filePath);
                                            if (!fullFilePath_1 || !validExtends(fullFilePath_1)) {
                                                // if the file is not in scope of the analysis, skip it
                                                // if no variable export corresponds to this local name, we delete it at the very end
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, fs_1.promises.readFile(fullFilePath_1, {
                                                    encoding: 'utf-8'
                                                })];
                                        case 2:
                                            source_1 = _c.sent();
                                            astRemote = (0, cacher_1.default)(function () { return (0, recast_1.parse)(source_1, { parser: (0, babel_parser_1.default)() }); }, source_1);
                                            returnedVariables_1 = (0, resolveImmediatelyExported_1.default)(astRemote, exportedVariableNames_1).variables;
                                            if (Object.keys(returnedVariables_1).length) {
                                                exportToLocal.forEach(function (exported, local) {
                                                    var aliasedVariable = returnedVariables_1[exported];
                                                    if (aliasedVariable) {
                                                        aliasedVariable.filePath = aliasedVariable.filePath
                                                            .map(function (p) { return pathResolver(p, path.dirname(fullFilePath_1)); })
                                                            .filter(function (a) { return a; });
                                                        varToFilePath[local] = aliasedVariable;
                                                    }
                                                });
                                            }
                                            return [3 /*break*/, 4];
                                        case 3:
                                            e_1 = _c.sent();
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            });
                        }))];
                case 1:
                    // then roll though this map and replace varToFilePath elements with their final destinations
                    // {
                    //	nameOfVariable: { filePath:['filesWhereToFindIt'], exportedName:'nameUsedInExportThatCanBeUsedForFiltering' }
                    // }
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.resolveIEV = resolveIEV;
