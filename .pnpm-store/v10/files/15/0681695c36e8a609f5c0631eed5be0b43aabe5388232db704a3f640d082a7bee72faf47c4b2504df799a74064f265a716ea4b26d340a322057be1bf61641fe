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
exports.extractValuesFromTags = exports.describeDefault = exports.describeRequired = exports.getValuesFromTypeAnnotation = exports.getTypeFromTypePath = exports.describeType = exports.describePropsFromValue = exports.getRawValueParsedFromFunctionsBlockStatementNode = void 0;
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var transformTagsIntoObject_1 = __importDefault(require("../utils/transformTagsIntoObject"));
var getPropsFilter_1 = __importDefault(require("../utils/getPropsFilter"));
var getTemplateExpressionAST_1 = __importDefault(require("../utils/getTemplateExpressionAST"));
var parseValidator_1 = __importDefault(require("./utils/parseValidator"));
function getRawValueParsedFromFunctionsBlockStatementNode(blockStatementNode) {
    var body = blockStatementNode.body;
    // if there is more than a return statement in the body,
    // we cannot resolve the new object, we let the function display as a function
    if (body.length !== 1 || !bt.isReturnStatement(body[0])) {
        return null;
    }
    var _a = __read(body, 1), ret = _a[0];
    return ret.argument ? (0, recast_1.print)(ret.argument).code : null;
}
exports.getRawValueParsedFromFunctionsBlockStatementNode = getRawValueParsedFromFunctionsBlockStatementNode;
/**
 * Extract props information form an object-style VueJs component
 * @param documentation
 * @param path
 */
