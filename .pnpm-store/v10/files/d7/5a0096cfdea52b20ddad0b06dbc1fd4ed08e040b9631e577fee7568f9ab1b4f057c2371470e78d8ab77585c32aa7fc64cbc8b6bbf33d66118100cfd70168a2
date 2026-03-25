var _ = require("underscore");
var options = require("option");
var results = require("./parsing-results");
var errors = require("./errors");
var lazyIterators = require("./lazy-iterators");

exports.token = function(tokenType, value) {
    var matchValue = value !== undefined;
    return function(input) {
        var token = input.head();
        if (token && token.name === tokenType && (!matchValue || token.value === value)) {
            return results.success(token.value, input.tail(), token.source);
        } else {
            var expected = describeToken({name: tokenType, value: value});
            return describeTokenMismatch(input, expected);
        }
    };
};

exports.tokenOfType = function(tokenType) {
    return exports.token(tokenType);
};

exports.firstOf = function(name, parsers) {
    if (!_.isArray(parsers)) {
        parsers = Array.prototype.slice.call(arguments, 1);
    }
    return function(input) {
        return lazyIterators
            .fromArray(parsers)
            .map(function(parser) {
                return parser(input);
            })
            .filter(function(result) {
                return result.isSuccess() || result.isError();
            })
            .first() || describeTokenMismatch(input, name);
    };
};

exports.then = function(parser, func) {
    return function(input) {
        var result = parser(input);
        if (!result.map) {
            console.log(result);
        }
        return result.map(func);
    };
};

exports.sequence = function() {
    var parsers = Array.prototype.slice.call(arguments, 0);
    var rule = function(input) {
        var result = _.foldl(parsers, function(memo, parser) {
            var result = memo.result;
            var hasCut = memo.hasCut;
            if (!result.isSuccess()) {
                return {result: result, hasCut: hasCut};
            }
            var subResult = parser(result.remaining());
            if (subResult.isCut()) {
                return {result: result, hasCut: true};
            } else if (subResult.isSuccess()) {
                var values;
                if (parser.isCaptured) {
                    values = result.value().withValue(parser, subResult.value());
                } else {
                    values = result.value();
                }
                var remaining = subResult.remaining();
                var source = input.to(remaining);
                return {
                    result: results.success(values, remaining, source),
                    hasCut: hasCut
                };
            } else if (hasCut) {
                return {result: results.error(subResult.errors(), subResult.remaining()), hasCut: hasCut};
            } else {
                return {result: subResult, hasCut: hasCut};
            }
        }, {result: results.success(new SequenceValues(), input), hasCut: false}).result;
        var source = input.to(result.remaining());
        return result.map(function(values) {
            return values.withValue(exports.sequence.source, source);
        });
    };
    rule.head = function() {
        var firstCapture = _.find(parsers, isCapturedRule);
        return exports.then(
            rule,
            exports.sequence.extract(firstCapture)
        );
    };
    rule.map = function(func) {
        return exports.then(
            rule,
            function(result) {
                return func.apply(this, result.toArray());
            }
        );
    };
    
    function isCapturedRule(subRule) {
        return subRule.isCaptured;
    }
    
    return rule;
};

var SequenceValues = function(values, valuesArray) {
    this._values = values || {};
    this._valuesArray = valuesArray || [];
};

SequenceValues.prototype.withValue = function(rule, value) {
    if (rule.captureName && rule.captureName in this._values) {
        throw new Error("Cannot add second value for capture \"" + rule.captureName + "\"");
    } else {
        var newValues = _.clone(this._values);
        newValues[rule.captureName] = value;
        var newValuesArray = this._valuesArray.concat([value]);
        return new SequenceValues(newValues, newValuesArray);
    }
};

SequenceValues.prototype.get = function(rule) {
    if (rule.captureName in this._values) {
        return this._values[rule.captureName];
    } else {
        throw new Error("No value for capture \"" + rule.captureName + "\"");
    }
};

SequenceValues.prototype.toArray = function() {
    return this._valuesArray;
};

exports.sequence.capture = function(rule, name) {
    var captureRule = function() {
        return rule.apply(this, arguments);
    };
    captureRule.captureName = name;
    captureRule.isCaptured = true;
    return captureRule;
};

