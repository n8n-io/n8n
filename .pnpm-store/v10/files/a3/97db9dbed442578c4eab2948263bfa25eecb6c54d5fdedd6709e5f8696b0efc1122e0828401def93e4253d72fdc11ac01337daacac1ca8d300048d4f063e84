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
var bt = __importStar(require("@babel/types"));
var path = __importStar(require("path"));
var ast_types_1 = require("ast-types");
var makePathResolver_1 = __importDefault(require("../../utils/makePathResolver"));
var resolveRequired_1 = __importDefault(require("../../utils/resolveRequired"));
var recursiveResolveIEV_1 = __importDefault(require("../../utils/recursiveResolveIEV"));
var getPathFromExportedValue_1 = __importDefault(require("../../utils/getPathFromExportedValue"));
/**
 * Determines if node contains the value -1
 * @param node
 */
function isMinusOne(node) {
    return (bt.isUnaryExpression(node) &&
        node.operator === '-' &&
        bt.isNumericLiteral(node.argument) &&
        node.argument.value === 1);
}
function parseValidatorForValues(validatorNode, ast, options) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Resolves a variable value from its identifier (name)
         * @param identifierName
         */
        function resolveValueFromIdentifier(identifierName) {
            return __awaiter(this, void 0, void 0, function () {
                var varPath, varToFilePath, originalDirName, pathResolver, _a, exportName, filePath, p;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            (0, ast_types_1.visit)(ast, {
                                visitVariableDeclaration: function (p) {
                                    p.node.declarations.forEach(function (decl, i) {
                                        if (bt.isVariableDeclarator(decl) &&
                                            bt.isIdentifier(decl.id) &&
                                            decl.id.name === identifierName) {
                                            varPath = p.get('declarations', i, 'init');
                                        }
                                    });
                                    return false;
                                }
                            });
                            if (varPath && bt.isArrayExpression(varPath.node)) {
                                return [2 /*return*/, varPath.node.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })];
                            }
                            varToFilePath = (0, resolveRequired_1.default)(ast, [identifierName]);
                            originalDirName = path.dirname(options.filePath);
                            pathResolver = (0, makePathResolver_1.default)(originalDirName, options.alias, options.modules);
                            // resolve where sources are through immediately exported variables
                            return [4 /*yield*/, (0, recursiveResolveIEV_1.default)(pathResolver, varToFilePath, options.validExtends)];
                        case 1:
                            // resolve where sources are through immediately exported variables
                            _b.sent();
                            if (!varToFilePath[identifierName]) return [3 /*break*/, 3];
                            _a = varToFilePath[identifierName], exportName = _a.exportName, filePath = _a.filePath;
                            return [4 /*yield*/, (0, getPathFromExportedValue_1.default)(pathResolver, exportName, filePath, options)];
                        case 2:
                            p = _b.sent();
                            if (p && bt.isArrayExpression(p.node)) {
                                return [2 /*return*/, p.node.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })];
                            }
                            _b.label = 3;
                        case 3: return [2 /*return*/, undefined];
                    }
                });
            });
        }
        function extractStringArray(valuesObjectNode) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!bt.isIdentifier(valuesObjectNode)) return [3 /*break*/, 2];
                            return [4 /*yield*/, resolveValueFromIdentifier(valuesObjectNode.name)];
                        case 1:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = bt.isArrayExpression(valuesObjectNode)
                                ? valuesObjectNode.elements.map(function (e) { return e.value; }).filter(function (e) { return e; })
                                : undefined;
                            _b.label = 3;
                        case 3: return [2 /*return*/, _a];
                    }
                });
            });
        }
        var returnedExpression, varName, valuesNode, values, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    returnedExpression = (bt.isMethod(validatorNode) || bt.isFunctionExpression(validatorNode)) &&
                        validatorNode.body.body.length === 1 &&
                        bt.isReturnStatement(validatorNode.body.body[0])
                        ? validatorNode.body.body[0].argument
                        : bt.isArrowFunctionExpression(validatorNode)
                            ? validatorNode.body
                            : undefined;
                    varName = validatorNode.params && bt.isIdentifier(validatorNode.params[0])
                        ? validatorNode.params[0].name
                        : undefined;
                    if (!bt.isBinaryExpression(returnedExpression)) return [3 /*break*/, 4];
                    valuesNode = void 0;
                    switch (returnedExpression.operator) {
                        case '>':
                            if (isMinusOne(returnedExpression.right)) {
                                valuesNode = returnedExpression.left;
                            }
                            break;
                        case '<':
                            if (bt.isExpression(returnedExpression.left) && isMinusOne(returnedExpression.left)) {
                                valuesNode = returnedExpression.right;
                            }
                            break;
                        case '!==':
                        case '!=':
                            if (bt.isExpression(returnedExpression.left) && isMinusOne(returnedExpression.left)) {
                                valuesNode = returnedExpression.right;
                            }
                            else if (isMinusOne(returnedExpression.right)) {
                                valuesNode = returnedExpression.left;
                            }
                            break;
                        default:
                            return [2 /*return*/, undefined];
                    }
                    if (!(bt.isCallExpression(valuesNode) &&
                        bt.isIdentifier(valuesNode.arguments[0]) &&
                        varName === valuesNode.arguments[0].name &&
                        bt.isMemberExpression(valuesNode.callee) &&
                        bt.isIdentifier(valuesNode.callee.property) &&
                        valuesNode.callee.property.name === 'indexOf')) return [3 /*break*/, 2];
                    return [4 /*yield*/, extractStringArray(valuesNode.callee.object)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = undefined;
                    _b.label = 3;
                case 3:
                    values = _a;
                    return [2 /*return*/, values];
                case 4:
                    if (bt.isCallExpression(returnedExpression)) {
                        if (bt.isMemberExpression(returnedExpression.callee) &&
                            bt.isIdentifier(returnedExpression.callee.property) &&
                            returnedExpression.callee.property.name === 'includes') {
                            return [2 /*return*/, extractStringArray(returnedExpression.callee.object)];
                        }
                    }
                    _b.label = 5;
                case 5: return [2 /*return*/, undefined];
            }
        });
    });
}
exports.default = parseValidatorForValues;
