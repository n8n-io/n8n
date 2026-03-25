var tape = require("tape");

var base64 = require("..");

var strings = {
    "": "",
    "a": "YQ==",
    "ab": "YWI=",
    "abcdefg": "YWJjZGVmZw==",
    "abcdefgh": "YWJjZGVmZ2g=",
    "abcdefghi": "YWJjZGVmZ2hp"
};

tape.test("base64", function(test) {

    Object.keys(strings).forEach(function(str) {
        var enc = strings[str];

        test.equal(base64.test(enc), true, "should detect '" + enc + "' to be base64 encoded");

        var len = base64.length(enc);
        test.equal(len, str.length, "should calculate '" + enc + "' as " + str.length + " bytes");

        var buf = new Array(len);
        var len2 = base64.decode(enc, buf, 0);
        test.equal(len2, len, "should decode '" + enc + "' to " + len + " bytes");

        test.equal(String.fromCharCode.apply(String, buf), str, "should decode '" + enc + "' to '" + str + "'");

        var enc2 = base64.encode(buf, 0, buf.length);
        test.equal(enc2, enc, "should encode '" + str + "' to '" + enc + "'");

    });

    test.throws(function() {
        var buf = new Array(10);
        base64.decode("YQ!", buf, 0);
    }, Error, "should throw if encoding is invalid");

    test.throws(function() {
        var buf = new Array(10);
        base64.decode("Y", buf, 0);
    }, Error, "should throw if string is truncated");

    test.end();
});
