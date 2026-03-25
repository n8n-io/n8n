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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPropsFromLiteralType = void 0;
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var getTypeFromAnnotation_1 = __importStar(require("../utils/getTypeFromAnnotation"));
var propHandler_1 = require("../script-handlers/propHandler");
var tsUtils_1 = require("./utils/tsUtils");
/**
 * Extract information from an setup-style VueJs 3 component
 * about what props can be used with this component
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
exports.default = (0, tsUtils_1.defineHandler)(function setupPropHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var propsDef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, recast_1.visit)(astPath.program, {
                        visitCallExpression: function (nodePath) {
                            var hasDefaults = bt.isIdentifier(nodePath.node.callee) && nodePath.node.callee.name === 'withDefaults';
                            var normalizedNodePath = hasDefaults ? nodePath.get('arguments', 0) : nodePath;
                            if (bt.isIdentifier(normalizedNodePath.node.callee) &&
                                normalizedNodePath.node.callee.name === 'defineProps') {
                                if (normalizedNodePath.node.typeParameters) {
                                    var typeParamsPath = normalizedNodePath.get('typeParameters', 'params', 0);
                                    if (bt.isTSTypeLiteral(typeParamsPath.node)) {
                                        getPropsFromLiteralType(documentation, typeParamsPath.get('members'));
                                    }
                                    else if (bt.isTSTypeReference(typeParamsPath.node)) {
                                        if (bt.isIdentifier(typeParamsPath.node.typeName)) {
                                            // its a reference to an interface or type
                                            var typeName = typeParamsPath.node.typeName.name; // extract the identifier
                                            // find it's definition in the file
                                            var definitionPath = (0, tsUtils_1.getTypeDefinitionFromIdentifier)(astPath, typeName, opt);
                                            // use the same process to exact info
                                            if (definitionPath &&
                                                (bt.isTSTypeLiteral(definitionPath.node) ||
                                                    bt.isTSInterfaceBody(definitionPath.node))) {
                                                getPropsFromLiteralType(documentation, definitionPath);
                                            }
                                        }
                                        else if (bt.isTSQualifiedName(typeParamsPath.node.typeName)) {
                                            // its a reference to an interface or type
                                            var importName = typeParamsPath.node.typeName.left.name; // extract the import identifier
                                            var typeName = typeParamsPath.node.typeName.right.name; // extract the identifier
                                            var definitionPath = (0, tsUtils_1.getTypeDefinitionFromIdentifier)(astPath, typeName, opt, importName);
                                            // use the same process to exact info
                                            if (definitionPath) {
                                                getPropsFromLiteralType(documentation, definitionPath);
                                            }
                                        }
                                    }
                                }
                                else {
                                    propsDef = normalizedNodePath.get('arguments', 0);
                                }
                                // add defaults from withDefaults
                                if (hasDefaults) {
                                    var defaults = nodePath.get('arguments', 1);
                                    if (bt.isObjectExpression(defaults.node)) {
                                        defaults.get('properties').each(function (propPath) {
                                            var propName = propPath.get('key').node.name;
                                            var propValue = propPath.get('value');
                                            var propDescriptor = documentation.getPropDescriptor(propName);
                                            propDescriptor.defaultValue = {
                                                func: false,
                                                value: (0, recast_1.print)(propValue).code
                                            };
                                        });
                                    }
                                }
                            }
                            return false;
                        }
                    });
                    if (!propsDef) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, propHandler_1.describePropsFromValue)(documentation, propsDef, astPath, opt)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
});
function getPropsFromLiteralType(documentation, typeParamsPathMembers) {
    typeParamsPathMembers.each(function (prop) {
        if (bt.isTSPropertySignature(prop.node) && bt.isIdentifier(prop.node.key)) {
            var propDescriptor = documentation.getPropDescriptor(prop.node.key.name);
            (0, getTypeFromAnnotation_1.decorateItem)(prop, propDescriptor);
            propDescriptor.required = !prop.node.optional;
            propDescriptor.type = (0, getTypeFromAnnotation_1.default)(prop.get('typeAnnotation').value);
        }
    });
}
exports.getPropsFromLiteralType = getPropsFromLiteralType;
