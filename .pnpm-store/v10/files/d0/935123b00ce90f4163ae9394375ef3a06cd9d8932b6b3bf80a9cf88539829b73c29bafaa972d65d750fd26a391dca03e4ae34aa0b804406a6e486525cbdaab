"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathError = exports.TokenData = void 0;
exports.parse = parse;
exports.compile = compile;
exports.match = match;
exports.pathToRegexp = pathToRegexp;
exports.stringify = stringify;
const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value) => value;
const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
const ID = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;
const SIMPLE_TOKENS = "{}()[]+?!";
/**
 * Escape text for stringify to path.
 */
function escapeText(str) {
    return str.replace(/[{}()\[\]+?!:*\\]/g, "\\$&");
}
/**
 * Escape a regular expression string.
 */
function escape(str) {
    return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
}
/**
 * Tokenized path instance.
 */
class TokenData {
    constructor(tokens, originalPath) {
        this.tokens = tokens;
        this.originalPath = originalPath;
    }
}
exports.TokenData = TokenData;
/**
 * ParseError is thrown when there is an error processing the path.
 */
class PathError extends TypeError {
    constructor(message, originalPath) {
        let text = message;
        if (originalPath)
            text += `: ${originalPath}`;
        text += `; visit https://git.new/pathToRegexpError for info`;
        super(text);
        this.originalPath = originalPath;
    }
}
exports.PathError = PathError;
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options = {}) {
    const { encodePath = NOOP_VALUE } = options;
    const chars = [...str];
    const tokens = [];
    let index = 0;
    let pos = 0;
    function name() {
        let value = "";
        if (ID_START.test(chars[index])) {
            do {
                value += chars[index++];
            } while (ID_CONTINUE.test(chars[index]));
        }
        else if (chars[index] === '"') {
            let quoteStart = index;
            while (index < chars.length) {
                if (chars[++index] === '"') {
                    index++;
                    quoteStart = 0;
                    break;
                }
                // Increment over escape characters.
                if (chars[index] === "\\")
                    index++;
                value += chars[index];
            }
            if (quoteStart) {
                throw new PathError(`Unterminated quote at index ${quoteStart}`, str);
            }
        }
        if (!value) {
            throw new PathError(`Missing parameter name at index ${index}`, str);
        }
        return value;
    }
    while (index < chars.length) {
        const value = chars[index++];
        if (SIMPLE_TOKENS.includes(value)) {
            tokens.push({ type: value, index, value });
        }
        else if (value === "\\") {
            tokens.push({ type: "escape", index, value: chars[index++] });
        }
        else if (value === ":") {
            tokens.push({ type: "param", index, value: name() });
        }
        else if (value === "*") {
            tokens.push({ type: "wildcard", index, value: name() });
        }
        else {
            tokens.push({ type: "char", index, value });
        }
    }
    tokens.push({ type: "end", index, value: "" });
    function consumeUntil(endType) {
        const output = [];
        while (true) {
            const token = tokens[pos++];
            if (token.type === endType)
                break;
            if (token.type === "char" || token.type === "escape") {
                let path = token.value;
                let cur = tokens[pos];
                while (cur.type === "char" || cur.type === "escape") {
                    path += cur.value;
                    cur = tokens[++pos];
                }
                output.push({
                    type: "text",
                    value: encodePath(path),
                });
                continue;
            }
            if (token.type === "param" || token.type === "wildcard") {
                output.push({
                    type: token.type,
                    name: token.value,
                });
                continue;
            }
            if (token.type === "{") {
                output.push({
                    type: "group",
                    tokens: consumeUntil("}"),
                });
                continue;
            }
            throw new PathError(`Unexpected ${token.type} at index ${token.index}, expected ${endType}`, str);
        }
        return output;
    }
    return new TokenData(consumeUntil("end"), str);
}
/**
 * Compile a string to a template function for the path.
 */
