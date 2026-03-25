var Tokeniser = require("./Tokeniser");
var Token = require("../lib/Token");
var StringSource = require("../lib/StringSource");

exports.stringIsSingleIdentifier = stringIsTokenisedTo("blah", [
    new Token("identifier", "blah", stringSourceRange("blah", 0, 4)),
    new Token("end", null, stringSourceRange("blah", 4, 4))
]);

exports.identifiersAreSeparatedByWhitespace = stringIsTokenisedTo("one two", [
    new Token("identifier", "one", stringSourceRange("one two", 0, 3)),
    new Token("identifier", "two", stringSourceRange("one two", 4, 7)),
    new Token("end", null, stringSourceRange("one two", 7, 7))
]);

exports.canDetectKeywords = stringIsTokenisedTo("true", [
    new Token("keyword", "true", stringSourceRange("true", 0, 4)),
    new Token("end", null, stringSourceRange("true", 4, 4))
]);

exports.emptyStringIsTokenisedToSingleEndToken = stringIsTokenisedTo("", [
    new Token("end", null, stringSourceRange("", 0, 0))
]);

function stringIsTokenisedTo(input, expected) {
    return function(test) {
        test.deepEqual(expected, tokenise(input));
        test.done();
    };
};

function stringSourceRange(string, startIndex, endIndex) {
    return new StringSource(string).range(startIndex, endIndex);
};

function tokenise(input) {
    return new Tokeniser({keywords: ["true"]}).tokenise(input);
};
