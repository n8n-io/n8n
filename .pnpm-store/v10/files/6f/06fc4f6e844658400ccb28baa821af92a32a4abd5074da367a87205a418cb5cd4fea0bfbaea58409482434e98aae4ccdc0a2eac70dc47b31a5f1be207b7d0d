import util = require("./testUtil");

suite('YAML Syntax', () => {

    suite('Warnings for tab symbols', () => {

        test('test 001', function () {
            testErrors(
                "schemas:\n" +
                "\tsch1:\n",
                [
                    {
                        line: 1,
                        column: 0,
                        message: "Using tabs can lead to unpredictable results",
                        isWarning: true
                    }
                ]
            );
        });

        test('test 002', function () {
            testErrors(
                "level0:\n" +
                "  level1:\n" +
                "    level2:\n" +
                "  \t  level3:\n",
                [
                    {
                        line: 3,
                        column: 2,
                        message: "Using tabs can lead to unpredictable results",
                        isWarning: true
                    }
                ]
            );
        });
    });
});

function testErrors(input:string,expectedErrors: util.TestError[]) {
    util.testErrors(input, expectedErrors);
}