function compile(path, options = {}) {
    const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
    const data = typeof path === "object" ? path : parse(path, options);
    const fn = tokensToFunction(data.tokens, delimiter, encode);
    return function path(params = {}) {
        const [path, ...missing] = fn(params);
        if (missing.length) {
            throw new TypeError(`Missing parameters: ${missing.join(", ")}`);
        }
        return path;
    };
}
function tokensToFunction(tokens, delimiter, encode) {
    const encoders = tokens.map((token) => tokenToFunction(token, delimiter, encode));
    return (data) => {
        const result = [""];
        for (const encoder of encoders) {
            const [value, ...extras] = encoder(data);
            result[0] += value;
            result.push(...extras);
        }
        return result;
    };
}
/**
 * Convert a single token into a path building function.
 */
function tokenToFunction(token, delimiter, encode) {
    if (token.type === "text")
        return () => [token.value];
    if (token.type === "group") {
        const fn = tokensToFunction(token.tokens, delimiter, encode);
        return (data) => {
            const [value, ...missing] = fn(data);
            if (!missing.length)
                return [value];
            return [""];
        };
    }
    const encodeValue = encode || NOOP_VALUE;
    if (token.type === "wildcard" && encode !== false) {
        return (data) => {
            const value = data[token.name];
            if (value == null)
                return ["", token.name];
            if (!Array.isArray(value) || value.length === 0) {
                throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
            }
            return [
                value
                    .map((value, index) => {
                    if (typeof value !== "string") {
                        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
                    }
                    return encodeValue(value);
                })
                    .join(delimiter),
            ];
        };
    }
    return (data) => {
        const value = data[token.name];
        if (value == null)
            return ["", token.name];
        if (typeof value !== "string") {
            throw new TypeError(`Expected "${token.name}" to be a string`);
        }
        return [encodeValue(value)];
    };
}
/**
 * Transform a path into a match function.
 */
function match(path, options = {}) {
    const { decode = decodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
    const { regexp, keys } = pathToRegexp(path, options);
    const decoders = keys.map((key) => {
        if (decode === false)
            return NOOP_VALUE;
        if (key.type === "param")
            return decode;
        return (value) => value.split(delimiter).map(decode);
    });
    return function match(input) {
        const m = regexp.exec(input);
        if (!m)
            return false;
        const path = m[0];
        const params = Object.create(null);
        for (let i = 1; i < m.length; i++) {
            if (m[i] === undefined)
                continue;
            const key = keys[i - 1];
            const decoder = decoders[i - 1];
            params[key.name] = decoder(m[i]);
        }
        return { path, params };
    };
}
/**
 * Transform a path into a regular expression and capture keys.
 */
function pathToRegexp(path, options = {}) {
    const { delimiter = DEFAULT_DELIMITER, end = true, sensitive = false, trailing = true, } = options;
    const root = new SourceNode("^");
    const paths = [path];
    let combinations = 0;
    while (paths.length) {
        const path = paths.shift();
        if (Array.isArray(path)) {
            paths.push(...path);
            continue;
        }
        const data = typeof path === "object" ? path : parse(path, options);
        flatten(data.tokens, 0, [], (tokens) => {
            if (combinations++ >= 256) {
                throw new PathError("Too many path combinations", data.originalPath);
            }
            let node = root;
            for (const part of toRegExpSource(tokens, delimiter, data.originalPath)) {
                node = node.add(part.source, part.key);
            }
            node.add(""); // Mark the end of the source.
        });
    }
    const keys = [];
    let pattern = toRegExp(root, keys);
    if (trailing)
        pattern += "(?:" + escape(delimiter) + "$)?";
    pattern += end ? "$" : "(?=" + escape(delimiter) + "|$)";
    return { regexp: new RegExp(pattern, sensitive ? "" : "i"), keys };
}
function toRegExp(node, keys) {
    if (node.key)
        keys.push(node.key);
    const children = Object.keys(node.children);
    const text = children
        .map((id) => toRegExp(node.children[id], keys))
        .join("|");
    return node.source + (children.length < 2 ? text : `(?:${text})`);
}
class SourceNode {
    constructor(source, key) {
        this.source = source;
        this.key = key;
        this.children = Object.create(null);
    }
    add(source, key) {
        var _a;
        const id = source + ":" + (key ? key.name : "");
        return ((_a = this.children)[id] || (_a[id] = new SourceNode(source, key)));
    }
}
/**
 * Generate a flat list of sequence tokens from the given tokens.
 */
function flatten(tokens, index, result, callback) {
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "group") {
            flatten(token.tokens, 0, result.slice(), (seq) => flatten(tokens, index, seq, callback));
            continue;
        }
        result.push(token);
    }
    callback(result);
}
/**
 * Transform a flat sequence of tokens into a regular expression.
 */
