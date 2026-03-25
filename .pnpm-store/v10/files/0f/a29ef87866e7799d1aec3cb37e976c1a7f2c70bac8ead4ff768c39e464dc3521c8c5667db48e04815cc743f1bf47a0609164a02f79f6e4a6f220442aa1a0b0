# lop -- parsing library for JavaScript

lop is a library to create parsers using parser combinators with helpful errors.

```javascript

function parse(tokens) {
    var parser = lop.Parser();
    return parser.parseTokens(expressionRule, tokens);
}

// This rule is wrapped inside lop.rule to defer evaluation until
// the rule is used -- otherwise, it would reference integerRule
// and ifRule, which don't exist yet.
var expressionRule = lop.rule(function() {
    return rules.firstOf("expression",
        integerRule,
        ifRule
    );
});

var integerRule = rules.then(
    rules.tokenOfType("integer"),
    function(value) {
        return new IntegerNode(parseInt(value, 10));
    }
);

var ifRule = rules.sequence(
    rules.token("keyword", "if"),
    rules.sequence.cut(),
    rules.sequence.capture(expressionRule),
    rules.token("keyword", "then"),
    rules.sequence.capture(expressionRule),
    rules.token("keyword", "else"),
    rules.sequence.capture(expressionRule)
).map(function(condition, trueBranch, falseBranch) {
    return new IfNode(condition, trueBranch, falseBranch);
});
```

lop tries to provide helpful errors where possible. For instance, in `ifRule`
as defined above, there is a cut following the keyword `if`. Before the cut,
if we fail to match the input, we can backtrack -- in this case, we backtrack
and see if another form of expression might match the input. However, after the
cut, we prevent backtracking. Once we've see the keyword `if`, there's no doubt
about which sort of expression this is, so if parsing fails later in this rule,
there's no point in backtracking. This allows informative error messages to be
generated: if we try to parse the string `"if 1 42 else 12"`, we get the error:

    Error: File: /tmp/lop-example
    Line number: 1
    Character number: 6:
    Expected keyword "then"
    but got integer "42"

## Tokens

When using a parser built with lop, the input is an array of tokens. A token can be any value so long as it has the property `source`, which must be a `StringSourceRange`.

### Regex tokeniser

The easiest way to create a tokeniser is using lop's regex tokeniser.
A regex tokeniser can be constructed by calling `new lop.RegexTokeniser(rules)`,
where `rules` is a list of token rules.
A token rule should have a `name` property that uniquely identifies that rule,
and a `regex` property that is an instance of `RegExp` describing the token.

Calling `tokenise` with a string will return a list of tokens.
Each token has three properties:

* `type`
* `value`
* `source`

The tokeniser will apply the regex from each rule in order at the current position.
The current position is initially zero, the start of the string.
The first rule with a matching regex is used to produce a token,
with the token's `value` being the first capture of the regex,
or `undefined` if the regex does not define any capture groups.
The current position is incremented to the index of the first character unmatched by the regex.
If no rule matches at the current position,
a single character `unrecognisedCharacter` token is produced,
and the current position is incremented by one.

For instance, to create a simple tokeniser that generates a stream of words tokens separated by whitespace tokens.

```javascript
var lop = require("lop");

var rules = [
    {
        name: "identifier",
        regex: /(\s+)/
    },
    {
        name: "whitespace",
        regex: /(\S+)/
    }
];
var tokeniser = new lop.RegexTokeniser(rules);
tokeniser.tokenise(input);
```

### Custom tokenisers

You can also create your own tokeniser.
For instance, to create a simple tokeniser that generates a stream of words tokens separated by whitespace tokens:

