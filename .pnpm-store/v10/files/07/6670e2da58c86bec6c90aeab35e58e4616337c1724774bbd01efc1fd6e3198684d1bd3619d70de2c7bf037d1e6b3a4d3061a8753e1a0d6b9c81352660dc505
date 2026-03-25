"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var assert = chai.assert;
var index_1 = require("../src/index");
function testErrors(input, expectedErrors) {
    var errorsMap = {};
    for (var _i = 0, expectedErrors_1 = expectedErrors; _i < expectedErrors_1.length; _i++) {
        var e = expectedErrors_1[_i];
        var key = e.message + " at line " + e.line + " column " + e.column;
        if (e.isWarning) {
            key += " (warning)";
        }
        errorsMap[key] = true;
    }
    var ast = safeLoad(input);
    if (!ast) {
        assert.fail("The parser has failed to load YAML AST");
    }
    var actualErrors = ast.errors;
    if (actualErrors.length == 0 && expectedErrors.length == 0) {
        assert(true);
        return;
    }
    var unexpectedErrorsMap = {};
    for (var _a = 0, actualErrors_1 = actualErrors; _a < actualErrors_1.length; _a++) {
        var e = actualErrors_1[_a];
        var key = e.reason + " at line " + e.mark.line + " column " + e.mark.column;
        if (e.isWarning) {
            key += " (warning)";
        }
        if (!errorsMap[key]) {
            unexpectedErrorsMap[key] = e;
        }
        else {
            delete errorsMap[key];
        }
    }
    var missingErrors = Object.keys(errorsMap);
    var unexpectedErrorKeys = Object.keys(unexpectedErrorsMap);
    if (missingErrors.length == 0 && unexpectedErrorKeys.length == 0) {
        assert(true);
        return;
    }
    var messageComponents = [];
    if (unexpectedErrorKeys.length > 0) {
        messageComponents.push("Unexpected errors:\n" + unexpectedErrorKeys.join('\n'));
    }
    if (missingErrors.length > 0) {
        messageComponents.push("Missing errors:\n" + missingErrors.join('\n'));
    }
    var testFailureMessage = "\n" + messageComponents.join("\n\n");
    assert(false, testFailureMessage);
}
exports.testErrors = testErrors;
;
function safeLoad(input) {
    return index_1.safeLoad(input, {});
}
exports.safeLoad = safeLoad;
//# sourceMappingURL=testUtil.js.map