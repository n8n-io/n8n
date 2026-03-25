var options = require("option");

var rules = require("../lib/rules");
var testing = require("../lib/testing");
var TokenIterator = require("../lib/TokenIterator");
var errors = require("../lib/errors");
var results = require("../lib/parsing-results");
var StringSource = require("../lib/StringSource");
var assertIsSuccess = testing.assertIsSuccess;
var assertIsSuccessWithValue = testing.assertIsSuccessWithValue;
var assertIsFailure = testing.assertIsFailure;
var assertIsFailureWithRemaining = testing.assertIsFailureWithRemaining;
var assertIsError = testing.assertIsError;
var Tokeniser = require("./Tokeniser");
var Token = require("../lib/Token");

var stringSourceRange = function(string, startIndex, endIndex) {
    return new StringSource(string).range(startIndex, endIndex);
};

var token = function(tokenType, value, source) {
    return new Token(tokenType, value, source);
};

var keyword = function(value) {
    return rules.token("keyword", value);
};

var identifier = function(value) {
    return rules.token("identifier", value);
};

exports.tokenRuleFailsIfInputIsEmpty = function(test) {
    var tokens = [];
    var rule = rules.token("keyword", "true");
    var result = rule(new TokenIterator(tokens));
    assertIsFailure(test, result, {
        remaining: [],
        errors: [errors.error({
            expected: "keyword \"true\"",
            actual: "end of tokens"
        })]
    });
    test.done();
};

exports.tokenRuleConsumeTokenWhenTokenIsOfCorrectType = function(test) {
    var parser = rules.token("keyword", "true");
    var result = parseString(parser, "true");
    assertIsSuccess(test, result, {
        value: "true",
        source: stringSourceRange("true", 0, 4)
    });
    test.done();
};

exports.parsingTokenFailsIfTokenIsOfWrongType = function(test) {
    var parser = rules.token("keyword", "true");
    var result = parseString(parser, "blah");
    assertIsFailure(test, result, {
        remaining: [
            token("identifier", "blah", stringSourceRange("blah", 0, 4)),
            token("end", null, stringSourceRange("blah", 4, 4))
        ],
        errors: [errors.error({
            expected: "keyword \"true\"",
            actual: "identifier \"blah\"",
            location: stringSourceRange("blah", 0, 4)
        })]
    });
    test.done();
};

exports.parsingTokenFailsIfTokenIsOfWrongValue = function(test) {
    var parser = rules.token("keyword", "true");
    var result = parseString(parser, "false");
    assertIsFailure(test, result, {
        remaining: [
            token("keyword", "false", stringSourceRange("false", 0, 5)),
            token("end", null, stringSourceRange("false", 5, 5))
        ],
        errors: [errors.error({
            expected: "keyword \"true\"",
            actual: "keyword \"false\"",
            location: stringSourceRange("false", 0, 5)
        })]
    });
    test.done();
};

exports.anyValueIsAcceptedIfValueOfTokenIsNotSpecified = function(test) {
    var parser = rules.token("keyword");
    var result = parseString(parser, "true");
    assertIsSuccess(test, result, {
        value: "true",
        source: stringSourceRange("true", 0, 4)
    });
    test.done();
};

exports.firstSuccessIsReturnedByFirstOf = function(test) {
    var trueParser = keyword("true");
    var falseParser = keyword("false");
    var evilParser = function() {
        throw new Error("Hahaha!");
    };
    var result = parseString(rules.firstOf("Boolean", trueParser, falseParser, evilParser), "false");
    assertIsSuccessWithValue(test, result, "false");
    test.done();
};

exports.firstOfFailsIfNoParsersMatch = function(test) {
    var trueParser = keyword("true");
    var falseParser = keyword("false");
    var result = parseString(rules.firstOf("Boolean", trueParser, falseParser), "blah");
    assertIsFailure(test, result, {
        remaining:[
            identifier("blah", stringSourceRange("blah", 0, 4)),
            token("end", null, stringSourceRange("blah", 4, 4))
        ],
        errors: [errors.error({
            expected: "Boolean",
            actual: "identifier \"blah\"",
            location: stringSourceRange("blah", 0, 4)
        })]
    });
    test.done();
};

