"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("./testUtil");
suite('YAML Syntax', function () {
    suite('Warnings for tab symbols', function () {
        test('test 001', function () {
            testErrors("schemas:\n" +
                "\tsch1:\n", [
                {
                    line: 1,
                    column: 0,
                    message: "Using tabs can lead to unpredictable results",
                    isWarning: true
                }
            ]);
        });
        test('test 002', function () {
            testErrors("level0:\n" +
                "  level1:\n" +
                "    level2:\n" +
                "  \t  level3:\n", [
                {
                    line: 3,
                    column: 2,
                    message: "Using tabs can lead to unpredictable results",
                    isWarning: true
                }
            ]);
        });
    });
});
function testErrors(input, expectedErrors) {
    util.testErrors(input, expectedErrors);
}
//# sourceMappingURL=yamlSyntax.test.js.map