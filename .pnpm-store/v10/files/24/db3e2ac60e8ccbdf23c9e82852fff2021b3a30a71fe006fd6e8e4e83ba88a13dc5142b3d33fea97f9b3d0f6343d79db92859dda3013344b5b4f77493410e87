"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = void 0;
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
function formatInput(json, options) {
    return options?.pretty
        ? JSON.stringify(typeof json === 'string' ? JSON.parse(json) : json, null, 2)
        : typeof json === 'string'
            ? json
            : JSON.stringify(json);
}
function tokenize(json, options) {
    let input = formatInput(json, options);
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
exports.tokenize = tokenize;
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
exports.default = colorizeJson;