exports.firstOfReturnsErrorIfSubRuleReturnsErrorEvenIfLaterRuleSucceeds = function(test) {
    var trueParser = rules.sequence(rules.sequence.cut(), keyword("true"));
    var falseParser = keyword("false");
    var result = parseString(rules.firstOf("Boolean", trueParser, falseParser), "false");
    assertIsError(test, result, {
        remaining:[
            keyword("false", stringSourceRange("false", 0, 5)),
            token("end", null, stringSourceRange("false", 5, 5))
        ],
        errors: [errors.error({
            expected: "keyword \"true\"",
            actual: "keyword \"false\"",
            location: stringSourceRange("false", 0, 5)
        })]
    });
    test.done();
};

exports.thenReturnsFailureIfOriginalResultIsFailure = function(test) {
    var parser = rules.then(keyword("true"), function() { return true; });
    var result = parseString(parser, "blah");
    assertIsFailure(test, result, {
        remaining:[
            identifier("blah", stringSourceRange("blah", 0, 4)),
            token("end", null, stringSourceRange("blah", 4, 4))
        ],
        errors: [errors.error({
            expected: "keyword \"true\"",
            actual: "identifier \"blah\"",
            location: stringSourceRange("blah", 0, 4)
        })]
    });
    test.done();
};

exports.thenMapsOverValueIfOriginalResultIsSuccess = function(test) {
    var parser = rules.then(keyword("true"), function() { return true; });
    var result = parseString(parser, "true");
    assertIsSuccessWithValue(test, result, true);
    test.done();
};

exports.sequenceSucceedsIfSubParsersCanBeAppliedInOrder = function(test) {
    var parser = rules.sequence(identifier("one"), identifier("two"));
    var result = parseString(parser, "one two");
    assertIsSuccess(test, result, {
        source: stringSourceRange("one two", 0, 7)
    });
    test.done();
};

exports.sequenceFailIfSubParserFails = function(test) {
    var parser = rules.sequence(identifier("("), identifier(")"));
    var result = parseString(parser, "(");
    assertIsFailure(test, result, {
        remaining:[token("end", null, stringSourceRange("(", 1, 1))],
        errors: [errors.error({
            expected: "identifier \")\"",
            actual: "end",
            location: stringSourceRange("(", 1, 1)
        })]
    });
    test.done();
};

exports.sequenceFailIfSubParserFailsAndFinalParserSucceeds = function(test) {
    var parser = rules.sequence(identifier("("), identifier(")"));
    var result = parseString(parser, ")");
    assertIsFailure(test, result, {
        remaining:[
            identifier(")", stringSourceRange(")", 0, 1)),
            token("end", null, stringSourceRange(")", 1, 1))
        ],
        errors: [errors.error({
            expected: "identifier \"(\"",
            actual: "identifier \")\"",
            location: stringSourceRange(")", 0, 1)
        })]
    });
    test.done();
};

exports.sequenceReturnsMapOfCapturedValues = function(test) {
    var name = rules.sequence.capture(identifier(), "name");
    var parser = rules.sequence(identifier("("), name, identifier(")"));
    var result = parseString(parser, "( bob )");
    assertIsSuccess(test, result);
    test.deepEqual(result.value().get(name), "bob");
    test.done();
};

exports.failureInSubRuleInSequenceBeforeCutCausesSequenceToFail = function(test) {
    var parser = rules.sequence(identifier("("), rules.sequence.cut(), identifier(), identifier(")"));
    var result = parseString(parser, "bob");
    assertIsFailure(test, result);
    test.done();
};

exports.failureInSubRuleInSequenceAfterCutCausesError = function(test) {
    var parser = rules.sequence(identifier("("), rules.sequence.cut(), identifier(), identifier(")"));
    var result = parseString(parser, "( true");
    assertIsError(test, result, {
        remaining: [
            token("keyword", "true", stringSourceRange("( true", 2, 6)),
            token("end", null, stringSourceRange("( true", 6, 6))
        ],
        errors: [errors.error({
            expected: "identifier",
            actual: "keyword \"true\"",
            location: stringSourceRange("( true", 2, 6)
        })]
    });
    test.done();
};

