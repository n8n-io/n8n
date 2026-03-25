"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var es_proposals_1 = tslib_1.__importDefault(require("./es-proposals"));
var type_annotations_1 = tslib_1.__importDefault(require("./type-annotations"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    fork.use(es_proposals_1.default);
    fork.use(type_annotations_1.default);
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    var or = types.Type.or;
    var defaults = fork.use(shared_1.default).defaults;
    // Base types
    def("Flow").bases("Node");
    def("FlowType").bases("Flow");
    // Type annotations
    def("AnyTypeAnnotation")
        .bases("FlowType")
        .build();
    def("EmptyTypeAnnotation")
        .bases("FlowType")
        .build();
    def("MixedTypeAnnotation")
        .bases("FlowType")
        .build();
    def("VoidTypeAnnotation")
        .bases("FlowType")
        .build();
    def("SymbolTypeAnnotation")
        .bases("FlowType")
        .build();
    def("NumberTypeAnnotation")
        .bases("FlowType")
        .build();
    def("BigIntTypeAnnotation")
        .bases("FlowType")
        .build();
    def("NumberLiteralTypeAnnotation")
        .bases("FlowType")
        .build("value", "raw")
        .field("value", Number)
        .field("raw", String);
    // Babylon 6 differs in AST from Flow
    // same as NumberLiteralTypeAnnotation
    def("NumericLiteralTypeAnnotation")
        .bases("FlowType")
        .build("value", "raw")
        .field("value", Number)
        .field("raw", String);
    def("BigIntLiteralTypeAnnotation")
        .bases("FlowType")
        .build("value", "raw")
        .field("value", null)
        .field("raw", String);
    def("StringTypeAnnotation")
        .bases("FlowType")
        .build();
    def("StringLiteralTypeAnnotation")
        .bases("FlowType")
        .build("value", "raw")
        .field("value", String)
        .field("raw", String);
    def("BooleanTypeAnnotation")
        .bases("FlowType")
        .build();
    def("BooleanLiteralTypeAnnotation")
        .bases("FlowType")
        .build("value", "raw")
        .field("value", Boolean)
        .field("raw", String);
    def("TypeAnnotation")
        .bases("Node")
        .build("typeAnnotation")
        .field("typeAnnotation", def("FlowType"));
    def("NullableTypeAnnotation")
        .bases("FlowType")
        .build("typeAnnotation")
        .field("typeAnnotation", def("FlowType"));
    def("NullLiteralTypeAnnotation")
        .bases("FlowType")
        .build();
    def("NullTypeAnnotation")
        .bases("FlowType")
        .build();
    def("ThisTypeAnnotation")
        .bases("FlowType")
        .build();
    def("ExistsTypeAnnotation")
        .bases("FlowType")
        .build();
    def("ExistentialTypeParam")
        .bases("FlowType")
        .build();
    def("FunctionTypeAnnotation")
        .bases("FlowType")
        .build("params", "returnType", "rest", "typeParameters")
        .field("params", [def("FunctionTypeParam")])
        .field("returnType", def("FlowType"))
        .field("rest", or(def("FunctionTypeParam"), null))
        .field("typeParameters", or(def("TypeParameterDeclaration"), null));
    def("FunctionTypeParam")
        .bases("Node")
        .build("name", "typeAnnotation", "optional")
        .field("name", or(def("Identifier"), null))
        .field("typeAnnotation", def("FlowType"))
        .field("optional", Boolean);
    def("ArrayTypeAnnotation")
        .bases("FlowType")
        .build("elementType")
        .field("elementType", def("FlowType"));
    def("ObjectTypeAnnotation")
        .bases("FlowType")
        .build("properties", "indexers", "callProperties")
        .field("properties", [
        or(def("ObjectTypeProperty"), def("ObjectTypeSpreadProperty"))
    ])
        .field("indexers", [def("ObjectTypeIndexer")], defaults.emptyArray)
        .field("callProperties", [def("ObjectTypeCallProperty")], defaults.emptyArray)
        .field("inexact", or(Boolean, void 0), defaults["undefined"])
        .field("exact", Boolean, defaults["false"])
        .field("internalSlots", [def("ObjectTypeInternalSlot")], defaults.emptyArray);
    def("Variance")
        .bases("Node")
        .build("kind")
        .field("kind", or("plus", "minus"));
    var LegacyVariance = or(def("Variance"), "plus", "minus", null);
    def("ObjectTypeProperty")
        .bases("Node")
        .build("key", "value", "optional")
        .field("key", or(def("Literal"), def("Identifier")))
        .field("value", def("FlowType"))
        .field("optional", Boolean)
        .field("variance", LegacyVariance, defaults["null"]);
    def("ObjectTypeIndexer")
        .bases("Node")
        .build("id", "key", "value")
        .field("id", def("Identifier"))
        .field("key", def("FlowType"))
        .field("value", def("FlowType"))
        .field("variance", LegacyVariance, defaults["null"])
        .field("static", Boolean, defaults["false"]);
    def("ObjectTypeCallProperty")
        .bases("Node")
        .build("value")
        .field("value", def("FunctionTypeAnnotation"))
        .field("static", Boolean, defaults["false"]);
    def("QualifiedTypeIdentifier")
        .bases("Node")
        .build("qualification", "id")
        .field("qualification", or(def("Identifier"), def("QualifiedTypeIdentifier")))
        .field("id", def("Identifier"));
    def("GenericTypeAnnotation")
        .bases("FlowType")
        .build("id", "typeParameters")
        .field("id", or(def("Identifier"), def("QualifiedTypeIdentifier")))
        .field("typeParameters", or(def("TypeParameterInstantiation"), null));
    def("MemberTypeAnnotation")
        .bases("FlowType")
        .build("object", "property")
        .field("object", def("Identifier"))
        .field("property", or(def("MemberTypeAnnotation"), def("GenericTypeAnnotation")));
    def("IndexedAccessType")
        .bases("FlowType")
        .build("objectType", "indexType")
        .field("objectType", def("FlowType"))
        .field("indexType", def("FlowType"));
    def("OptionalIndexedAccessType")
        .bases("FlowType")
        .build("objectType", "indexType", "optional")
        .field("objectType", def("FlowType"))
        .field("indexType", def("FlowType"))
        .field('optional', Boolean);
    def("UnionTypeAnnotation")
        .bases("FlowType")
        .build("types")
        .field("types", [def("FlowType")]);
    def("IntersectionTypeAnnotation")
        .bases("FlowType")
        .build("types")
        .field("types", [def("FlowType")]);
    def("TypeofTypeAnnotation")
        .bases("FlowType")
        .build("argument")
        .field("argument", def("FlowType"));
    def("ObjectTypeSpreadProperty")
        .bases("Node")
        .build("argument")
        .field("argument", def("FlowType"));
    def("ObjectTypeInternalSlot")
        .bases("Node")
        .build("id", "value", "optional", "static", "method")
        .field("id", def("Identifier"))
        .field("value", def("FlowType"))
        .field("optional", Boolean)
        .field("static", Boolean)
        .field("method", Boolean);
    def("TypeParameterDeclaration")
        .bases("Node")
        .build("params")
        .field("params", [def("TypeParameter")]);
    def("TypeParameterInstantiation")
        .bases("Node")
        .build("params")
        .field("params", [def("FlowType")]);
    def("TypeParameter")
        .bases("FlowType")
        .build("name", "variance", "bound", "default")
        .field("name", String)
        .field("variance", LegacyVariance, defaults["null"])
        .field("bound", or(def("TypeAnnotation"), null), defaults["null"])
        .field("default", or(def("FlowType"), null), defaults["null"]);
    def("ClassProperty")
        .field("variance", LegacyVariance, defaults["null"]);
    def("ClassImplements")
        .bases("Node")
        .build("id")
        .field("id", def("Identifier"))
        .field("superClass", or(def("Expression"), null), defaults["null"])
        .field("typeParameters", or(def("TypeParameterInstantiation"), null), defaults["null"]);
    def("InterfaceTypeAnnotation")
        .bases("FlowType")
        .build("body", "extends")
        .field("body", def("ObjectTypeAnnotation"))
        .field("extends", or([def("InterfaceExtends")], null), defaults["null"]);
    def("InterfaceDeclaration")
        .bases("Declaration")
        .build("id", "body", "extends")
        .field("id", def("Identifier"))
        .field("typeParameters", or(def("TypeParameterDeclaration"), null), defaults["null"])
        .field("body", def("ObjectTypeAnnotation"))
        .field("extends", [def("InterfaceExtends")]);
    def("DeclareInterface")
        .bases("InterfaceDeclaration")
        .build("id", "body", "extends");
    def("InterfaceExtends")
        .bases("Node")
        .build("id")
        .field("id", def("Identifier"))
        .field("typeParameters", or(def("TypeParameterInstantiation"), null), defaults["null"]);
    def("TypeAlias")
        .bases("Declaration")
        .build("id", "typeParameters", "right")
        .field("id", def("Identifier"))
        .field("typeParameters", or(def("TypeParameterDeclaration"), null))
        .field("right", def("FlowType"));
    def("DeclareTypeAlias")
        .bases("TypeAlias")
        .build("id", "typeParameters", "right");
    def("OpaqueType")
        .bases("Declaration")
        .build("id", "typeParameters", "impltype", "supertype")
        .field("id", def("Identifier"))
        .field("typeParameters", or(def("TypeParameterDeclaration"), null))
        .field("impltype", def("FlowType"))
        .field("supertype", or(def("FlowType"), null));
    def("DeclareOpaqueType")
        .bases("OpaqueType")
        .build("id", "typeParameters", "supertype")
        .field("impltype", or(def("FlowType"), null));
    def("TypeCastExpression")
        .bases("Expression")
        .build("expression", "typeAnnotation")
        .field("expression", def("Expression"))
        .field("typeAnnotation", def("TypeAnnotation"));
    def("TupleTypeAnnotation")
        .bases("FlowType")
        .build("types")
        .field("types", [def("FlowType")]);
    def("DeclareVariable")
        .bases("Statement")
        .build("id")
        .field("id", def("Identifier"));
    def("DeclareFunction")
        .bases("Statement")
        .build("id")
        .field("id", def("Identifier"))
        .field("predicate", or(def("FlowPredicate"), null), defaults["null"]);
    def("DeclareClass")
        .bases("InterfaceDeclaration")
        .build("id");
    def("DeclareModule")
        .bases("Statement")
        .build("id", "body")
        .field("id", or(def("Identifier"), def("Literal")))
        .field("body", def("BlockStatement"));
    def("DeclareModuleExports")
        .bases("Statement")
        .build("typeAnnotation")
        .field("typeAnnotation", def("TypeAnnotation"));
    def("DeclareExportDeclaration")
        .bases("Declaration")
        .build("default", "declaration", "specifiers", "source")
        .field("default", Boolean)
        .field("declaration", or(def("DeclareVariable"), def("DeclareFunction"), def("DeclareClass"), def("FlowType"), // Implies default.
    def("TypeAlias"), // Implies named type
    def("DeclareOpaqueType"), // Implies named opaque type
    def("InterfaceDeclaration"), null))
        .field("specifiers", [or(def("ExportSpecifier"), def("ExportBatchSpecifier"))], defaults.emptyArray)
        .field("source", or(def("Literal"), null), defaults["null"]);
    def("DeclareExportAllDeclaration")
        .bases("Declaration")
        .build("source")
        .field("source", or(def("Literal"), null), defaults["null"]);
    def("ImportDeclaration")
        .field("importKind", or("value", "type", "typeof"), function () { return "value"; });
    def("FlowPredicate").bases("Flow");
    def("InferredPredicate")
        .bases("FlowPredicate")
        .build();
    def("DeclaredPredicate")
        .bases("FlowPredicate")
        .build("value")
        .field("value", def("Expression"));
    def("Function")
        .field("predicate", or(def("FlowPredicate"), null), defaults["null"]);
    def("CallExpression")
        .field("typeArguments", or(null, def("TypeParameterInstantiation")), defaults["null"]);
    def("NewExpression")
        .field("typeArguments", or(null, def("TypeParameterInstantiation")), defaults["null"]);
    // Enums
    def("EnumDeclaration")
        .bases("Declaration")
        .build("id", "body")
        .field("id", def("Identifier"))
        .field("body", or(def("EnumBooleanBody"), def("EnumNumberBody"), def("EnumStringBody"), def("EnumSymbolBody")));
    def("EnumBooleanBody")
        .build("members", "explicitType")
        .field("members", [def("EnumBooleanMember")])
        .field("explicitType", Boolean);
    def("EnumNumberBody")
        .build("members", "explicitType")
        .field("members", [def("EnumNumberMember")])
        .field("explicitType", Boolean);
    def("EnumStringBody")
        .build("members", "explicitType")
        .field("members", or([def("EnumStringMember")], [def("EnumDefaultedMember")]))
        .field("explicitType", Boolean);
    def("EnumSymbolBody")
        .build("members")
        .field("members", [def("EnumDefaultedMember")]);
    def("EnumBooleanMember")
        .build("id", "init")
        .field("id", def("Identifier"))
        .field("init", or(def("Literal"), Boolean));
    def("EnumNumberMember")
        .build("id", "init")
        .field("id", def("Identifier"))
        .field("init", def("Literal"));
    def("EnumStringMember")
        .build("id", "init")
        .field("id", def("Identifier"))
        .field("init", def("Literal"));
    def("EnumDefaultedMember")
        .build("id")
        .field("id", def("Identifier"));
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=flow.js.map