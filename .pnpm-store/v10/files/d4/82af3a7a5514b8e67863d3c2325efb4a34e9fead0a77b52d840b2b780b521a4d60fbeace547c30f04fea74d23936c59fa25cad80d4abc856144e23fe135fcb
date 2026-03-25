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
exports.addDefaultAndExecuteHandlers = void 0;
var Documentation_1 = __importDefault(require("../Documentation"));
var script_handlers_1 = __importStar(require("../script-handlers"));
var addDefaultAndExecuteHandlers = function (componentDefinitions, ast, options, deps, documentation, forceSingleExport) {
    if (forceSingleExport === void 0) { forceSingleExport = false; }
    var handlers = __spreadArray(__spreadArray([], __read((options.scriptHandlers || script_handlers_1.default)), false), __read((options.addScriptHandlers || [])), false);
    return executeHandlers(options.scriptPreHandlers || script_handlers_1.preHandlers, handlers, componentDefinitions, ast, options, forceSingleExport, deps, documentation);
};
exports.addDefaultAndExecuteHandlers = addDefaultAndExecuteHandlers;
function executeHandlers(preHandlers, localHandlers, componentDefinitions, ast, opt, forceSingleExport, deps, documentation) {
    return __awaiter(this, void 0, void 0, function () {
        var compDefs, docs;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    compDefs = componentDefinitions
                        .keys()
                        .filter(function (name) { return name && (!opt.nameFilter || opt.nameFilter.indexOf(name) > -1); });
                    if (forceSingleExport && compDefs.length > 1) {
                        throw Error('vue-docgen-api: multiple exports in a component file are not handled by docgen.parse, Please use "docgen.parseMulti" instead');
                    }
                    return [4 /*yield*/, Promise.all(compDefs.map(function (name) { return __awaiter(_this, void 0, void 0, function () {
                            var doc, compDef;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        doc = (compDefs.length > 1 && name !== 'default' ? undefined : documentation) ||
                                            new Documentation_1.default(opt.filePath);
                                        compDef = componentDefinitions.get(name);
                                        // execute all prehandlers in order
                                        return [4 /*yield*/, preHandlers.reduce(function (_, handler) { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, _];
                                                        case 1:
                                                            _a.sent();
                                                            if (!(typeof handler === 'function')) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, handler(doc, compDef, ast, opt, { parseFile: deps.parseFile, addDefaultAndExecuteHandlers: exports.addDefaultAndExecuteHandlers })];
                                                        case 2: return [2 /*return*/, _a.sent()];
                                                        case 3: return [2 /*return*/];
                                                    }
                                                });
                                            }); }, Promise.resolve())];
                                    case 1:
                                        // execute all prehandlers in order
                                        _a.sent();
                                        return [4 /*yield*/, Promise.all(localHandlers.map(function (handler) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, handler(doc, compDef, ast, opt, { parseFile: deps.parseFile, addDefaultAndExecuteHandlers: exports.addDefaultAndExecuteHandlers })];
                                                    case 1: return [2 /*return*/, _a.sent()];
                                                }
                                            }); }); }))
                                            // end with setting of exportname
                                            // to avoid dependencies names bleeding on the main components,
                                            // do this step at the end of the function
                                        ];
                                    case 2:
                                        _a.sent();
                                        // end with setting of exportname
                                        // to avoid dependencies names bleeding on the main components,
                                        // do this step at the end of the function
                                        doc.set('exportName', name);
                                        return [2 /*return*/, doc];
                                }
                            });
                        }); }))
                        // default component first so in multiple exports in parse it is returned
                    ];
                case 1:
                    docs = _a.sent();
                    // default component first so in multiple exports in parse it is returned
                    return [2 /*return*/, docs.sort(function (a, b) {
                            return a.get('exportName') === 'default' ? -1 : b.get('exportName') === 'default' ? 1 : 0;
                        })];
            }
        });
    });
}