exports.canPullSingleValueOutOfCapturedValuesUsingExtract = function(test) {
    var name = rules.sequence.capture(identifier(), "name");
    var parser = rules.then(
        rules.sequence(identifier("("), name, identifier(")")),
        rules.sequence.extract(name)
    );
    var result = parseString(parser, "( bob )");
    assertIsSuccessWithValue(test, result, "bob");
    test.done();
};

exports.canPullSingleValueOutOfCapturedValuesUsingHeadOnSequenceRule = function(test) {
    var name = rules.sequence.capture(identifier(), "name");
    var parser =
        rules.sequence(identifier("("), name, identifier(")"))
            .head();
    var result = parseString(parser, "( bob )");
    assertIsSuccessWithValue(test, result, "bob");
    test.done();
};

exports.canApplyValuesFromSequenceToFunction = function(test) {
    var firstName = rules.sequence.capture(identifier(), "firstName");
    var secondName = rules.sequence.capture(identifier(), "secondName");
    var parser = rules.then(
        rules.sequence(
            secondName,
            identifier(","),
            firstName
        ),
        rules.sequence.applyValues(function(firstName, secondName) {
            return {first: firstName, second: secondName};
        }, firstName, secondName)
    );
    var result = parseString(parser, "Bobertson , Bob");
    assertIsSuccessWithValue(test, result, {first: "Bob", second: "Bobertson"});
    test.done();
};

exports.canApplyValuesAndSourceFromSequenceToFunctionUsingMapOnSequenceRule = function(test) {
    var firstName = rules.sequence.capture(identifier(), "firstName");
    var secondName = rules.sequence.capture(identifier());
    var parser = rules.sequence(
            secondName,
            identifier(","),
            firstName
        ).map(function(secondName, firstName, source) {
            return {first: firstName, second: secondName, source: source};
        });
    var result = parseString(parser, "Bobertson , Bob");
    assertIsSuccessWithValue(test, result, {
        first: "Bob",
        second: "Bobertson",
        source: stringSourceRange("Bobertson , Bob", 0, 15)
    });
    test.done();
};

exports.canApplyValuesWithSourceFromSequenceToFunction = function(test) {
    var firstName = rules.sequence.capture(identifier(), "firstName");
    var secondName = rules.sequence.capture(identifier(), "secondName");
    var parser = rules.then(
        rules.sequence(
            secondName,
            identifier(","),
            firstName
        ),
        rules.sequence.applyValues(function(firstName, secondName, source) {
            return {first: firstName, second: secondName, source: source};
        }, firstName, secondName, rules.sequence.source)
    );
    var result = parseString(parser, "Bobertson , Bob");
    assertIsSuccessWithValue(test, result, {
        first: "Bob",
        second: "Bobertson",
        source: stringSourceRange("Bobertson , Bob", 0, 15)
    });
    test.done();
};

exports.exceptionIfTryingToReadAValueThatHasntBeenCaptured = function(test) {
    var name = rules.sequence.capture(identifier(), "name");
    var parser = rules.sequence(identifier("("), identifier(")"));
    var result = parseString(parser, "( )");
    assertIsSuccess(test, result);
    try {
        result.value().get(name);
        test.ok(false, "Expected exception");
    } catch (error) {
        test.equal(error.message, "No value for capture \"name\"");
    }
    test.done();
};

exports.exceptionIfTryingToCaptureValueWithUsedName = function(test) {
    var firstName = rules.sequence.capture(identifier(), "name");
    var secondName = rules.sequence.capture(identifier(), "name");
    var parser = rules.sequence(secondName, identifier(","), firstName);
    try {
        parseString(parser, "Bobertson , Bob")
        test.ok(false, "Expected exception");
    } catch (error) {
        test.equal(error.message, "Cannot add second value for capture \"name\"");
    }
    test.done();
};

exports.optionalRuleDoesNothingIfValueDoesNotMatch = function(test) {
    var parser = rules.optional(identifier("("));
    var result = parseString(parser, "");
    assertIsSuccess(test, result);
    test.deepEqual(result.value(), options.none);
    test.done();
};

exports.optionalRuleConsumesInputIfPossible = function(test) {
    var parser = rules.optional(identifier("("));
    var result = parseString(parser, "(");
    assertIsSuccess(test, result);
    test.deepEqual(result.value(), options.some("("));
    test.done();
};

