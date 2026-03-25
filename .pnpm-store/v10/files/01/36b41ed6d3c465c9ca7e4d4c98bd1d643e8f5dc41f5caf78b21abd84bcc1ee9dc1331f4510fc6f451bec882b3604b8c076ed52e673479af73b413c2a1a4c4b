"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyInput = stringifyInput;
exports.tokenize = tokenize;
exports.default = colorizeJson;
const theme_1 = require("./theme");
const tokenTypes = [
    { regex: /^\s+/, tokenType: 'whitespace' },
    { regex: /^[{}]/, tokenType: 'brace' },
    { regex: /^[[\]]/, tokenType: 'bracket' },
    { regex: /^:/, tokenType: 'colon' },
    { regex: /^,/, tokenType: 'comma' },
    { regex: /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i, tokenType: 'number' },
    { regex: /^"(?:\\.|[^"\\])*"(?=\s*:)/, tokenType: 'key' },
    { regex: /^"(?:\\.|[^"\\])*"/, tokenType: 'string' },
    { regex: /^true|^false/, tokenType: 'boolean' },
    { regex: /^null/, tokenType: 'null' },
];
function stringify(value, replacer, spaces) {
    return JSON.stringify(value, serializer(replacer, replacer), spaces);
}
// Inspired by https://github.com/moll/json-stringify-safe
function serializer(replacer, cycleReplacer) {
    const stack = [];
    const keys = [];
    if (!cycleReplacer)
        cycleReplacer = function (key, value) {
            if (stack[0] === value)
                return '[Circular ~]';
            return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
        };
    return function (key, value) {
        if (stack.length > 0) {
            // @ts-expect-error because `this` is not typed
            const thisPos = stack.indexOf(this);
            // @ts-expect-error because `this` is not typed
            // eslint-disable-next-line no-bitwise, @typescript-eslint/no-unused-expressions
            ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
            // eslint-disable-next-line no-bitwise, @typescript-eslint/no-unused-expressions
            ~thisPos ? keys.splice(thisPos, Number.POSITIVE_INFINITY, key) : keys.push(key);
            // @ts-expect-error because `this` is not typed
            if (stack.includes(value))
                value = cycleReplacer.call(this, key, value);
        }
        else
            stack.push(value);
        // @ts-expect-error because `this` is not typed
        return replacer ? replacer.call(this, key, value) : value;
    };
}
function stringifyInput(json, options) {
    const str = options?.pretty
        ? stringify(typeof json === 'string' ? JSON.parse(json) : json, undefined, 2)
        : typeof json === 'string'
            ? json
            : stringify(json);
    return str;
}
function tokenize(json, options) {
    let input = stringifyInput(json, options);
    const tokens = [];
    let foundToken = false;
    do {
        for (const tokenType of tokenTypes) {
            const match = tokenType.regex.exec(input);
            if (match) {
                tokens.push({ type: tokenType.tokenType, value: match[0] });
                input = input.slice(match[0].length);
                foundToken = true;
                break;
            }
        }
    } while (hasRemainingTokens(input, foundToken));
    return tokens;
}
function hasRemainingTokens(input, foundToken) {
    return (input?.length ?? 0) > 0 && foundToken;
}
/**
 * Add color to JSON.
 *
 * options
 *  pretty: set to true to pretty print the JSON (defaults to true)
 *  theme: theme to use for colorizing. See keys below for available options. All keys are optional and must be valid colors (e.g. hex code, rgb, or standard ansi color).
 *
 * Available theme keys:
 * - brace
 * - bracket
 * - colon
 * - comma
 * - key
 * - string
 * - number
 * - boolean
 * - null
 */
function colorizeJson(json, options) {
    const opts = { ...options, pretty: options?.pretty ?? true };
    return tokenize(json, opts).reduce((acc, token) => acc + (0, theme_1.colorize)(options?.theme?.[token.type], token.value), '');
}
