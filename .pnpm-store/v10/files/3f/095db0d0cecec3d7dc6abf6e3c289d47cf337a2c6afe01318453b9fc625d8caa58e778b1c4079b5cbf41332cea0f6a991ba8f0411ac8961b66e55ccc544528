import { token, remainingTokensNumber, map, flatten, parserPosition as parserPosition$1, tryParse as tryParse$1, match as match$1 } from './core.mjs';
import { clamp, escapeWhitespace } from './util.mjs';

function char(char) {
    return token((c) => (c === char) ? c : undefined);
}
function oneOf(chars) {
    return token((c) => (chars.includes(c)) ? c : undefined);
}
function noneOf(chars) {
    return token((c) => (chars.includes(c)) ? undefined : c);
}
function charTest(regex) {
    return token((c) => regex.test(c) ? c : undefined);
}
function str(str) {
    const len = str.length;
    return (data, i) => {
        const tokensNumber = remainingTokensNumber(data, i);
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
    return map(flatten(...ps), (vs) => vs.join(''));
}
function parserPosition(data, i, contextTokens = 11) {
    const len = data.tokens.length;
    const lowIndex = clamp(0, i - contextTokens, len - contextTokens);
    const highIndex = clamp(contextTokens, i + 1 + contextTokens, len);
    const tokensSlice = data.tokens.slice(lowIndex, highIndex);
    if (tokensSlice.some((t) => t.length !== 1)) {
        return parserPosition$1(data, i, (t) => t);
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
        const token = escapeWhitespace(tokensSlice[j]);
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
    return tryParse$1(parser, [...str], options);
}
function match(matcher, str, options) {
    return match$1(matcher, [...str], options);
}

export { oneOf as anyOf, char, charTest, concat, match, noneOf, oneOf, parse, parserPosition, str, tryParse };
