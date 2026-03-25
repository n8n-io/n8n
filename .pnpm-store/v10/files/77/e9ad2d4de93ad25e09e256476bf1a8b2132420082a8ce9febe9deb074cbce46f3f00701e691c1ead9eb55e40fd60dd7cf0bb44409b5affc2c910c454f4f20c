exports.Parser = require("./lib/parser").Parser;
exports.rules = require("./lib/rules");
exports.errors = require("./lib/errors");
exports.results = require("./lib/parsing-results");
exports.StringSource = require("./lib/StringSource");
exports.Token = require("./lib/Token");
exports.bottomUp = require("./lib/bottom-up");
exports.RegexTokeniser = require("./lib/regex-tokeniser").RegexTokeniser;

exports.rule = function(ruleBuilder) {
    var rule;
    return function(input) {
        if (!rule) {
            rule = ruleBuilder();
        }
        return rule(input);
    };
};
