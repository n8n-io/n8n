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
var urlMatch_exports = {};
__export(urlMatch_exports, {
  constructURLBasedOnBaseURL: () => constructURLBasedOnBaseURL,
  globToRegexPattern: () => globToRegexPattern,
  resolveGlobToRegexPattern: () => resolveGlobToRegexPattern,
  urlMatches: () => urlMatches,
  urlMatchesEqual: () => urlMatchesEqual
});
module.exports = __toCommonJS(urlMatch_exports);
var import_stringUtils = require("./stringUtils");
const escapedChars = /* @__PURE__ */ new Set(["$", "^", "+", ".", "*", "(", ")", "|", "\\", "?", "{", "}", "[", "]"]);
function globToRegexPattern(glob) {
  const tokens = ["^"];
  let inGroup = false;
  for (let i = 0; i < glob.length; ++i) {
    const c = glob[i];
    if (c === "\\" && i + 1 < glob.length) {
      const char = glob[++i];
      tokens.push(escapedChars.has(char) ? "\\" + char : char);
      continue;
    }
    if (c === "*") {
      const charBefore = glob[i - 1];
      let starCount = 1;
      while (glob[i + 1] === "*") {
        starCount++;
        i++;
      }
      if (starCount > 1) {
        const charAfter = glob[i + 1];
        if (charAfter === "/") {
          if (charBefore === "/")
            tokens.push("((.+/)|)");
          else
            tokens.push("(.*/)");
          ++i;
        } else {
          tokens.push("(.*)");
        }
      } else {
        tokens.push("([^/]*)");
      }
      continue;
    }
    switch (c) {
      case "{":
        inGroup = true;
        tokens.push("(");
        break;
      case "}":
        inGroup = false;
        tokens.push(")");
        break;
      case ",":
        if (inGroup) {
          tokens.push("|");
          break;
        }
        tokens.push("\\" + c);
        break;
      default:
        tokens.push(escapedChars.has(c) ? "\\" + c : c);
    }
  }
  tokens.push("$");
  return tokens.join("");
}
function isRegExp(obj) {
  return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
}
function urlMatchesEqual(match1, match2) {
  if (isRegExp(match1) && isRegExp(match2))
    return match1.source === match2.source && match1.flags === match2.flags;
  return match1 === match2;
}
function urlMatches(baseURL, urlString, match, webSocketUrl) {
  if (match === void 0 || match === "")
    return true;
  if ((0, import_stringUtils.isString)(match))
    match = new RegExp(resolveGlobToRegexPattern(baseURL, match, webSocketUrl));
  if (isRegExp(match)) {
    const r = match.test(urlString);
    return r;
  }
  const url = parseURL(urlString);
  if (!url)
    return false;
  if (typeof match !== "function")
    throw new Error("url parameter should be string, RegExp or function");
  return match(url);
}
function resolveGlobToRegexPattern(baseURL, glob, webSocketUrl) {
  if (webSocketUrl)
    baseURL = toWebSocketBaseUrl(baseURL);
  glob = resolveGlobBase(baseURL, glob);
  return globToRegexPattern(glob);
}
function toWebSocketBaseUrl(baseURL) {
  if (baseURL && /^https?:\/\//.test(baseURL))
    baseURL = baseURL.replace(/^http/, "ws");
  return baseURL;
}
function resolveGlobBase(baseURL, match) {
  if (!match.startsWith("*")) {
    let mapToken2 = function(original, replacement) {
      if (original.length === 0)
        return "";
      tokenMap.set(replacement, original);
      return replacement;
    };
    var mapToken = mapToken2;
    const tokenMap = /* @__PURE__ */ new Map();
    match = match.replaceAll(/\\\\\?/g, "?");
    if (match.startsWith("about:") || match.startsWith("data:") || match.startsWith("chrome:") || match.startsWith("edge:") || match.startsWith("file:"))
      return match;
    const relativePath = match.split("/").map((token, index) => {
      if (token === "." || token === ".." || token === "")
        return token;
      if (index === 0 && token.endsWith(":")) {
        if (token.indexOf("*") !== -1 || token.indexOf("{") !== -1)
          return mapToken2(token, "http:");
        return token;
      }
      const questionIndex = token.indexOf("?");
      if (questionIndex === -1)
        return mapToken2(token, `$_${index}_$`);
      const newPrefix = mapToken2(token.substring(0, questionIndex), `$_${index}_$`);
      const newSuffix = mapToken2(token.substring(questionIndex), `?$_${index}_$`);
      return newPrefix + newSuffix;
    }).join("/");
    const result = resolveBaseURL(baseURL, relativePath);
    let resolved = result.resolved;
    for (const [token, original] of tokenMap) {
      const normalize = result.caseInsensitivePart?.includes(token);
      resolved = resolved.replace(token, normalize ? original.toLowerCase() : original);
    }
    match = resolved;
  }
  return match;
}
function parseURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}
function constructURLBasedOnBaseURL(baseURL, givenURL) {
  try {
    return resolveBaseURL(baseURL, givenURL).resolved;
  } catch (e) {
    return givenURL;
  }
}
function resolveBaseURL(baseURL, givenURL) {
  try {
    const url = new URL(givenURL, baseURL);
    const resolved = url.toString();
    const caseInsensitivePrefix = url.origin;
    return { resolved, caseInsensitivePart: caseInsensitivePrefix };
  } catch (e) {
    return { resolved: givenURL };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  constructURLBasedOnBaseURL,
  globToRegexPattern,
  resolveGlobToRegexPattern,
  urlMatches,
  urlMatchesEqual
});
