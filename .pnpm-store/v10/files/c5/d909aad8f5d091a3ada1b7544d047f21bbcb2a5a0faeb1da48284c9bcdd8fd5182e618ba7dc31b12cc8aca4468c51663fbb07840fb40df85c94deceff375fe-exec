var TokenIterator = require("../lib/TokenIterator");
var Token = require("../lib/Token");
var StringSource = require("../lib/StringSource");

exports.canCreateSourceRangeToIteratorBeyondEnd = function(test) {
    var source = function(startIndex, endIndex) {
        return new StringSource("blah").range(startIndex, endIndex);
    };
    var startIterator = new TokenIterator([
        new Token("identifier", "blah", source(0, 4)),
        new Token("end", null, source(4, 4))
    ]);
    var endIterator = startIterator.tail().tail();
    var range = startIterator.to(endIterator);
    test.deepEqual(source(0, 4), range);
    test.done();
};
