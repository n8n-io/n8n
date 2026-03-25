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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorateItem = void 0;
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var getDocblock_1 = __importDefault(require("./getDocblock"));
var getDoclets_1 = __importDefault(require("./getDoclets"));
var transformTagsIntoObject_1 = __importDefault(require("./transformTagsIntoObject"));
function getTypeFromAnnotation(typeNode) {
    if (typeNode) {
        if (bt.isTSTypeAnnotation(typeNode)) {
            return getTypeObjectFromTSType(typeNode.typeAnnotation);
        }
        else if (bt.isTypeAnnotation(typeNode)) {
            return getTypeObjectFromFlowType(typeNode.typeAnnotation);
        }
    }
    return undefined;
}
exports.default = getTypeFromAnnotation;
var TS_TYPE_NAME_MAP = {
    TSAnyKeyword: 'any',
    TSUnknownKeyword: 'unknown',
    TSNumberKeyword: 'number',
    TSObjectKeyword: 'object',
    TSBooleanKeyword: 'boolean',
    TSStringKeyword: 'string',
    TSSymbolKeyword: 'symbol',
    TSVoidKeyword: 'void',
    TSUndefinedKeyword: 'undefined',
    TSNullKeyword: 'null',
    TSNeverKeyword: 'never',
    TSArrayType: 'Array',
    TSUnionType: 'union',
    TSIntersectionType: 'intersection',
    TSTupleType: 'tuple'
};
function printType(t) {
    var _a;
    if (!t) {
        return { name: '' };
    }
    if (bt.isTSLiteralType(t) && !bt.isUnaryExpression(t.literal) && !bt.isTemplateLiteral(t.literal)) {
        return { name: JSON.stringify(t.literal.value) };
    }
    if (bt.isTSTypeLiteral(t)) {
        return {
            name: (0, recast_1.print)(t).code
        };
    }
    if (bt.isTSTypeReference(t) && bt.isIdentifier(t.typeName)) {
        var out = { name: t.typeName.name };
        if ((_a = t.typeParameters) === null || _a === void 0 ? void 0 : _a.params) {
            out.elements = t.typeParameters.params.map(getTypeObjectFromTSType);
        }
        return out;
    }
    if (TS_TYPE_NAME_MAP[t.type]) {
        return { name: TS_TYPE_NAME_MAP[t.type] };
    }
    return { name: t.type };
}
function getTypeObjectFromTSType(type) {
    if (bt.isTSUnionType(type) || bt.isTSIntersectionType(type)) {
        return { name: TS_TYPE_NAME_MAP[type.type], elements: type.types.map(getTypeObjectFromTSType) };
    }
    if (bt.isTSArrayType(type)) {
        return {
            name: TS_TYPE_NAME_MAP[type.type],
            elements: [getTypeObjectFromTSType(type.elementType)]
        };
    }
    if (bt.isTSTupleType(type)) {
        return {
            name: TS_TYPE_NAME_MAP[type.type],
            elements: type.elementTypes.map(getTypeObjectFromTSType)
        };
    }
    if (bt.isTSNamedTupleMember(type)) {
        return getTypeObjectFromTSType(type.elementType);
    }
    return printType(type);
}
var FLOW_TYPE_NAME_MAP = {
    AnyTypeAnnotation: 'any',
    UnknownTypeAnnotation: 'unknown',
    NumberTypeAnnotation: 'number',
    ObjectTypeAnnotation: 'object',
    BooleanTypeAnnotation: 'boolean',
    StringTypeAnnotation: 'string',
    SymbolTypeAnnotation: 'symbol',
    VoidTypeAnnotation: 'void',
    UndefinedTypeAnnotation: 'undefined',
    NullTypeAnnotation: 'null',
    NeverTypeAnnotation: 'never'
};
function getTypeObjectFromFlowType(type) {
    var name = FLOW_TYPE_NAME_MAP[type.type]
        ? FLOW_TYPE_NAME_MAP[type.type]
        : bt.isGenericTypeAnnotation(type) && bt.isIdentifier(type.id)
            ? type.id.name
            : type.type;
    return { name: name };
}
function decorateItem(item, propDescriptor) {
    var docBlock = (0, getDocblock_1.default)(item);
    var jsDoc = docBlock ? (0, getDoclets_1.default)(docBlock) : { description: '', tags: [] };
    var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
    if (jsDoc.description) {
        propDescriptor.description = jsDoc.description;
    }
    if (jsDocTags.length) {
        propDescriptor.tags = (0, transformTagsIntoObject_1.default)(jsDocTags);
    }
}
exports.decorateItem = decorateItem;
