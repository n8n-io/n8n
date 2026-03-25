var _ = require("underscore");
var duck = require("duck");

var Token = require("./Token");

var assertIsSuccess = exports.assertIsSuccess = function(test, result, options) {
    test.ok(result.isSuccess(), result.errors().map(function(error) {
        return error.describe();
    }).join("\n\n"));
    options = options || {};
    if (!options.remaining) {
        options.remaining = [new Token("end", null)];
    }
    assertResultExtras(test, result, options);
};

var assertIsSuccessWithValue = exports.assertIsSuccessWithValue = function(test, result, value, source) {
    assertIsSuccess(test, result, {
        value: value,
        source: source
    });
};

var assertIsFailure = exports.assertIsFailure = function(test, result, options) {
    test.deepEqual(result.isSuccess(), false);
    assertResultExtras(test, result, options);
};

var assertRemaining = exports.assertRemaining = function(test, result, expectedRemaining) {
    var actualRemaining = result.remaining().toArray();
    assertThat(test, actualRemaining, duck.isArray(expectedRemaining.map(duck.hasProperties)));
};

var assertErrors = exports.assertErrors = function(test, result, expectedErrors) {
    test.deepEqual(result.errors(), expectedErrors);
};

var assertIsFailureWithRemaining = exports.assertIsFailureWithRemaining = function(test, result, expectedRemaining) {
    assertIsFailure(test, result);
    assertRemaining(test, result, expectedRemaining);
};

var assertIsError = exports.assertIsError = function(test, result, options) {
    test.ok(result.isError());
    assertResultExtras(test, result, options);
};

var assertResultExtras = function(test, result, options) {
    options = options || {};
    if (options.remaining) {
        assertRemaining(test, result, options.remaining);
    }
    if (options.errors) {
        assertErrors(test, result, options.errors);
    }
    if (options.source) {
        test.deepEqual(result.source(), options.source);
    }
    if (options.value) {
        assertThat(test, result.value(), duck.is(options.value));
    }
}

var assertThat = function(test, value, matcher) {
    var message = "Expected " + matcher.describeSelf() +
        "\nbut " + matcher.describeMismatch(value);
    test.ok(matcher.matches(value), message);
};

