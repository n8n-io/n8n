"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var YAML = require("../src/");
var util = require("./testUtil");
suite('YAML Syntax', function () {
    test('Allow astral characters', function () {
        var key = '𝑘𝑒𝑦';
        var value = '𝑣𝑎𝑙𝑢𝑒';
        var document = YAML.safeLoad(key + ": " + value);
        chai_1.assert.deepEqual(document.mappings[0].key.value, key);
        chai_1.assert.deepEqual(document.mappings[0].value.value, value);
    });
    test('Forbid non-printable characters', function () {
        testErrors('\x01', [{
                line: 1,
                column: 0,
                message: 'the stream contains non-printable characters',
                isWarning: false
            }]);
        testErrors('\x7f', [{
                line: 1,
                column: 0,
                message: 'the stream contains non-printable characters',
                isWarning: false
            }]);
        testErrors('\x9f', [{
                line: 1,
                column: 0,
                message: 'the stream contains non-printable characters',
                isWarning: false
            }]);
    });
    test('Forbid lone surrogates', function () {
        testErrors('\udc00\ud800', [{
                line: 1,
                column: 0,
                message: 'the stream contains non-printable characters',
                isWarning: false
            }]);
    });
    test('Allow non-printable characters inside quoted scalars', function () {
        var key = '"\x7f\x9f\udc00\ud800"';
        var document = YAML.safeLoad(key);
        chai_1.assert.deepEqual(document.value, '\x7f\x9f\udc00\ud800');
    });
    test('Forbid control sequences inside quoted scalars', function () {
        testErrors('"\x03"', [{
                line: 0,
                column: 2,
                message: 'expected valid JSON character',
                isWarning: false
            }]);
    });
});
function testErrors(input, expectedErrors) {
    util.testErrors(input, expectedErrors);
}
//# sourceMappingURL=characterSet.test.js.map