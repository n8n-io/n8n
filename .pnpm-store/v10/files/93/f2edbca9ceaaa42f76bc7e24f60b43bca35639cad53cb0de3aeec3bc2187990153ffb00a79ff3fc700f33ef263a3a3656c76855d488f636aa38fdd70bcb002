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
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitorKeys = void 0;
const eslintVisitorKeys = __importStar(require("eslint-visitor-keys"));
/*
 ********************************** IMPORTANT NOTE ********************************
 *                                                                                *
 * The key arrays should be sorted in the order in which you would want to visit  *
 * the child keys.                                                                *
 *                                                                                *
 *                        DO NOT SORT THEM ALPHABETICALLY!                        *
 *                                                                                *
 * They should be sorted in the order that they appear in the source code.        *
 * For example:                                                                   *
 *                                                                                *
 * class Foo extends Bar { prop: 1 }                                              *
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ClassDeclaration                             *
 *       ^^^ id      ^^^ superClass                                               *
 *                       ^^^^^^^^^^^ body                                         *
 *                                                                                *
 * It would be incorrect to provide the visitor keys ['body', 'id', 'superClass'] *
 * because the body comes AFTER everything else in the source code.               *
 * Instead the correct ordering would be ['id', 'superClass', 'body'].            *
 *                                                                                *
 **********************************************************************************
 */
