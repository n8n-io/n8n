var tape = require("tape");

var float = require("..");

tape.test("float", function(test) {

    // default
    test.test(test.name + " - typed array", function(test) {
        runTest(float, test);
    });

    // ieee754
    test.test(test.name + " - fallback", function(test) {
        var F32 = global.Float32Array,
            F64 = global.Float64Array;
        delete global.Float32Array;
        delete global.Float64Array;
        runTest(float({}), test);
        global.Float32Array = F32;
        global.Float64Array = F64;
    });
});

function runTest(float, test) {

    var common = [
        0,
        -0,
        Infinity,
        -Infinity,
        0.125,
        1024.5,
        -4096.5,
        NaN
    ];

    test.test(test.name + " - using 32 bits", function(test) {
        common.concat([
            3.4028234663852886e+38,
            1.1754943508222875e-38,
            1.1754946310819804e-39
        ])
        .forEach(function(value) {
            var strval = value === 0 && 1 / value < 0 ? "-0" : value.toString();
            test.ok(
                checkValue(value, 4, float.readFloatLE, float.writeFloatLE, Buffer.prototype.writeFloatLE),
                "should write and read back " + strval + " (32 bit LE)"
            );
            test.ok(
                checkValue(value, 4, float.readFloatBE, float.writeFloatBE, Buffer.prototype.writeFloatBE),
                "should write and read back " + strval + " (32 bit BE)"
            );
        });
        test.end();
    });

    test.test(test.name + " - using 64 bits", function(test) {
        common.concat([
            1.7976931348623157e+308,
            2.2250738585072014e-308,
            2.2250738585072014e-309
        ])
        .forEach(function(value) {
            var strval = value === 0 && 1 / value < 0 ? "-0" : value.toString();
            test.ok(
                checkValue(value, 8, float.readDoubleLE, float.writeDoubleLE, Buffer.prototype.writeDoubleLE),
                "should write and read back " + strval + " (64 bit LE)"
            );
            test.ok(
                checkValue(value, 8, float.readDoubleBE, float.writeDoubleBE, Buffer.prototype.writeDoubleBE),
                "should write and read back " + strval + " (64 bit BE)"
            );
        });
        test.end();
    });

    test.end();
}

function checkValue(value, size, read, write, write_comp) {
    var buffer = new Buffer(size);
    write(value, buffer, 0);
    var value_comp = read(buffer, 0);
    var strval = value === 0 && 1 / value < 0 ? "-0" : value.toString();
    if (value !== value) {
        if (value_comp === value_comp)
            return false;
    } else if (value_comp !== value)
        return false;

    var buffer_comp = new Buffer(size);
    write_comp.call(buffer_comp, value, 0);
    for (var i = 0; i < size; ++i)
        if (buffer[i] !== buffer_comp[i]) {
            console.error(">", buffer, buffer_comp);
            return false;
        }

    return true;
}