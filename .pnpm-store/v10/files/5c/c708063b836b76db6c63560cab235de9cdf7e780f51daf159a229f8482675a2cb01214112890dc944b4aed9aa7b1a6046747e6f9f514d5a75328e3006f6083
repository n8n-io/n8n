"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var es_proposals_1 = tslib_1.__importDefault(require("./es-proposals"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    fork.use(es_proposals_1.default);
    var types = fork.use(types_1.default);
    var defaults = fork.use(shared_1.default).defaults;
    var def = types.Type.def;
    var or = types.Type.or;
    def("VariableDeclaration")
        .field("declarations", [or(def("VariableDeclarator"), def("Identifier") // Esprima deviation.
        )]);
    def("Property")
        .field("value", or(def("Expression"), def("Pattern") // Esprima deviation.
    ));
    def("ArrayPattern")
        .field("elements", [or(def("Pattern"), def("SpreadElement"), null)]);
    def("ObjectPattern")
        .field("properties", [or(def("Property"), def("PropertyPattern"), def("SpreadPropertyPattern"), def("SpreadProperty") // Used by Esprima.
        )]);
    // Like ModuleSpecifier, except type:"ExportSpecifier" and buildable.
    // export {<id [as name]>} [from ...];
    def("ExportSpecifier")
        .bases("ModuleSpecifier")
        .build("id", "name");
    // export <*> from ...;
    def("ExportBatchSpecifier")
        .bases("Specifier")
        .build();
    def("ExportDeclaration")
        .bases("Declaration")
        .build("default", "declaration", "specifiers", "source")
        .field("default", Boolean)
        .field("declaration", or(def("Declaration"), def("Expression"), // Implies default.
    null))
        .field("specifiers", [or(def("ExportSpecifier"), def("ExportBatchSpecifier"))], defaults.emptyArray)
        .field("source", or(def("Literal"), null), defaults["null"]);
    def("Block")
        .bases("Comment")
        .build("value", /*optional:*/ "leading", "trailing");
    def("Line")
        .bases("Comment")
        .build("value", /*optional:*/ "leading", "trailing");
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=esprima.js.map