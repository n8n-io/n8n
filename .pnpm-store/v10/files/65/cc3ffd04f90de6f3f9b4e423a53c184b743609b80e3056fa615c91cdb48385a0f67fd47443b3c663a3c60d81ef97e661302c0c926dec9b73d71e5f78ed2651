"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
var es2022_1 = tslib_1.__importDefault(require("./es2022"));
function default_1(fork) {
    fork.use(es2022_1.default);
    var types = fork.use(types_1.default);
    var Type = types.Type;
    var def = types.Type.def;
    var or = Type.or;
    var shared = fork.use(shared_1.default);
    var defaults = shared.defaults;
    def("AwaitExpression")
        .build("argument", "all")
        .field("argument", or(def("Expression"), null))
        .field("all", Boolean, defaults["false"]);
    // Decorators
    def("Decorator")
        .bases("Node")
        .build("expression")
        .field("expression", def("Expression"));
    def("Property")
        .field("decorators", or([def("Decorator")], null), defaults["null"]);
    def("MethodDefinition")
        .field("decorators", or([def("Decorator")], null), defaults["null"]);
    // Private names
    def("PrivateName")
        .bases("Expression", "Pattern")
        .build("id")
        .field("id", def("Identifier"));
    def("ClassPrivateProperty")
        .bases("ClassProperty")
        .build("key", "value")
        .field("key", def("PrivateName"))
        .field("value", or(def("Expression"), null), defaults["null"]);
    // https://github.com/tc39/proposal-import-assertions
    def("ImportAttribute")
        .bases("Node")
        .build("key", "value")
        .field("key", or(def("Identifier"), def("Literal")))
        .field("value", def("Expression"));
    ["ImportDeclaration",
        "ExportAllDeclaration",
        "ExportNamedDeclaration",
    ].forEach(function (decl) {
        def(decl).field("assertions", [def("ImportAttribute")], defaults.emptyArray);
    });
    // https://github.com/tc39/proposal-record-tuple
    // https://github.com/babel/babel/pull/10865
    def("RecordExpression")
        .bases("Expression")
        .build("properties")
        .field("properties", [or(def("ObjectProperty"), def("ObjectMethod"), def("SpreadElement"))]);
    def("TupleExpression")
        .bases("Expression")
        .build("elements")
        .field("elements", [or(def("Expression"), def("SpreadElement"), null)]);
    // https://github.com/tc39/proposal-js-module-blocks
    // https://github.com/babel/babel/pull/12469
    def("ModuleExpression")
        .bases("Node")
        .build("body")
        .field("body", def("Program"));
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es-proposals.js.map