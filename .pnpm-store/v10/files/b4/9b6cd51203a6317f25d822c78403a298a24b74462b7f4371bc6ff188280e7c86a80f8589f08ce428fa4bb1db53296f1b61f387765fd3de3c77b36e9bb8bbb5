var tape = require("tape");

var utf8 = require("..");

var data = require("fs").readFileSync(require.resolve("./data/utf8.txt")),
    dataStr = data.toString("utf8");

tape.test("utf8", function(test) {

    test.test(test.name + " - length", function(test) {
        test.equal(utf8.length(""), 0, "should return a byte length of zero for an empty string");

        test.equal(utf8.length(dataStr), Buffer.byteLength(dataStr), "should return the same byte length as node buffers");

        test.end();
    });

    test.test(test.name + " - read", function(test) {
        var comp = utf8.read([], 0, 0);
        test.equal(comp, "", "should decode an empty buffer to an empty string");

        comp = utf8.read(data, 0, data.length);
        test.equal(comp, data.toString("utf8"), "should decode to the same byte data as node buffers");

        var longData = Buffer.concat([data, data, data, data]);
        comp = utf8.read(longData, 0, longData.length);
        test.equal(comp, longData.toString("utf8"), "should decode to the same byte data as node buffers (long)");

        var chunkData = new Buffer(data.toString("utf8").substring(0, 8192));
        comp = utf8.read(chunkData, 0, chunkData.length);
        test.equal(comp, chunkData.toString("utf8"), "should decode to the same byte data as node buffers (chunk size)");

        test.end();
    });

    test.test(test.name + " - write", function(test) {
        var buf = new Buffer(0);
        test.equal(utf8.write("", buf, 0), 0, "should encode an empty string to an empty buffer");

        var len = utf8.length(dataStr);
        buf = new Buffer(len);
        test.equal(utf8.write(dataStr, buf, 0), len, "should encode to exactly " + len + " bytes");

        test.equal(buf.length, data.length, "should encode to a buffer length equal to that of node buffers");

        for (var i = 0; i < buf.length; ++i) {
            if (buf[i] !== data[i]) {
                test.fail("should encode to the same buffer data as node buffers (offset " + i + ")");
                return;
            }
        }
        test.pass("should encode to the same buffer data as node buffers");

        test.end();
    });

});
