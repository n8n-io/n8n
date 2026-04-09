"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const dedent = createDedent({});
var _default = exports.default = dedent;
function createDedent(options) {
  dedent.withOptions = newOptions => createDedent({
    ...options,
    ...newOptions
  });
  return dedent;
  function dedent(strings, ...values) {
    const raw = typeof strings === "string" ? [strings] : strings.raw;
    const {
      alignValues = false,
      escapeSpecialCharacters = Array.isArray(strings),
      trimWhitespace = true
    } = options;

    // first, perform interpolation
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      let next = raw[i];
      if (escapeSpecialCharacters) {
        // handle escaped newlines, backticks, and interpolation characters
        next = next.replace(/\\\n[ \t]*/g, "").replace(/\\`/g, "`").replace(/\\\$/g, "$").replace(/\\\{/g, "{");
      }
      result += next;
      if (i < values.length) {
        const value = alignValues ? alignValue(values[i], result) : values[i];

        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        result += value;
      }
    }

    // now strip indentation
    const lines = result.split("\n");
    let mindent = null;
    for (const l of lines) {
      const m = l.match(/^(\s+)\S+/);
      if (m) {
        const indent = m[1].length;
        if (!mindent) {
          // this is the first indented line
          mindent = indent;
        } else {
          mindent = Math.min(mindent, indent);
        }
      }
    }
    if (mindent !== null) {
      const m = mindent; // appease TypeScript
      result = lines
      // https://github.com/typescript-eslint/typescript-eslint/issues/7140
      // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
      .map(l => l[0] === " " || l[0] === "\t" ? l.slice(m) : l).join("\n");
    }

    // dedent eats leading and trailing whitespace too
    if (trimWhitespace) {
      result = result.trim();
    }

    // Unescape escapes after trimming so sequences like `\n`, `\t`,
    // `\xHH` and `\u{...}` are preserved (fixes #24)
    if (escapeSpecialCharacters) {
      result = result.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r").replace(/\\v/g, "\v").replace(/\\b/g, "\b").replace(/\\f/g, "\f").replace(/\\0/g, "\0").replace(/\\x([\da-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\u\{([\da-fA-F]{1,6})\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\u([\da-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }

    // Workaround for Bun issue with Unicode characters
    // https://github.com/oven-sh/bun/issues/8745
    if (typeof Bun !== "undefined") {
      result = result.replace(
      // Matches e.g. \\u{1f60a} or \\u5F1F
      /\\u(?:\{([\da-fA-F]{1,6})\}|([\da-fA-F]{4}))/g, (_, braced, unbraced) => {
        var _ref;
        const hex = (_ref = braced !== null && braced !== void 0 ? braced : unbraced) !== null && _ref !== void 0 ? _ref : "";
        return String.fromCodePoint(parseInt(hex, 16));
      });
    }
    return result;
  }
}

/**
 * Adjusts the indentation of a multi-line interpolated value to match the current line.
 */
function alignValue(value, precedingText) {
  if (typeof value !== "string" || !value.includes("\n")) {
    return value;
  }
  const currentLine = precedingText.slice(precedingText.lastIndexOf("\n") + 1);
  const indentMatch = currentLine.match(/^(\s+)/);
  if (indentMatch) {
    const indent = indentMatch[1];
    return value.replace(/\n/g, `\n${indent}`);
  }
  return value;
}
module.exports = exports.default;
module.exports.default = exports.default;
