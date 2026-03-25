/**
 * This splits a string on a top-level character.
 *
 * Regex doesn't support recursion (at least not the JS-flavored version).
 * So we have to use a tiny state machine to keep track of paren placement.
 *
 * Expected behavior using commas:
 * var(--a, 0 0 1px rgb(0, 0, 0)), 0 0 1px rgb(0, 0, 0)
 *       ─┬─             ┬  ┬    ┬
 *        x              x  x    ╰──────── Split because top-level
 *        ╰──────────────┴──┴───────────── Ignored b/c inside >= 1 levels of parens
 *
 * @param {string} input
 * @param {string} separator
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "splitAtTopLevelOnly", {
    enumerable: true,
    get: function() {
        return splitAtTopLevelOnly;
    }
});
function splitAtTopLevelOnly(input, separator) {
    let stack = [];
    let parts = [];
    let lastPos = 0;
    let isEscaped = false;
    for(let idx = 0; idx < input.length; idx++){
        let char = input[idx];
        if (stack.length === 0 && char === separator[0] && !isEscaped) {
            if (separator.length === 1 || input.slice(idx, idx + separator.length) === separator) {
                parts.push(input.slice(lastPos, idx));
                lastPos = idx + separator.length;
            }
        }
        if (isEscaped) {
            isEscaped = false;
        } else if (char === "\\") {
            isEscaped = true;
        }
        if (char === "(" || char === "[" || char === "{") {
            stack.push(char);
        } else if (char === ")" && stack[stack.length - 1] === "(" || char === "]" && stack[stack.length - 1] === "[" || char === "}" && stack[stack.length - 1] === "{") {
            stack.pop();
        }
    }
    parts.push(input.slice(lastPos));
    return parts;
}
