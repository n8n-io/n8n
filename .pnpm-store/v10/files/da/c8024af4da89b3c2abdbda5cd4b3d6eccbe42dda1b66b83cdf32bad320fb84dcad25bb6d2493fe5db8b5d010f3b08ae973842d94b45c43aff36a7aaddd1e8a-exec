var Token = require("../lib/Token");
var StringSource = require("../lib/StringSource");

var Tokeniser = module.exports = function(options) {
    var keywords = options.keywords;
    var tokenise = function(input) {
        var source = new StringSource(input);
        
        var createToken = function(startIndex, endIndex) {
            var value = input.substring(startIndex, endIndex);
            var tokenType = keywords.indexOf(value) === -1 ? "identifier" : "keyword";
            return new Token(
                tokenType,
                value,
                source.range(startIndex, endIndex)
            );
        };
        
        var position = 0;
        var tokens = [];
        var done = input === "";
        
        while (!done) {
            var nextWhitespace = indexOfRegex(input, /\s/, position);
            if (nextWhitespace === -1) {
                done = true;
                tokens.push(createToken(position, input.length));
            } else {
                tokens.push(createToken(position, nextWhitespace));
                position = indexOfRegex(input, /\S/, nextWhitespace);
            }
        }
        tokens.push(new Token("end", null, source.range(input.length, input.length)));
        return tokens;
    };
    
    var indexOfRegex = function(string, regex, startIndex) {
        startIndex = startIndex || 0;
        var index = string.substring(startIndex).search(regex);
        if (index === -1) {
            return -1;
        } else {
            return index + startIndex;
        }
    };
    
    return {
        tokenise: tokenise
    };
};
