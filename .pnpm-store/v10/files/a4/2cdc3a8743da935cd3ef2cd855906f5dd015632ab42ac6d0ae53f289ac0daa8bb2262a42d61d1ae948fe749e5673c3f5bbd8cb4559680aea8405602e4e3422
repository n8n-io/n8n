"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var babel_core_1 = tslib_1.__importDefault(require("./babel-core"));
var type_annotations_1 = tslib_1.__importDefault(require("./type-annotations"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    // Since TypeScript is parsed by Babylon, include the core Babylon types
    // but omit the Flow-related types.
    fork.use(babel_core_1.default);
    fork.use(type_annotations_1.default);
    var types = fork.use(types_1.default);
    var n = types.namedTypes;
    var def = types.Type.def;
    var or = types.Type.or;
    var defaults = fork.use(shared_1.default).defaults;
    var StringLiteral = types.Type.from(function (value, deep) {
        if (n.StringLiteral &&
            n.StringLiteral.check(value, deep)) {
            return true;
        }
        if (n.Literal &&
            n.Literal.check(value, deep) &&
            typeof value.value === "string") {
            return true;
        }
        return false;
    }, "StringLiteral");
    def("TSType")
        .bases("Node");
    var TSEntityName = or(def("Identifier"), def("TSQualifiedName"));
    def("TSTypeReference")
        .bases("TSType", "TSHasOptionalTypeParameterInstantiation")
        .build("typeName", "typeParameters")
        .field("typeName", TSEntityName);
    // An abstract (non-buildable) base type that provide a commonly-needed
    // optional .typeParameters field.
    def("TSHasOptionalTypeParameterInstantiation")
        .field("typeParameters", or(def("TSTypeParameterInstantiation"), null), defaults["null"]);
    // An abstract (non-buildable) base type that provide a commonly-needed
    // optional .typeParameters field.
    def("TSHasOptionalTypeParameters")
        .field("typeParameters", or(def("TSTypeParameterDeclaration"), null, void 0), defaults["null"]);
    // An abstract (non-buildable) base type that provide a commonly-needed
    // optional .typeAnnotation field.
    def("TSHasOptionalTypeAnnotation")
        .field("typeAnnotation", or(def("TSTypeAnnotation"), null), defaults["null"]);
    def("TSQualifiedName")
        .bases("Node")
        .build("left", "right")
        .field("left", TSEntityName)
        .field("right", TSEntityName);
    def("TSAsExpression")
        .bases("Expression", "Pattern")
        .build("expression", "typeAnnotation")
        .field("expression", def("Expression"))
        .field("typeAnnotation", def("TSType"))
        .field("extra", or({ parenthesized: Boolean }, null), defaults["null"]);
    def("TSTypeCastExpression")
        .bases("Expression")
        .build("expression", "typeAnnotation")
        .field("expression", def("Expression"))
        .field("typeAnnotation", def("TSType"));
    def("TSSatisfiesExpression")
        .bases("Expression", "Pattern")
        .build("expression", "typeAnnotation")
        .field("expression", def("Expression"))
        .field("typeAnnotation", def("TSType"));
    def("TSNonNullExpression")
        .bases("Expression", "Pattern")
        .build("expression")
        .field("expression", def("Expression"));
    [
        "TSAnyKeyword",
        "TSBigIntKeyword",
        "TSBooleanKeyword",
        "TSNeverKeyword",
        "TSNullKeyword",
        "TSNumberKeyword",
        "TSObjectKeyword",
        "TSStringKeyword",
        "TSSymbolKeyword",
        "TSUndefinedKeyword",
        "TSUnknownKeyword",
        "TSVoidKeyword",
        "TSIntrinsicKeyword",
        "TSThisType",
    ].forEach(function (keywordType) {
        def(keywordType)
            .bases("TSType")
            .build();
    });
    def("TSArrayType")
        .bases("TSType")
        .build("elementType")
        .field("elementType", def("TSType"));
    def("TSLiteralType")
        .bases("TSType")
        .build("literal")
        .field("literal", or(def("NumericLiteral"), def("StringLiteral"), def("BooleanLiteral"), def("TemplateLiteral"), def("UnaryExpression"), def("BigIntLiteral")));
    def("TemplateLiteral")
        // The TemplateLiteral type appears to be reused for TypeScript template
        // literal types (instead of introducing a new TSTemplateLiteralType type),
        // so we allow the templateLiteral.expressions array to be either all
        // expressions or all TypeScript types.
        .field("expressions", or([def("Expression")], [def("TSType")]));
    ["TSUnionType",
        "TSIntersectionType",
    ].forEach(function (typeName) {
        def(typeName)
            .bases("TSType")
            .build("types")
            .field("types", [def("TSType")]);
    });
    def("TSConditionalType")
        .bases("TSType")
        .build("checkType", "extendsType", "trueType", "falseType")
        .field("checkType", def("TSType"))
        .field("extendsType", def("TSType"))
        .field("trueType", def("TSType"))
        .field("falseType", def("TSType"));
    def("TSInferType")
        .bases("TSType")
        .build("typeParameter")
        .field("typeParameter", def("TSTypeParameter"));
    def("TSParenthesizedType")
        .bases("TSType")
        .build("typeAnnotation")
        .field("typeAnnotation", def("TSType"));
    var ParametersType = [or(def("Identifier"), def("RestElement"), def("ArrayPattern"), def("ObjectPattern"))];
    ["TSFunctionType",
        "TSConstructorType",
    ].forEach(function (typeName) {
        def(typeName)
            .bases("TSType", "TSHasOptionalTypeParameters", "TSHasOptionalTypeAnnotation")
            .build("parameters")
            .field("parameters", ParametersType);
    });
    def("TSDeclareFunction")
        .bases("Declaration", "TSHasOptionalTypeParameters")
        .build("id", "params", "returnType")
        .field("declare", Boolean, defaults["false"])
        .field("async", Boolean, defaults["false"])
        .field("generator", Boolean, defaults["false"])
        .field("id", or(def("Identifier"), null), defaults["null"])
        .field("params", [def("Pattern")])
        // tSFunctionTypeAnnotationCommon
        .field("returnType", or(def("TSTypeAnnotation"), def("Noop"), // Still used?
    null), defaults["null"]);
    def("TSDeclareMethod")
        .bases("Declaration", "TSHasOptionalTypeParameters")
        .build("key", "params", "returnType")
        .field("async", Boolean, defaults["false"])
        .field("generator", Boolean, defaults["false"])
        .field("params", [def("Pattern")])
        // classMethodOrPropertyCommon
        .field("abstract", Boolean, defaults["false"])
        .field("accessibility", or("public", "private", "protected", void 0), defaults["undefined"])
        .field("static", Boolean, defaults["false"])
        .field("computed", Boolean, defaults["false"])
        .field("optional", Boolean, defaults["false"])
        .field("key", or(def("Identifier"), def("StringLiteral"), def("NumericLiteral"), 
    // Only allowed if .computed is true.
    def("Expression")))
        // classMethodOrDeclareMethodCommon
        .field("kind", or("get", "set", "method", "constructor"), function getDefault() { return "method"; })
        .field("access", // Not "accessibility"?
    or("public", "private", "protected", void 0), defaults["undefined"])
        .field("decorators", or([def("Decorator")], null), defaults["null"])
        // tSFunctionTypeAnnotationCommon
        .field("returnType", or(def("TSTypeAnnotation"), def("Noop"), // Still used?
    null), defaults["null"]);
    def("TSMappedType")
        .bases("TSType")
        .build("typeParameter", "typeAnnotation")
        .field("readonly", or(Boolean, "+", "-"), defaults["false"])
        .field("typeParameter", def("TSTypeParameter"))
        .field("optional", or(Boolean, "+", "-"), defaults["false"])
        .field("typeAnnotation", or(def("TSType"), null), defaults["null"]);
    def("TSTupleType")
        .bases("TSType")
        .build("elementTypes")
        .field("elementTypes", [or(def("TSType"), def("TSNamedTupleMember"))]);
    def("TSNamedTupleMember")
        .bases("TSType")
        .build("label", "elementType", "optional")
        .field("label", def("Identifier"))
        .field("optional", Boolean, defaults["false"])
        .field("elementType", def("TSType"));
    def("TSRestType")
        .bases("TSType")
        .build("typeAnnotation")
        .field("typeAnnotation", def("TSType"));
    def("TSOptionalType")
        .bases("TSType")
        .build("typeAnnotation")
        .field("typeAnnotation", def("TSType"));
    def("TSIndexedAccessType")
        .bases("TSType")
        .build("objectType", "indexType")
        .field("objectType", def("TSType"))
        .field("indexType", def("TSType"));
    def("TSTypeOperator")
        .bases("TSType")
        .build("operator")
        .field("operator", String)
        .field("typeAnnotation", def("TSType"));
    def("TSTypeAnnotation")
        .bases("Node")
        .build("typeAnnotation")
        .field("typeAnnotation", or(def("TSType"), def("TSTypeAnnotation")));
    def("TSIndexSignature")
        .bases("Declaration", "TSHasOptionalTypeAnnotation")
        .build("parameters", "typeAnnotation")
        .field("parameters", [def("Identifier")]) // Length === 1
        .field("readonly", Boolean, defaults["false"]);
    def("TSPropertySignature")
        .bases("Declaration", "TSHasOptionalTypeAnnotation")
        .build("key", "typeAnnotation", "optional")
        .field("key", def("Expression"))
        .field("computed", Boolean, defaults["false"])
        .field("readonly", Boolean, defaults["false"])
        .field("optional", Boolean, defaults["false"])
        .field("initializer", or(def("Expression"), null), defaults["null"]);
    def("TSMethodSignature")
        .bases("Declaration", "TSHasOptionalTypeParameters", "TSHasOptionalTypeAnnotation")
        .build("key", "parameters", "typeAnnotation")
        .field("key", def("Expression"))
        .field("computed", Boolean, defaults["false"])
        .field("optional", Boolean, defaults["false"])
        .field("parameters", ParametersType);
    def("TSTypePredicate")
        .bases("TSTypeAnnotation", "TSType")
        .build("parameterName", "typeAnnotation", "asserts")
        .field("parameterName", or(def("Identifier"), def("TSThisType")))
        .field("typeAnnotation", or(def("TSTypeAnnotation"), null), defaults["null"])
        .field("asserts", Boolean, defaults["false"]);
    ["TSCallSignatureDeclaration",
        "TSConstructSignatureDeclaration",
    ].forEach(function (typeName) {
        def(typeName)
            .bases("Declaration", "TSHasOptionalTypeParameters", "TSHasOptionalTypeAnnotation")
            .build("parameters", "typeAnnotation")
            .field("parameters", ParametersType);
    });
    def("TSEnumMember")
        .bases("Node")
        .build("id", "initializer")
        .field("id", or(def("Identifier"), StringLiteral))
        .field("initializer", or(def("Expression"), null), defaults["null"]);
    def("TSTypeQuery")
        .bases("TSType")
        .build("exprName")
        .field("exprName", or(TSEntityName, def("TSImportType")));
    // Inferred from Babylon's tsParseTypeMember method.
    var TSTypeMember = or(def("TSCallSignatureDeclaration"), def("TSConstructSignatureDeclaration"), def("TSIndexSignature"), def("TSMethodSignature"), def("TSPropertySignature"));
    def("TSTypeLiteral")
        .bases("TSType")
        .build("members")
        .field("members", [TSTypeMember]);
    def("TSTypeParameter")
        .bases("Identifier")
        .build("name", "constraint", "default")
        .field("name", or(def("Identifier"), String))
        .field("constraint", or(def("TSType"), void 0), defaults["undefined"])
        .field("default", or(def("TSType"), void 0), defaults["undefined"]);
    def("TSTypeAssertion")
        .bases("Expression", "Pattern")
        .build("typeAnnotation", "expression")
        .field("typeAnnotation", def("TSType"))
        .field("expression", def("Expression"))
        .field("extra", or({ parenthesized: Boolean }, null), defaults["null"]);
    def("TSTypeParameterDeclaration")
        .bases("Declaration")
        .build("params")
        .field("params", [def("TSTypeParameter")]);
    def("TSInstantiationExpression")
        .bases("Expression", "TSHasOptionalTypeParameterInstantiation")
        .build("expression", "typeParameters")
        .field("expression", def("Expression"));
    def("TSTypeParameterInstantiation")
        .bases("Node")
        .build("params")
        .field("params", [def("TSType")]);
    def("TSEnumDeclaration")
        .bases("Declaration")
        .build("id", "members")
        .field("id", def("Identifier"))
        .field("const", Boolean, defaults["false"])
        .field("declare", Boolean, defaults["false"])
        .field("members", [def("TSEnumMember")])
        .field("initializer", or(def("Expression"), null), defaults["null"]);
    def("TSTypeAliasDeclaration")
        .bases("Declaration", "TSHasOptionalTypeParameters")
        .build("id", "typeAnnotation")
        .field("id", def("Identifier"))
        .field("declare", Boolean, defaults["false"])
        .field("typeAnnotation", def("TSType"));
    def("TSModuleBlock")
        .bases("Node")
        .build("body")
        .field("body", [def("Statement")]);
    def("TSModuleDeclaration")
        .bases("Declaration")
        .build("id", "body")
        .field("id", or(StringLiteral, TSEntityName))
        .field("declare", Boolean, defaults["false"])
        .field("global", Boolean, defaults["false"])
        .field("body", or(def("TSModuleBlock"), def("TSModuleDeclaration"), null), defaults["null"]);
    def("TSImportType")
        .bases("TSType", "TSHasOptionalTypeParameterInstantiation")
        .build("argument", "qualifier", "typeParameters")
        .field("argument", StringLiteral)
        .field("qualifier", or(TSEntityName, void 0), defaults["undefined"]);
    def("TSImportEqualsDeclaration")
        .bases("Declaration")
        .build("id", "moduleReference")
        .field("id", def("Identifier"))
        .field("isExport", Boolean, defaults["false"])
        .field("moduleReference", or(TSEntityName, def("TSExternalModuleReference")));
    def("TSExternalModuleReference")
        .bases("Declaration")
        .build("expression")
        .field("expression", StringLiteral);
    def("TSExportAssignment")
        .bases("Statement")
        .build("expression")
        .field("expression", def("Expression"));
    def("TSNamespaceExportDeclaration")
        .bases("Declaration")
        .build("id")
        .field("id", def("Identifier"));
    def("TSInterfaceBody")
        .bases("Node")
        .build("body")
        .field("body", [TSTypeMember]);
    def("TSExpressionWithTypeArguments")
        .bases("TSType", "TSHasOptionalTypeParameterInstantiation")
        .build("expression", "typeParameters")
        .field("expression", TSEntityName);
    def("TSInterfaceDeclaration")
        .bases("Declaration", "TSHasOptionalTypeParameters")
        .build("id", "body")
        .field("id", TSEntityName)
        .field("declare", Boolean, defaults["false"])
        .field("extends", or([def("TSExpressionWithTypeArguments")], null), defaults["null"])
        .field("body", def("TSInterfaceBody"));
    def("TSParameterProperty")
        .bases("Pattern")
        .build("parameter")
        .field("accessibility", or("public", "private", "protected", void 0), defaults["undefined"])
        .field("readonly", Boolean, defaults["false"])
        .field("parameter", or(def("Identifier"), def("AssignmentPattern")));
    def("ClassProperty")
        .field("access", // Not "accessibility"?
    or("public", "private", "protected", void 0), defaults["undefined"]);
    def("ClassAccessorProperty")
        .bases("Declaration", "TSHasOptionalTypeAnnotation");
    // Defined already in es6 and babel-core.
    def("ClassBody")
        .field("body", [or(def("MethodDefinition"), def("VariableDeclarator"), def("ClassPropertyDefinition"), def("ClassProperty"), def("ClassPrivateProperty"), def("ClassAccessorProperty"), def("ClassMethod"), def("ClassPrivateMethod"), def("StaticBlock"), 
        // Just need to add these types:
        def("TSDeclareMethod"), TSTypeMember)]);
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=typescript.js.map