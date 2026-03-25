var errors = require("../lib/errors");
var StringSource = require("../lib/StringSource");

exports.errorDescriptionIncludesLocationAndActualValueAndExpectedValue = function(test) {
    var error = errors.error({
        expected: "Nothing",
        actual: "Something",
        location: {
            describe: function() {
                return "Here"
            }
        }
    });
    test.equal("Here:\nExpected Nothing\nbut got Something", error.describe());
    test.done();
};

exports.canDescribeErrorWithoutLocation = function(test) {
    var error = errors.error({
        expected: "Nothing",
        actual: "Something"
    });
    test.equal("Expected Nothing\nbut got Something", error.describe());
    test.done();
};

exports.canGetPositionFromError = function(test) {
    var error = errors.error({
        expected: "Nothing",
        actual: "Something",
        location: new StringSource("abc\ndef\nghi\n", "").range(6, 8)
    });
    test.equal(2, error.lineNumber());
    test.equal(3, error.characterNumber());
    test.done();
};
