"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var shared_1 = require("../../shared");
var es2016_1 = tslib_1.__importDefault(require("./es2016"));
function default_1(fork) {
    var result = fork.use(es2016_1.default);
    // Nullish coalescing. Must run before LogicalOperators is used.
    // https://github.com/tc39/proposal-nullish-coalescing
    if (result.LogicalOperators.indexOf("??") < 0) {
        result.LogicalOperators.push("??");
    }
    return result;
}
exports.default = default_1;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2020.js.map