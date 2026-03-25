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
var locatorParser_exports = {};
__export(locatorParser_exports, {
  locatorOrSelectorAsSelector: () => locatorOrSelectorAsSelector,
  unsafeLocatorOrSelectorAsSelector: () => unsafeLocatorOrSelectorAsSelector
});
module.exports = __toCommonJS(locatorParser_exports);
var import_locatorGenerators = require("./locatorGenerators");
var import_selectorParser = require("./selectorParser");
var import_stringUtils = require("./stringUtils");
function parseLocator(locator, testIdAttributeName) {
  locator = locator.replace(/AriaRole\s*\.\s*([\w]+)/g, (_, group) => group.toLowerCase()).replace(/(get_by_role|getByRole)\s*\(\s*(?:["'`])([^'"`]+)['"`]/g, (_, group1, group2) => `${group1}(${group2.toLowerCase()}`);
  const params = [];
  let template = "";
  for (let i = 0; i < locator.length; ++i) {
    const quote = locator[i];
    if (quote !== '"' && quote !== "'" && quote !== "`" && quote !== "/") {
      template += quote;
      continue;
    }
    const isRegexEscaping = locator[i - 1] === "r" || locator[i] === "/";
    ++i;
    let text = "";
    while (i < locator.length) {
      if (locator[i] === "\\") {
        if (isRegexEscaping) {
          if (locator[i + 1] !== quote)
            text += locator[i];
          ++i;
          text += locator[i];
        } else {
          ++i;
          if (locator[i] === "n")
            text += "\n";
          else if (locator[i] === "r")
            text += "\r";
          else if (locator[i] === "t")
            text += "	";
          else
            text += locator[i];
        }
        ++i;
        continue;
      }
      if (locator[i] !== quote) {
        text += locator[i++];
        continue;
      }
      break;
    }
    params.push({ quote, text });
    template += (quote === "/" ? "r" : "") + "$" + params.length;
  }
  template = template.toLowerCase().replace(/get_by_alt_text/g, "getbyalttext").replace(/get_by_test_id/g, "getbytestid").replace(/get_by_([\w]+)/g, "getby$1").replace(/has_not_text/g, "hasnottext").replace(/has_text/g, "hastext").replace(/has_not/g, "hasnot").replace(/frame_locator/g, "framelocator").replace(/content_frame/g, "contentframe").replace(/[{}\s]/g, "").replace(/new\(\)/g, "").replace(/new[\w]+\.[\w]+options\(\)/g, "").replace(/\.set/g, ",set").replace(/\.or_\(/g, "or(").replace(/\.and_\(/g, "and(").replace(/:/g, "=").replace(/,re\.ignorecase/g, "i").replace(/,pattern.case_insensitive/g, "i").replace(/,regexoptions.ignorecase/g, "i").replace(/re.compile\(([^)]+)\)/g, "$1").replace(/pattern.compile\(([^)]+)\)/g, "r$1").replace(/newregex\(([^)]+)\)/g, "r$1").replace(/string=/g, "=").replace(/regex=/g, "=").replace(/,,/g, ",").replace(/,\)/g, ")");
  const preferredQuote = params.map((p) => p.quote).filter((quote) => "'\"`".includes(quote))[0];
  return { selector: transform(template, params, testIdAttributeName), preferredQuote };
}
function countParams(template) {
  return [...template.matchAll(/\$\d+/g)].length;
}
function shiftParams(template, sub) {
  return template.replace(/\$(\d+)/g, (_, ordinal) => `$${ordinal - sub}`);
}
function transform(template, params, testIdAttributeName) {
  while (true) {
    const hasMatch = template.match(/filter\(,?(has=|hasnot=|sethas\(|sethasnot\()/);
    if (!hasMatch)
      break;
    const start = hasMatch.index + hasMatch[0].length;
    let balance = 0;
    let end = start;
    for (; end < template.length; end++) {
      if (template[end] === "(")
        balance++;
      else if (template[end] === ")")
        balance--;
      if (balance < 0)
        break;
    }
    let prefix = template.substring(0, start);
    let extraSymbol = 0;
    if (["sethas(", "sethasnot("].includes(hasMatch[1])) {
      extraSymbol = 1;
      prefix = prefix.replace(/sethas\($/, "has=").replace(/sethasnot\($/, "hasnot=");
    }
    const paramsCountBeforeHas = countParams(template.substring(0, start));
    const hasTemplate = shiftParams(template.substring(start, end), paramsCountBeforeHas);
    const paramsCountInHas = countParams(hasTemplate);
    const hasParams = params.slice(paramsCountBeforeHas, paramsCountBeforeHas + paramsCountInHas);
    const hasSelector = JSON.stringify(transform(hasTemplate, hasParams, testIdAttributeName));
    template = prefix.replace(/=$/, "2=") + `$${paramsCountBeforeHas + 1}` + shiftParams(template.substring(end + extraSymbol), paramsCountInHas - 1);
    const paramsBeforeHas = params.slice(0, paramsCountBeforeHas);
    const paramsAfterHas = params.slice(paramsCountBeforeHas + paramsCountInHas);
    params = paramsBeforeHas.concat([{ quote: '"', text: hasSelector }]).concat(paramsAfterHas);
  }
  template = template.replace(/\,set([\w]+)\(([^)]+)\)/g, (_, group1, group2) => "," + group1.toLowerCase() + "=" + group2.toLowerCase()).replace(/framelocator\(([^)]+)\)/g, "$1.internal:control=enter-frame").replace(/contentframe(\(\))?/g, "internal:control=enter-frame").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+),hasnottext=([^),]+)\)/g, "locator($1).internal:has-not-text=$2").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+)\)/g, "$1").replace(/getbyrole\(([^)]+)\)/g, "internal:role=$1").replace(/getbytext\(([^)]+)\)/g, "internal:text=$1").replace(/getbylabel\(([^)]+)\)/g, "internal:label=$1").replace(/getbytestid\(([^)]+)\)/g, `internal:testid=[${testIdAttributeName}=$1]`).replace(/getby(placeholder|alt|title)(?:text)?\(([^)]+)\)/g, "internal:attr=[$1=$2]").replace(/first(\(\))?/g, "nth=0").replace(/last(\(\))?/g, "nth=-1").replace(/nth\(([^)]+)\)/g, "nth=$1").replace(/filter\(,?visible=true\)/g, "visible=true").replace(/filter\(,?visible=false\)/g, "visible=false").replace(/filter\(,?hastext=([^)]+)\)/g, "internal:has-text=$1").replace(/filter\(,?hasnottext=([^)]+)\)/g, "internal:has-not-text=$1").replace(/filter\(,?has2=([^)]+)\)/g, "internal:has=$1").replace(/filter\(,?hasnot2=([^)]+)\)/g, "internal:has-not=$1").replace(/,exact=false/g, "").replace(/,exact=true/g, "s").replace(/,includehidden=/g, ",include-hidden=").replace(/\,/g, "][");
  const parts = template.split(".");
  for (let index = 0; index < parts.length - 1; index++) {
    if (parts[index] === "internal:control=enter-frame" && parts[index + 1].startsWith("nth=")) {
      const [nth] = parts.splice(index, 1);
      parts.splice(index + 1, 0, nth);
    }
  }
  return parts.map((t) => {
    if (!t.startsWith("internal:") || t === "internal:control")
      return t.replace(/\$(\d+)/g, (_, ordinal) => {
        const param = params[+ordinal - 1];
        return param.text;
      });
    t = t.includes("[") ? t.replace(/\]/, "") + "]" : t;
    t = t.replace(/(?:r)\$(\d+)(i)?/g, (_, ordinal, suffix) => {
      const param = params[+ordinal - 1];
      if (t.startsWith("internal:attr") || t.startsWith("internal:testid") || t.startsWith("internal:role"))
        return (0, import_stringUtils.escapeForAttributeSelector)(new RegExp(param.text), false) + (suffix || "");
      return (0, import_stringUtils.escapeForTextSelector)(new RegExp(param.text, suffix), false);
    }).replace(/\$(\d+)(i|s)?/g, (_, ordinal, suffix) => {
      const param = params[+ordinal - 1];
      if (t.startsWith("internal:has=") || t.startsWith("internal:has-not="))
        return param.text;
      if (t.startsWith("internal:testid"))
        return (0, import_stringUtils.escapeForAttributeSelector)(param.text, true);
      if (t.startsWith("internal:attr") || t.startsWith("internal:role"))
        return (0, import_stringUtils.escapeForAttributeSelector)(param.text, suffix === "s");
      return (0, import_stringUtils.escapeForTextSelector)(param.text, suffix === "s");
    });
    return t;
  }).join(" >> ");
}
function locatorOrSelectorAsSelector(language, locator, testIdAttributeName) {
  try {
    return unsafeLocatorOrSelectorAsSelector(language, locator, testIdAttributeName);
  } catch (e) {
    return "";
  }
}
function unsafeLocatorOrSelectorAsSelector(language, locator, testIdAttributeName) {
  try {
    (0, import_selectorParser.parseSelector)(locator);
    return locator;
  } catch (e) {
  }
  const { selector, preferredQuote } = parseLocator(locator, testIdAttributeName);
  const locators = (0, import_locatorGenerators.asLocators)(language, selector, void 0, void 0, preferredQuote);
  const digest = digestForComparison(language, locator);
  if (locators.some((candidate) => digestForComparison(language, candidate) === digest))
    return selector;
  return "";
}
function digestForComparison(language, locator) {
  locator = locator.replace(/\s/g, "");
  if (language === "javascript")
    locator = locator.replace(/\\?["`]/g, "'").replace(/,{}/g, "");
  return locator;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  locatorOrSelectorAsSelector,
  unsafeLocatorOrSelectorAsSelector
});
