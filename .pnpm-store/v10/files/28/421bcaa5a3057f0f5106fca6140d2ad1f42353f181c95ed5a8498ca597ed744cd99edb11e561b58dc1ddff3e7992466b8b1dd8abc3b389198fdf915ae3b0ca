var RegexTokeniser = require("../lib/regex-tokeniser").RegexTokeniser;
var Token = require("../lib/Token");
var StringSource = require("../lib/StringSource");

exports.emptyStringIsTokenisedToEndToken = stringIsTokenisedTo("", [
    endToken("")
]);

exports.canMatchSingleToken = stringIsTokenisedTo("blah", [
    new Token("identifier", "blah", stringSourceRange("blah", 0, 4)),
    endToken("blah")
]);

exports.canMatchMultipleTokens = stringIsTokenisedTo("a.btn", [
    new Token("identifier", "a", stringSourceRange("a.btn", 0, 1)),
    new Token("dot", ".", stringSourceRange("a.btn", 1, 2)),
    new Token("identifier", "btn", stringSourceRange("a.btn", 2, 5)),
    endToken("a.btn")
]);

exports.unrecognisedCharactersAreTokenised = stringIsTokenisedTo("!btn", [
    new Token("unrecognisedCharacter", "!", stringSourceRange("!btn", 0, 1)),
    new Token("identifier", "btn", stringSourceRange("!btn", 1, 4)),
    endToken("!btn")
]);

exports.firstMatchingRuleIsUsed = stringIsTokenisedTo(":", [
    new Token("colon1", ":", stringSourceRange(":", 0, 1)),
    endToken(":")
]);

exports.valuesOfZeroLengthAreIgnored = function(test) {
    var expectedTokens = [
        new Token("unrecognisedCharacter", "!", stringSourceRange("!btn", 0, 1)),
        new Token("identifier", "btn", stringSourceRange("!btn", 1, 4)),
        endToken("!btn")
    ];
    
    var rules = [
        {
            name: "identifier",
            regex: /([a-z]*)/
        }
    ];
    var tokeniser = new RegexTokeniser(rules);
    test.deepEqual(expectedTokens, tokeniser.tokenise("!btn"));
    test.done();
};

exports.tokenValueIsFirstCaptureOfRegex = stringIsTokenisedTo('"a"', [
    new Token("string", "a", stringSourceRange('"a"', 0, 3)),
    endToken('"a"')
]);

exports.tokenWithNoCaptureHasUndefinedValue = function(test) {
    var expectedTokens = [
        new Token("bang", undefined, stringSourceRange("!", 0, 1)),
        endToken("!")
    ];
    
    var rules = [
        {
            name: "bang",
            regex: /!/
        }
    ];
    var tokeniser = new RegexTokeniser(rules);
    test.deepEqual(expectedTokens, tokeniser.tokenise("!"));
    test.done();
};

function endToken(input) {
    var source = stringSourceRange(input, input.length, input.length);
    return new Token("end", null, source);
}

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
    var rules = [
        {
            name: "identifier",
            regex: /([a-z]+)/
        },
        {
            name: "dot",
            regex: /(\.)/
        },
        {
            name: "colon1",
            regex: /(:)/
        },
        {
            name: "colon2",
            regex: /(:)/
        },
        {
            name: "string",
            regex: /"([a-z]*)"/
        }
    ];
    var tokeniser = new RegexTokeniser(rules);
    return tokeniser.tokenise(input);
};

