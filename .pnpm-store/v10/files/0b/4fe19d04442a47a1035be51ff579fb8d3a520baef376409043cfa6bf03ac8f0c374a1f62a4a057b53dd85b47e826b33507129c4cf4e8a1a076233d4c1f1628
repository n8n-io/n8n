"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var assert = chai.assert;
var scalarInference_1 = require("../src/scalarInference");
var Yaml = require("../src/index");
suite('determineScalarType', function () {
    function determineScalarType(scalar) {
        return scalarInference_1.determineScalarType(scalar);
    }
    function safeLoad(input) {
        return Yaml.safeLoad(input, {});
    }
    var _test = test;
    suite('Plain Tag Resolution', function () {
        function test(name, type, acceptable) {
            _test(name, function () {
                for (var _i = 0, acceptable_1 = acceptable; _i < acceptable_1.length; _i++) {
                    var word = acceptable_1[_i];
                    assert.strictEqual(determineScalarType(safeLoad(word)), type, word);
                }
            });
        }
        ;
        test('boolean', scalarInference_1.ScalarType.bool, ["true", "True", "TRUE", "false", "False", "FALSE"]);
        test("null", scalarInference_1.ScalarType.null, ["null", "Null", "NULL", "~", ""]);
        _test("null as from an array", function () {
            var node = Yaml.newScalar('');
            node.plainScalar = true;
            assert.strictEqual(determineScalarType(node), scalarInference_1.ScalarType.null, "unquoted empty string");
        });
        test("integer", scalarInference_1.ScalarType.int, ["0", "0o7", "0x3A", "-19"]);
        test("float", scalarInference_1.ScalarType.float, ["0.", "-0.0", ".5", "+12e03", "-2E+05"]);
        test("float-infinity", scalarInference_1.ScalarType.float, [".inf", "-.Inf", "+.INF"]);
        test("float-NaN", scalarInference_1.ScalarType.float, [".nan", ".NaN", ".NAN"]);
        test("string", scalarInference_1.ScalarType.string, ["'true'", "TrUe", "nULl", "''", "'0'", '"1"', '" .5"', ".inF", ".nAn"]);
    });
    suite('Flow style', function () {
        test('still recognizes types', function () {
            var node = safeLoad("[ null,\n  true,\n  0,\n  0.,\n  .inf,\n  .nan,\n  \"-123\n345\"\n]");
            var expected = [scalarInference_1.ScalarType.null, scalarInference_1.ScalarType.bool, scalarInference_1.ScalarType.int, scalarInference_1.ScalarType.float, scalarInference_1.ScalarType.float, scalarInference_1.ScalarType.float, scalarInference_1.ScalarType.string];
            assert.deepEqual(node.items.map(function (d) { return determineScalarType(d); }), expected);
        });
    });
    suite('Block styles', function () {
        var variations = ['>', '|', '>8', '|+1', '>-', '>+', '|-', '|+'];
        test('are always strings', function () {
            for (var _i = 0, variations_1 = variations; _i < variations_1.length; _i++) {
                var variant = variations_1[_i];
                assert.deepEqual(determineScalarType(safeLoad(variant + "\n 123")), scalarInference_1.ScalarType.string);
            }
        });
    });
});
suite('parseYamlInteger', function () {
    test('decimal', function () {
        assert.strictEqual(scalarInference_1.parseYamlInteger("0"), 0);
        assert.strictEqual(scalarInference_1.parseYamlInteger("-19"), -19);
        assert.strictEqual(scalarInference_1.parseYamlInteger("+1"), 1);
    });
    test('hexadecimal', function () {
        assert.strictEqual(scalarInference_1.parseYamlInteger("0x3A"), 58);
    });
    test('octal', function () {
        assert.strictEqual(scalarInference_1.parseYamlInteger("0o7"), 7);
    });
    test('otherwise', function () {
        var error;
        try {
            scalarInference_1.parseYamlInteger("'1'");
        }
        catch (e) {
            error = e;
        }
        assert(error, "should have thrown");
    });
});
suite('parseYamlBoolean', function () {
    test('true', function () {
        for (var _i = 0, _a = ["true", "True", "TRUE"]; _i < _a.length; _i++) {
            var value = _a[_i];
            assert.strictEqual(scalarInference_1.parseYamlBoolean(value), true, value);
        }
    });
    test('false', function () {
        for (var _i = 0, _a = ["false", "False", "FALSE"]; _i < _a.length; _i++) {
            var value = _a[_i];
            assert.strictEqual(scalarInference_1.parseYamlBoolean(value), false, value);
        }
    });
    test('otherwise', function () {
        var error;
        try {
            scalarInference_1.parseYamlBoolean("tRUE");
        }
        catch (e) {
            error = e;
        }
        assert(error, "should have thrown");
    });
});
suite('parseYamlFloat', function () {
    test('float', function () {
        var values = ["0.", "-0.0", ".5", "+12e03", "-2E+05"];
        var expected = [0, -0, 0.5, 12000, -200000];
        for (var index = 0; index < values.length; index++) {
            assert.strictEqual(scalarInference_1.parseYamlFloat(values[index]), expected[index]);
        }
    });
    test('NaN', function () {
        for (var _i = 0, _a = [".nan", ".NaN", ".NAN"]; _i < _a.length; _i++) {
            var value = _a[_i];
            assert(isNaN(scalarInference_1.parseYamlFloat(value)), "isNaN(" + value + ")");
        }
    });
    test('infinity', function () {
        assert.strictEqual(scalarInference_1.parseYamlFloat(".inf"), Infinity);
        assert.strictEqual(scalarInference_1.parseYamlFloat("-.Inf"), -Infinity);
        assert.strictEqual(scalarInference_1.parseYamlFloat(".INF"), Infinity);
    });
    test('otherwise', function () {
        var error;
        try {
            scalarInference_1.parseYamlFloat("text");
        }
        catch (e) {
            error = e;
        }
        assert(error, "should have thrown");
    });
});
//# sourceMappingURL=scalarInference.test.js.map