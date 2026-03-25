var _ = require("underscore");
var lop = require("lop");

var documentMatchers = require("./styles/document-matchers");
var htmlPaths = require("./styles/html-paths");
var tokenise = require("./styles/parser/tokeniser").tokenise;
var results = require("./results");

exports.readHtmlPath = readHtmlPath;
exports.readDocumentMatcher = readDocumentMatcher;
exports.readStyle = readStyle;


function readStyle(string) {
    return parseString(styleRule, string);
}

function createStyleRule() {
    return lop.rules.sequence(
        lop.rules.sequence.capture(documentMatcherRule()),
        lop.rules.tokenOfType("whitespace"),
        lop.rules.tokenOfType("arrow"),
        lop.rules.sequence.capture(lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("whitespace"),
            lop.rules.sequence.capture(htmlPathRule())
        ).head())),
        lop.rules.tokenOfType("end")
    ).map(function(documentMatcher, htmlPath) {
        return {
            from: documentMatcher,
            to: htmlPath.valueOrElse(htmlPaths.empty)
        };
    });
}

function readDocumentMatcher(string) {
    return parseString(documentMatcherRule(), string);
}

function documentMatcherRule() {
    var sequence = lop.rules.sequence;

    var identifierToConstant = function(identifier, constant) {
        return lop.rules.then(
            lop.rules.token("identifier", identifier),
            function() {
                return constant;
            }
        );
    };

    var paragraphRule = identifierToConstant("p", documentMatchers.paragraph);
    var runRule = identifierToConstant("r", documentMatchers.run);

    var elementTypeRule = lop.rules.firstOf("p or r or table",
        paragraphRule,
        runRule
    );

    var styleIdRule = lop.rules.sequence(
        lop.rules.tokenOfType("dot"),
        lop.rules.sequence.cut(),
        lop.rules.sequence.capture(identifierRule)
    ).map(function(styleId) {
        return {styleId: styleId};
    });

    var styleNameMatcherRule = lop.rules.firstOf("style name matcher",
        lop.rules.then(
            lop.rules.sequence(
                lop.rules.tokenOfType("equals"),
                lop.rules.sequence.cut(),
                lop.rules.sequence.capture(stringRule)
            ).head(),
            function(styleName) {
                return {styleName: documentMatchers.equalTo(styleName)};
            }
        ),
        lop.rules.then(
            lop.rules.sequence(
                lop.rules.tokenOfType("startsWith"),
                lop.rules.sequence.cut(),
                lop.rules.sequence.capture(stringRule)
            ).head(),
            function(styleName) {
                return {styleName: documentMatchers.startsWith(styleName)};
            }
        )
    );

    var styleNameRule = lop.rules.sequence(
        lop.rules.tokenOfType("open-square-bracket"),
        lop.rules.sequence.cut(),
        lop.rules.token("identifier", "style-name"),
        lop.rules.sequence.capture(styleNameMatcherRule),
        lop.rules.tokenOfType("close-square-bracket")
    ).head();


    var listTypeRule = lop.rules.firstOf("list type",
        identifierToConstant("ordered-list", {isOrdered: true}),
        identifierToConstant("unordered-list", {isOrdered: false})
    );
    var listRule = sequence(
        lop.rules.tokenOfType("colon"),
        sequence.capture(listTypeRule),
        sequence.cut(),
        lop.rules.tokenOfType("open-paren"),
        sequence.capture(integerRule),
        lop.rules.tokenOfType("close-paren")
    ).map(function(listType, levelNumber) {
        return {
            list: {
                isOrdered: listType.isOrdered,
                levelIndex: levelNumber - 1
            }
        };
    });

    function createMatcherSuffixesRule(rules) {
        var matcherSuffix = lop.rules.firstOf.apply(
            lop.rules.firstOf,
            ["matcher suffix"].concat(rules)
        );
        var matcherSuffixes = lop.rules.zeroOrMore(matcherSuffix);
        return lop.rules.then(matcherSuffixes, function(suffixes) {
            var matcherOptions = {};
            suffixes.forEach(function(suffix) {
                _.extend(matcherOptions, suffix);
            });
            return matcherOptions;
        });
    }

    var paragraphOrRun = sequence(
        sequence.capture(elementTypeRule),
        sequence.capture(createMatcherSuffixesRule([
            styleIdRule,
            styleNameRule,
            listRule
        ]))
    ).map(function(createMatcher, matcherOptions) {
        return createMatcher(matcherOptions);
    });

    var table = sequence(
        lop.rules.token("identifier", "table"),
        sequence.capture(createMatcherSuffixesRule([
            styleIdRule,
            styleNameRule
        ]))
    ).map(function(options) {
        return documentMatchers.table(options);
    });

    var bold = identifierToConstant("b", documentMatchers.bold);
    var italic = identifierToConstant("i", documentMatchers.italic);
    var underline = identifierToConstant("u", documentMatchers.underline);
    var strikethrough = identifierToConstant("strike", documentMatchers.strikethrough);
    var allCaps = identifierToConstant("all-caps", documentMatchers.allCaps);
    var smallCaps = identifierToConstant("small-caps", documentMatchers.smallCaps);

    var highlight = sequence(
        lop.rules.token("identifier", "highlight"),
        lop.rules.sequence.capture(lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("open-square-bracket"),
            lop.rules.sequence.cut(),
            lop.rules.token("identifier", "color"),
            lop.rules.tokenOfType("equals"),
            lop.rules.sequence.capture(stringRule),
            lop.rules.tokenOfType("close-square-bracket")
        ).head()))
    ).map(function(color) {
        return documentMatchers.highlight({
            color: color.valueOrElse(undefined)
        });
    });

    var commentReference = identifierToConstant("comment-reference", documentMatchers.commentReference);

    var breakMatcher = sequence(
        lop.rules.token("identifier", "br"),
        sequence.cut(),
        lop.rules.tokenOfType("open-square-bracket"),
        lop.rules.token("identifier", "type"),
        lop.rules.tokenOfType("equals"),
        sequence.capture(stringRule),
        lop.rules.tokenOfType("close-square-bracket")
    ).map(function(breakType) {
        switch (breakType) {
        case "line":
            return documentMatchers.lineBreak;
        case "page":
            return documentMatchers.pageBreak;
        case "column":
            return documentMatchers.columnBreak;
        default:
            // TODO: handle unknown document matchers
        }
    });

    return lop.rules.firstOf("element type",
        paragraphOrRun,
        table,
        bold,
        italic,
        underline,
        strikethrough,
        allCaps,
        smallCaps,
        highlight,
        commentReference,
        breakMatcher
    );
}

