"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var cssParser_exports = {};
__export(cssParser_exports, {
  InvalidSelectorError: () => InvalidSelectorError,
  isInvalidSelectorError: () => isInvalidSelectorError,
  parseCSS: () => parseCSS,
  serializeSelector: () => serializeSelector
});
module.exports = __toCommonJS(cssParser_exports);
var css = __toESM(require("./cssTokenizer"));
class InvalidSelectorError extends Error {
}
function isInvalidSelectorError(error) {
  return error instanceof InvalidSelectorError;
}
function parseCSS(selector, customNames) {
  let tokens;
  try {
    tokens = css.tokenize(selector);
    if (!(tokens[tokens.length - 1] instanceof css.EOFToken))
      tokens.push(new css.EOFToken());
  } catch (e) {
    const newMessage = e.message + ` while parsing css selector "${selector}". Did you mean to CSS.escape it?`;
    const index = (e.stack || "").indexOf(e.message);
    if (index !== -1)
      e.stack = e.stack.substring(0, index) + newMessage + e.stack.substring(index + e.message.length);
    e.message = newMessage;
    throw e;
  }
  const unsupportedToken = tokens.find((token) => {
    return token instanceof css.AtKeywordToken || token instanceof css.BadStringToken || token instanceof css.BadURLToken || token instanceof css.ColumnToken || token instanceof css.CDOToken || token instanceof css.CDCToken || token instanceof css.SemicolonToken || // TODO: Consider using these for something, e.g. to escape complex strings.
    // For example :xpath{ (//div/bar[@attr="foo"])[2]/baz }
    // Or this way :xpath( {complex-xpath-goes-here("hello")} )
    token instanceof css.OpenCurlyToken || token instanceof css.CloseCurlyToken || // TODO: Consider treating these as strings?
    token instanceof css.URLToken || token instanceof css.PercentageToken;
  });
  if (unsupportedToken)
    throw new InvalidSelectorError(`Unsupported token "${unsupportedToken.toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
  let pos = 0;
  const names = /* @__PURE__ */ new Set();
  function unexpected() {
    return new InvalidSelectorError(`Unexpected token "${tokens[pos].toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
  }
  function skipWhitespace() {
    while (tokens[pos] instanceof css.WhitespaceToken)
      pos++;
  }
  function isIdent(p = pos) {
    return tokens[p] instanceof css.IdentToken;
  }
  function isString(p = pos) {
    return tokens[p] instanceof css.StringToken;
  }
  function isNumber(p = pos) {
    return tokens[p] instanceof css.NumberToken;
  }
  function isComma(p = pos) {
    return tokens[p] instanceof css.CommaToken;
  }
  function isOpenParen(p = pos) {
    return tokens[p] instanceof css.OpenParenToken;
  }
  function isCloseParen(p = pos) {
    return tokens[p] instanceof css.CloseParenToken;
  }
  function isFunction(p = pos) {
    return tokens[p] instanceof css.FunctionToken;
  }
  function isStar(p = pos) {
    return tokens[p] instanceof css.DelimToken && tokens[p].value === "*";
  }
  function isEOF(p = pos) {
    return tokens[p] instanceof css.EOFToken;
  }
  function isClauseCombinator(p = pos) {
    return tokens[p] instanceof css.DelimToken && [">", "+", "~"].includes(tokens[p].value);
  }
  function isSelectorClauseEnd(p = pos) {
    return isComma(p) || isCloseParen(p) || isEOF(p) || isClauseCombinator(p) || tokens[p] instanceof css.WhitespaceToken;
  }
  function consumeFunctionArguments() {
    const result2 = [consumeArgument()];
    while (true) {
      skipWhitespace();
      if (!isComma())
        break;
      pos++;
      result2.push(consumeArgument());
    }
    return result2;
  }
  function consumeArgument() {
    skipWhitespace();
    if (isNumber())
      return tokens[pos++].value;
    if (isString())
      return tokens[pos++].value;
    return consumeComplexSelector();
  }
  function consumeComplexSelector() {
    const result2 = { simples: [] };
    skipWhitespace();
    if (isClauseCombinator()) {
      result2.simples.push({ selector: { functions: [{ name: "scope", args: [] }] }, combinator: "" });
    } else {
      result2.simples.push({ selector: consumeSimpleSelector(), combinator: "" });
    }
    while (true) {
      skipWhitespace();
      if (isClauseCombinator()) {
        result2.simples[result2.simples.length - 1].combinator = tokens[pos++].value;
        skipWhitespace();
      } else if (isSelectorClauseEnd()) {
        break;
      }
      result2.simples.push({ combinator: "", selector: consumeSimpleSelector() });
    }
    return result2;
  }
  function consumeSimpleSelector() {
    let rawCSSString = "";
    const functions = [];
    while (!isSelectorClauseEnd()) {
      if (isIdent() || isStar()) {
        rawCSSString += tokens[pos++].toSource();
      } else if (tokens[pos] instanceof css.HashToken) {
        rawCSSString += tokens[pos++].toSource();
      } else if (tokens[pos] instanceof css.DelimToken && tokens[pos].value === ".") {
        pos++;
        if (isIdent())
          rawCSSString += "." + tokens[pos++].toSource();
        else
          throw unexpected();
      } else if (tokens[pos] instanceof css.ColonToken) {
        pos++;
        if (isIdent()) {
          if (!customNames.has(tokens[pos].value.toLowerCase())) {
            rawCSSString += ":" + tokens[pos++].toSource();
          } else {
            const name = tokens[pos++].value.toLowerCase();
            functions.push({ name, args: [] });
            names.add(name);
          }
        } else if (isFunction()) {
          const name = tokens[pos++].value.toLowerCase();
          if (!customNames.has(name)) {
            rawCSSString += `:${name}(${consumeBuiltinFunctionArguments()})`;
          } else {
            functions.push({ name, args: consumeFunctionArguments() });
            names.add(name);
          }
          skipWhitespace();
          if (!isCloseParen())
            throw unexpected();
          pos++;
        } else {
          throw unexpected();
        }
      } else if (tokens[pos] instanceof css.OpenSquareToken) {
        rawCSSString += "[";
        pos++;
        while (!(tokens[pos] instanceof css.CloseSquareToken) && !isEOF())
          rawCSSString += tokens[pos++].toSource();
        if (!(tokens[pos] instanceof css.CloseSquareToken))
          throw unexpected();
        rawCSSString += "]";
        pos++;
      } else {
        throw unexpected();
      }
    }
    if (!rawCSSString && !functions.length)
      throw unexpected();
    return { css: rawCSSString || void 0, functions };
  }
  function consumeBuiltinFunctionArguments() {
    let s = "";
    let balance = 1;
    while (!isEOF()) {
      if (isOpenParen() || isFunction())
        balance++;
      if (isCloseParen())
        balance--;
      if (!balance)
        break;
      s += tokens[pos++].toSource();
    }
    return s;
  }
  const result = consumeFunctionArguments();
  if (!isEOF())
    throw unexpected();
  if (result.some((arg) => typeof arg !== "object" || !("simples" in arg)))
    throw new InvalidSelectorError(`Error while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
  return { selector: result, names: Array.from(names) };
}
function serializeSelector(args) {
  return args.map((arg) => {
    if (typeof arg === "string")
      return `"${arg}"`;
    if (typeof arg === "number")
      return String(arg);
    return arg.simples.map(({ selector, combinator }) => {
      let s = selector.css || "";
      s = s + selector.functions.map((func) => `:${func.name}(${serializeSelector(func.args)})`).join("");
      if (combinator)
        s += " " + combinator;
      return s;
    }).join(" ");
  }).join(", ");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InvalidSelectorError,
  isInvalidSelectorError,
  parseCSS,
  serializeSelector
});
