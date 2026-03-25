"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var types_1 = tslib_1.__importDefault(require("../types"));
var babel_core_1 = tslib_1.__importDefault(require("./babel-core"));
var flow_1 = tslib_1.__importDefault(require("./flow"));
var shared_1 = require("../shared");
function default_1(fork) {
    var types = fork.use(types_1.default);
    var def = types.Type.def;
    fork.use(babel_core_1.default);
    fork.use(flow_1.default);
    // https://github.com/babel/babel/pull/10148
    def("V8IntrinsicIdentifier")
        .bases("Expression")
        .build("name")
        .field("name", String);
    // https://github.com/babel/babel/pull/13191
    // https://github.com/babel/website/pull/2541
    def("TopicReference")
        .bases("Expression")
        .build();
}
exports.default = default_1;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=babel.js.map