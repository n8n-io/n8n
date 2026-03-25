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
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var getTypeFromAnnotation_1 = __importDefault(require("../utils/getTypeFromAnnotation"));
var transformTagsIntoObject_1 = __importDefault(require("../utils/transformTagsIntoObject"));
var propHandler_1 = __importStar(require("./propHandler"));
var getArgFromDecorator_1 = __importDefault(require("../utils/getArgFromDecorator"));
/**
 * Extracts prop information from a class-style VueJs component
 * @param documentation
 * @param path
 */
function classPropHandler(documentation, path, ast, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var config;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt.isClassDeclaration(path.node)) return [3 /*break*/, 3];
                    config = (0, getArgFromDecorator_1.default)(path.get('decorators'));
                    if (!(config && bt.isObjectExpression(config.node))) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, propHandler_1.default)(documentation, config, ast, opt)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    path
                        .get('body')
                        .get('body')
                        .filter(function (p) { return bt.isClassProperty(p.node) && !!p.node.decorators; })
                        .forEach(function (propPath) {
                        var propDeco = (propPath.get('decorators') || []).filter(function (p) {
                            var exp = bt.isCallExpression(p.node.expression)
                                ? p.node.expression.callee
                                : p.node.expression;
                            return bt.isIdentifier(exp) && exp.name === 'Prop';
                        });
                        if (!propDeco.length) {
                            return undefined;
                        }
                        var propName = bt.isIdentifier(propPath.node.key) ? propPath.node.key.name : undefined;
                        if (!propName) {
                            return undefined;
                        }
                        var propDescriptor = documentation.getPropDescriptor(propName);
                        // description
                        var docBlock = (0, getDocblock_1.default)(propPath);
                        var jsDoc = docBlock ? (0, getDoclets_1.default)(docBlock) : { description: '', tags: [] };
                        var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                        if (jsDocTags) {
                            propDescriptor.tags = (0, transformTagsIntoObject_1.default)(jsDocTags);
                        }
                        if (jsDoc.description) {
                            propDescriptor.description = jsDoc.description;
                        }
                        (0, propHandler_1.extractValuesFromTags)(propDescriptor);
                        var litteralType;
                        if (propPath.node.typeAnnotation) {
                            var values = !!bt.isTSTypeAnnotation(propPath.node.typeAnnotation) &&
                                (0, propHandler_1.getValuesFromTypeAnnotation)(propPath.node.typeAnnotation.typeAnnotation);
                            if (values) {
                                propDescriptor.values = values;
                                propDescriptor.type = { name: 'string' };
                                litteralType = 'string';
                            }
                            else {
                                // type
                                propDescriptor.type = (0, getTypeFromAnnotation_1.default)(propPath.node.typeAnnotation);
                            }
                        }
                        else if (propPath.node.value) {
                            propDescriptor.type = getTypeFromInitValue(propPath.node.value);
                        }
                        var propDecoratorPath = propDeco[0].get('expression');
                        if (bt.isCallExpression(propDecoratorPath.node)) {
                            var propDecoratorArg = propDecoratorPath.get('arguments', 0);
                            if (propDecoratorArg) {
                                if (bt.isObjectExpression(propDecoratorArg.node)) {
                                    var propsPath = propDecoratorArg
                                        .get('properties')
                                        .filter(function (p) {
                                        return bt.isObjectProperty(p.node);
                                    });
                                    // if there is no type annotation, get it from the decorators arguments
                                    if (!propPath.node.typeAnnotation) {
                                        litteralType = (0, propHandler_1.describeType)(propsPath, propDescriptor);
                                    }
                                    (0, propHandler_1.describeDefault)(propsPath, propDescriptor, litteralType || '');
                                    (0, propHandler_1.describeRequired)(propsPath, propDescriptor);
                                    // this compares the node to its supposed args
                                    // if it finds no args it will return itself
                                }
                                else if (propDecoratorArg.node !== propDecoratorPath.node) {
                                    propDescriptor.type = (0, propHandler_1.getTypeFromTypePath)(propDecoratorArg);
                                }
                            }
                        }
                        return undefined;
                    });
                    _a.label = 3;
                case 3: return [2 /*return*/, Promise.resolve()];
            }
        });
    });
}
exports.default = classPropHandler;
function getTypeFromInitValue(node) {
    if (bt.isNumericLiteral(node)) {
        return { name: 'number' };
    }
    if (bt.isStringLiteral(node) || bt.isTemplateLiteral(node)) {
        return { name: 'string' };
    }
    if (bt.isBooleanLiteral(node)) {
        return { name: 'boolean' };
    }
    return undefined;
}
