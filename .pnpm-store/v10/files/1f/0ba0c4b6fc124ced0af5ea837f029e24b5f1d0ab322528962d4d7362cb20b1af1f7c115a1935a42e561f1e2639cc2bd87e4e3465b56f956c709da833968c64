"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var shared_1 = require("../../shared");
var core_1 = tslib_1.__importDefault(require("./core"));
function default_1(fork) {
    var result = fork.use(core_1.default);
    // Exponentiation operators. Must run before BinaryOperators or
    // AssignmentOperators are used (hence before fork.use(es6Def)).
    // https://github.com/tc39/proposal-exponentiation-operator
    if (result.BinaryOperators.indexOf("**") < 0) {
        result.BinaryOperators.push("**");
    }
    if (result.AssignmentOperators.indexOf("**=") < 0) {
        result.AssignmentOperators.push("**=");
    }
    return result;
}
exports.default = default_1;
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=es2016.js.map