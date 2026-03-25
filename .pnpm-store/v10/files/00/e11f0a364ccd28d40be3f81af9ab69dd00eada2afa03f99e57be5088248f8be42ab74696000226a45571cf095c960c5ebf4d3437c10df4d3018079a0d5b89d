"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_1 = tslib_1.__importDefault(require("./core"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    fork.use(core_1.default);
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    var or = types.Type.or;
    var defaults = fork.use(shared_1.default).defaults;
    def("Function")
        .field("generator", Boolean, defaults["false"])
        .field("expression", Boolean, defaults["false"])
        .field("defaults", [or(def("Expression"), null)], defaults.emptyArray)
        // Legacy
        .field("rest", or(def("Identifier"), null), defaults["null"]);
    // The ESTree way of representing a ...rest parameter.
    def("RestElement")
        .bases("Pattern")
        .build("argument")
        .field("argument", def("Pattern"))
        .field("typeAnnotation", // for Babylon. Flow parser puts it on the identifier
    or(def("TypeAnnotation"), def("TSTypeAnnotation"), null), defaults["null"]);
    def("SpreadElementPattern")
        .bases("Pattern")
        .build("argument")
        .field("argument", def("Pattern"));
    def("FunctionDeclaration")
        .build("id", "params", "body", "generator", "expression")
        // May be `null` in the context of `export default function () {}`
        .field("id", or(def("Identifier"), null));
    def("FunctionExpression")
        .build("id", "params", "body", "generator", "expression");
    def("ArrowFunctionExpression")
        .bases("Function", "Expression")
        .build("params", "body", "expression")
        // The forced null value here is compatible with the overridden
        // definition of the "id" field in the Function interface.
        .field("id", null, defaults["null"])
        // Arrow function bodies are allowed to be expressions.
        .field("body", or(def("BlockStatement"), def("Expression")))
        // The current spec forbids arrow generators, so I have taken the
        // liberty of enforcing that. TODO Report this.
        .field("generator", false, defaults["false"]);
    def("ForOfStatement")
        .bases("Statement")
        .build("left", "right", "body")
        .field("left", or(def("VariableDeclaration"), def("Pattern")))
        .field("right", def("Expression"))
        .field("body", def("Statement"));
    def("YieldExpression")
        .bases("Expression")
        .build("argument", "delegate")
        .field("argument", or(def("Expression"), null))
        .field("delegate", Boolean, defaults["false"]);
    def("GeneratorExpression")
        .bases("Expression")
        .build("body", "blocks", "filter")
        .field("body", def("Expression"))
        .field("blocks", [def("ComprehensionBlock")])
        .field("filter", or(def("Expression"), null));
    def("ComprehensionExpression")
        .bases("Expression")
        .build("body", "blocks", "filter")
        .field("body", def("Expression"))
        .field("blocks", [def("ComprehensionBlock")])
        .field("filter", or(def("Expression"), null));
    def("ComprehensionBlock")
        .bases("Node")
        .build("left", "right", "each")
        .field("left", def("Pattern"))
        .field("right", def("Expression"))
        .field("each", Boolean);
    def("Property")
        .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
        .field("value", or(def("Expression"), def("Pattern")))
        .field("method", Boolean, defaults["false"])
        .field("shorthand", Boolean, defaults["false"])
        .field("computed", Boolean, defaults["false"]);
    def("ObjectProperty")
        .field("shorthand", Boolean, defaults["false"]);
    def("PropertyPattern")
        .bases("Pattern")
        .build("key", "pattern")
        .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
        .field("pattern", def("Pattern"))
        .field("computed", Boolean, defaults["false"]);
    def("ObjectPattern")
        .bases("Pattern")
        .build("properties")
        .field("properties", [or(def("PropertyPattern"), def("Property"))]);
    def("ArrayPattern")
        .bases("Pattern")
        .build("elements")
        .field("elements", [or(def("Pattern"), null)]);
    def("SpreadElement")
        .bases("Node")
        .build("argument")
        .field("argument", def("Expression"));
    def("ArrayExpression")
        .field("elements", [or(def("Expression"), def("SpreadElement"), def("RestElement"), null)]);
    def("NewExpression")
        .field("arguments", [or(def("Expression"), def("SpreadElement"))]);
    def("CallExpression")
        .field("arguments", [or(def("Expression"), def("SpreadElement"))]);
    // Note: this node type is *not* an AssignmentExpression with a Pattern on
    // the left-hand side! The existing AssignmentExpression type already
    // supports destructuring assignments. AssignmentPattern nodes may appear
    // wherever a Pattern is allowed, and the right-hand side represents a
    // default value to be destructured against the left-hand side, if no
    // value is otherwise provided. For example: default parameter values.
    def("AssignmentPattern")
        .bases("Pattern")
        .build("left", "right")
        .field("left", def("Pattern"))
        .field("right", def("Expression"));
    def("MethodDefinition")
        .bases("Declaration")
        .build("kind", "key", "value", "static")
        .field("kind", or("constructor", "method", "get", "set"))
        .field("key", def("Expression"))
        .field("value", def("Function"))
        .field("computed", Boolean, defaults["false"])
        .field("static", Boolean, defaults["false"]);
    var ClassBodyElement = or(def("MethodDefinition"), def("VariableDeclarator"), def("ClassPropertyDefinition"), def("ClassProperty"), def("StaticBlock"));
    def("ClassProperty")
        .bases("Declaration")
        .build("key")
        .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
        .field("computed", Boolean, defaults["false"]);
    def("ClassPropertyDefinition") // static property
        .bases("Declaration")
        .build("definition")
        // Yes, Virginia, circular definitions are permitted.
        .field("definition", ClassBodyElement);
    def("ClassBody")
        .bases("Declaration")
        .build("body")
        .field("body", [ClassBodyElement]);
    def("ClassDeclaration")
        .bases("Declaration")
        .build("id", "body", "superClass")
        .field("id", or(def("Identifier"), null))
        .field("body", def("ClassBody"))
        .field("superClass", or(def("Expression"), null), defaults["null"]);
    def("ClassExpression")
        .bases("Expression")
        .build("id", "body", "superClass")
        .field("id", or(def("Identifier"), null), defaults["null"])
        .field("body", def("ClassBody"))
        .field("superClass", or(def("Expression"), null), defaults["null"]);
    def("Super")
        .bases("Expression")
        .build();
    // Specifier and ModuleSpecifier are abstract non-standard types
    // introduced for definitional convenience.
    def("Specifier").bases("Node");
    // This supertype is shared/abused by both def/babel.js and
    // def/esprima.js. In the future, it will be possible to load only one set
    // of definitions appropriate for a given parser, but until then we must
    // rely on default functions to reconcile the conflicting AST formats.
    def("ModuleSpecifier")
        .bases("Specifier")
        // This local field is used by Babel/Acorn. It should not technically
        // be optional in the Babel/Acorn AST format, but it must be optional
        // in the Esprima AST format.
        .field("local", or(def("Identifier"), null), defaults["null"])
        // The id and name fields are used by Esprima. The id field should not
        // technically be optional in the Esprima AST format, but it must be
        // optional in the Babel/Acorn AST format.
        .field("id", or(def("Identifier"), null), defaults["null"])
        .field("name", or(def("Identifier"), null), defaults["null"]);
    // import {<id [as name]>} from ...;
    def("ImportSpecifier")
        .bases("ModuleSpecifier")
        .build("imported", "local")
        .field("imported", def("Identifier"));
    // import <id> from ...;
    def("ImportDefaultSpecifier")
        .bases("ModuleSpecifier")
        .build("local");
    // import <* as id> from ...;
    def("ImportNamespaceSpecifier")
        .bases("ModuleSpecifier")
        .build("local");
    def("ImportDeclaration")
        .bases("Declaration")
        .build("specifiers", "source", "importKind")
        .field("specifiers", [or(def("ImportSpecifier"), def("ImportNamespaceSpecifier"), def("ImportDefaultSpecifier"))], defaults.emptyArray)
        .field("source", def("Literal"))
        .field("importKind", or("value", "type"), function () {
        return "value";
    });
    def("ExportNamedDeclaration")
        .bases("Declaration")
        .build("declaration", "specifiers", "source")
        .field("declaration", or(def("Declaration"), null))
        .field("specifiers", [def("ExportSpecifier")], defaults.emptyArray)
        .field("source", or(def("Literal"), null), defaults["null"]);
    def("ExportSpecifier")
        .bases("ModuleSpecifier")
        .build("local", "exported")
        .field("exported", def("Identifier"));
    def("ExportDefaultDeclaration")
        .bases("Declaration")
        .build("declaration")
        .field("declaration", or(def("Declaration"), def("Expression")));
    def("ExportAllDeclaration")
        .bases("Declaration")
        .build("source")
        .field("source", def("Literal"));
    def("TaggedTemplateExpression")
        .bases("Expression")
        .build("tag", "quasi")
        .field("tag", def("Expression"))
        .field("quasi", def("TemplateLiteral"));
    def("TemplateLiteral")
        .bases("Expression")
        .build("quasis", "expressions")
        .field("quasis", [def("TemplateElement")])
        .field("expressions", [def("Expression")]);
    def("TemplateElement")
        .bases("Node")
        .build("value", "tail")
        .field("value", { "cooked": String, "raw": String })
        .field("tail", Boolean);
    def("MetaProperty")
        .bases("Expression")
        .build("meta", "property")
        .field("meta", def("Identifier"))
        .field("property", def("Identifier"));
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es6.js.map