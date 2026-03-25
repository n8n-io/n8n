'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('./core.cjs');
var util = require('./util.cjs');

function char(char) {
    return core.token((c) => (c === char) ? c : undefined);
}
function oneOf(chars) {
    return core.token((c) => (chars.includes(c)) ? c : undefined);
}
function noneOf(chars) {
    return core.token((c) => (chars.includes(c)) ? undefined : c);
}
function charTest(regex) {
    return core.token((c) => regex.test(c) ? c : undefined);
}
function str(str) {
    const len = str.length;
    return (data, i) => {
        const tokensNumber = core.remainingTokensNumber(data, i);
        let substr = '';
        let j = 0;
        while (j < tokensNumber && substr.length < len) {
            substr += data.tokens[i + j];
            j++;
        }
        return (substr === str)
            ? {
                matched: true,
                position: i + j,
                value: str
            }
            : { matched: false };
    };
}
function concat(...ps) {
    return core.map(core.flatten(...ps), (vs) => vs.join(''));
}
function parserPosition(data, i, contextTokens = 11) {
    const len = data.tokens.length;
    const lowIndex = util.clamp(0, i - contextTokens, len - contextTokens);
    const highIndex = util.clamp(contextTokens, i + 1 + contextTokens, len);
    const tokensSlice = data.tokens.slice(lowIndex, highIndex);
    if (tokensSlice.some((t) => t.length !== 1)) {
        return core.parserPosition(data, i, (t) => t);
    }
    let line = '';
    let offset = 0;
    let markerLen = 1;
    if (i < 0) {
        line += ' ';
    }
    if (0 < lowIndex) {
        line += '...';
    }
    for (let j = 0; j < tokensSlice.length; j++) {
        const token = util.escapeWhitespace(tokensSlice[j]);
        if (lowIndex + j === i) {
            offset = line.length;
            markerLen = token.length;
        }
        line += token;
    }
    if (highIndex < len) {
        line += '...';
    }
    if (len <= i) {
        offset = line.length;
    }
    return `${''.padEnd(offset)}${i}\n${line}\n${''.padEnd(offset)}${'^'.repeat(markerLen)}`;
}
function parse(parser, str, options) {
    const data = { tokens: [...str], options: options };
    const result = parser(data, 0);
    if (!result.matched) {
        throw new Error('No match');
    }
    if (result.position < data.tokens.length) {
        throw new Error(`Partial match. Parsing stopped at:\n${parserPosition(data, result.position)}`);
    }
    return result.value;
}
function tryParse(parser, str, options) {
    return core.tryParse(parser, [...str], options);
}
function match(matcher, str, options) {
    return core.match(matcher, [...str], options);
}

exports.anyOf = oneOf;
exports.char = char;
exports.charTest = charTest;
exports.concat = concat;
exports.match = match;
exports.noneOf = noneOf;
exports.oneOf = oneOf;
exports.parse = parse;
exports.parserPosition = parserPosition;
exports.str = str;
exports.tryParse = tryParse;
