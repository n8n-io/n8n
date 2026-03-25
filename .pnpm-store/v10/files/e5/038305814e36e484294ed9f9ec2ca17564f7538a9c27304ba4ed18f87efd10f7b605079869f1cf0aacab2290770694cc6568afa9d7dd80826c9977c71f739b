var tape = require("tape");

var inquire = require("..");

tape.test("inquire", function(test) {

    test.equal(inquire("buffer").Buffer, Buffer, "should be able to require \"buffer\"");

    test.equal(inquire("%invalid"), null, "should not be able to require \"%invalid\"");

    test.equal(inquire("./tests/data/emptyObject"), null, "should return null when requiring a module exporting an empty object");

    test.equal(inquire("./tests/data/emptyArray"), null, "should return null when requiring a module exporting an empty array");

    test.same(inquire("./tests/data/object"), { a: 1 }, "should return the object if a non-empty object");

    test.same(inquire("./tests/data/array"), [ 1 ], "should return the module if a non-empty array");

    test.end();
});
