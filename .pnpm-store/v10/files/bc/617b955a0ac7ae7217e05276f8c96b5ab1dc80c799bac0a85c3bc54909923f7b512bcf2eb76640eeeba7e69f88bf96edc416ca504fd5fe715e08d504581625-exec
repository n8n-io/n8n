var StringSource = require("../lib/StringSource");

exports.stringSourceRangeDescriptionIncludesLineAndCharacterNumber = function(test) {
    test.equal(
        "Line number: 1\nCharacter number: 3",
        new StringSource("blah").range(2, 3).describe()
    );
    test.equal(
        "Line number: 3\nCharacter number: 5",
        new StringSource("one\ntwo\nthree\nfour").range(12, 15).describe()
    );
    test.done();
};

exports.stringSourceRangeDescriptionIncludesDescriptionIfProvided = function(test) {
    test.equal(
        "File: /some/file\nLine number: 1\nCharacter number: 3",
        new StringSource("blah", "File: /some/file").range(2, 3).describe()
    );
    test.done();
};
