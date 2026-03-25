function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
const dedent = createDedent({});
export default dedent;
function createDedent(options) {
  dedent.withOptions = newOptions => createDedent(_objectSpread(_objectSpread({}, options), newOptions));
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

    // handle escaped newlines at the end to ensure they don't get stripped too
    if (escapeSpecialCharacters) {
      result = result.replace(/\\n/g, "\n");
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
