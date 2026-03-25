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
var locatorGenerators_exports = {};
__export(locatorGenerators_exports, {
  CSharpLocatorFactory: () => CSharpLocatorFactory,
  JavaLocatorFactory: () => JavaLocatorFactory,
  JavaScriptLocatorFactory: () => JavaScriptLocatorFactory,
  JsonlLocatorFactory: () => JsonlLocatorFactory,
  PythonLocatorFactory: () => PythonLocatorFactory,
  asLocator: () => asLocator,
  asLocatorDescription: () => asLocatorDescription,
  asLocators: () => asLocators,
  locatorCustomDescription: () => locatorCustomDescription
});
module.exports = __toCommonJS(locatorGenerators_exports);
var import_selectorParser = require("./selectorParser");
var import_stringUtils = require("./stringUtils");
function asLocatorDescription(lang, selector) {
  try {
    const parsed = (0, import_selectorParser.parseSelector)(selector);
    const customDescription = parseCustomDescription(parsed);
    if (customDescription)
      return customDescription;
    return innerAsLocators(new generators[lang](), parsed, false, 1)[0];
  } catch (e) {
    return selector;
  }
}
function locatorCustomDescription(selector) {
  try {
    const parsed = (0, import_selectorParser.parseSelector)(selector);
    return parseCustomDescription(parsed);
  } catch (e) {
    return void 0;
  }
}
function parseCustomDescription(parsed) {
  const lastPart = parsed.parts[parsed.parts.length - 1];
  if (lastPart?.name === "internal:describe") {
    const description = JSON.parse(lastPart.body);
    if (typeof description === "string")
      return description;
  }
  return void 0;
}
function asLocator(lang, selector, isFrameLocator = false) {
  return asLocators(lang, selector, isFrameLocator, 1)[0];
}
function asLocators(lang, selector, isFrameLocator = false, maxOutputSize = 20, preferredQuote) {
  try {
    return innerAsLocators(new generators[lang](preferredQuote), (0, import_selectorParser.parseSelector)(selector), isFrameLocator, maxOutputSize);
  } catch (e) {
    return [selector];
  }
}
function innerAsLocators(factory, parsed, isFrameLocator = false, maxOutputSize = 20) {
  const parts = [...parsed.parts];
  const tokens = [];
  let nextBase = isFrameLocator ? "frame-locator" : "page";
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const base = nextBase;
    nextBase = "locator";
    if (part.name === "internal:describe")
      continue;
    if (part.name === "nth") {
      if (part.body === "0")
        tokens.push([factory.generateLocator(base, "first", ""), factory.generateLocator(base, "nth", "0")]);
      else if (part.body === "-1")
        tokens.push([factory.generateLocator(base, "last", ""), factory.generateLocator(base, "nth", "-1")]);
      else
        tokens.push([factory.generateLocator(base, "nth", part.body)]);
      continue;
    }
    if (part.name === "visible") {
      tokens.push([factory.generateLocator(base, "visible", part.body), factory.generateLocator(base, "default", `visible=${part.body}`)]);
      continue;
    }
    if (part.name === "internal:text") {
      const { exact, text } = detectExact(part.body);
      tokens.push([factory.generateLocator(base, "text", text, { exact })]);
      continue;
    }
    if (part.name === "internal:has-text") {
      const { exact, text } = detectExact(part.body);
      if (!exact) {
        tokens.push([factory.generateLocator(base, "has-text", text, { exact })]);
        continue;
      }
    }
    if (part.name === "internal:has-not-text") {
      const { exact, text } = detectExact(part.body);
      if (!exact) {
        tokens.push([factory.generateLocator(base, "has-not-text", text, { exact })]);
        continue;
      }
    }
    if (part.name === "internal:has") {
      const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
      tokens.push(inners.map((inner) => factory.generateLocator(base, "has", inner)));
      continue;
    }
    if (part.name === "internal:has-not") {
      const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
      tokens.push(inners.map((inner) => factory.generateLocator(base, "hasNot", inner)));
      continue;
    }
    if (part.name === "internal:and") {
      const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
      tokens.push(inners.map((inner) => factory.generateLocator(base, "and", inner)));
      continue;
    }
    if (part.name === "internal:or") {
      const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
      tokens.push(inners.map((inner) => factory.generateLocator(base, "or", inner)));
      continue;
    }
    if (part.name === "internal:chain") {
      const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
      tokens.push(inners.map((inner) => factory.generateLocator(base, "chain", inner)));
      continue;
    }
    if (part.name === "internal:label") {
      const { exact, text } = detectExact(part.body);
      tokens.push([factory.generateLocator(base, "label", text, { exact })]);
      continue;
    }
    if (part.name === "internal:role") {
      const attrSelector = (0, import_selectorParser.parseAttributeSelector)(part.body, true);
      const options = { attrs: [] };
      for (const attr of attrSelector.attributes) {
        if (attr.name === "name") {
          options.exact = attr.caseSensitive;
          options.name = attr.value;
        } else {
          if (attr.name === "level" && typeof attr.value === "string")
            attr.value = +attr.value;
          options.attrs.push({ name: attr.name === "include-hidden" ? "includeHidden" : attr.name, value: attr.value });
        }
      }
      tokens.push([factory.generateLocator(base, "role", attrSelector.name, options)]);
      continue;
    }
    if (part.name === "internal:testid") {
      const attrSelector = (0, import_selectorParser.parseAttributeSelector)(part.body, true);
      const { value } = attrSelector.attributes[0];
      tokens.push([factory.generateLocator(base, "test-id", value)]);
      continue;
    }
    if (part.name === "internal:attr") {
      const attrSelector = (0, import_selectorParser.parseAttributeSelector)(part.body, true);
      const { name, value, caseSensitive } = attrSelector.attributes[0];
      const text = value;
      const exact = !!caseSensitive;
      if (name === "placeholder") {
        tokens.push([factory.generateLocator(base, "placeholder", text, { exact })]);
        continue;
      }
      if (name === "alt") {
        tokens.push([factory.generateLocator(base, "alt", text, { exact })]);
        continue;
      }
      if (name === "title") {
        tokens.push([factory.generateLocator(base, "title", text, { exact })]);
        continue;
      }
    }
    if (part.name === "internal:control" && part.body === "enter-frame") {
      const lastTokens = tokens[tokens.length - 1];
      const lastPart = parts[index - 1];
      const transformed = lastTokens.map((token) => factory.chainLocators([token, factory.generateLocator(base, "frame", "")]));
      if (["xpath", "css"].includes(lastPart.name)) {
        transformed.push(
          factory.generateLocator(base, "frame-locator", (0, import_selectorParser.stringifySelector)({ parts: [lastPart] })),
          factory.generateLocator(base, "frame-locator", (0, import_selectorParser.stringifySelector)({ parts: [lastPart] }, true))
        );
      }
      lastTokens.splice(0, lastTokens.length, ...transformed);
      nextBase = "frame-locator";
      continue;
    }
    const nextPart = parts[index + 1];
    const selectorPart = (0, import_selectorParser.stringifySelector)({ parts: [part] });
    const locatorPart = factory.generateLocator(base, "default", selectorPart);
    if (nextPart && ["internal:has-text", "internal:has-not-text"].includes(nextPart.name)) {
      const { exact, text } = detectExact(nextPart.body);
      if (!exact) {
        const nextLocatorPart = factory.generateLocator("locator", nextPart.name === "internal:has-text" ? "has-text" : "has-not-text", text, { exact });
        const options = {};
        if (nextPart.name === "internal:has-text")
          options.hasText = text;
        else
          options.hasNotText = text;
        const combinedPart = factory.generateLocator(base, "default", selectorPart, options);
        tokens.push([factory.chainLocators([locatorPart, nextLocatorPart]), combinedPart]);
        index++;
        continue;
      }
    }
    let locatorPartWithEngine;
    if (["xpath", "css"].includes(part.name)) {
      const selectorPart2 = (0, import_selectorParser.stringifySelector)(
        { parts: [part] },
        /* forceEngineName */
        true
      );
      locatorPartWithEngine = factory.generateLocator(base, "default", selectorPart2);
    }
    tokens.push([locatorPart, locatorPartWithEngine].filter(Boolean));
  }
  return combineTokens(factory, tokens, maxOutputSize);
}
function combineTokens(factory, tokens, maxOutputSize) {
  const currentTokens = tokens.map(() => "");
  const result = [];
  const visit = (index) => {
    if (index === tokens.length) {
      result.push(factory.chainLocators(currentTokens));
      return result.length < maxOutputSize;
    }
    for (const taken of tokens[index]) {
      currentTokens[index] = taken;
      if (!visit(index + 1))
        return false;
    }
    return true;
  };
  visit(0);
  return result;
}
function detectExact(text) {
  let exact = false;
  const match = text.match(/^\/(.*)\/([igm]*)$/);
  if (match)
    return { text: new RegExp(match[1], match[2]) };
  if (text.endsWith('"')) {
    text = JSON.parse(text);
    exact = true;
  } else if (text.endsWith('"s')) {
    text = JSON.parse(text.substring(0, text.length - 1));
    exact = true;
  } else if (text.endsWith('"i')) {
    text = JSON.parse(text.substring(0, text.length - 1));
    exact = false;
  }
  return { exact, text };
}
class JavaScriptLocatorFactory {
  constructor(preferredQuote) {
    this.preferredQuote = preferredQuote;
  }
  generateLocator(base, kind, body, options = {}) {
    switch (kind) {
      case "default":
        if (options.hasText !== void 0)
          return `locator(${this.quote(body)}, { hasText: ${this.toHasText(options.hasText)} })`;
        if (options.hasNotText !== void 0)
          return `locator(${this.quote(body)}, { hasNotText: ${this.toHasText(options.hasNotText)} })`;
        return `locator(${this.quote(body)})`;
      case "frame-locator":
        return `frameLocator(${this.quote(body)})`;
      case "frame":
        return `contentFrame()`;
      case "nth":
        return `nth(${body})`;
      case "first":
        return `first()`;
      case "last":
        return `last()`;
      case "visible":
        return `filter({ visible: ${body === "true" ? "true" : "false"} })`;
      case "role":
        const attrs = [];
        if (isRegExp(options.name)) {
          attrs.push(`name: ${this.regexToSourceString(options.name)}`);
        } else if (typeof options.name === "string") {
          attrs.push(`name: ${this.quote(options.name)}`);
          if (options.exact)
            attrs.push(`exact: true`);
        }
        for (const { name, value } of options.attrs)
          attrs.push(`${name}: ${typeof value === "string" ? this.quote(value) : value}`);
        const attrString = attrs.length ? `, { ${attrs.join(", ")} }` : "";
        return `getByRole(${this.quote(body)}${attrString})`;
      case "has-text":
        return `filter({ hasText: ${this.toHasText(body)} })`;
      case "has-not-text":
        return `filter({ hasNotText: ${this.toHasText(body)} })`;
      case "has":
        return `filter({ has: ${body} })`;
      case "hasNot":
        return `filter({ hasNot: ${body} })`;
      case "and":
        return `and(${body})`;
      case "or":
        return `or(${body})`;
      case "chain":
        return `locator(${body})`;
      case "test-id":
        return `getByTestId(${this.toTestIdValue(body)})`;
      case "text":
        return this.toCallWithExact("getByText", body, !!options.exact);
      case "alt":
        return this.toCallWithExact("getByAltText", body, !!options.exact);
      case "placeholder":
        return this.toCallWithExact("getByPlaceholder", body, !!options.exact);
      case "label":
        return this.toCallWithExact("getByLabel", body, !!options.exact);
      case "title":
        return this.toCallWithExact("getByTitle", body, !!options.exact);
      default:
        throw new Error("Unknown selector kind " + kind);
    }
  }
  chainLocators(locators) {
    return locators.join(".");
  }
  regexToSourceString(re) {
    return (0, import_stringUtils.normalizeEscapedRegexQuotes)(String(re));
  }
  toCallWithExact(method, body, exact) {
    if (isRegExp(body))
      return `${method}(${this.regexToSourceString(body)})`;
    return exact ? `${method}(${this.quote(body)}, { exact: true })` : `${method}(${this.quote(body)})`;
  }
  toHasText(body) {
    if (isRegExp(body))
      return this.regexToSourceString(body);
    return this.quote(body);
  }
  toTestIdValue(value) {
    if (isRegExp(value))
      return this.regexToSourceString(value);
    return this.quote(value);
  }
  quote(text) {
    return (0, import_stringUtils.escapeWithQuotes)(text, this.preferredQuote ?? "'");
  }
}
class PythonLocatorFactory {
  generateLocator(base, kind, body, options = {}) {
    switch (kind) {
      case "default":
        if (options.hasText !== void 0)
          return `locator(${this.quote(body)}, has_text=${this.toHasText(options.hasText)})`;
        if (options.hasNotText !== void 0)
          return `locator(${this.quote(body)}, has_not_text=${this.toHasText(options.hasNotText)})`;
        return `locator(${this.quote(body)})`;
      case "frame-locator":
        return `frame_locator(${this.quote(body)})`;
      case "frame":
        return `content_frame`;
      case "nth":
        return `nth(${body})`;
      case "first":
        return `first`;
      case "last":
        return `last`;
      case "visible":
        return `filter(visible=${body === "true" ? "True" : "False"})`;
      case "role":
        const attrs = [];
        if (isRegExp(options.name)) {
          attrs.push(`name=${this.regexToString(options.name)}`);
        } else if (typeof options.name === "string") {
          attrs.push(`name=${this.quote(options.name)}`);
          if (options.exact)
            attrs.push(`exact=True`);
        }
        for (const { name, value } of options.attrs) {
          let valueString = typeof value === "string" ? this.quote(value) : value;
          if (typeof value === "boolean")
            valueString = value ? "True" : "False";
          attrs.push(`${(0, import_stringUtils.toSnakeCase)(name)}=${valueString}`);
        }
        const attrString = attrs.length ? `, ${attrs.join(", ")}` : "";
        return `get_by_role(${this.quote(body)}${attrString})`;
      case "has-text":
        return `filter(has_text=${this.toHasText(body)})`;
      case "has-not-text":
        return `filter(has_not_text=${this.toHasText(body)})`;
      case "has":
        return `filter(has=${body})`;
      case "hasNot":
        return `filter(has_not=${body})`;
      case "and":
        return `and_(${body})`;
      case "or":
        return `or_(${body})`;
      case "chain":
        return `locator(${body})`;
      case "test-id":
        return `get_by_test_id(${this.toTestIdValue(body)})`;
      case "text":
        return this.toCallWithExact("get_by_text", body, !!options.exact);
      case "alt":
        return this.toCallWithExact("get_by_alt_text", body, !!options.exact);
      case "placeholder":
        return this.toCallWithExact("get_by_placeholder", body, !!options.exact);
      case "label":
        return this.toCallWithExact("get_by_label", body, !!options.exact);
      case "title":
        return this.toCallWithExact("get_by_title", body, !!options.exact);
      default:
        throw new Error("Unknown selector kind " + kind);
    }
  }
  chainLocators(locators) {
    return locators.join(".");
  }
  regexToString(body) {
    const suffix = body.flags.includes("i") ? ", re.IGNORECASE" : "";
    return `re.compile(r"${(0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source).replace(/\\\//, "/").replace(/"/g, '\\"')}"${suffix})`;
  }
  toCallWithExact(method, body, exact) {
    if (isRegExp(body))
      return `${method}(${this.regexToString(body)})`;
    if (exact)
      return `${method}(${this.quote(body)}, exact=True)`;
    return `${method}(${this.quote(body)})`;
  }
  toHasText(body) {
    if (isRegExp(body))
      return this.regexToString(body);
    return `${this.quote(body)}`;
  }
  toTestIdValue(value) {
    if (isRegExp(value))
      return this.regexToString(value);
    return this.quote(value);
  }
  quote(text) {
    return (0, import_stringUtils.escapeWithQuotes)(text, '"');
  }
}
class JavaLocatorFactory {
  generateLocator(base, kind, body, options = {}) {
    let clazz;
    switch (base) {
      case "page":
        clazz = "Page";
        break;
      case "frame-locator":
        clazz = "FrameLocator";
        break;
      case "locator":
        clazz = "Locator";
        break;
    }
    switch (kind) {
      case "default":
        if (options.hasText !== void 0)
          return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasText(${this.toHasText(options.hasText)}))`;
        if (options.hasNotText !== void 0)
          return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasNotText(${this.toHasText(options.hasNotText)}))`;
        return `locator(${this.quote(body)})`;
      case "frame-locator":
        return `frameLocator(${this.quote(body)})`;
      case "frame":
        return `contentFrame()`;
      case "nth":
        return `nth(${body})`;
      case "first":
        return `first()`;
      case "last":
        return `last()`;
      case "visible":
        return `filter(new ${clazz}.FilterOptions().setVisible(${body === "true" ? "true" : "false"}))`;
      case "role":
        const attrs = [];
        if (isRegExp(options.name)) {
          attrs.push(`.setName(${this.regexToString(options.name)})`);
        } else if (typeof options.name === "string") {
          attrs.push(`.setName(${this.quote(options.name)})`);
          if (options.exact)
            attrs.push(`.setExact(true)`);
        }
        for (const { name, value } of options.attrs)
          attrs.push(`.set${(0, import_stringUtils.toTitleCase)(name)}(${typeof value === "string" ? this.quote(value) : value})`);
        const attrString = attrs.length ? `, new ${clazz}.GetByRoleOptions()${attrs.join("")}` : "";
        return `getByRole(AriaRole.${(0, import_stringUtils.toSnakeCase)(body).toUpperCase()}${attrString})`;
      case "has-text":
        return `filter(new ${clazz}.FilterOptions().setHasText(${this.toHasText(body)}))`;
      case "has-not-text":
        return `filter(new ${clazz}.FilterOptions().setHasNotText(${this.toHasText(body)}))`;
      case "has":
        return `filter(new ${clazz}.FilterOptions().setHas(${body}))`;
      case "hasNot":
        return `filter(new ${clazz}.FilterOptions().setHasNot(${body}))`;
      case "and":
        return `and(${body})`;
      case "or":
        return `or(${body})`;
      case "chain":
        return `locator(${body})`;
      case "test-id":
        return `getByTestId(${this.toTestIdValue(body)})`;
      case "text":
        return this.toCallWithExact(clazz, "getByText", body, !!options.exact);
      case "alt":
        return this.toCallWithExact(clazz, "getByAltText", body, !!options.exact);
      case "placeholder":
        return this.toCallWithExact(clazz, "getByPlaceholder", body, !!options.exact);
      case "label":
        return this.toCallWithExact(clazz, "getByLabel", body, !!options.exact);
      case "title":
        return this.toCallWithExact(clazz, "getByTitle", body, !!options.exact);
      default:
        throw new Error("Unknown selector kind " + kind);
    }
  }
  chainLocators(locators) {
    return locators.join(".");
  }
  regexToString(body) {
    const suffix = body.flags.includes("i") ? ", Pattern.CASE_INSENSITIVE" : "";
    return `Pattern.compile(${this.quote((0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source))}${suffix})`;
  }
  toCallWithExact(clazz, method, body, exact) {
    if (isRegExp(body))
      return `${method}(${this.regexToString(body)})`;
    if (exact)
      return `${method}(${this.quote(body)}, new ${clazz}.${(0, import_stringUtils.toTitleCase)(method)}Options().setExact(true))`;
    return `${method}(${this.quote(body)})`;
  }
  toHasText(body) {
    if (isRegExp(body))
      return this.regexToString(body);
    return this.quote(body);
  }
  toTestIdValue(value) {
    if (isRegExp(value))
      return this.regexToString(value);
    return this.quote(value);
  }
  quote(text) {
    return (0, import_stringUtils.escapeWithQuotes)(text, '"');
  }
}
class CSharpLocatorFactory {
  generateLocator(base, kind, body, options = {}) {
    switch (kind) {
      case "default":
        if (options.hasText !== void 0)
          return `Locator(${this.quote(body)}, new() { ${this.toHasText(options.hasText)} })`;
        if (options.hasNotText !== void 0)
          return `Locator(${this.quote(body)}, new() { ${this.toHasNotText(options.hasNotText)} })`;
        return `Locator(${this.quote(body)})`;
      case "frame-locator":
        return `FrameLocator(${this.quote(body)})`;
      case "frame":
        return `ContentFrame`;
      case "nth":
        return `Nth(${body})`;
      case "first":
        return `First`;
      case "last":
        return `Last`;
      case "visible":
        return `Filter(new() { Visible = ${body === "true" ? "true" : "false"} })`;
      case "role":
        const attrs = [];
        if (isRegExp(options.name)) {
          attrs.push(`NameRegex = ${this.regexToString(options.name)}`);
        } else if (typeof options.name === "string") {
          attrs.push(`Name = ${this.quote(options.name)}`);
          if (options.exact)
            attrs.push(`Exact = true`);
        }
        for (const { name, value } of options.attrs)
          attrs.push(`${(0, import_stringUtils.toTitleCase)(name)} = ${typeof value === "string" ? this.quote(value) : value}`);
        const attrString = attrs.length ? `, new() { ${attrs.join(", ")} }` : "";
        return `GetByRole(AriaRole.${(0, import_stringUtils.toTitleCase)(body)}${attrString})`;
      case "has-text":
        return `Filter(new() { ${this.toHasText(body)} })`;
      case "has-not-text":
        return `Filter(new() { ${this.toHasNotText(body)} })`;
      case "has":
        return `Filter(new() { Has = ${body} })`;
      case "hasNot":
        return `Filter(new() { HasNot = ${body} })`;
      case "and":
        return `And(${body})`;
      case "or":
        return `Or(${body})`;
      case "chain":
        return `Locator(${body})`;
      case "test-id":
        return `GetByTestId(${this.toTestIdValue(body)})`;
      case "text":
        return this.toCallWithExact("GetByText", body, !!options.exact);
      case "alt":
        return this.toCallWithExact("GetByAltText", body, !!options.exact);
      case "placeholder":
        return this.toCallWithExact("GetByPlaceholder", body, !!options.exact);
      case "label":
        return this.toCallWithExact("GetByLabel", body, !!options.exact);
      case "title":
        return this.toCallWithExact("GetByTitle", body, !!options.exact);
      default:
        throw new Error("Unknown selector kind " + kind);
    }
  }
  chainLocators(locators) {
    return locators.join(".");
  }
  regexToString(body) {
    const suffix = body.flags.includes("i") ? ", RegexOptions.IgnoreCase" : "";
    return `new Regex(${this.quote((0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source))}${suffix})`;
  }
  toCallWithExact(method, body, exact) {
    if (isRegExp(body))
      return `${method}(${this.regexToString(body)})`;
    if (exact)
      return `${method}(${this.quote(body)}, new() { Exact = true })`;
    return `${method}(${this.quote(body)})`;
  }
  toHasText(body) {
    if (isRegExp(body))
      return `HasTextRegex = ${this.regexToString(body)}`;
    return `HasText = ${this.quote(body)}`;
  }
  toTestIdValue(value) {
    if (isRegExp(value))
      return this.regexToString(value);
    return this.quote(value);
  }
  toHasNotText(body) {
    if (isRegExp(body))
      return `HasNotTextRegex = ${this.regexToString(body)}`;
    return `HasNotText = ${this.quote(body)}`;
  }
  quote(text) {
    return (0, import_stringUtils.escapeWithQuotes)(text, '"');
  }
}
class JsonlLocatorFactory {
  generateLocator(base, kind, body, options = {}) {
    return JSON.stringify({
      kind,
      body,
      options
    });
  }
  chainLocators(locators) {
    const objects = locators.map((l) => JSON.parse(l));
    for (let i = 0; i < objects.length - 1; ++i)
      objects[i].next = objects[i + 1];
    return JSON.stringify(objects[0]);
  }
}
const generators = {
  javascript: JavaScriptLocatorFactory,
  python: PythonLocatorFactory,
  java: JavaLocatorFactory,
  csharp: CSharpLocatorFactory,
  jsonl: JsonlLocatorFactory
};
function isRegExp(obj) {
  return obj instanceof RegExp;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CSharpLocatorFactory,
  JavaLocatorFactory,
  JavaScriptLocatorFactory,
  JsonlLocatorFactory,
  PythonLocatorFactory,
  asLocator,
  asLocatorDescription,
  asLocators,
  locatorCustomDescription
});
