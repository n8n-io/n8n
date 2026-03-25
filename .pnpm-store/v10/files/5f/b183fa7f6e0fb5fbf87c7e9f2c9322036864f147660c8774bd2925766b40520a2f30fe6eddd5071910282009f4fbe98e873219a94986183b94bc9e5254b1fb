"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var es2021_1 = tslib_1.__importDefault(require("./es2021"));
var types_1 = tslib_1.__importDefault(require("../types"));
var shared_1 = require("../shared");
function default_1(fork) {
    fork.use(es2021_1.default);
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    def("StaticBlock")
        .bases("Declaration")
        .build("body")
        .field("body", [def("Statement")]);
}
exports.default = default_1;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2022.js.map