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
var recast_1 = require("recast");
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var getTypeFromAnnotation_1 = __importDefault(require("../utils/getTypeFromAnnotation"));
var eventHandler_1 = require("../script-handlers/eventHandler");
var tsUtils_1 = require("./utils/tsUtils");
/**
 * Extract information from an setup-style VueJs 3 component
 * about what events can be emitted
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
function setupEventHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        function buildEventDescriptor(eventName, eventPath) {
            var _a;
            var eventDescriptor = documentation.getEventDescriptor(eventName);
            var isPropertyEmitSyntax = bt.isTSPropertySignature(eventPath.node);
            var typeParam = isPropertyEmitSyntax
                ? eventPath.get('typeAnnotation')
                : eventPath.get('parameters', 1, 'typeAnnotation');
            if (bt.isTSTypeAnnotation(typeParam.node)) {
                var type = (0, getTypeFromAnnotation_1.default)(typeParam.node);
                if (isPropertyEmitSyntax && type) {
                    type = (_a = type.elements) === null || _a === void 0 ? void 0 : _a[0];
                }
                if (type) {
                    eventDescriptor.type = {
                        names: [type.name]
                    };
                    if (type.elements) {
                        eventDescriptor.type.elements = type.elements;
                    }
                }
            }
            var docBlock = (0, getDocblock_1.default)(eventPath);
            if (docBlock) {
                var jsDoc = (0, getDoclets_1.default)(docBlock);
                (0, eventHandler_1.setEventDescriptor)(eventDescriptor, jsDoc);
            }
        }
        function readEventsTSTypes(refs) {
            if (!refs.value) {
                return;
            }
            refs.each(function (member) {
                if (bt.isTSCallSignatureDeclaration(member.node)) {
                    var firstParam = member.node.parameters[0].typeAnnotation;
                    if (bt.isTSTypeAnnotation(firstParam) &&
                        bt.isTSLiteralType(firstParam.typeAnnotation) &&
                        !bt.isUnaryExpression(firstParam.typeAnnotation.literal) &&
                        !bt.isTemplateLiteral(firstParam.typeAnnotation.literal) &&
                        typeof firstParam.typeAnnotation.literal.value === 'string') {
                        buildEventDescriptor(firstParam.typeAnnotation.literal.value, member);
                    }
                }
                else if (bt.isTSPropertySignature(member.node)) {
                    if (bt.isIdentifier(member.node.key)) {
                        buildEventDescriptor(member.node.key.name, member);
                    }
                    else if (bt.isStringLiteral(member.node.key)) {
                        buildEventDescriptor(member.node.key.value, member);
                    }
                }
            });
        }
        return __generator(this, function (_a) {
            (0, recast_1.visit)(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (bt.isIdentifier(nodePath.node.callee) && nodePath.node.callee.name === 'defineEmits') {
                        // Array of string where no type is specified
                        if (bt.isArrayExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'elements').each(function (element) {
                                if (bt.isStringLiteral(element.node)) {
                                    buildEventDescriptor(element.node.value, element);
                                }
                            });
                        }
                        // Object where the arguments are validated manually
                        if (bt.isObjectExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'properties').each(function (element) {
                                if (bt.isObjectProperty(element.node)) {
                                    if (bt.isIdentifier(element.node.key)) {
                                        buildEventDescriptor(element.node.key.name, element);
                                    }
                                    else if (bt.isStringLiteral(element.node.key)) {
                                        buildEventDescriptor(element.node.key.value, element);
                                    }
                                }
                            });
                        }
                        // typescript validation of arguments
                        if (bt.isTSTypeParameterInstantiation(nodePath.get('typeParameters').node)) {
                            nodePath.get('typeParameters', 'params').each(function (param) {
                                if (bt.isTSTypeLiteral(param.node)) {
                                    readEventsTSTypes(param.get('members'));
                                }
                                else if (bt.isTSTypeReference(param.node) && bt.isIdentifier(param.node.typeName)) {
                                    var resolvedType = (0, tsUtils_1.getTypeDefinitionFromIdentifier)(astPath, param.node.typeName.name, opt);
                                    if (resolvedType) {
                                        readEventsTSTypes(resolvedType);
                                    }
                                }
                            });
                        }
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
}
exports.default = setupEventHandler;