```javascript
var StringSource = require("lop").StringSource;

function tokeniseString(string) {
    return tokenise(new StringSource(string, "raw string"));
}

function tokenise(source) {
    var string = source.asString();
    var whitespaceRegex = /(\s+)/g;
    var result;
    var start = 0;
    var parts = [];
    
    while ((result = whitespaceRegex.exec(source)) !== null) {
        parts.push({
            type: "word",
            value: string.substring(start, result.index),
            source: source.range(start, result.index)
        });
        parts.push({
            type: "whitespace",
            value: result[1],
            source: source.range(result.index, whitespaceRegex.lastIndex)
        });
        start = whitespaceRegex.lastIndex;
    }
    parts.push({
        type: "word",
        value: string.substring(start),
        source: source.range(start, string.length)
    });
    parts.push({
        type: "end",
        source: source.range(string.length, string.length)
    });
    return parts.filter(function(part) {
        return part.type !== "word" || part.value !== "";
    });
}
```

lop also defines its own notion of a token. Each instance of `lop.Token` has a type, name, and source, similarly to most of the tokens that would be created by the token above. For instance, instead of:

    {
        type: "word",
        value: value,
        source: source
    }

you could use:

    new Token("word", value, source)

The main advantage of using `lop.Token` is that you can then use the rules `lop.rules.token` and `lop.rules.tokenOfType` (described later). If you don't use `lop.Token`, you must define your own atomic rules, but you can use the other rules without any modifications.

## Parser

To parse an array of tokens, you can call the method `parseTokens` on `lop.Parser`, passing in the parsing rule and the array of tokens. For instance, assuming we already have a `tokenise` function (the one above would do fine):

```javascript
function parseSentence(source) {
    var tokens = tokenise(source);
    var parser = new lop.Parser();
    var parseResult = parser.parseTokens(sentenceRule, tokens);
    if (!parseResult.isSuccess()) {
        throw new Error("Failed to parse: " + describeFailure(parseResult));
    }
    return parseResult.value();
}

function describeFailure(parseResult) {
    return parseResult.errors().map(describeError).join("\n");
   
    function describeError(error) {
        return error.describe();
    }
}
```

The result of parsing can be success, failure, or error. While failure indicates
that the rule didn't match the input tokens, error indicates that the input
was invalid in some way. In general, rules will backtrack when they
encounter a failure, but will completely abort when they encounter an error.
Each of these results has a number of methods:

```javascript
    result.isSuccess() // true for success, false otherwise
    result.isFailure() // true for failure, false otherwise
    result.isError() // true for error, false otherwise
    result.value() // if success, the value that was parsed
    result.remaining() // if success, the tokens that weren't consumed by parsing
    result.source() // the StringSourceRange containing the consumed tokens
    result.errors() // if failure or error, an array of descriptions of the failure/error
```

The final question is then: how do we define rules for the parser, such as the currently undefined `sentenceRule`?

## Rules

Each rule in lop accepts an iterator over tokens, and returns a result, as
described in the previous section.

### lop.rules.token(*tokenType*, *value*)

Success if the next token has type `tokenType` and value `value`, failure
otherwise. Value on success is the value of the token.

### lop.rules.tokenOfType(*tokenType*)

Success if the next token has type `tokenType`, failure otherwise. Value on
success is the value of the token.

### lop.rules.firstOf(*name*, *subRules*)

Tries each rule in `subRules` on the input tokens in turn. We return the result
from the first sub-rule that returns success or error. In other words, return the
result from the first sub-rule that doesn't return failure. If all sub-rules return
failure, this rule returns failure.

### lop.rules.then(*subRule*, *func*)

Try `subRule` on the input tokens, and if successful, map over the result. For
instance:

```javascript
lop.rules.then(
    lop.rules.tokenOfType("integer"),
    function(tokenValue) {
        return parseInt(tokenValue, 10);
    }
)
```

### lop.rules.optional(*subRule*)

Try `subRule` on the input tokens. If the sub-rule is successful with the value
`value`, then return success with the value `options.some(value)`. If the sub-rule fails, return
success with the value `options.none`. If the sub-rules errors, return that error.