function propHandler(documentation, path, ast, opt) {
    return __awaiter(this, void 0, void 0, function () {
        var propsPath, modelPropertyName, propsValuePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt.isObjectExpression(path.node)) return [3 /*break*/, 2];
                    propsPath = path
                        .get('properties')
                        .filter(function (p) { return bt.isObjectProperty(p.node) && (0, getPropsFilter_1.default)('props')(p); });
                    // if no prop return
                    if (!propsPath.length) {
                        return [2 /*return*/, Promise.resolve()];
                    }
                    modelPropertyName = getModelPropName(path);
                    propsValuePath = propsPath[0].get('value');
                    return [4 /*yield*/, describePropsFromValue(documentation, propsValuePath, ast, opt, modelPropertyName)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
exports.default = propHandler;
function describePropsFromValue(documentation, propsValuePath, ast, opt, modelPropertyName) {
    if (modelPropertyName === void 0) { modelPropertyName = null; }
    return __awaiter(this, void 0, void 0, function () {
        var objProp, objPropFiltered;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!bt.isObjectExpression(propsValuePath.node)) return [3 /*break*/, 2];
                    objProp = propsValuePath.get('properties');
                    objPropFiltered = objProp.filter(function (p) {
                        return bt.isProperty(p.node);
                    });
                    return [4 /*yield*/, Promise.all(objPropFiltered.map(function (prop) { return __awaiter(_this, void 0, void 0, function () {
                            var propNode, docBlock, jsDoc, jsDocTags, propertyName, isPropertyModel, propName, propDescriptor, propValuePath, propPropertiesPath, literalType, propValuePathExpression, finalPropValuePathExpression, propPropertiesPath;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        propNode = prop.node;
                                        docBlock = (0, getDocblock_1.default)(prop);
                                        jsDoc = docBlock ? (0, getDoclets_1.default)(docBlock) : { description: '', tags: [] };
                                        jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                                        propertyName = bt.isIdentifier(propNode.key)
                                            ? propNode.key.name
                                            : bt.isStringLiteral(propNode.key)
                                                ? propNode.key.value
                                                : null;
                                        if (!propertyName) {
                                            return [2 /*return*/];
                                        }
                                        isPropertyModel = jsDocTags.some(function (t) { return t.title === 'model'; }) || propertyName === modelPropertyName;
                                        propName = isPropertyModel ? 'v-model' : propertyName;
                                        propDescriptor = documentation.getPropDescriptor(propName);
                                        propValuePath = prop.get('value');
                                        if (jsDoc.description) {
                                            propDescriptor.description = jsDoc.description;
                                        }
                                        if (jsDocTags.length) {
                                            propDescriptor.tags = (0, transformTagsIntoObject_1.default)(jsDocTags);
                                        }
                                        extractValuesFromTags(propDescriptor);
                                        if (!(bt.isArrayExpression(propValuePath.node) || bt.isIdentifier(propValuePath.node))) return [3 /*break*/, 1];
                                        // if it's an immediately typed property, resolve its type immediately
                                        propDescriptor.type = getTypeFromTypePath(propValuePath);
                                        return [3 /*break*/, 4];
                                    case 1:
                                        if (!bt.isObjectExpression(propValuePath.node)) return [3 /*break*/, 3];
                                        propPropertiesPath = propValuePath
                                            .get('properties')
                                            .filter(function (p) { return bt.isObjectProperty(p.node) || bt.isObjectMethod(p.node); });
                                        literalType = describeType(propPropertiesPath, propDescriptor);
                                        // required
                                        describeRequired(propPropertiesPath, propDescriptor);
                                        // default
                                        describeDefault(propPropertiesPath, propDescriptor, literalType || '');
                                        // validator => values
                                        return [4 /*yield*/, describeValues(propPropertiesPath, propDescriptor, ast, opt)];
                                    case 2:
                                        // validator => values
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        if (bt.isTSAsExpression(propValuePath.node)) {
                                            propValuePathExpression = propValuePath.get('expression');
                                            finalPropValuePathExpression = bt.isTSAsExpression(propValuePathExpression.node) &&
                                                bt.isTSUnknownKeyword(propValuePathExpression.get('typeAnnotation').node)
                                                ? propValuePathExpression.get('expression')
                                                : propValuePathExpression;
                                            if (bt.isObjectExpression(finalPropValuePathExpression.node)) {
                                                propPropertiesPath = finalPropValuePathExpression
                                                    .get('properties')
                                                    .filter(function (p) { return bt.isObjectProperty(p.node); });
                                                // type and values
                                                describeTypeAndValuesFromPath(propValuePath, propDescriptor);
                                                // required
                                                describeRequired(propPropertiesPath, propDescriptor);
                                                // default
                                                describeDefault(propPropertiesPath, propDescriptor, (propDescriptor.type && propDescriptor.type.name) || '');
                                            }
                                            else if (bt.isIdentifier(finalPropValuePathExpression.node)) {
                                                describeTypeAndValuesFromPath(propValuePath, propDescriptor);
                                            }
                                        }
                                        else {
                                            // in any other case, just display the code for the typing
                                            propDescriptor.type = {
                                                name: (0, recast_1.print)(prop.get('value')).code,
                                                func: true
                                            };
                                        }
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (bt.isArrayExpression(propsValuePath.node)) {
                        propsValuePath
                            .get('elements')
                            .filter(function (e) { return bt.isStringLiteral(e.node); })
                            .forEach(function (e) {
                            var propDescriptor = documentation.getPropDescriptor(e.node.value);
                            propDescriptor.type = { name: 'undefined' };
                        });
                    }
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.describePropsFromValue = describePropsFromValue;
/**
 * Deal with the description of the type
 * @param propPropertiesPath
 * @param propDescriptor
 * @returns the unaltered type member of the prop object
 */
function describeType(propPropertiesPath, propDescriptor) {
    var typeArray = propPropertiesPath.filter((0, getPropsFilter_1.default)('type'));
    if (propDescriptor.tags && propDescriptor.tags.type) {
        var _a = __read(propDescriptor.tags.type, 1), typeDesc = _a[0].type;
        if (typeDesc) {
            var typedAST = (0, getTemplateExpressionAST_1.default)("let a:".concat(typeDesc.name));
            var typeValues_1;
            (0, recast_1.visit)(typedAST.program, {
                visitVariableDeclaration: function (path) {
                    var typeAnnotation = path.get('declarations', 0, 'id', 'typeAnnotation').value.typeAnnotation;
                    if (bt.isTSUnionType(typeAnnotation) &&
                        typeAnnotation.types.every(function (t) { return bt.isTSLiteralType(t); })) {
                        typeValues_1 = typeAnnotation.types.map(function (t) {
                            return 'literal' in t
                                ? bt.isUnaryExpression(t.literal)
                                    ? t.literal.argument.toString()
                                    : bt.isTemplateLiteral(t.literal)
                                        ? t.literal.type
                                        : t.literal.value.toString()
                                : t.type.toString();
                        });
                    }
                    return false;
                }
            });
            if (typeValues_1) {
                propDescriptor.values = typeValues_1;
            }
            else {
                propDescriptor.type = typeDesc;
                if (typeArray.length) {
                    return getTypeFromTypePath(typeArray[0].get('value')).name;
                }
            }
        }
    }
    if (typeArray.length) {
        return describeTypeAndValuesFromPath(typeArray[0].get('value'), propDescriptor);
    }
    else {
        // deduce the type from default expression
        var defaultArray = propPropertiesPath.filter((0, getPropsFilter_1.default)('default'));
        if (defaultArray.length) {
            var typeNode = defaultArray[0].node;
            if (bt.isObjectProperty(typeNode)) {
                var func = bt.isArrowFunctionExpression(typeNode.value) || bt.isFunctionExpression(typeNode.value);
                var typeValueNode = defaultArray[0].get('value').node;
                var typeName = typeof typeValueNode.value;
                propDescriptor.type = { name: func ? 'func' : typeName };
            }
        }
    }
    return undefined;
}
exports.describeType = describeType;
var VALID_VUE_TYPES = [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'date',
    'function',
    'symbol'
];
function resolveParenthesis(typeAnnotation) {
    var finalAnno = typeAnnotation;
    while (bt.isTSParenthesizedType(finalAnno)) {
        finalAnno = finalAnno.typeAnnotation;
    }
    return finalAnno;
}
function describeTypeAndValuesFromPath(propPropertiesPath, propDescriptor) {
    // values
    var values = getValuesFromTypePath(propPropertiesPath.node.typeAnnotation);
    // if it has an "as" annotation defining values
    if (values) {
        propDescriptor.values = values;
        propDescriptor.type = { name: 'string' };
    }
    else {
        // Get natural type from its identifier
        // (classic way)
        // type: Object
        propDescriptor.type = getTypeFromTypePath(propPropertiesPath);
    }
    return propDescriptor.type.name;
}
function getTypeFromTypePath(typePath) {
    var typeNode = typePath.node;
    var typeAnnotation = typeNode.typeAnnotation;
    var typeName = !typeNode
        ? 'any'
        : bt.isTSTypeReference(typeAnnotation) && typeAnnotation.typeParameters
            ? (0, recast_1.print)(resolveParenthesis(typeAnnotation.typeParameters.params[0])).code
            : bt.isArrayExpression(typeNode)
                ? typePath
                    .get('elements')
                    .map(function (t) { return getTypeFromTypePath(t).name; })
                    .join('|')
                : bt.isIdentifier(typeNode) && VALID_VUE_TYPES.indexOf(typeNode.name.toLowerCase()) > -1
                    ? typeNode.name.toLowerCase()
                    : bt.isObjectProperty(typeNode) &&
                        bt.isExpression(typeNode.value) &&
                        bt.isTSInstantiationExpression(typeNode.value)
                        ? (0, recast_1.print)(typeNode.value.expression).code +
                            (typeNode.value.typeParameters ? (0, recast_1.print)(typeNode.value.typeParameters).code : '')
                        : (0, recast_1.print)(typeNode).code;
    return {
        name: typeName === 'function' ? 'func' : typeName
    };
}
exports.getTypeFromTypePath = getTypeFromTypePath;
/**
 * When a prop is type annotated with the "as" keyword,
 * It means that its possible values can be extracted from it
 * this extracts the values from the as
 * @param typeAnnotation the as annotation
 */
function getValuesFromTypePath(typeAnnotation) {
    if (bt.isTSTypeReference(typeAnnotation) && typeAnnotation.typeParameters) {
        var type = resolveParenthesis(typeAnnotation.typeParameters.params[0]);
        return getValuesFromTypeAnnotation(type);
    }
    return undefined;
}
function getValuesFromTypeAnnotation(type) {
    if (bt.isTSUnionType(type) && type.types.every(function (t) { return bt.isTSLiteralType(t); })) {
        return type.types.map(function (t) {
            return bt.isTSLiteralType(t) && !bt.isUnaryExpression(t.literal)
                ? bt.isTemplateLiteral(t.literal)
                    ? t.literal.type
                    : t.literal.value.toString()
                : '';
        });
    }
    return undefined;
}
exports.getValuesFromTypeAnnotation = getValuesFromTypeAnnotation;
function describeRequired(propPropertiesPath, propDescriptor) {
    var requiredArray = propPropertiesPath.filter((0, getPropsFilter_1.default)('required'));
    var requiredNode = requiredArray.length ? requiredArray[0].get('value').node : undefined;
    var required = requiredNode && bt.isBooleanLiteral(requiredNode) ? requiredNode.value : undefined;
    if (required !== undefined) {
        propDescriptor.required = required;
    }
}
exports.describeRequired = describeRequired;
function describeDefault(propPropertiesPath, propDescriptor, propType) {
    var _a;
    var defaultArray = propPropertiesPath.filter((0, getPropsFilter_1.default)('default'));
    if (defaultArray.length) {
        /**
         * This means the default value is formatted like so: `default: any`
         */
        var defaultValueIsProp = bt.isObjectProperty(defaultArray[0].value);
        /**
         * This means the default value is formatted like so: `default () { return {} }`
         */
        var defaultValueIsObjectMethod = bt.isObjectMethod(defaultArray[0].value);
        // objects and arrays should try to extract the body from functions
        if (propType === 'object' || propType === 'array') {
            if (defaultValueIsProp) {
                /* TODO: add correct type info here ↓ */
                var defaultFunction = defaultArray[0].get('value');
                var isArrowFunction = bt.isArrowFunctionExpression(defaultFunction.node);
                var isOldSchoolFunction = bt.isFunctionExpression(defaultFunction.node);
                // if default is undefined or null, literals are allowed
                if (bt.isNullLiteral(defaultFunction.node) ||
                    (bt.isIdentifier(defaultFunction.node) && defaultFunction.node.name === 'undefined')) {
                    propDescriptor.defaultValue = {
                        func: false,
                        value: (0, recast_1.print)(defaultFunction.node).code
                    };
                    return;
                }
                // check if the prop value is a function
                if (!isArrowFunction && !isOldSchoolFunction) {
                    throw new Error('A default value needs to be a function when your type is an object or array');
                }
                // retrieve the function "body" from the arrow function
                if (isArrowFunction) {
                    var arrowFunctionBody = defaultFunction.get('body');
                    // arrow function looks like `() => { return {} }`
                    if (bt.isBlockStatement(arrowFunctionBody.node)) {
                        var rawValueParsed_1 = getRawValueParsedFromFunctionsBlockStatementNode(arrowFunctionBody.node);
                        if (rawValueParsed_1) {
                            propDescriptor.defaultValue = {
                                func: false,
                                value: rawValueParsed_1
                            };
                            return;
                        }
                    }
                    if (bt.isArrayExpression(arrowFunctionBody.node) ||
                        bt.isObjectExpression(arrowFunctionBody.node)) {
                        var rawCode = (0, recast_1.print)(arrowFunctionBody.node).code;
                        var value = ((_a = arrowFunctionBody.node.extra) === null || _a === void 0 ? void 0 : _a.parenthesized)
                            ? rawCode.slice(1, rawCode.length - 1)
                            : rawCode;
                        propDescriptor.defaultValue = {
                            func: false,
                            value: value
                        };
                        return;
                    }
                    // arrow function looks like `() => ({})`
                    propDescriptor.defaultValue = {
                        func: true,
                        value: (0, recast_1.print)(defaultFunction).code
                    };
                    return;
                }
            }
            // defaultValue was either an ObjectMethod or an oldSchoolFunction
            // in either case we need to retrieve the blockStatement and work with that
            /* todo: add correct type info here ↓ */
            var defaultBlockStatement = defaultValueIsObjectMethod
                ? defaultArray[0].get('body')
                : defaultArray[0].get('value').get('body');
            var defaultBlockStatementNode = defaultBlockStatement.node;
            var rawValueParsed = getRawValueParsedFromFunctionsBlockStatementNode(defaultBlockStatementNode);
            if (rawValueParsed) {
                propDescriptor.defaultValue = {
                    func: false,
                    value: rawValueParsed
                };
                return;
            }
        }
        // otherwise the rest should return whatever there is
        if (defaultValueIsProp) {
            // in this case, just return the rawValue
            var defaultPath = defaultArray[0].get('value');
            if (bt.isTSAsExpression(defaultPath.value)) {
                defaultPath = defaultPath.get('expression');
            }
            var rawValue = (0, recast_1.print)(defaultPath).code;
            propDescriptor.defaultValue = {
                func: bt.isFunction(defaultPath.node),
                value: rawValue
            };
            return;
        }
        if (defaultValueIsObjectMethod) {
            // in this case, just the function needs to be reconstructed a bit
            var defaultObjectMethod = defaultArray[0].get('value');
            var paramNodeArray = defaultObjectMethod.node.params;
            var params = paramNodeArray.map(function (p) { return p.name; }).join(', ');
            var defaultBlockStatement = defaultArray[0].get('body');
            var rawValue = (0, recast_1.print)(defaultBlockStatement).code;
            // the function should be reconstructed as "old-school" function, because they have the same handling of "this", whereas arrow functions do not.
            var rawValueParsed = "function(".concat(params, ") ").concat(rawValue.trim());
            propDescriptor.defaultValue = {
                func: true,
                value: rawValueParsed
            };
            return;
        }
        throw new Error('Your default value was formatted incorrectly');
    }
}
exports.describeDefault = describeDefault;
function describeValues(propPropertiesPath, propDescriptor, ast, options) {
    return __awaiter(this, void 0, void 0, function () {
        var validatorArray, validatorNode, values;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (propDescriptor.values) {
                        return [2 /*return*/];
                    }
                    validatorArray = propPropertiesPath.filter((0, getPropsFilter_1.default)('validator'));
                    if (!validatorArray.length) return [3 /*break*/, 2];
                    validatorNode = validatorArray[0].get('value').node;
                    return [4 /*yield*/, (0, parseValidator_1.default)(validatorNode, ast, options)];
                case 1:
                    values = _a.sent();
                    if (values) {
                        propDescriptor.values = values;
                    }
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
function extractValuesFromTags(propDescriptor) {
    var _a;
    if (propDescriptor.tags && propDescriptor.tags.values) {
        var values = propDescriptor.tags.values.map(function (tag) {
            var description = tag.description;
            var choices = typeof description === 'string' ? description.split(',') : undefined;
            if (choices) {
                return choices.map(function (v) { return v.trim(); });
            }
            return [];
        });
        propDescriptor.values = (_a = []).concat.apply(_a, __spreadArray([], __read(values), false));
        delete propDescriptor.tags.values;
    }
}
exports.extractValuesFromTags = extractValuesFromTags;
/**
 * extract the property model.prop from the component object
 * @param path component NodePath
 * @returns name of the model prop, null if none
 */
function getModelPropName(path) {
    var modelPath = path
        .get('properties')
        .filter(function (p) { return bt.isObjectProperty(p.node) && (0, getPropsFilter_1.default)('model')(p); });
    if (!modelPath.length) {
        return null;
    }
    var modelValue = modelPath.length && modelPath[0].get('value');
    if (!bt.isObjectExpression(modelValue.node)) {
        return null;
    }
    var modelPropertyNamePath = modelValue
        .get('properties')
        .filter(function (p) { return bt.isObjectProperty(p.node) && (0, getPropsFilter_1.default)('prop')(p); });
    if (!modelPropertyNamePath.length) {
        return null;
    }
    var valuePath = modelPropertyNamePath[0].get('value');
    return bt.isStringLiteral(valuePath.node) ? valuePath.node.value : null;
}