exports.sequence.extract = function(rule) {
    return function(result) {
        return result.get(rule);
    };
};

exports.sequence.applyValues = function(func) {
    // TODO: check captureName doesn't conflict with source or other captures
    var rules = Array.prototype.slice.call(arguments, 1);
    return function(result) {
        var values = rules.map(function(rule) {
            return result.get(rule);
        });
        return func.apply(this, values);
    };
};

exports.sequence.source = {
    captureName: "☃source☃"
};

exports.sequence.cut = function() {
    return function(input) {
        return results.cut(input);
    };
};

exports.optional = function(rule) {
    return function(input) {
        var result = rule(input);
        if (result.isSuccess()) {
            return result.map(options.some);
        } else if (result.isFailure()) {
            return results.success(options.none, input);
        } else {
            return result;
        }
    };
};

exports.zeroOrMoreWithSeparator = function(rule, separator) {
    return repeatedWithSeparator(rule, separator, false);
};

exports.oneOrMoreWithSeparator = function(rule, separator) {
    return repeatedWithSeparator(rule, separator, true);
};

var zeroOrMore = exports.zeroOrMore = function(rule) {
    return function(input) {
        var values = [];
        var result;
        while ((result = rule(input)) && result.isSuccess()) {
            input = result.remaining();
            values.push(result.value());
        }
        if (result.isError()) {
            return result;
        } else {
            return results.success(values, input);
        }
    };
};

exports.oneOrMore = function(rule) {
    return exports.oneOrMoreWithSeparator(rule, noOpRule);
};

function noOpRule(input) {
    return results.success(null, input);
}

var repeatedWithSeparator = function(rule, separator, isOneOrMore) {
    return function(input) {
        var result = rule(input);
        if (result.isSuccess()) {
            var mainRule = exports.sequence.capture(rule, "main");
            var remainingRule = zeroOrMore(exports.then(
                exports.sequence(separator, mainRule),
                exports.sequence.extract(mainRule)
            ));
            var remainingResult = remainingRule(result.remaining());
            return results.success([result.value()].concat(remainingResult.value()), remainingResult.remaining());
        } else if (isOneOrMore || result.isError()) {
            return result;
        } else {
            return results.success([], input);
        }
    };
};

exports.leftAssociative = function(leftRule, rightRule, func) {
    var rights;
    if (func) {
        rights = [{func: func, rule: rightRule}];
    } else {
        rights = rightRule;
    }
    rights = rights.map(function(right) {
        return exports.then(right.rule, function(rightValue) {
            return function(leftValue, source) {
                return right.func(leftValue, rightValue, source);
            };
        });
    });
    var repeatedRule = exports.firstOf.apply(null, ["rules"].concat(rights));
    
    return function(input) {
        var start = input;
        var leftResult = leftRule(input);
        if (!leftResult.isSuccess()) {
            return leftResult;
        }
        var repeatedResult = repeatedRule(leftResult.remaining());
        while (repeatedResult.isSuccess()) {
            var remaining = repeatedResult.remaining();
            var source = start.to(repeatedResult.remaining());
            var right = repeatedResult.value();
            leftResult = results.success(
                right(leftResult.value(), source),
                remaining,
                source
            );
            repeatedResult = repeatedRule(leftResult.remaining());
        }
        if (repeatedResult.isError()) {
            return repeatedResult;
        }
        return leftResult;
    };
};

exports.leftAssociative.firstOf = function() {
    return Array.prototype.slice.call(arguments, 0);
};

exports.nonConsuming = function(rule) {
    return function(input) {
        return rule(input).changeRemaining(input);
    };
};

var describeToken = function(token) {
    if (token.value) {
        return token.name + " \"" + token.value + "\"";
    } else {
        return token.name;
    }
};

function describeTokenMismatch(input, expected) {
    var error;
    var token = input.head();
    if (token) {
        error = errors.error({
            expected: expected,
            actual: describeToken(token),
            location: token.source
        });
    } else {
        error = errors.error({
            expected: expected,
            actual: "end of tokens"
        });
    }
    return results.failure([error], input);
}