exports.optionalRulePreservesErrors = function(test) {
    var error = results.error([errors.error({
        expected: "something",
        actual: "something else"
    })]);
    var parser = rules.optional(function(input) {
        return error;
    });
    var result = parseString(parser, "");
    test.deepEqual(result, error);
    test.done();
};

exports.zeroOrMoreWithSeparatorParsesEmptyStringAndReturnsEmptyArray = function(test) {
    var parser = rules.zeroOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "");
    assertIsSuccessWithValue(test, result, []);
    test.done();
};

exports.zeroOrMoreWithSeparatorParsesSingleInstanceOfRuleAndReturnsSingleElementArray = function(test) {
    var parser = rules.zeroOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "blah");
    assertIsSuccessWithValue(test, result, ["blah"]);
    test.done();
};

exports.zeroOrMoreWithSeparatorParsesMultipleInstanceOfRuleAndReturnsArray = function(test) {
    var parser = rules.zeroOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "apple , banana , coconut");
    assertIsSuccessWithValue(test, result, ["apple", "banana", "coconut"]);
    test.done();
};

exports.zeroOrMoreWithSeparatorDoesNotConsumeFinalSeparatorIfItIsNotFollowedByMainRule = function(test) {
    var parser = rules.zeroOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "apple , banana ,");
    assertIsSuccess(test, result, {
        remaining: [
            token("identifier", ",", stringSourceRange("apple , banana ,", 15, 16)),
            token("end", null, stringSourceRange("apple , banana ,", 16, 16))
        ],
    });
    test.done();
};

exports.zeroOrMoreReturnsErrorIfFirstUseOfRuleReturnsError = function(test) {
    var parser = rules.zeroOrMoreWithSeparator(
        rules.sequence(identifier(), rules.sequence.cut(), identifier()),
        identifier(",")
    );
    var result = parseString(parser, "apple");
    assertIsError(test, result);
    test.done();
};

exports.zeroOrMoreParsesEmptyStringAndReturnsEmptyArray = function(test) {
    var parser = rules.zeroOrMore(identifier());
    var result = parseString(parser, "");
    assertIsSuccessWithValue(test, result, []);
    test.done();
};

exports.zeroOrMoreParsesSingleInstanceOfRuleAndReturnsSingleElementArray = function(test) {
    var parser = rules.zeroOrMore(identifier());
    var result = parseString(parser, "blah");
    assertIsSuccessWithValue(test, result, ["blah"]);
    test.done();
};

exports.zeroOrMoreParsesMultipleInstanceOfRuleAndReturnsArray = function(test) {
    var parser = rules.zeroOrMore(identifier());
    var result = parseString(parser, "( , )");
    assertIsSuccessWithValue(test, result, ["(", ",", ")"]);
    test.done();
};

exports.zeroOrMoreReturnsErrorIfSubRuleReturnsError = function(test) {
    var parser = rules.zeroOrMore(
        rules.sequence(identifier(), rules.sequence.cut(), identifier(";"))
    );
    var result = parseString(parser, "blah");
    assertIsError(test, result, {
        remaining:[
            token("end", null, stringSourceRange("blah", 4, 4))
        ],
        errors: [errors.error({
            expected: "identifier \";\"",
            actual: "end",
            location: stringSourceRange("blah", 4, 4)
        })]
    });
    test.done();
};

exports.oneOrMoreWithSeparatorFailsOnEmptyString = function(test) {
    var parser = rules.oneOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "");
    assertIsFailure(test, result, {
        remaining:[
            token("end", null, stringSourceRange("", 0, 0))
        ],
        errors: [errors.error({
            expected: "identifier",
            actual: "end",
            location: stringSourceRange("", 0, 0)
        })]
    });
    test.done();
};

exports.oneOrMoreWithSeparatorParsesSingleInstanceOfRuleAndReturnsSingleElementArray = function(test) {
    var parser = rules.oneOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "blah");
    assertIsSuccessWithValue(test, result, ["blah"]);
    test.done();
};

exports.oneOrMoreWithSeparatorParsesMultipleInstanceOfRuleAndReturnsArray = function(test) {
    var parser = rules.oneOrMoreWithSeparator(identifier(), identifier(","));
    var result = parseString(parser, "apple , banana , coconut");
    assertIsSuccessWithValue(test, result, ["apple", "banana", "coconut"]);
    test.done();
};

