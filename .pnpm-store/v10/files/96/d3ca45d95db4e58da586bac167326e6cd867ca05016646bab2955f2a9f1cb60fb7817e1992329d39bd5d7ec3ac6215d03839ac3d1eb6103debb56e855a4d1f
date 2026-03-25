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
var bt = __importStar(require("@babel/types"));
var resolveRequired_1 = __importDefault(require("../utils/resolveRequired"));
var documentRequiredComponents_1 = __importDefault(require("../utils/documentRequiredComponents"));
var getProperties_1 = __importDefault(require("./utils/getProperties"));
var resolveLocal_1 = __importDefault(require("../utils/resolveLocal"));
/**
 * Look in the mixin section of a component.
 * Parse the file mixins point to.
 * Add the necessary info to the current doc object.
 * Must be run first as mixins do not override components.
 */
var mixinHandler = function (documentation, componentDefinition, astPath, opt, deps) { return __awaiter(void 0, void 0, void 0, function () {
    var mixinVariableNames, variablesResolvedToCurrentFile, mixinVarToFilePath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                mixinVariableNames = getMixinsVariableNames(componentDefinition);
                if (!mixinVariableNames || !mixinVariableNames.length) {
                    return [2 /*return*/];
                }
                variablesResolvedToCurrentFile = (0, resolveLocal_1.default)(astPath, mixinVariableNames);
                mixinVarToFilePath = (0, resolveRequired_1.default)(astPath, mixinVariableNames);
                return [4 /*yield*/, mixinVariableNames.reduce(function (_, varName) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, _];
                                case 1:
                                    _a.sent();
                                    if (!variablesResolvedToCurrentFile.get(varName)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, deps.addDefaultAndExecuteHandlers(variablesResolvedToCurrentFile, astPath, __assign(__assign({}, opt), { nameFilter: [varName] }), deps, documentation)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 5];
                                case 3: 
                                // get each doc for each mixin using parse
                                return [4 /*yield*/, (0, documentRequiredComponents_1.default)(deps.parseFile, documentation, mixinVarToFilePath, 'mixin', __assign(__assign({}, opt), { nameFilter: [varName] }))];
                                case 4:
                                    // get each doc for each mixin using parse
                                    _a.sent();
                                    _a.label = 5;
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); }, Promise.resolve())];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.default = mixinHandler;
function getMixinsVariableNames(compDef) {
    var varNames = [];
    if (bt.isObjectExpression(compDef.node)) {
        var mixinProp = (0, getProperties_1.default)(compDef, 'mixins');
        var mixinPath = mixinProp.length ? mixinProp[0] : undefined;
        if (mixinPath) {
            var mixinPropertyValue = mixinPath.node.value && bt.isArrayExpression(mixinPath.node.value)
                ? mixinPath.node.value.elements
                : [];
            mixinPropertyValue.forEach(function (e) {
                if (!e) {
                    return;
                }
                if (bt.isCallExpression(e)) {
                    e = e.callee;
                }
                if (bt.isIdentifier(e)) {
                    varNames.push(e.name);
                }
            });
        }
    }
    else if (bt.isClassDeclaration(compDef.node) &&
        compDef.node.superClass &&
        bt.isCallExpression(compDef.node.superClass) &&
        bt.isIdentifier(compDef.node.superClass.callee) &&
        compDef.node.superClass.callee.name.toLowerCase() === 'mixins') {
        return compDef.node.superClass.arguments.reduce(function (acc, a) {
            if (bt.isIdentifier(a)) {
                acc.push(a.name);
            }
            return acc;
        }, []);
    }
    return varNames;
}
