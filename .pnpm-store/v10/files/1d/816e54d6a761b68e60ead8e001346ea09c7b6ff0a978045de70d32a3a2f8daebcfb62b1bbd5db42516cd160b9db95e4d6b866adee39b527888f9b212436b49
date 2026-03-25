var hamjest = require("hamjest");
var assertThat = hamjest.assertThat;
var contains = hamjest.contains;
var hasProperties = hamjest.hasProperties;

var tokenise = require("../../../lib/styles/parser/tokeniser").tokenise;
var test = require("../../test")(module);


test("unknown tokens are tokenised", function() {
    assertTokens("~", [isToken("unrecognisedCharacter", "~")]);
});

test("empty string is tokenised to end of file token", function() {
    assertTokens("", []);
});

test("whitespace is tokenised", function() {
    assertTokens(" \t\t  ", [isToken("whitespace")]);
});

test("identifiers are tokenised", function() {
    assertTokens("Overture", [isToken("identifier", "Overture")]);
});

test("integers are tokenised", function() {
    assertTokens("123", [isToken("integer", "123")]);
});

test("strings are tokenised", function() {
    assertTokens("'Tristan'", [isToken("string", "Tristan")]);
});

test("unterminated strings are tokenised", function() {
    assertTokens("'Tristan", [isToken("unterminated-string", "Tristan")]);
});

test("arrows are tokenised", function() {
    assertTokens("=>", [isToken("arrow")]);
});

test("classes are tokenised", function() {
    assertTokens(".overture", [isToken("dot"), isToken("identifier", "overture")]);
});

test("colons are tokenised", function() {
    assertTokens("::", [isToken("colon"), isToken("colon")]);
});

test("greater thans are tokenised", function() {
    assertTokens(">>", [isToken("gt"), isToken("gt")]);
});

test("equals are tokenised", function() {
    assertTokens("==", [isToken("equals"), isToken("equals")]);
});

test("startsWith symbols are tokenised", function() {
    assertTokens("^=^=", [isToken("startsWith"), isToken("startsWith")]);
});

test("open parens are tokenised", function() {
    assertTokens("((", [isToken("open-paren"), isToken("open-paren")]);
});

test("close parens are tokenised", function() {
    assertTokens("))", [isToken("close-paren"), isToken("close-paren")]);
});

test("open square brackets are tokenised", function() {
    assertTokens("[[", [isToken("open-square-bracket"), isToken("open-square-bracket")]);
});

test("close square brackets are tokenised", function() {
    assertTokens("]]", [isToken("close-square-bracket"), isToken("close-square-bracket")]);
});

test("choices are tokenised", function() {
    assertTokens("||", [isToken("choice"), isToken("choice")]);
});

test("can tokenise multiple tokens", function() {
    assertTokens("The Magic Position", [
        isToken("identifier", "The"),
        isToken("whitespace"),
        isToken("identifier", "Magic"),
        isToken("whitespace"),
        isToken("identifier", "Position")
    ]);
});

function assertTokens(input, expectedTokens) {
    assertThat(
        tokenise(input),
        contains.apply(null, expectedTokens.concat([isToken("end", null)]))
    );
}

function isToken(tokenType, value) {
    return hasProperties({
        name: tokenType,
        value: value
    });
}
