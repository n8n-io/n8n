var lop = require("../");
var Parser = lop.Parser;
var rules = lop.rules;
var testing = require("../lib/testing");
var Tokeniser = require("./Tokeniser");

exports.canParseUsingParser = function(test) {
    var tokens = new Tokeniser({keywords: []}).tokenise("! blah");
    
    var name = rules.sequence.capture(rules.token("identifier"), "name");
    var rule = rules.sequence(
        rules.token("identifier", "!"),
        name
    );
    
    var parser = new Parser();
    var result = parser.parseTokens(rule, tokens);
    
    testing.assertIsSuccess(test, result);
    test.deepEqual(result.value().get(name), "blah");
    
    test.done();
};

var parseString = function(parser, string) {
    return parser(new TokenIterator(tokens));
};