const SharedVisitorKeys = (() => {
    const FunctionType = ['typeParameters', 'params', 'returnType'];
    const AnonymousFunction = [...FunctionType, 'body'];
    const AbstractPropertyDefinition = [
        'decorators',
        'key',
        'typeAnnotation',
    ];
    return {
        AnonymousFunction,
        Function: ['id', ...AnonymousFunction],
        FunctionType,
        ClassDeclaration: [
            'decorators',
            'id',
            'typeParameters',
            'superClass',
            'superTypeArguments',
            'implements',
            'body',
        ],
        AbstractPropertyDefinition: ['decorators', 'key', 'typeAnnotation'],
        PropertyDefinition: [...AbstractPropertyDefinition, 'value'],
        TypeAssertion: ['expression', 'typeAnnotation'],
    };
})();
const additionalKeys = {
    AccessorProperty: SharedVisitorKeys.PropertyDefinition,
    ArrayPattern: ['decorators', 'elements', 'typeAnnotation'],
    ArrowFunctionExpression: SharedVisitorKeys.AnonymousFunction,
    AssignmentPattern: ['decorators', 'left', 'right', 'typeAnnotation'],
    CallExpression: ['callee', 'typeArguments', 'arguments'],
    ClassDeclaration: SharedVisitorKeys.ClassDeclaration,
    ClassExpression: SharedVisitorKeys.ClassDeclaration,
    Decorator: ['expression'],
    ExportAllDeclaration: ['exported', 'source', 'assertions'],
    ExportNamedDeclaration: ['declaration', 'specifiers', 'source', 'assertions'],
    FunctionDeclaration: SharedVisitorKeys.Function,
    FunctionExpression: SharedVisitorKeys.Function,
    Identifier: ['decorators', 'typeAnnotation'],
    ImportAttribute: ['key', 'value'],
    ImportDeclaration: ['specifiers', 'source', 'assertions'],
    ImportExpression: ['source', 'attributes'],
    JSXClosingFragment: [],
    JSXOpeningElement: ['name', 'typeArguments', 'attributes'],
    JSXOpeningFragment: [],
    JSXSpreadChild: ['expression'],
    MethodDefinition: ['decorators', 'key', 'value'],
    NewExpression: ['callee', 'typeArguments', 'arguments'],
    ObjectPattern: ['decorators', 'properties', 'typeAnnotation'],
    PropertyDefinition: SharedVisitorKeys.PropertyDefinition,
    RestElement: ['decorators', 'argument', 'typeAnnotation'],
    StaticBlock: ['body'],
    TaggedTemplateExpression: ['tag', 'typeArguments', 'quasi'],
    TSAbstractAccessorProperty: SharedVisitorKeys.AbstractPropertyDefinition,
    TSAbstractKeyword: [],
    TSAbstractMethodDefinition: ['key', 'value'],
    TSAbstractPropertyDefinition: SharedVisitorKeys.AbstractPropertyDefinition,
    TSAnyKeyword: [],
    TSArrayType: ['elementType'],
    TSAsExpression: SharedVisitorKeys.TypeAssertion,
    TSAsyncKeyword: [],
    TSBigIntKeyword: [],
    TSBooleanKeyword: [],
    TSCallSignatureDeclaration: SharedVisitorKeys.FunctionType,
    TSClassImplements: ['expression', 'typeArguments'],
    TSConditionalType: ['checkType', 'extendsType', 'trueType', 'falseType'],
    TSConstructorType: SharedVisitorKeys.FunctionType,
    TSConstructSignatureDeclaration: SharedVisitorKeys.FunctionType,
    TSDeclareFunction: SharedVisitorKeys.Function,
    TSDeclareKeyword: [],
    TSEmptyBodyFunctionExpression: ['id', ...SharedVisitorKeys.FunctionType],
    TSEnumDeclaration: ['id', 'members'],
    TSEnumMember: ['id', 'initializer'],
    TSExportAssignment: ['expression'],
    TSExportKeyword: [],
    TSExternalModuleReference: ['expression'],
    TSFunctionType: SharedVisitorKeys.FunctionType,
    TSImportEqualsDeclaration: ['id', 'moduleReference'],
    TSImportType: ['argument', 'qualifier', 'typeArguments'],
    TSIndexedAccessType: ['indexType', 'objectType'],
    TSIndexSignature: ['parameters', 'typeAnnotation'],
    TSInferType: ['typeParameter'],
    TSInstantiationExpression: ['expression', 'typeArguments'],
    TSInterfaceBody: ['body'],
    TSInterfaceDeclaration: ['id', 'typeParameters', 'extends', 'body'],
    TSInterfaceHeritage: ['expression', 'typeArguments'],
    TSIntersectionType: ['types'],
    TSIntrinsicKeyword: [],
    TSLiteralType: ['literal'],
    TSMappedType: ['nameType', 'typeParameter', 'typeAnnotation'],
    TSMethodSignature: ['typeParameters', 'key', 'params', 'returnType'],
    TSModuleBlock: ['body'],
    TSModuleDeclaration: ['id', 'body'],
    TSNamedTupleMember: ['label', 'elementType'],
    TSNamespaceExportDeclaration: ['id'],
    TSNeverKeyword: [],
    TSNonNullExpression: ['expression'],
    TSNullKeyword: [],
    TSNumberKeyword: [],
    TSObjectKeyword: [],
    TSOptionalType: ['typeAnnotation'],
    TSParameterProperty: ['decorators', 'parameter'],
    TSPrivateKeyword: [],
    TSPropertySignature: ['typeAnnotation', 'key'],
    TSProtectedKeyword: [],
    TSPublicKeyword: [],
    TSQualifiedName: ['left', 'right'],
    TSReadonlyKeyword: [],
    TSRestType: ['typeAnnotation'],
    TSSatisfiesExpression: [
        // this is intentionally different to SharedVisitorKeys.TypeAssertion because
        // the type annotation comes first in the source code
        'typeAnnotation',
        'expression',
    ],
    TSStaticKeyword: [],
    TSStringKeyword: [],
    TSSymbolKeyword: [],
    TSTemplateLiteralType: ['quasis', 'types'],
    TSThisType: [],
    TSTupleType: ['elementTypes'],
    TSTypeAliasDeclaration: ['id', 'typeParameters', 'typeAnnotation'],
    TSTypeAnnotation: ['typeAnnotation'],
    TSTypeAssertion: SharedVisitorKeys.TypeAssertion,
    TSTypeLiteral: ['members'],
    TSTypeOperator: ['typeAnnotation'],
    TSTypeParameter: ['name', 'constraint', 'default'],
    TSTypeParameterDeclaration: ['params'],
    TSTypeParameterInstantiation: ['params'],
    TSTypePredicate: ['typeAnnotation', 'parameterName'],
    TSTypeQuery: ['exprName', 'typeArguments'],
    TSTypeReference: ['typeName', 'typeArguments'],
    TSUndefinedKeyword: [],
    TSUnionType: ['types'],
    TSUnknownKeyword: [],
    TSVoidKeyword: [],
};
const visitorKeys = eslintVisitorKeys.unionWith(additionalKeys);
exports.visitorKeys = visitorKeys;
//# sourceMappingURL=visitor-keys.js.map