"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var es2018_1 = tslib_1.__importDefault(require("./es2018"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = tslib_1.__importStar(require("../shared"));
function default_1(fork) {
    fork.use(es2018_1.default);
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    var or = types.Type.or;
    var defaults = fork.use(shared_1.default).defaults;
    def("CatchClause")
        .field("param", or(def("Pattern"), null), defaults["null"]);
}
exports.default = default_1;
;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2019.js.map