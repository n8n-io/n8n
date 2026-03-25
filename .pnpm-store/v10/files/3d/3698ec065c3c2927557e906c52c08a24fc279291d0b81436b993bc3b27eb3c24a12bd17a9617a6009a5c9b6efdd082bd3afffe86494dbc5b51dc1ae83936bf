"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var es2017_1 = tslib_1.__importDefault(require("./es2017"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    fork.use(es2017_1.default);
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    var or = types.Type.or;
    var defaults = fork.use(shared_1.default).defaults;
    def("ForOfStatement")
        .field("await", Boolean, defaults["false"]);
    // Legacy
    def("SpreadProperty")
        .bases("Node")
        .build("argument")
        .field("argument", def("Expression"));
    def("ObjectExpression")
        .field("properties", [or(def("Property"), def("SpreadProperty"), // Legacy
        def("SpreadElement"))]);
    def("TemplateElement")
        .field("value", { "cooked": or(String, null), "raw": String });
    // Legacy
    def("SpreadPropertyPattern")
        .bases("Pattern")
        .build("argument")
        .field("argument", def("Pattern"));
    def("ObjectPattern")
        .field("properties", [or(def("PropertyPattern"), def("Property"), def("RestElement"), def("SpreadPropertyPattern"))]);
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2018.js.map