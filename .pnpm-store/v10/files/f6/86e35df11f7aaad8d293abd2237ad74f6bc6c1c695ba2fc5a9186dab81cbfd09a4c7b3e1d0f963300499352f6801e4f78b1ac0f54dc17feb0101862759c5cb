"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var shared_1 = require("../../shared");
var es2020_1 = tslib_1.__importDefault(require("./es2020"));
function default_1(fork) {
    var result = fork.use(es2020_1.default);
    // Logical assignment operators. Must run before AssignmentOperators is used.
    // https://github.com/tc39/proposal-logical-assignment
    result.LogicalOperators.forEach(function (op) {
        var assignOp = op + "=";
        if (result.AssignmentOperators.indexOf(assignOp) < 0) {
            result.AssignmentOperators.push(assignOp);
        }
    });
    return result;
}
exports.default = default_1;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2021.js.map