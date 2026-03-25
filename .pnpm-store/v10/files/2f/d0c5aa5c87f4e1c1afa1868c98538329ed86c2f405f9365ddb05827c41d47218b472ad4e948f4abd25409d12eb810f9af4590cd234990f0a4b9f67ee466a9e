"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = dedent;
function dedent(strings, ...values) {
  const raw = typeof strings === "string" ? [strings] : strings.raw;

  // first, perform interpolation
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    result += raw[i]
    // join lines when there is a suppressed newline
    .replace(/\\\n[ \t]*/g, "")
    // handle escaped backticks
    .replace(/\\`/g, "`");
    if (i < values.length) {
      result += values[i];
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
  return result
  // dedent eats leading and trailing whitespace too
  .trim()
  // handle escaped newlines at the end to ensure they don't get stripped too
  .replace(/\\n/g, "\n");
}
module.exports = exports.default;
module.exports.default = exports.default;
