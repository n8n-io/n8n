"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("./testUtil");
suite('YAML Syntax', function () {
    suite('Warnings for tab symbols', function () {
        test('test 001', function () {
            testErrors("schemas:\n" +
                "  - !i", [
                {
                    line: 1,
                    column: 4,
                    message: "unknown tag <!i>",
                    isWarning: false
                }
            ]);
        });
        test('test 002', function () {
            testErrors("schemas:\n" +
                "  - !in", [
                {
                    line: 1,
                    column: 4,
                    message: "unknown tag <!in>",
                    isWarning: false
                }
            ]);
        });
        test('test 003', function () {
            testErrors("schemas:\n" +
                "  - !inc", [
                {
                    line: 1,
                    column: 4,
                    message: "unknown tag <!inc>",
                    isWarning: false
                }
            ]);
        });
        test('test 004', function () {
            testErrors("schemas:\n" +
                "  - !incl", [
                {
                    line: 1,
                    column: 4,
                    message: "unknown tag <!incl>",
                    isWarning: false
                }
            ]);
        });
    });
});
function testErrors(input, expectedErrors) {
    util.testErrors(input, expectedErrors);
}
//# sourceMappingURL=stability.test.js.map