exports.oneOrMoreFailsOnEmptyString = function(test) {
    var parser = rules.oneOrMore(identifier());
    var result = parseString(parser, "");
    assertIsFailure(test, result, {
        remaining:[
            token("end", null, stringSourceRange("", 0, 0))
        ],
        errors: [errors.error({
            expected: "identifier",
            actual: "end",
            location: stringSourceRange("", 0, 0)
        })]
    });
    test.done();
};

exports.oneOrMoreParsesSingleInstanceOfRuleAndReturnsSingleElementArray = function(test) {
    var parser = rules.oneOrMore(identifier());
    var result = parseString(parser, "blah");
    assertIsSuccessWithValue(test, result, ["blah"]);
    test.done();
};

exports.oneOrMoreParsesMultipleInstanceOfRuleAndReturnsArray = function(test) {
    var parser = rules.oneOrMore(identifier());
    var result = parseString(parser, "apple banana coconut");
    assertIsSuccessWithValue(test, result, ["apple", "banana", "coconut"]);
    test.done();
};

exports.leftAssociativeConsumesNothingIfLeftHandSideDoesntMatch = function(test) {
    var parser = rules.leftAssociative(
        keyword(),
        identifier("+"),
        function(left, right) {
            return [left, right];
        }
    );
    var result = parseString(parser, "+ +");
    assertIsFailure(test, result, {
        remaining:[
            token("identifier", "+", stringSourceRange("+ +", 0, 1)),
            token("identifier", "+", stringSourceRange("+ +", 2, 3)),
            token("end", null, stringSourceRange("+ +", 3, 3))
        ],
        errors: [errors.error({
            expected: "keyword",
            actual: "identifier \"+\"",
            location: stringSourceRange("+ +", 0, 1)
        })]
    });
    test.done();
};

exports.leftAssociativeReturnsValueOfLeftHandSideIfRightHandSideDoesntMatch = function(test) {
    var parser = rules.leftAssociative(
        identifier(),
        identifier("+"),
        function(left, right) {
            return [left, right];
        }
    );
    var result = parseString(parser, "apple");
    assertIsSuccessWithValue(test, result, "apple");
    test.done();
};

exports.leftAssociativeAllowsLeftAssociativeRules = function(test) {
    var parser = rules.leftAssociative(
        identifier(),
        identifier("+"),
        function(left, right) {
            return [left, right];
        }
    );
    var result = parseString(parser, "apple + +");
    assertIsSuccessWithValue(test, result, [["apple", "+"], "+"]);
    test.done();
};

exports.leftAssociativeCanHaveMultipleChoicesForRight = function(test) {
    var parser = rules.leftAssociative(
        identifier(),
        rules.leftAssociative.firstOf(
            {rule: identifier("+"), func: function(left, right) { return [left, right]; }},
            {rule: identifier(","), func: function(left, right) { return [left]; }}
        )
    );
    var result = parseString(parser, "apple + ,");
    assertIsSuccessWithValue(test, result, [["apple", "+"]]);
    test.done();
};

exports.leftAssociativeReturnsErrorIfRightHandSideReturnsError = function(test) {
    var parser = rules.leftAssociative(
        identifier(),
        rules.leftAssociative.firstOf(
            {rule: rules.sequence(rules.sequence.cut(), identifier("+")), func: function() {}}
        )
    );
    var result = parseString(parser, "apple");
    assertIsError(test, result);
    test.done();
};

exports.nonConsumingRuleDoesNotConsumeInput = function(test) {
    var parser = rules.nonConsuming(rules.token("keyword", "true"));
    var result = parseString(parser, "true");
    assertIsSuccess(test, result, {
        value: "true",
        source: stringSourceRange("true", 0, 4),
        remaining: [token("keyword", "true"), token("end", null)]
    });
    test.done();
};

var parseString = function(parser, string) {
    var keywords = ["true", "false"];
    var tokens = new Tokeniser({keywords: keywords}).tokenise(string);
    return parser(new TokenIterator(tokens));
};

var parseTokens = function(parser, tokens) {
    return parser(new TokenIterator(tokens));
};
