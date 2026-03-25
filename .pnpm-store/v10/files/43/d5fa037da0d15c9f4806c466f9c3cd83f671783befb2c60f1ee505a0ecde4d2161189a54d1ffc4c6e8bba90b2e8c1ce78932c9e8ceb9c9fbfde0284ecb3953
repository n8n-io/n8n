var Token = require("./Token");
var StringSource = require("./StringSource");

exports.RegexTokeniser = RegexTokeniser;

function RegexTokeniser(rules) {
    rules = rules.map(function(rule) {
        return {
            name: rule.name,
            regex: new RegExp(rule.regex.source, "g")
        };
    });
    
    function tokenise(input, description) {
        var source = new StringSource(input, description);
        var index = 0;
        var tokens = [];
    
        while (index < input.length) {
            var result = readNextToken(input, index, source);
            index = result.endIndex;
            tokens.push(result.token);
        }
        
        tokens.push(endToken(input, source));
        return tokens;
    }

    function readNextToken(string, startIndex, source) {
        for (var i = 0; i < rules.length; i++) {
            var regex = rules[i].regex;
            regex.lastIndex = startIndex;
            var result = regex.exec(string);
            
            if (result) {
                var endIndex = startIndex + result[0].length;
                if (result.index === startIndex && endIndex > startIndex) {
                    var value = result[1];
                    var token = new Token(
                        rules[i].name,
                        value,
                        source.range(startIndex, endIndex)
                    );
                    return {token: token, endIndex: endIndex};
                }
            }
        }
        var endIndex = startIndex + 1;
        var token = new Token(
            "unrecognisedCharacter",
            string.substring(startIndex, endIndex),
            source.range(startIndex, endIndex)
        );
        return {token: token, endIndex: endIndex};
    }
    
    function endToken(input, source) {
        return new Token(
            "end",
            null,
            source.range(input.length, input.length)
        );
    }
    
    return {
        tokenise: tokenise
    }
}