function readHtmlPath(string) {
    return parseString(htmlPathRule(), string);
}

function htmlPathRule() {
    var capture = lop.rules.sequence.capture;
    var whitespaceRule = lop.rules.tokenOfType("whitespace");
    var freshRule = lop.rules.then(
        lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("colon"),
            lop.rules.token("identifier", "fresh")
        )),
        function(option) {
            return option.map(function() {
                return true;
            }).valueOrElse(false);
        }
    );

    var separatorRule = lop.rules.then(
        lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("colon"),
            lop.rules.token("identifier", "separator"),
            lop.rules.tokenOfType("open-paren"),
            capture(stringRule),
            lop.rules.tokenOfType("close-paren")
        ).head()),
        function(option) {
            return option.valueOrElse("");
        }
    );

    var tagNamesRule = lop.rules.oneOrMoreWithSeparator(
        identifierRule,
        lop.rules.tokenOfType("choice")
    );

    var styleElementRule = lop.rules.sequence(
        capture(tagNamesRule),
        capture(lop.rules.zeroOrMore(attributeOrClassRule)),
        capture(freshRule),
        capture(separatorRule)
    ).map(function(tagName, attributesList, fresh, separator) {
        var attributes = {};
        var options = {};
        attributesList.forEach(function(attribute) {
            if (attribute.append && attributes[attribute.name]) {
                attributes[attribute.name] += " " + attribute.value;
            } else {
                attributes[attribute.name] = attribute.value;
            }
        });
        if (fresh) {
            options.fresh = true;
        }
        if (separator) {
            options.separator = separator;
        }
        return htmlPaths.element(tagName, attributes, options);
    });

    return lop.rules.firstOf("html path",
        lop.rules.then(lop.rules.tokenOfType("bang"), function() {
            return htmlPaths.ignore;
        }),
        lop.rules.then(
            lop.rules.zeroOrMoreWithSeparator(
                styleElementRule,
                lop.rules.sequence(
                    whitespaceRule,
                    lop.rules.tokenOfType("gt"),
                    whitespaceRule
                )
            ),
            htmlPaths.elements
        )
    );
}

var identifierRule = lop.rules.then(
    lop.rules.tokenOfType("identifier"),
    decodeEscapeSequences
);
var integerRule = lop.rules.tokenOfType("integer");

var stringRule = lop.rules.then(
    lop.rules.tokenOfType("string"),
    decodeEscapeSequences
);

var escapeSequences = {
    "n": "\n",
    "r": "\r",
    "t": "\t"
};

function decodeEscapeSequences(value) {
    return value.replace(/\\(.)/g, function(match, code) {
        return escapeSequences[code] || code;
    });
}

var attributeRule = lop.rules.sequence(
    lop.rules.tokenOfType("open-square-bracket"),
    lop.rules.sequence.cut(),
    lop.rules.sequence.capture(identifierRule),
    lop.rules.tokenOfType("equals"),
    lop.rules.sequence.capture(stringRule),
    lop.rules.tokenOfType("close-square-bracket")
).map(function(name, value) {
    return {name: name, value: value, append: false};
});

var classRule = lop.rules.sequence(
    lop.rules.tokenOfType("dot"),
    lop.rules.sequence.cut(),
    lop.rules.sequence.capture(identifierRule)
).map(function(className) {
    return {name: "class", value: className, append: true};
});

var attributeOrClassRule = lop.rules.firstOf(
    "attribute or class",
    attributeRule,
    classRule
);

function parseString(rule, string) {
    var tokens = tokenise(string);
    var parser = lop.Parser();
    var parseResult = parser.parseTokens(rule, tokens);
    if (parseResult.isSuccess()) {
        return results.success(parseResult.value());
    } else {
        return new results.Result(null, [results.warning(describeFailure(string, parseResult))]);
    }
}

function describeFailure(input, parseResult) {
    return "Did not understand this style mapping, so ignored it: " + input + "\n" +
        parseResult.errors().map(describeError).join("\n");
}

function describeError(error) {
    return "Error was at character number " + error.characterNumber() + ": " +
        "Expected " + error.expected + " but got " + error.actual;
}

var styleRule = createStyleRule();
