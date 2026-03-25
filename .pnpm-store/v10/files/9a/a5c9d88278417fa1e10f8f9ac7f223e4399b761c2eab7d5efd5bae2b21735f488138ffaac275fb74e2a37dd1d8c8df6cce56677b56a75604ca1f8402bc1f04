"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var selectorParser_exports = {};
__export(selectorParser_exports, {
  InvalidSelectorError: () => import_cssParser2.InvalidSelectorError,
  customCSSNames: () => customCSSNames,
  isInvalidSelectorError: () => import_cssParser2.isInvalidSelectorError,
  parseAttributeSelector: () => parseAttributeSelector,
  parseSelector: () => parseSelector,
  splitSelectorByFrame: () => splitSelectorByFrame,
  stringifySelector: () => stringifySelector,
  visitAllSelectorParts: () => visitAllSelectorParts
});
module.exports = __toCommonJS(selectorParser_exports);
var import_cssParser = require("./cssParser");
var import_cssParser2 = require("./cssParser");
const kNestedSelectorNames = /* @__PURE__ */ new Set(["internal:has", "internal:has-not", "internal:and", "internal:or", "internal:chain", "left-of", "right-of", "above", "below", "near"]);
const kNestedSelectorNamesWithDistance = /* @__PURE__ */ new Set(["left-of", "right-of", "above", "below", "near"]);
const customCSSNames = /* @__PURE__ */ new Set(["not", "is", "where", "has", "scope", "light", "visible", "text", "text-matches", "text-is", "has-text", "above", "below", "right-of", "left-of", "near", "nth-match"]);
function parseSelector(selector) {
  const parsedStrings = parseSelectorString(selector);
  const parts = [];
  for (const part of parsedStrings.parts) {
    if (part.name === "css" || part.name === "css:light") {
      if (part.name === "css:light")
        part.body = ":light(" + part.body + ")";
      const parsedCSS = (0, import_cssParser.parseCSS)(part.body, customCSSNames);
      parts.push({
        name: "css",
        body: parsedCSS.selector,
        source: part.body
      });
      continue;
    }
    if (kNestedSelectorNames.has(part.name)) {
      let innerSelector;
      let distance;
      try {
        const unescaped = JSON.parse("[" + part.body + "]");
        if (!Array.isArray(unescaped) || unescaped.length < 1 || unescaped.length > 2 || typeof unescaped[0] !== "string")
          throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
        innerSelector = unescaped[0];
        if (unescaped.length === 2) {
          if (typeof unescaped[1] !== "number" || !kNestedSelectorNamesWithDistance.has(part.name))
            throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
          distance = unescaped[1];
        }
      } catch (e) {
        throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
      }
      const nested = { name: part.name, source: part.body, body: { parsed: parseSelector(innerSelector), distance } };
      const lastFrame = [...nested.body.parsed.parts].reverse().find((part2) => part2.name === "internal:control" && part2.body === "enter-frame");
      const lastFrameIndex = lastFrame ? nested.body.parsed.parts.indexOf(lastFrame) : -1;
      if (lastFrameIndex !== -1 && selectorPartsEqual(nested.body.parsed.parts.slice(0, lastFrameIndex + 1), parts.slice(0, lastFrameIndex + 1)))
        nested.body.parsed.parts.splice(0, lastFrameIndex + 1);
      parts.push(nested);
      continue;
    }
    parts.push({ ...part, source: part.body });
  }
  if (kNestedSelectorNames.has(parts[0].name))
    throw new import_cssParser.InvalidSelectorError(`"${parts[0].name}" selector cannot be first`);
  return {
    capture: parsedStrings.capture,
    parts
  };
}
function splitSelectorByFrame(selectorText) {
  const selector = parseSelector(selectorText);
  const result = [];
  let chunk = {
    parts: []
  };
  let chunkStartIndex = 0;
  for (let i = 0; i < selector.parts.length; ++i) {
    const part = selector.parts[i];
    if (part.name === "internal:control" && part.body === "enter-frame") {
      if (!chunk.parts.length)
        throw new import_cssParser.InvalidSelectorError("Selector cannot start with entering frame, select the iframe first");
      result.push(chunk);
      chunk = { parts: [] };
      chunkStartIndex = i + 1;
      continue;
    }
    if (selector.capture === i)
      chunk.capture = i - chunkStartIndex;
    chunk.parts.push(part);
  }
  if (!chunk.parts.length)
    throw new import_cssParser.InvalidSelectorError(`Selector cannot end with entering frame, while parsing selector ${selectorText}`);
  result.push(chunk);
  if (typeof selector.capture === "number" && typeof result[result.length - 1].capture !== "number")
    throw new import_cssParser.InvalidSelectorError(`Can not capture the selector before diving into the frame. Only use * after the last frame has been selected`);
  return result;
}
function selectorPartsEqual(list1, list2) {
  return stringifySelector({ parts: list1 }) === stringifySelector({ parts: list2 });
}
function stringifySelector(selector, forceEngineName) {
  if (typeof selector === "string")
    return selector;
  return selector.parts.map((p, i) => {
    let includeEngine = true;
    if (!forceEngineName && i !== selector.capture) {
      if (p.name === "css")
        includeEngine = false;
      else if (p.name === "xpath" && p.source.startsWith("//") || p.source.startsWith(".."))
        includeEngine = false;
    }
    const prefix = includeEngine ? p.name + "=" : "";
    return `${i === selector.capture ? "*" : ""}${prefix}${p.source}`;
  }).join(" >> ");
}
function visitAllSelectorParts(selector, visitor) {
  const visit = (selector2, nested) => {
    for (const part of selector2.parts) {
      visitor(part, nested);
      if (kNestedSelectorNames.has(part.name))
        visit(part.body.parsed, true);
    }
  };
  visit(selector, false);
}
function parseSelectorString(selector) {
  let index = 0;
  let quote;
  let start = 0;
  const result = { parts: [] };
  const append = () => {
    const part = selector.substring(start, index).trim();
    const eqIndex = part.indexOf("=");
    let name;
    let body;
    if (eqIndex !== -1 && part.substring(0, eqIndex).trim().match(/^[a-zA-Z_0-9-+:*]+$/)) {
      name = part.substring(0, eqIndex).trim();
      body = part.substring(eqIndex + 1);
    } else if (part.length > 1 && part[0] === '"' && part[part.length - 1] === '"') {
      name = "text";
      body = part;
    } else if (part.length > 1 && part[0] === "'" && part[part.length - 1] === "'") {
      name = "text";
      body = part;
    } else if (/^\(*\/\//.test(part) || part.startsWith("..")) {
      name = "xpath";
      body = part;
    } else {
      name = "css";
      body = part;
    }
    let capture = false;
    if (name[0] === "*") {
      capture = true;
      name = name.substring(1);
    }
    result.parts.push({ name, body });
    if (capture) {
      if (result.capture !== void 0)
        throw new import_cssParser.InvalidSelectorError(`Only one of the selectors can capture using * modifier`);
      result.capture = result.parts.length - 1;
    }
  };
  if (!selector.includes(">>")) {
    index = selector.length;
    append();
    return result;
  }
  const shouldIgnoreTextSelectorQuote = () => {
    const prefix = selector.substring(start, index);
    const match = prefix.match(/^\s*text\s*=(.*)$/);
    return !!match && !!match[1];
  };
  while (index < selector.length) {
    const c = selector[index];
    if (c === "\\" && index + 1 < selector.length) {
      index += 2;
    } else if (c === quote) {
      quote = void 0;
      index++;
    } else if (!quote && (c === '"' || c === "'" || c === "`") && !shouldIgnoreTextSelectorQuote()) {
      quote = c;
      index++;
    } else if (!quote && c === ">" && selector[index + 1] === ">") {
      append();
      index += 2;
      start = index;
    } else {
      index++;
    }
  }
  append();
  return result;
}
function parseAttributeSelector(selector, allowUnquotedStrings) {
  let wp = 0;
  let EOL = selector.length === 0;
  const next = () => selector[wp] || "";
  const eat1 = () => {
    const result2 = next();
    ++wp;
    EOL = wp >= selector.length;
    return result2;
  };
  const syntaxError = (stage) => {
    if (EOL)
      throw new import_cssParser.InvalidSelectorError(`Unexpected end of selector while parsing selector \`${selector}\``);
    throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` + (stage ? " during " + stage : ""));
  };
  function skipSpaces() {
    while (!EOL && /\s/.test(next()))
      eat1();
  }
  function isCSSNameChar(char) {
    return char >= "\x80" || char >= "0" && char <= "9" || char >= "A" && char <= "Z" || char >= "a" && char <= "z" || char >= "0" && char <= "9" || char === "_" || char === "-";
  }
  function readIdentifier() {
    let result2 = "";
    skipSpaces();
    while (!EOL && isCSSNameChar(next()))
      result2 += eat1();
    return result2;
  }
  function readQuotedString(quote) {
    let result2 = eat1();
    if (result2 !== quote)
      syntaxError("parsing quoted string");
    while (!EOL && next() !== quote) {
      if (next() === "\\")
        eat1();
      result2 += eat1();
    }
    if (next() !== quote)
      syntaxError("parsing quoted string");
    result2 += eat1();
    return result2;
  }
  function readRegularExpression() {
    if (eat1() !== "/")
      syntaxError("parsing regular expression");
    let source = "";
    let inClass = false;
    while (!EOL) {
      if (next() === "\\") {
        source += eat1();
        if (EOL)
          syntaxError("parsing regular expression");
      } else if (inClass && next() === "]") {
        inClass = false;
      } else if (!inClass && next() === "[") {
        inClass = true;
      } else if (!inClass && next() === "/") {
        break;
      }
      source += eat1();
    }
    if (eat1() !== "/")
      syntaxError("parsing regular expression");
    let flags = "";
    while (!EOL && next().match(/[dgimsuy]/))
      flags += eat1();
    try {
      return new RegExp(source, flags);
    } catch (e) {
      throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\`: ${e.message}`);
    }
  }
  function readAttributeToken() {
    let token = "";
    skipSpaces();
    if (next() === `'` || next() === `"`)
      token = readQuotedString(next()).slice(1, -1);
    else
      token = readIdentifier();
    if (!token)
      syntaxError("parsing property path");
    return token;
  }
  function readOperator() {
    skipSpaces();
    let op = "";
    if (!EOL)
      op += eat1();
    if (!EOL && op !== "=")
      op += eat1();
    if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
      syntaxError("parsing operator");
    return op;
  }
  function readAttribute() {
    eat1();
    const jsonPath = [];
    jsonPath.push(readAttributeToken());
    skipSpaces();
    while (next() === ".") {
      eat1();
      jsonPath.push(readAttributeToken());
      skipSpaces();
    }
    if (next() === "]") {
      eat1();
      return { name: jsonPath.join("."), jsonPath, op: "<truthy>", value: null, caseSensitive: false };
    }
    const operator = readOperator();
    let value = void 0;
    let caseSensitive = true;
    skipSpaces();
    if (next() === "/") {
      if (operator !== "=")
        throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`);
      value = readRegularExpression();
    } else if (next() === `'` || next() === `"`) {
      value = readQuotedString(next()).slice(1, -1);
      skipSpaces();
      if (next() === "i" || next() === "I") {
        caseSensitive = false;
        eat1();
      } else if (next() === "s" || next() === "S") {
        caseSensitive = true;
        eat1();
      }
    } else {
      value = "";
      while (!EOL && (isCSSNameChar(next()) || next() === "+" || next() === "."))
        value += eat1();
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else {
        if (!allowUnquotedStrings) {
          value = +value;
          if (Number.isNaN(value))
            syntaxError("parsing attribute value");
        }
      }
    }
    skipSpaces();
    if (next() !== "]")
      syntaxError("parsing attribute value");
    eat1();
    if (operator !== "=" && typeof value !== "string")
      throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`);
    return { name: jsonPath.join("."), jsonPath, op: operator, value, caseSensitive };
  }
  const result = {
    name: "",
    attributes: []
  };
  result.name = readIdentifier();
  skipSpaces();
  while (next() === "[") {
    result.attributes.push(readAttribute());
    skipSpaces();
  }
  if (!EOL)
    syntaxError(void 0);
  if (!result.name && !result.attributes.length)
    throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - selector cannot be empty`);
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InvalidSelectorError,
  customCSSNames,
  isInvalidSelectorError,
  parseAttributeSelector,
  parseSelector,
  splitSelectorByFrame,
  stringifySelector,
  visitAllSelectorParts
});
