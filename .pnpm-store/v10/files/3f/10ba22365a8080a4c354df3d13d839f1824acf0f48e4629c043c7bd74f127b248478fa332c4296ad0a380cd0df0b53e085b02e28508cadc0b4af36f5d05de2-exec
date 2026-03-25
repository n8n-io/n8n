var util = require("util");
var assert = require("assert");

var _ = require("underscore");


var inspect = function(value) {
    return util.inspect(value, false, null);
};

exports.assertThat = function(value, matcher) {
    var result = matcher.matchesWithDescription(value);
    var message = "Expected " + matcher.describeSelf() +
        "\nbut " + result.description;
    assert.ok(result.matches, message);
};

exports.is = function(value) {
    if (value && value._isDuckMatcher) {
        return value;
    } else {
        return equalTo(value);
    }
};

var equalTo = exports.equalTo = function(matchValue) {
    return new Matcher({
        matches: function(value) {
            return _.isEqual(value, matchValue);
        },
        describeMismatch: function(value) {
            return "was " + inspect(value);
        },
        describeSelf: function() {
            return inspect(matchValue);
        }
    });
};

exports.isObject = function(object) {
    var matchers = valuesToMatchers(object);
    
    return new Matcher({
        matchesWithDescription: function(value) {
            var expectedKeys = ownKeys(object);
            var hasPropertiesResult = exports.hasProperties(matchers).matchesWithDescription(value);
            
            var unexpectedPropertyMismatches = ownKeys(value).filter(function(key) {
                return expectedKeys.indexOf(key) === -1
            }).map(function(key) {
                return "unexpected property: \"" + key + "\"";
            });
            
            var mismatchDescriptions = 
                (hasPropertiesResult.matches ? [] : [hasPropertiesResult.description])
                .concat(unexpectedPropertyMismatches);
                
            if (mismatchDescriptions.length === 0) {
                return {matches: true};
            } else {
                return {matches: false, description: mismatchDescriptions.join("\n")};
            }
        },
        describeSelf: function() {
            return formatObjectOfMatchers(matchers);
        }
    });
};

exports.hasProperties = function(object) {
    var matchers = valuesToMatchers(object);
    
    return new Matcher({
        matchesWithDescription: function(value) {
            var expectedKeys = ownKeys(object);
            expectedKeys.sort(function(first, second) {
                if (first < second) {
                    return -1;
                } else if (first > second) {
                    return 1;
                } else {
                    return 0;
                }
            });
            var propertyResults = expectedKeys.map(function(key) {
                var propertyMatcher = matchers[key];
                if (!objectHasOwnProperty(value, key)) {
                    return {matches: false, description: util.format("missing property: \"%s\"", key)};
                } else if (!propertyMatcher.matches(value[key])) {
                    var description = "value of property \"" + key + "\" didn't match:\n" +
                        "    " + indent(propertyMatcher.describeMismatch(value[key]), 1) + "\n" +
                        "    expected " + indent(propertyMatcher.describeSelf(), 1);
                    return {matches: false, description: description};
                } else {
                    return {matches: true};
                }
            });
            
            return combineMatchResults(propertyResults);
        },
        describeSelf: function() {
            return "object with properties " + formatObjectOfMatchers(matchers);
        }
    });
};

exports.isArray = function(expectedArray) {
    var elementMatchers = expectedArray.map(exports.is);
    return new Matcher({
        matchesWithDescription: function(value) {
            if (value.length !== elementMatchers.length) {
                return {matches: false, description: "was of length " + value.length};
            } else {
                var elementResults = _.zip(elementMatchers, value).map(function(values, index) {
                    var expectedMatcher = values[0];
                    var actual = values[1];
                    if (expectedMatcher.matches(actual)) {
                        return {matches: true};
                    } else {
                        var description = "element at index " + index + " didn't match:\n    " + indent(expectedMatcher.describeMismatch(actual), 1)
                            + "\n    expected " + indent(expectedMatcher.describeSelf(), 1);
                        return {matches: false, description: description};
                    }
                });
                
                return combineMatchResults(elementResults);
            }
        },
        describeSelf: function() {
            return util.format("[%s]", _.invoke(elementMatchers, "describeSelf").join(", "));
        }
    });
};

var Matcher = function(matcher) {
    this._matcher = matcher;
    this._isDuckMatcher = true;
};

Matcher.prototype.matches = function(value) {
    if (this._matcher.matches) {
        return this._matcher.matches(value);
    } else {
        return this._matcher.matchesWithDescription(value).matches;
    }
};

Matcher.prototype.describeMismatch = function(value) {
    if (this._matcher.describeMismatch) {
        return this._matcher.describeMismatch(value);
    } else {
        return this._matcher.matchesWithDescription(value).description;
    }
};

Matcher.prototype.matchesWithDescription = function(value) {
    if (this._matcher.matchesWithDescription) {
        var result = this._matcher.matchesWithDescription(value);
        if (result.matches) {
            return {
                matches: true,
                description: ""
            };
        } else {
            return result;
        }
    } else {
        var isMatch = this.matches(value);
        return {
            matches: isMatch,
            description: isMatch ? "" : this.describeMismatch(value)
        };
    }
};

Matcher.prototype.describeSelf = function() {
    return this._matcher.describeSelf();
};

var combineMatchResults = function(results) {
    var mismatches = results.filter(function(result) {
        return !result.matches;
    });
    return combineMismatchs(mismatches);
};

var combineMismatchs = function(mismatches) {
    if (mismatches.length === 0) {
        return {matches: true};
    } else {
        var mismatchDescriptions = mismatches.map(function(mismatch) {
            return mismatch.description;
        });
        return {matches: false, description: mismatchDescriptions.join("\n")};
    }
};

var ownKeys = function(obj) {
    var keys = [];
    for (var key in obj) {
        if (objectHasOwnProperty(obj, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var objectHasOwnProperty = function(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
};

var objectMap = function(obj, func) {
    var matchers = {};
    _.forEach(obj, function(value, key) {
        if (_.has(obj, key)) {
            matchers[key] = func(value, key);
        }
    });
    return matchers;
    
};

var valuesToMatchers = function(obj) {
    return objectMap(obj, exports.is);
};

var formatObject = function(obj) {
    if (_.size(obj) === 0) {
        return "{}";
    } else {
        return util.format("{%s\n}", formatProperties(obj));
    }
};

var formatProperties = function(obj) {
    var properties = _.map(obj, function(value, key) {
        return {key: key, value: value};
    });
    var sortedProperties = _.sortBy(properties, function(property) {
        return property.key;
    });
    return "\n    " + sortedProperties.map(function(property) {
        return indent(property.key + ": " + property.value, 1);
    }).join(",\n    ");
};

var formatObjectOfMatchers = function(matchers) {
    return formatObject(objectMap(matchers, function(matcher) {
        return matcher.describeSelf();
    }));
};

var indent = function(str, indentationLevel) {
    var indentation = _.range(indentationLevel).map(function() {
        return "    ";
    }).join("");
    return str.replace(/\n/g, "\n" + indentation);
};

exports.any = new Matcher({
    matchesWithDescription: function() {
        return {matches: true};
    },
    describeSelf: function() {
        return "<any>";
    }
});