function toRegExpSource(tokens, delimiter, originalPath) {
    let result = [];
    let backtrack = "";
    let wildcardBacktrack = "";
    let prevCaptureType = 0;
    let hasSegmentCapture = 0;
    let index = 0;
    function hasInSegment(index, type) {
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === type)
                return true;
            if (token.type === "text") {
                if (token.value.includes(delimiter))
                    break;
            }
        }
        return false;
    }
    function peekText(index) {
        let result = "";
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type !== "text")
                break;
            result += token.value;
        }
        return result;
    }
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            result.push({ source: escape(token.value) });
            backtrack += token.value;
            if (prevCaptureType === 2)
                wildcardBacktrack += token.value;
            if (token.value.includes(delimiter))
                hasSegmentCapture = 0;
            continue;
        }
        if (token.type === "param" || token.type === "wildcard") {
            if (prevCaptureType && !backtrack) {
                throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
            }
            if (token.type === "param") {
                result.push({
                    source: hasSegmentCapture // Seen param/wildcard in segment.
                        ? `(${negate(delimiter, backtrack)}+?)`
                        : hasInSegment(index, "wildcard") // See wildcard later in segment.
                            ? `(${negate(delimiter, peekText(index))}+?)`
                            : `(${negate(delimiter, "")}+?)`,
                    key: token,
                });
                hasSegmentCapture |= prevCaptureType = 1;
            }
            else {
                result.push({
                    source: hasSegmentCapture & 2 // Seen wildcard in segment.
                        ? `(${negate(backtrack, "")}+?)`
                        : hasSegmentCapture & 1 // Seen param in segment.
                            ? `(${negate(wildcardBacktrack, "")}+?)`
                            : wildcardBacktrack // No capture in segment, seen wildcard in path.
                                ? `(${negate(wildcardBacktrack, "")}+?|${negate(delimiter, "")}+?)`
                                : `([^]+?)`,
                    key: token,
                });
                wildcardBacktrack = "";
                hasSegmentCapture |= prevCaptureType = 2;
            }
            backtrack = "";
            continue;
        }
        throw new TypeError(`Unknown token type: ${token.type}`);
    }
    return result;
}
/**
 * Block backtracking on previous text/delimiter.
 */
function negate(a, b) {
    if (b.length > a.length)
        return negate(b, a); // Longest string first.
    if (a === b)
        b = ""; // Cleaner regex strings, no duplication.
    if (b.length > 1)
        return `(?:(?!${escape(a)}|${escape(b)})[^])`;
    if (a.length > 1)
        return `(?:(?!${escape(a)})[^${escape(b)}])`;
    return `[^${escape(a + b)}]`;
}
/**
 * Stringify an array of tokens into a path string.
 */
function stringifyTokens(tokens, index) {
    let value = "";
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            value += escapeText(token.value);
            continue;
        }
        if (token.type === "group") {
            value += "{" + stringifyTokens(token.tokens, 0) + "}";
            continue;
        }
        if (token.type === "param") {
            value += ":" + stringifyName(token.name, tokens[index]);
            continue;
        }
        if (token.type === "wildcard") {
            value += "*" + stringifyName(token.name, tokens[index]);
            continue;
        }
        throw new TypeError(`Unknown token type: ${token.type}`);
    }
    return value;
}
/**
 * Stringify token data into a path string.
 */
function stringify(data) {
    return stringifyTokens(data.tokens, 0);
}
/**
 * Stringify a parameter name, escaping when it cannot be emitted directly.
 */
function stringifyName(name, next) {
    if (!ID.test(name))
        return JSON.stringify(name);
    if ((next === null || next === void 0 ? void 0 : next.type) === "text" && ID_CONTINUE.test(next.value[0])) {
        return JSON.stringify(name);
    }
    return name;
}
//# sourceMappingURL=index.js.map