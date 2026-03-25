Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');

// exporting a separate copy of `WINDOW` rather than exporting the one from `@sentry/browser`
// prevents the browser package from being bundled in the CDN bundle, and avoids a
// circular dependency between the browser and replay packages should `@sentry/browser` import
// from `@sentry/replay` in the future
const WINDOW = core.GLOBAL_OBJ ;

const REPLAY_SESSION_KEY = 'sentryReplaySession';
const REPLAY_EVENT_NAME = 'replay_event';
const UNABLE_TO_SEND_REPLAY = 'Unable to send Replay';

// The idle limit for a session after which recording is paused.
const SESSION_IDLE_PAUSE_DURATION = 300000; // 5 minutes in ms

// The idle limit for a session after which the session expires.
const SESSION_IDLE_EXPIRE_DURATION = 900000; // 15 minutes in ms

/** Default flush delays */
const DEFAULT_FLUSH_MIN_DELAY = 5000;
// XXX: Temp fix for our debounce logic where `maxWait` would never occur if it
// was the same as `wait`
const DEFAULT_FLUSH_MAX_DELAY = 5500;

/* How long to wait for error checkouts */
const BUFFER_CHECKOUT_TIME = 60000;

const RETRY_BASE_INTERVAL = 5000;
const RETRY_MAX_COUNT = 3;

/* The max (uncompressed) size in bytes of a network body. Any body larger than this will be truncated. */
const NETWORK_BODY_MAX_SIZE = 150000;

/* The max size of a single console arg that is captured. Any arg larger than this will be truncated. */
const CONSOLE_ARG_MAX_SIZE = 5000;

/* Min. time to wait before we consider something a slow click. */
const SLOW_CLICK_THRESHOLD = 3000;
/* For scroll actions after a click, we only look for a very short time period to detect programmatic scrolling. */
const SLOW_CLICK_SCROLL_TIMEOUT = 300;

/** When encountering a total segment size exceeding this size, stop the replay (as we cannot properly ingest it). */
const REPLAY_MAX_EVENT_BUFFER_SIZE = 20000000; // ~20MB

/** Replays must be min. 5s long before we send them. */
const MIN_REPLAY_DURATION = 4999;

/*
The max. allowed value that the minReplayDuration can be set to.
This needs to be below 60s, so we don't unintentionally drop buffered replays that are longer than 60s.
*/
const MIN_REPLAY_DURATION_LIMIT = 50000;

/** The max. length of a replay. */
const MAX_REPLAY_DURATION = 3600000; // 60 minutes in ms;

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
var NodeType$2 = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["Document"] = 0] = "Document";
  NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
  NodeType2[NodeType2["Element"] = 2] = "Element";
  NodeType2[NodeType2["Text"] = 3] = "Text";
  NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
  NodeType2[NodeType2["Comment"] = 5] = "Comment";
  return NodeType2;
})(NodeType$2 || {});
function isElement$1(n2) {
  return n2.nodeType === n2.ELEMENT_NODE;
}
function isShadowRoot(n2) {
  const host = n2?.host;
  return Boolean(host?.shadowRoot === n2);
}
function isNativeShadowDom(shadowRoot) {
  return Object.prototype.toString.call(shadowRoot) === "[object ShadowRoot]";
}
function fixBrowserCompatibilityIssuesInCSS(cssText) {
  if (cssText.includes(" background-clip: text;") && !cssText.includes(" -webkit-background-clip: text;")) {
    cssText = cssText.replace(
      /\sbackground-clip:\s*text;/g,
      " -webkit-background-clip: text; background-clip: text;"
    );
  }
  return cssText;
}
function escapeImportStatement(rule) {
  const { cssText } = rule;
  if (cssText.split('"').length < 3) return cssText;
  const statement = ["@import", `url(${JSON.stringify(rule.href)})`];
  if (rule.layerName === "") {
    statement.push(`layer`);
  } else if (rule.layerName) {
    statement.push(`layer(${rule.layerName})`);
  }
  if (rule.supportsText) {
    statement.push(`supports(${rule.supportsText})`);
  }
  if (rule.media.length) {
    statement.push(rule.media.mediaText);
  }
  return statement.join(" ") + ";";
}
function stringifyStylesheet(s2) {
  try {
    const rules2 = s2.rules || s2.cssRules;
    return rules2 ? fixBrowserCompatibilityIssuesInCSS(
      Array.from(rules2, stringifyRule).join("")
    ) : null;
  } catch (error) {
    return null;
  }
}
function fixAllCssProperty(rule) {
  let styles = "";
  for (let i2 = 0; i2 < rule.style.length; i2++) {
    const styleDeclaration = rule.style;
    const attribute = styleDeclaration[i2];
    const isImportant = styleDeclaration.getPropertyPriority(attribute);
    styles += `${attribute}:${styleDeclaration.getPropertyValue(attribute)}${isImportant ? ` !important` : ""};`;
  }
  return `${rule.selectorText} { ${styles} }`;
}
function stringifyRule(rule) {
  let importStringified;
  if (isCSSImportRule(rule)) {
    try {
      importStringified = // for same-origin stylesheets,
      // we can access the imported stylesheet rules directly
      stringifyStylesheet(rule.styleSheet) || // work around browser issues with the raw string `@import url(...)` statement
      escapeImportStatement(rule);
    } catch (error) {
    }
  } else if (isCSSStyleRule(rule)) {
    let cssText = rule.cssText;
    const needsSafariColonFix = rule.selectorText.includes(":");
    const needsAllFix = typeof rule.style["all"] === "string" && rule.style["all"];
    if (needsAllFix) {
      cssText = fixAllCssProperty(rule);
    }
    if (needsSafariColonFix) {
      cssText = fixSafariColons(cssText);
    }
    if (needsSafariColonFix || needsAllFix) {
      return cssText;
    }
  }
  return importStringified || rule.cssText;
}
function fixSafariColons(cssStringified) {
  const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
  return cssStringified.replace(regex, "$1\\$2");
}
function isCSSImportRule(rule) {
  return "styleSheet" in rule;
}
function isCSSStyleRule(rule) {
  return "selectorText" in rule;
}
class Mirror {
  constructor() {
    __publicField$1(this, "idNodeMap", /* @__PURE__ */ new Map());
    __publicField$1(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
  }
  getId(n2) {
    if (!n2) return -1;
    const id = this.getMeta(n2)?.id;
    return id ?? -1;
  }
  getNode(id) {
    return this.idNodeMap.get(id) || null;
  }
  getIds() {
    return Array.from(this.idNodeMap.keys());
  }
  getMeta(n2) {
    return this.nodeMetaMap.get(n2) || null;
  }
  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n2) {
    const id = this.getId(n2);
    this.idNodeMap.delete(id);
    if (n2.childNodes) {
      n2.childNodes.forEach(
        (childNode) => this.removeNodeFromMap(childNode)
      );
    }
  }
  has(id) {
    return this.idNodeMap.has(id);
  }
  hasNode(node) {
    return this.nodeMetaMap.has(node);
  }
  add(n2, meta) {
    const id = meta.id;
    this.idNodeMap.set(id, n2);
    this.nodeMetaMap.set(n2, meta);
  }
  replace(id, n2) {
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta) this.nodeMetaMap.set(n2, meta);
    }
    this.idNodeMap.set(id, n2);
  }
  reset() {
    this.idNodeMap = /* @__PURE__ */ new Map();
    this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
  }
}
function createMirror$2() {
  return new Mirror();
}
function shouldMaskInput({
  maskInputOptions,
  tagName,
  type
}) {
  if (tagName === "OPTION") {
    tagName = "SELECT";
  }
  return Boolean(
    maskInputOptions[tagName.toLowerCase()] || type && maskInputOptions[type] || type === "password" || // Default to "text" option for inputs without a "type" attribute defined
    tagName === "INPUT" && !type && maskInputOptions["text"]
  );
}
function maskInputValue({
  isMasked,
  element,
  value,
  maskInputFn
}) {
  let text = value || "";
  if (!isMasked) {
    return text;
  }
  if (maskInputFn) {
    text = maskInputFn(text, element);
  }
  return "*".repeat(text.length);
}
function toLowerCase(str) {
  return str.toLowerCase();
}
function toUpperCase(str) {
  return str.toUpperCase();
}
const ORIGINAL_ATTRIBUTE_NAME = "__rrweb_original__";
function is2DCanvasBlank(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const chunkSize = 50;
  for (let x = 0; x < canvas.width; x += chunkSize) {
    for (let y = 0; y < canvas.height; y += chunkSize) {
      const getImageData = ctx.getImageData;
      const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData ? getImageData[ORIGINAL_ATTRIBUTE_NAME] : getImageData;
      const pixelBuffer = new Uint32Array(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        originalGetImageData.call(
          ctx,
          x,
          y,
          Math.min(chunkSize, canvas.width - x),
          Math.min(chunkSize, canvas.height - y)
        ).data.buffer
      );
      if (pixelBuffer.some((pixel) => pixel !== 0)) return false;
    }
  }
  return true;
}
function getInputType(element) {
  const type = element.type;
  return element.hasAttribute("data-rr-is-password") ? "password" : type ? (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    toLowerCase(type)
  ) : null;
}
function getInputValue(el, tagName, type) {
  if (tagName === "INPUT" && (type === "radio" || type === "checkbox")) {
    return el.getAttribute("value") || "";
  }
  return el.value;
}
function extractFileExtension(path, baseURL) {
  let url;
  try {
    url = new URL(path, baseURL ?? window.location.href);
  } catch (err) {
    return null;
  }
  const regex = /\.([0-9a-z]+)(?:$)/i;
  const match = url.pathname.match(regex);
  return match?.[1] ?? null;
}
const cachedImplementations$1 = {};
function getImplementation$1(name) {
  const cached = cachedImplementations$1[name];
  if (cached) {
    return cached;
  }
  const document2 = window.document;
  let impl = window[name];
  if (document2 && typeof document2.createElement === "function") {
    try {
      const sandbox = document2.createElement("iframe");
      sandbox.hidden = true;
      document2.head.appendChild(sandbox);
      const contentWindow = sandbox.contentWindow;
      if (contentWindow && contentWindow[name]) {
        impl = // eslint-disable-next-line @typescript-eslint/unbound-method
        contentWindow[name];
      }
      document2.head.removeChild(sandbox);
    } catch (e2) {
    }
  }
  return cachedImplementations$1[name] = impl.bind(
    window
  );
}
function setTimeout$2(...rest) {
  return getImplementation$1("setTimeout")(...rest);
}
function clearTimeout$1(...rest) {
  return getImplementation$1("clearTimeout")(...rest);
}
function getIframeContentDocument(iframe) {
  try {
    return iframe.contentDocument;
  } catch (e2) {
  }
}
let _id = 1;
const tagNameRegex = new RegExp("[^a-z0-9-_:]");
const IGNORED_NODE = -2;
function genId() {
  return _id++;
}
function getValidTagName$1(element) {
  if (element instanceof HTMLFormElement) {
    return "form";
  }
  const processedTagName = toLowerCase(element.tagName);
  if (tagNameRegex.test(processedTagName)) {
    return "div";
  }
  return processedTagName;
}
function extractOrigin(url) {
  let origin = "";
  if (url.indexOf("//") > -1) {
    origin = url.split("/").slice(0, 3).join("/");
  } else {
    origin = url.split("/")[0];
  }
  origin = origin.split("?")[0];
  return origin;
}
let canvasService;
let canvasCtx;
const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
const URL_WWW_MATCH = /^www\..*/i;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
function filterCSSPropertiesFromInlineStyle(cssText, ignoredProperties) {
  if (!cssText || ignoredProperties.size === 0) {
    return cssText;
  }
  try {
    const properties = cssText.split(";");
    const filteredProperties = [];
    for (let property of properties) {
      property = property.trim();
      if (!property) continue;
      const colonIndex = property.indexOf(":");
      if (colonIndex === -1) {
        filteredProperties.push(property);
        continue;
      }
      const propertyName = property.slice(0, colonIndex).trim();
      if (!ignoredProperties.has(propertyName)) {
        filteredProperties.push(property);
      }
    }
    return filteredProperties.join("; ") + (filteredProperties.length > 0 && cssText.endsWith(";") ? ";" : "");
  } catch (error) {
    console.warn("Error filtering CSS properties:", error);
    return cssText;
  }
}
function absoluteToStylesheet(cssText, href) {
  return (cssText || "").replace(
    URL_IN_CSS_REF,
    (origin, quote1, path1, quote2, path2, path3) => {
      const filePath = path1 || path2 || path3;
      const maybeQuote = quote1 || quote2 || "";
      if (!filePath) {
        return origin;
      }
      if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (DATA_URI.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (filePath[0] === "/") {
        return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
      }
      const stack = href.split("/");
      const parts = filePath.split("/");
      stack.pop();
      for (const part of parts) {
        if (part === ".") {
          continue;
        } else if (part === "..") {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      return `url(${maybeQuote}${stack.join("/")}${maybeQuote})`;
    }
  );
}
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
  if (attributeValue.trim() === "") {
    return attributeValue;
  }
  let pos = 0;
  function collectCharacters(regEx) {
    let chars2;
    const match = regEx.exec(attributeValue.substring(pos));
    if (match) {
      chars2 = match[0];
      pos += chars2.length;
      return chars2;
    }
    return "";
  }
  const output = [];
  while (true) {
    collectCharacters(SRCSET_COMMAS_OR_SPACES);
    if (pos >= attributeValue.length) {
      break;
    }
    let url = collectCharacters(SRCSET_NOT_SPACES);
    if (url.slice(-1) === ",") {
      url = absoluteToDoc(doc, url.substring(0, url.length - 1));
      output.push(url);
    } else {
      let descriptorsStr = "";
      url = absoluteToDoc(doc, url);
      let inParens = false;
      while (true) {
        const c2 = attributeValue.charAt(pos);
        if (c2 === "") {
          output.push((url + descriptorsStr).trim());
          break;
        } else if (!inParens) {
          if (c2 === ",") {
            pos += 1;
            output.push((url + descriptorsStr).trim());
            break;
          } else if (c2 === "(") {
            inParens = true;
          }
        } else {
          if (c2 === ")") {
            inParens = false;
          }
        }
        descriptorsStr += c2;
        pos += 1;
      }
    }
  }
  return output.join(", ");
}
const cachedDocument = /* @__PURE__ */ new WeakMap();
function absoluteToDoc(doc, attributeValue) {
  if (!attributeValue || attributeValue.trim() === "") {
    return attributeValue;
  }
  return getHref(doc, attributeValue);
}
function isSVGElement(el) {
  return Boolean(el.tagName === "svg" || el.ownerSVGElement);
}
function getHref(doc, customHref) {
  let a2 = cachedDocument.get(doc);
  if (!a2) {
    a2 = doc.createElement("a");
    cachedDocument.set(doc, a2);
  }
  if (!customHref) {
    customHref = "";
  } else if (customHref.startsWith("blob:") || customHref.startsWith("data:")) {
    return customHref;
  }
  a2.setAttribute("href", customHref);
  return a2.href;
}
function transformAttribute(doc, tagName, name, value, element, maskAttributeFn, ignoreCSSAttributes) {
  if (!value) {
    return value;
  }
  if (name === "src" || name === "href" && !(tagName === "use" && value[0] === "#")) {
    return absoluteToDoc(doc, value);
  } else if (name === "xlink:href" && value[0] !== "#") {
    return absoluteToDoc(doc, value);
  } else if (name === "background" && (tagName === "table" || tagName === "td" || tagName === "th")) {
    return absoluteToDoc(doc, value);
  } else if (name === "srcset") {
    return getAbsoluteSrcsetString(doc, value);
  } else if (name === "style") {
    let processedStyle = absoluteToStylesheet(value, getHref(doc));
    if (ignoreCSSAttributes && ignoreCSSAttributes.size > 0) {
      processedStyle = filterCSSPropertiesFromInlineStyle(
        processedStyle,
        ignoreCSSAttributes
      );
    }
    return processedStyle;
  } else if (tagName === "object" && name === "data") {
    return absoluteToDoc(doc, value);
  }
  if (typeof maskAttributeFn === "function") {
    return maskAttributeFn(name, value, element);
  }
  return value;
}
function ignoreAttribute(tagName, name, _value) {
  return (tagName === "video" || tagName === "audio") && name === "autoplay";
}
function _isBlockedElement(element, blockClass, blockSelector, unblockSelector) {
  try {
    if (unblockSelector && element.matches(unblockSelector)) {
      return false;
    }
    if (typeof blockClass === "string") {
      if (element.classList.contains(blockClass)) {
        return true;
      }
    } else {
      for (let eIndex = element.classList.length; eIndex--; ) {
        const className = element.classList[eIndex];
        if (blockClass.test(className)) {
          return true;
        }
      }
    }
    if (blockSelector) {
      return element.matches(blockSelector);
    }
  } catch (e2) {
  }
  return false;
}
function elementClassMatchesRegex(el, regex) {
  for (let eIndex = el.classList.length; eIndex--; ) {
    const className = el.classList[eIndex];
    if (regex.test(className)) {
      return true;
    }
  }
  return false;
}
function distanceToMatch(node, matchPredicate, limit = Infinity, distance = 0) {
  if (!node) return -1;
  if (node.nodeType !== node.ELEMENT_NODE) return -1;
  if (distance > limit) return -1;
  if (matchPredicate(node)) return distance;
  return distanceToMatch(node.parentNode, matchPredicate, limit, distance + 1);
}
function createMatchPredicate(className, selector) {
  return (node) => {
    const el = node;
    if (el === null) return false;
    try {
      if (className) {
        if (typeof className === "string") {
          if (el.matches(`.${className}`)) return true;
        } else if (elementClassMatchesRegex(el, className)) {
          return true;
        }
      }
      if (selector && el.matches(selector)) return true;
      return false;
    } catch {
      return false;
    }
  };
}
function needMaskingText(node, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, maskAllText) {
  try {
    const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
    if (el === null) return false;
    if (el.tagName === "INPUT") {
      const autocomplete = el.getAttribute("autocomplete");
      const disallowedAutocompleteValues = [
        "current-password",
        "new-password",
        "cc-number",
        "cc-exp",
        "cc-exp-month",
        "cc-exp-year",
        "cc-csc"
      ];
      if (disallowedAutocompleteValues.includes(autocomplete)) {
        return true;
      }
    }
    let maskDistance = -1;
    let unmaskDistance = -1;
    if (maskAllText) {
      unmaskDistance = distanceToMatch(
        el,
        createMatchPredicate(unmaskTextClass, unmaskTextSelector)
      );
      if (unmaskDistance < 0) {
        return true;
      }
      maskDistance = distanceToMatch(
        el,
        createMatchPredicate(maskTextClass, maskTextSelector),
        unmaskDistance >= 0 ? unmaskDistance : Infinity
      );
    } else {
      maskDistance = distanceToMatch(
        el,
        createMatchPredicate(maskTextClass, maskTextSelector)
      );
      if (maskDistance < 0) {
        return false;
      }
      unmaskDistance = distanceToMatch(
        el,
        createMatchPredicate(unmaskTextClass, unmaskTextSelector),
        maskDistance >= 0 ? maskDistance : Infinity
      );
    }
    return maskDistance >= 0 ? unmaskDistance >= 0 ? maskDistance <= unmaskDistance : true : unmaskDistance >= 0 ? false : !!maskAllText;
  } catch (e2) {
  }
  return !!maskAllText;
}
function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
  const win = iframeEl.contentWindow;
  if (!win) {
    return;
  }
  let fired = false;
  let readyState;
  try {
    readyState = win.document.readyState;
  } catch (error) {
    return;
  }
  if (readyState !== "complete") {
    const timer = setTimeout$2(() => {
      if (!fired) {
        listener();
        fired = true;
      }
    }, iframeLoadTimeout);
    iframeEl.addEventListener("load", () => {
      clearTimeout$1(timer);
      fired = true;
      listener();
    });
    return;
  }
  const blankUrl = "about:blank";
  if (win.location.href !== blankUrl || iframeEl.src === blankUrl || iframeEl.src === "") {
    setTimeout$2(listener, 0);
    return iframeEl.addEventListener("load", listener);
  }
  iframeEl.addEventListener("load", listener);
}
function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
  let fired = false;
  let styleSheetLoaded;
  try {
    styleSheetLoaded = link.sheet;
  } catch (error) {
    return;
  }
  if (styleSheetLoaded) return;
  const timer = setTimeout$2(() => {
    if (!fired) {
      listener();
      fired = true;
    }
  }, styleSheetLoadTimeout);
  link.addEventListener("load", () => {
    clearTimeout$1(timer);
    fired = true;
    listener();
  });
}
function serializeNode(n2, options) {
  const {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    unblockSelector,
    maskAllText,
    maskAttributeFn,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    inlineStylesheet,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false,
    ignoreCSSAttributes
  } = options;
  const rootId = getRootId(doc, mirror2);
  switch (n2.nodeType) {
    case n2.DOCUMENT_NODE:
      if (n2.compatMode !== "CSS1Compat") {
        return {
          type: NodeType$2.Document,
          childNodes: [],
          compatMode: n2.compatMode
          // probably "BackCompat"
        };
      } else {
        return {
          type: NodeType$2.Document,
          childNodes: []
        };
      }
    case n2.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType$2.DocumentType,
        name: n2.name,
        publicId: n2.publicId,
        systemId: n2.systemId,
        rootId
      };
    case n2.ELEMENT_NODE:
      return serializeElementNode(n2, {
        doc,
        blockClass,
        blockSelector,
        unblockSelector,
        inlineStylesheet,
        maskAttributeFn,
        maskInputOptions,
        maskInputFn,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        keepIframeSrcFn,
        newlyAddedElement,
        rootId,
        maskTextClass,
        unmaskTextClass,
        maskTextSelector,
        unmaskTextSelector,
        ignoreCSSAttributes
      });
    case n2.TEXT_NODE:
      return serializeTextNode(n2, {
        doc,
        maskAllText,
        maskTextClass,
        unmaskTextClass,
        maskTextSelector,
        unmaskTextSelector,
        maskTextFn,
        maskInputOptions,
        maskInputFn,
        rootId
      });
    case n2.CDATA_SECTION_NODE:
      return {
        type: NodeType$2.CDATA,
        textContent: "",
        rootId
      };
    case n2.COMMENT_NODE:
      return {
        type: NodeType$2.Comment,
        textContent: n2.textContent || "",
        rootId
      };
    default:
      return false;
  }
}
function getRootId(doc, mirror2) {
  if (!mirror2.hasNode(doc)) return void 0;
  const docId = mirror2.getId(doc);
  return docId === 1 ? void 0 : docId;
}
function serializeTextNode(n2, options) {
  const {
    maskAllText,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    maskTextFn,
    maskInputOptions,
    maskInputFn,
    rootId
  } = options;
  const parentTagName = n2.parentNode && n2.parentNode.tagName;
  let textContent = n2.textContent;
  const isStyle = parentTagName === "STYLE" ? true : void 0;
  const isScript = parentTagName === "SCRIPT" ? true : void 0;
  const isTextarea = parentTagName === "TEXTAREA" ? true : void 0;
  if (isStyle && textContent) {
    try {
      if (n2.nextSibling || n2.previousSibling) {
      } else if (n2.parentNode.sheet?.cssRules) {
        textContent = stringifyStylesheet(
          n2.parentNode.sheet
        );
      }
    } catch (err) {
      console.warn(
        `Cannot get CSS styles from text's parentNode. Error: ${err}`,
        n2
      );
    }
    textContent = absoluteToStylesheet(textContent, getHref(options.doc));
  }
  if (isScript) {
    textContent = "SCRIPT_PLACEHOLDER";
  }
  const forceMask = needMaskingText(
    n2,
    maskTextClass,
    maskTextSelector,
    unmaskTextClass,
    unmaskTextSelector,
    maskAllText
  );
  if (!isStyle && !isScript && !isTextarea && textContent && forceMask) {
    textContent = maskTextFn ? maskTextFn(textContent, n2.parentElement) : textContent.replace(/[\S]/g, "*");
  }
  if (isTextarea && textContent && (maskInputOptions.textarea || forceMask)) {
    textContent = maskInputFn ? maskInputFn(textContent, n2.parentNode) : textContent.replace(/[\S]/g, "*");
  }
  if (parentTagName === "OPTION" && textContent) {
    const isInputMasked = shouldMaskInput({
      type: null,
      tagName: parentTagName,
      maskInputOptions
    });
    textContent = maskInputValue({
      isMasked: needMaskingText(
        n2,
        maskTextClass,
        maskTextSelector,
        unmaskTextClass,
        unmaskTextSelector,
        isInputMasked
      ),
      element: n2,
      value: textContent,
      maskInputFn
    });
  }
  return {
    type: NodeType$2.Text,
    textContent: textContent || "",
    isStyle,
    rootId
  };
}
function serializeElementNode(n2, options) {
  const {
    doc,
    blockClass,
    blockSelector,
    unblockSelector,
    inlineStylesheet,
    maskInputOptions = {},
    maskAttributeFn,
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false,
    rootId,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    ignoreCSSAttributes
  } = options;
  const needBlock = _isBlockedElement(
    n2,
    blockClass,
    blockSelector,
    unblockSelector
  );
  const tagName = getValidTagName$1(n2);
  let attributes2 = {};
  const len = n2.attributes.length;
  for (let i2 = 0; i2 < len; i2++) {
    const attr = n2.attributes[i2];
    if (attr.name && !ignoreAttribute(tagName, attr.name, attr.value)) {
      attributes2[attr.name] = transformAttribute(
        doc,
        tagName,
        toLowerCase(attr.name),
        attr.value,
        n2,
        maskAttributeFn,
        ignoreCSSAttributes
      );
    }
  }
  if (tagName === "link" && inlineStylesheet) {
    const stylesheet = Array.from(doc.styleSheets).find((s2) => {
      return s2.href === n2.href;
    });
    let cssText = null;
    if (stylesheet) {
      cssText = stringifyStylesheet(stylesheet);
    }
    if (cssText) {
      attributes2.rel = null;
      attributes2.href = null;
      attributes2.crossorigin = null;
      attributes2._cssText = absoluteToStylesheet(cssText, stylesheet.href);
    }
  }
  if (tagName === "style" && n2.sheet && // TODO: Currently we only try to get dynamic stylesheet when it is an empty style element
  !(n2.innerText || n2.textContent || "").trim().length) {
    const cssText = stringifyStylesheet(
      n2.sheet
    );
    if (cssText) {
      attributes2._cssText = absoluteToStylesheet(cssText, getHref(doc));
    }
  }
  if (tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "option") {
    const el = n2;
    const type = getInputType(el);
    const value = getInputValue(el, toUpperCase(tagName), type);
    const checked = el.checked;
    if (type !== "submit" && type !== "button" && value) {
      const forceMask = needMaskingText(
        el,
        maskTextClass,
        maskTextSelector,
        unmaskTextClass,
        unmaskTextSelector,
        shouldMaskInput({
          type,
          tagName: toUpperCase(tagName),
          maskInputOptions
        })
      );
      attributes2.value = maskInputValue({
        isMasked: forceMask,
        element: el,
        value,
        maskInputFn
      });
    }
    if (checked) {
      attributes2.checked = checked;
    }
  }
  if (tagName === "option") {
    if (n2.selected && !maskInputOptions["select"]) {
      attributes2.selected = true;
    } else {
      delete attributes2.selected;
    }
  }
  if (tagName === "canvas" && recordCanvas) {
    if (n2.__context === "2d") {
      if (!is2DCanvasBlank(n2)) {
        attributes2.rr_dataURL = n2.toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality
        );
      }
    } else if (!("__context" in n2)) {
      const canvasDataURL = n2.toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality
      );
      const blankCanvas = doc.createElement("canvas");
      blankCanvas.width = n2.width;
      blankCanvas.height = n2.height;
      const blankCanvasDataURL = blankCanvas.toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality
      );
      if (canvasDataURL !== blankCanvasDataURL) {
        attributes2.rr_dataURL = canvasDataURL;
      }
    }
  }
  if (tagName === "img" && inlineImages) {
    if (!canvasService) {
      canvasService = doc.createElement("canvas");
      canvasCtx = canvasService.getContext("2d");
    }
    const image = n2;
    const imageSrc = image.currentSrc || image.getAttribute("src") || "<unknown-src>";
    const priorCrossOrigin = image.crossOrigin;
    const recordInlineImage = () => {
      image.removeEventListener("load", recordInlineImage);
      try {
        canvasService.width = image.naturalWidth;
        canvasService.height = image.naturalHeight;
        canvasCtx.drawImage(image, 0, 0);
        attributes2.rr_dataURL = canvasService.toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality
        );
      } catch (err) {
        if (image.crossOrigin !== "anonymous") {
          image.crossOrigin = "anonymous";
          if (image.complete && image.naturalWidth !== 0)
            recordInlineImage();
          else image.addEventListener("load", recordInlineImage);
          return;
        } else {
          console.warn(
            `Cannot inline img src=${imageSrc}! Error: ${err}`
          );
        }
      }
      if (image.crossOrigin === "anonymous") {
        priorCrossOrigin ? attributes2.crossOrigin = priorCrossOrigin : image.removeAttribute("crossorigin");
      }
    };
    if (image.complete && image.naturalWidth !== 0) recordInlineImage();
    else image.addEventListener("load", recordInlineImage);
  }
  if (tagName === "audio" || tagName === "video") {
    attributes2.rr_mediaState = n2.paused ? "paused" : "played";
    attributes2.rr_mediaCurrentTime = n2.currentTime;
  }
  if (!newlyAddedElement) {
    if (n2.scrollLeft) {
      attributes2.rr_scrollLeft = n2.scrollLeft;
    }
    if (n2.scrollTop) {
      attributes2.rr_scrollTop = n2.scrollTop;
    }
  }
  if (needBlock) {
    const { width, height } = n2.getBoundingClientRect();
    attributes2 = {
      class: attributes2.class,
      rr_width: `${width}px`,
      rr_height: `${height}px`
    };
  }
  if (tagName === "iframe" && !keepIframeSrcFn(attributes2.src)) {
    if (!needBlock && !getIframeContentDocument(n2)) {
      attributes2.rr_src = attributes2.src;
    }
    delete attributes2.src;
  }
  let isCustomElement;
  try {
    if (customElements.get(tagName)) isCustomElement = true;
  } catch (e2) {
  }
  return {
    type: NodeType$2.Element,
    tagName,
    attributes: attributes2,
    childNodes: [],
    isSVG: isSVGElement(n2) || void 0,
    needBlock,
    rootId,
    isCustom: isCustomElement
  };
}
function lowerIfExists(maybeAttr) {
  if (maybeAttr === void 0 || maybeAttr === null) {
    return "";
  } else {
    return maybeAttr.toLowerCase();
  }
}
function slimDOMExcluded(sn, slimDOMOptions) {
  if (slimDOMOptions.comment && sn.type === NodeType$2.Comment) {
    return true;
  } else if (sn.type === NodeType$2.Element) {
    if (slimDOMOptions.script && // script tag
    (sn.tagName === "script" || // (module)preload link
    sn.tagName === "link" && (sn.attributes.rel === "preload" || sn.attributes.rel === "modulepreload") || // prefetch link
    sn.tagName === "link" && sn.attributes.rel === "prefetch" && typeof sn.attributes.href === "string" && extractFileExtension(sn.attributes.href) === "js")) {
      return true;
    } else if (slimDOMOptions.headFavicon && (sn.tagName === "link" && sn.attributes.rel === "shortcut icon" || sn.tagName === "meta" && (lowerIfExists(sn.attributes.name).match(
      /^msapplication-tile(image|color)$/
    ) || lowerIfExists(sn.attributes.name) === "application-name" || lowerIfExists(sn.attributes.rel) === "icon" || lowerIfExists(sn.attributes.rel) === "apple-touch-icon" || lowerIfExists(sn.attributes.rel) === "shortcut icon"))) {
      return true;
    } else if (sn.tagName === "meta") {
      if (slimDOMOptions.headMetaDescKeywords && lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
        return true;
      } else if (slimDOMOptions.headMetaSocial && (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) || // og = opengraph (facebook)
      lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) || lowerIfExists(sn.attributes.name) === "pinterest")) {
        return true;
      } else if (slimDOMOptions.headMetaRobots && (lowerIfExists(sn.attributes.name) === "robots" || lowerIfExists(sn.attributes.name) === "googlebot" || lowerIfExists(sn.attributes.name) === "bingbot")) {
        return true;
      } else if (slimDOMOptions.headMetaHttpEquiv && sn.attributes["http-equiv"] !== void 0) {
        return true;
      } else if (slimDOMOptions.headMetaAuthorship && (lowerIfExists(sn.attributes.name) === "author" || lowerIfExists(sn.attributes.name) === "generator" || lowerIfExists(sn.attributes.name) === "framework" || lowerIfExists(sn.attributes.name) === "publisher" || lowerIfExists(sn.attributes.name) === "progid" || lowerIfExists(sn.attributes.property).match(/^article:/) || lowerIfExists(sn.attributes.property).match(/^product:/))) {
        return true;
      } else if (slimDOMOptions.headMetaVerification && (lowerIfExists(sn.attributes.name) === "google-site-verification" || lowerIfExists(sn.attributes.name) === "yandex-verification" || lowerIfExists(sn.attributes.name) === "csrf-token" || lowerIfExists(sn.attributes.name) === "p:domain_verify" || lowerIfExists(sn.attributes.name) === "verify-v1" || lowerIfExists(sn.attributes.name) === "verification" || lowerIfExists(sn.attributes.name) === "shopify-checkout-api-token")) {
        return true;
      }
    }
  }
  return false;
}
function serializeNodeWithId(n2, options) {
  const {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    unblockSelector,
    maskAllText,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    skipChild = false,
    inlineStylesheet = true,
    maskInputOptions = {},
    maskAttributeFn,
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions = {},
    inlineImages = false,
    recordCanvas = false,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout = 5e3,
    onBlockedImageLoad,
    onStylesheetLoad,
    stylesheetLoadTimeout = 5e3,
    keepIframeSrcFn = () => false,
    newlyAddedElement = false,
    ignoreCSSAttributes
  } = options;
  let { preserveWhiteSpace = true } = options;
  const _serializedNode = serializeNode(n2, {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    maskAllText,
    unblockSelector,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    inlineStylesheet,
    maskInputOptions,
    maskAttributeFn,
    maskTextFn,
    maskInputFn,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement,
    ignoreCSSAttributes
  });
  if (!_serializedNode) {
    console.warn(n2, "not serialized");
    return null;
  }
  let id;
  if (mirror2.hasNode(n2)) {
    id = mirror2.getId(n2);
  } else if (slimDOMExcluded(_serializedNode, slimDOMOptions) || !preserveWhiteSpace && _serializedNode.type === NodeType$2.Text && !_serializedNode.isStyle && !_serializedNode.textContent.replace(/^\s+|\s+$/gm, "").length) {
    id = IGNORED_NODE;
  } else {
    id = genId();
  }
  const serializedNode2 = Object.assign(_serializedNode, { id });
  mirror2.add(n2, serializedNode2);
  if (id === IGNORED_NODE) {
    return null;
  }
  if (onSerialize) {
    onSerialize(n2);
  }
  let recordChild = !skipChild;
  if (serializedNode2.type === NodeType$2.Element) {
    recordChild = recordChild && !serializedNode2.needBlock;
    const shadowRoot = n2.shadowRoot;
    if (shadowRoot && isNativeShadowDom(shadowRoot))
      serializedNode2.isShadowHost = true;
  }
  if ((serializedNode2.type === NodeType$2.Document || serializedNode2.type === NodeType$2.Element) && recordChild) {
    if (slimDOMOptions.headWhitespace && serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "head") {
      preserveWhiteSpace = false;
    }
    const bypassOptions = {
      doc,
      mirror: mirror2,
      blockClass,
      blockSelector,
      maskAllText,
      unblockSelector,
      maskTextClass,
      unmaskTextClass,
      maskTextSelector,
      unmaskTextSelector,
      skipChild,
      inlineStylesheet,
      maskInputOptions,
      maskAttributeFn,
      maskTextFn,
      maskInputFn,
      slimDOMOptions,
      dataURLOptions,
      inlineImages,
      recordCanvas,
      preserveWhiteSpace,
      onSerialize,
      onIframeLoad,
      iframeLoadTimeout,
      onBlockedImageLoad,
      onStylesheetLoad,
      stylesheetLoadTimeout,
      keepIframeSrcFn,
      ignoreCSSAttributes
    };
    const childNodes = n2.childNodes ? Array.from(n2.childNodes) : [];
    for (const childN of childNodes) {
      const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
      if (serializedChildNode) {
        serializedNode2.childNodes.push(serializedChildNode);
      }
    }
    if (isElement$1(n2) && n2.shadowRoot) {
      for (const childN of Array.from(n2.shadowRoot.childNodes)) {
        const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
        if (serializedChildNode) {
          isNativeShadowDom(n2.shadowRoot) && (serializedChildNode.isShadow = true);
          serializedNode2.childNodes.push(serializedChildNode);
        }
      }
    }
  }
  if (n2.parentNode && isShadowRoot(n2.parentNode) && isNativeShadowDom(n2.parentNode)) {
    serializedNode2.isShadow = true;
  }
  if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "iframe" && !serializedNode2.needBlock) {
    onceIframeLoaded(
      n2,
      () => {
        const iframeDoc = getIframeContentDocument(n2);
        if (iframeDoc && onIframeLoad) {
          const serializedIframeNode = serializeNodeWithId(iframeDoc, {
            doc: iframeDoc,
            mirror: mirror2,
            blockClass,
            blockSelector,
            unblockSelector,
            maskAllText,
            maskTextClass,
            unmaskTextClass,
            maskTextSelector,
            unmaskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskAttributeFn,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
            ignoreCSSAttributes
          });
          if (serializedIframeNode) {
            onIframeLoad(
              n2,
              serializedIframeNode
            );
          }
        }
      },
      iframeLoadTimeout
    );
  }
  if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "img" && !n2.complete && serializedNode2.needBlock) {
    const image = n2;
    const updateImageDimensions = () => {
      if (image.isConnected && !image.complete && onBlockedImageLoad) {
        try {
          const rect = image.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            onBlockedImageLoad(image, serializedNode2, rect);
          }
        } catch (error) {
        }
      }
      image.removeEventListener("load", updateImageDimensions);
    };
    if (image.isConnected) {
      image.addEventListener("load", updateImageDimensions);
    }
  }
  if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "link" && typeof serializedNode2.attributes.rel === "string" && (serializedNode2.attributes.rel === "stylesheet" || serializedNode2.attributes.rel === "preload" && typeof serializedNode2.attributes.href === "string" && extractFileExtension(serializedNode2.attributes.href) === "css")) {
    onceStylesheetLoaded(
      n2,
      () => {
        if (onStylesheetLoad) {
          const serializedLinkNode = serializeNodeWithId(n2, {
            doc,
            mirror: mirror2,
            blockClass,
            blockSelector,
            unblockSelector,
            maskAllText,
            maskTextClass,
            unmaskTextClass,
            maskTextSelector,
            unmaskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskAttributeFn,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
            ignoreCSSAttributes
          });
          if (serializedLinkNode) {
            onStylesheetLoad(
              n2,
              serializedLinkNode
            );
          }
        }
      },
      stylesheetLoadTimeout
    );
  }
  if (serializedNode2.type === NodeType$2.Element) {
    delete serializedNode2.needBlock;
  }
  return serializedNode2;
}
function snapshot(n2, options) {
  const {
    mirror: mirror2 = new Mirror(),
    blockClass = "rr-block",
    blockSelector = null,
    unblockSelector = null,
    maskAllText = false,
    maskTextClass = "rr-mask",
    unmaskTextClass = null,
    maskTextSelector = null,
    unmaskTextSelector = null,
    inlineStylesheet = true,
    inlineImages = false,
    recordCanvas = false,
    maskAllInputs = false,
    maskAttributeFn,
    maskTextFn,
    maskInputFn,
    slimDOM = false,
    dataURLOptions,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onBlockedImageLoad,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn = () => false,
    ignoreCSSAttributes = /* @__PURE__ */ new Set([])
  } = options || {};
  const maskInputOptions = maskAllInputs === true ? {
    color: true,
    date: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true,
    textarea: true,
    select: true
  } : maskAllInputs === false ? {} : maskAllInputs;
  const slimDOMOptions = slimDOM === true || slimDOM === "all" ? (
    // if true: set of sensible options that should not throw away any information
    {
      script: true,
      comment: true,
      headFavicon: true,
      headWhitespace: true,
      headMetaDescKeywords: slimDOM === "all",
      // destructive
      headMetaSocial: true,
      headMetaRobots: true,
      headMetaHttpEquiv: true,
      headMetaAuthorship: true,
      headMetaVerification: true
    }
  ) : slimDOM === false ? {} : slimDOM;
  return serializeNodeWithId(n2, {
    doc: n2,
    mirror: mirror2,
    blockClass,
    blockSelector,
    unblockSelector,
    maskAllText,
    maskTextClass,
    unmaskTextClass,
    maskTextSelector,
    unmaskTextSelector,
    skipChild: false,
    inlineStylesheet,
    maskInputOptions,
    maskAttributeFn,
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onBlockedImageLoad,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn,
    newlyAddedElement: false,
    ignoreCSSAttributes
  });
}
function on(type, fn, target = document) {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}
const DEPARTED_MIRROR_ACCESS_WARNING = "Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";
let _mirror = {
  map: {},
  getId() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return -1;
  },
  getNode() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return null;
  },
  removeNodeFromMap() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  },
  has() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return false;
  },
  reset() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  }
};
if (typeof window !== "undefined" && window.Proxy && window.Reflect) {
  _mirror = new Proxy(_mirror, {
    get(target, prop, receiver) {
      if (prop === "map") {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function throttle$1(func, wait, options = {}) {
  let timeout = null;
  let previous = 0;
  return function(...args) {
    const now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    const context = this;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout$2(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout$1(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}
function hookSetter(target, key, d, isRevoked, win = window) {
  const original = win.Object.getOwnPropertyDescriptor(target, key);
  win.Object.defineProperty(
    target,
    key,
    isRevoked ? d : {
      set(value) {
        setTimeout$1(() => {
          d.set.call(this, value);
        }, 0);
        if (original && original.set) {
          original.set.call(this, value);
        }
      }
    }
  );
  return () => hookSetter(target, key, original || {}, true);
}
function patch(source, name, replacement) {
  try {
    if (!(name in source)) {
      return () => {
      };
    }
    const original = source[name];
    const wrapped = replacement(original);
    if (typeof wrapped === "function") {
      wrapped.prototype = wrapped.prototype || {};
      Object.defineProperties(wrapped, {
        __rrweb_original__: {
          enumerable: false,
          value: original
        }
      });
    }
    source[name] = wrapped;
    return () => {
      source[name] = original;
    };
  } catch {
    return () => {
    };
  }
}
let nowTimestamp = Date.now;
if (!/* @__PURE__ */ /[1-9][0-9]{12}/.test(Date.now().toString())) {
  nowTimestamp = () => (/* @__PURE__ */ new Date()).getTime();
}
function getWindowScroll(win) {
  const doc = win.document;
  return {
    left: doc.scrollingElement ? doc.scrollingElement.scrollLeft : win.pageXOffset !== void 0 ? win.pageXOffset : doc?.documentElement.scrollLeft || doc?.body?.parentElement?.scrollLeft || doc?.body?.scrollLeft || 0,
    top: doc.scrollingElement ? doc.scrollingElement.scrollTop : win.pageYOffset !== void 0 ? win.pageYOffset : doc?.documentElement.scrollTop || doc?.body?.parentElement?.scrollTop || doc?.body?.scrollTop || 0
  };
}
function getWindowHeight() {
  return window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body && document.body.clientHeight;
}
function getWindowWidth() {
  return window.innerWidth || document.documentElement && document.documentElement.clientWidth || document.body && document.body.clientWidth;
}
function closestElementOfNode$1(node) {
  if (!node) {
    return null;
  }
  try {
    const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
    return el;
  } catch (error) {
    return null;
  }
}
function isBlocked(node, blockClass, blockSelector, unblockSelector, checkAncestors) {
  if (!node) {
    return false;
  }
  const el = closestElementOfNode$1(node);
  if (!el) {
    return false;
  }
  const blockedPredicate = createMatchPredicate(blockClass, blockSelector);
  if (!checkAncestors) {
    const isUnblocked = unblockSelector && el.matches(unblockSelector);
    return blockedPredicate(el) && !isUnblocked;
  }
  const blockDistance = distanceToMatch(el, blockedPredicate);
  let unblockDistance = -1;
  if (blockDistance < 0) {
    return false;
  }
  if (unblockSelector) {
    unblockDistance = distanceToMatch(
      el,
      createMatchPredicate(null, unblockSelector)
    );
  }
  if (blockDistance > -1 && unblockDistance < 0) {
    return true;
  }
  return blockDistance < unblockDistance;
}
function isSerialized(n2, mirror2) {
  return mirror2.getId(n2) !== -1;
}
function isIgnored(n2, mirror2) {
  return mirror2.getId(n2) === IGNORED_NODE;
}
function isAncestorRemoved(target, mirror2) {
  if (isShadowRoot(target)) {
    return false;
  }
  const id = mirror2.getId(target);
  if (!mirror2.has(id)) {
    return true;
  }
  if (target.parentNode && target.parentNode.nodeType === target.DOCUMENT_NODE) {
    return false;
  }
  if (!target.parentNode) {
    return true;
  }
  return isAncestorRemoved(target.parentNode, mirror2);
}
function legacy_isTouchEvent(event) {
  return Boolean(event.changedTouches);
}
function polyfill$1(win = window) {
  if ("NodeList" in win && !win.NodeList.prototype.forEach) {
    win.NodeList.prototype.forEach = Array.prototype.forEach;
  }
  if ("DOMTokenList" in win && !win.DOMTokenList.prototype.forEach) {
    win.DOMTokenList.prototype.forEach = Array.prototype.forEach;
  }
  if (!Node.prototype.contains) {
    Node.prototype.contains = (...args) => {
      let node = args[0];
      if (!(0 in args)) {
        throw new TypeError("1 argument is required");
      }
      do {
        if (this === node) {
          return true;
        }
      } while (node = node && node.parentNode);
      return false;
    };
  }
}
function isSerializedIframe(n2, mirror2) {
  return Boolean(n2.nodeName === "IFRAME" && mirror2.getMeta(n2));
}
function isSerializedStylesheet(n2, mirror2) {
  return Boolean(
    n2.nodeName === "LINK" && n2.nodeType === n2.ELEMENT_NODE && n2.getAttribute && n2.getAttribute("rel") === "stylesheet" && mirror2.getMeta(n2)
  );
}
function hasShadowRoot(n2) {
  return Boolean(n2?.shadowRoot);
}
class StyleSheetMirror {
  constructor() {
    this.id = 1;
    this.styleIDMap = /* @__PURE__ */ new WeakMap();
    this.idStyleMap = /* @__PURE__ */ new Map();
  }
  getId(stylesheet) {
    return this.styleIDMap.get(stylesheet) ?? -1;
  }
  has(stylesheet) {
    return this.styleIDMap.has(stylesheet);
  }
  /**
   * @returns If the stylesheet is in the mirror, returns the id of the stylesheet. If not, return the new assigned id.
   */
  add(stylesheet, id) {
    if (this.has(stylesheet)) return this.getId(stylesheet);
    let newId;
    if (id === void 0) {
      newId = this.id++;
    } else newId = id;
    this.styleIDMap.set(stylesheet, newId);
    this.idStyleMap.set(newId, stylesheet);
    return newId;
  }
  getStyle(id) {
    return this.idStyleMap.get(id) || null;
  }
  reset() {
    this.styleIDMap = /* @__PURE__ */ new WeakMap();
    this.idStyleMap = /* @__PURE__ */ new Map();
    this.id = 1;
  }
  generateId() {
    return this.id++;
  }
}
function getShadowHost(n2) {
  let shadowHost = null;
  if (n2.getRootNode?.()?.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n2.getRootNode().host)
    shadowHost = n2.getRootNode().host;
  return shadowHost;
}
function getRootShadowHost(n2) {
  let rootShadowHost = n2;
  let shadowHost;
  while (shadowHost = getShadowHost(rootShadowHost))
    rootShadowHost = shadowHost;
  return rootShadowHost;
}
function shadowHostInDom(n2) {
  const doc = n2.ownerDocument;
  if (!doc) return false;
  const shadowHost = getRootShadowHost(n2);
  return doc.contains(shadowHost);
}
function inDom(n2) {
  const doc = n2.ownerDocument;
  if (!doc) return false;
  return doc.contains(n2) || shadowHostInDom(n2);
}
const cachedImplementations = {};
function getImplementation(name) {
  const cached = cachedImplementations[name];
  if (cached) {
    return cached;
  }
  const document2 = window.document;
  let impl = window[name];
  if (document2 && typeof document2.createElement === "function") {
    try {
      const sandbox = document2.createElement("iframe");
      sandbox.hidden = true;
      document2.head.appendChild(sandbox);
      const contentWindow = sandbox.contentWindow;
      if (contentWindow && contentWindow[name]) {
        impl = // eslint-disable-next-line @typescript-eslint/unbound-method
        contentWindow[name];
      }
      document2.head.removeChild(sandbox);
    } catch (e2) {
    }
  }
  return cachedImplementations[name] = impl.bind(
    window
  );
}
function onRequestAnimationFrame(...rest) {
  return getImplementation("requestAnimationFrame")(...rest);
}
function setTimeout$1(...rest) {
  return getImplementation("setTimeout")(...rest);
}
function clearTimeout$2(...rest) {
  return getImplementation("clearTimeout")(...rest);
}
var EventType = /* @__PURE__ */ ((EventType2) => {
  EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
  EventType2[EventType2["Load"] = 1] = "Load";
  EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
  EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
  EventType2[EventType2["Meta"] = 4] = "Meta";
  EventType2[EventType2["Custom"] = 5] = "Custom";
  EventType2[EventType2["Plugin"] = 6] = "Plugin";
  return EventType2;
})(EventType || {});
var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
  IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
  IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
  IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
  IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
  IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
  IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
  IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
  IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
  IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
  IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
  IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
  IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
  IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
  IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
  IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
  IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
  IncrementalSource2[IncrementalSource2["CustomElement"] = 16] = "CustomElement";
  return IncrementalSource2;
})(IncrementalSource || {});
var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
  MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
  MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
  MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
  MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
  MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
  MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
  MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
  MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
  MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
  MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
  MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
  return MouseInteractions2;
})(MouseInteractions || {});
var PointerTypes = /* @__PURE__ */ ((PointerTypes2) => {
  PointerTypes2[PointerTypes2["Mouse"] = 0] = "Mouse";
  PointerTypes2[PointerTypes2["Pen"] = 1] = "Pen";
  PointerTypes2[PointerTypes2["Touch"] = 2] = "Touch";
  return PointerTypes2;
})(PointerTypes || {});
var MediaInteractions = /* @__PURE__ */ ((MediaInteractions2) => {
  MediaInteractions2[MediaInteractions2["Play"] = 0] = "Play";
  MediaInteractions2[MediaInteractions2["Pause"] = 1] = "Pause";
  MediaInteractions2[MediaInteractions2["Seeked"] = 2] = "Seeked";
  MediaInteractions2[MediaInteractions2["VolumeChange"] = 3] = "VolumeChange";
  MediaInteractions2[MediaInteractions2["RateChange"] = 4] = "RateChange";
  return MediaInteractions2;
})(MediaInteractions || {});
function getIFrameContentDocument(iframe) {
  try {
    return iframe.contentDocument;
  } catch (e2) {
  }
}
function getIFrameContentWindow(iframe) {
  try {
    return iframe.contentWindow;
  } catch (e2) {
  }
}
function isNodeInLinkedList(n2) {
  return "__ln" in n2;
}
class DoubleLinkedList {
  constructor() {
    this.length = 0;
    this.head = null;
    this.tail = null;
  }
  get(position) {
    if (position >= this.length) {
      throw new Error("Position outside of list range");
    }
    let current = this.head;
    for (let index = 0; index < position; index++) {
      current = current?.next || null;
    }
    return current;
  }
  addNode(n2) {
    const node = {
      value: n2,
      previous: null,
      next: null
    };
    n2.__ln = node;
    if (n2.previousSibling && isNodeInLinkedList(n2.previousSibling)) {
      const current = n2.previousSibling.__ln.next;
      node.next = current;
      node.previous = n2.previousSibling.__ln;
      n2.previousSibling.__ln.next = node;
      if (current) {
        current.previous = node;
      }
    } else if (n2.nextSibling && isNodeInLinkedList(n2.nextSibling) && n2.nextSibling.__ln.previous) {
      const current = n2.nextSibling.__ln.previous;
      node.previous = current;
      node.next = n2.nextSibling.__ln;
      n2.nextSibling.__ln.previous = node;
      if (current) {
        current.next = node;
      }
    } else {
      if (this.head) {
        this.head.previous = node;
      }
      node.next = this.head;
      this.head = node;
    }
    if (node.next === null) {
      this.tail = node;
    }
    this.length++;
  }
  removeNode(n2) {
    const current = n2.__ln;
    if (!this.head) {
      return;
    }
    if (!current.previous) {
      this.head = current.next;
      if (this.head) {
        this.head.previous = null;
      } else {
        this.tail = null;
      }
    } else {
      current.previous.next = current.next;
      if (current.next) {
        current.next.previous = current.previous;
      } else {
        this.tail = current.previous;
      }
    }
    if (n2.__ln) {
      delete n2.__ln;
    }
    this.length--;
  }
}
const moveKey = (id, parentId) => `${id}@${parentId}`;
class MutationBuffer {
  constructor() {
    this.frozen = false;
    this.locked = false;
    this.texts = [];
    this.attributes = [];
    this.attributeMap = /* @__PURE__ */ new WeakMap();
    this.removes = [];
    this.mapRemoves = [];
    this.movedMap = {};
    this.addedSet = /* @__PURE__ */ new Set();
    this.movedSet = /* @__PURE__ */ new Set();
    this.droppedSet = /* @__PURE__ */ new Set();
    this.processMutations = (mutations) => {
      mutations.forEach(this.processMutation);
      this.emit();
    };
    this.emit = () => {
      if (this.frozen || this.locked) {
        return;
      }
      const adds = [];
      const addedIds = /* @__PURE__ */ new Set();
      const addList = new DoubleLinkedList();
      const getNextId = (n2) => {
        let ns = n2;
        let nextId = IGNORED_NODE;
        while (nextId === IGNORED_NODE) {
          ns = ns && ns.nextSibling;
          nextId = ns && this.mirror.getId(ns);
        }
        return nextId;
      };
      const pushAdd = (n2) => {
        if (!n2.parentNode || !inDom(n2)) {
          return;
        }
        const parentId = isShadowRoot(n2.parentNode) ? this.mirror.getId(getShadowHost(n2)) : this.mirror.getId(n2.parentNode);
        const nextId = getNextId(n2);
        if (parentId === -1 || nextId === -1) {
          return addList.addNode(n2);
        }
        const sn = serializeNodeWithId(n2, {
          doc: this.doc,
          mirror: this.mirror,
          blockClass: this.blockClass,
          blockSelector: this.blockSelector,
          maskAllText: this.maskAllText,
          unblockSelector: this.unblockSelector,
          maskTextClass: this.maskTextClass,
          unmaskTextClass: this.unmaskTextClass,
          maskTextSelector: this.maskTextSelector,
          unmaskTextSelector: this.unmaskTextSelector,
          skipChild: true,
          newlyAddedElement: true,
          inlineStylesheet: this.inlineStylesheet,
          maskInputOptions: this.maskInputOptions,
          maskAttributeFn: this.maskAttributeFn,
          maskTextFn: this.maskTextFn,
          maskInputFn: this.maskInputFn,
          slimDOMOptions: this.slimDOMOptions,
          dataURLOptions: this.dataURLOptions,
          recordCanvas: this.recordCanvas,
          inlineImages: this.inlineImages,
          onSerialize: (currentN) => {
            if (isSerializedIframe(currentN, this.mirror) && !isBlocked(
              currentN,
              this.blockClass,
              this.blockSelector,
              this.unblockSelector,
              false
            )) {
              this.iframeManager.addIframe(currentN);
            }
            if (isSerializedStylesheet(currentN, this.mirror)) {
              this.stylesheetManager.trackLinkElement(
                currentN
              );
            }
            if (hasShadowRoot(n2)) {
              this.shadowDomManager.addShadowRoot(n2.shadowRoot, this.doc);
            }
          },
          onIframeLoad: (iframe, childSn) => {
            if (isBlocked(
              iframe,
              this.blockClass,
              this.blockSelector,
              this.unblockSelector,
              false
            )) {
              return;
            }
            this.iframeManager.attachIframe(iframe, childSn);
            if (iframe.contentWindow) {
              this.canvasManager.addWindow(iframe.contentWindow);
            }
            this.shadowDomManager.observeAttachShadow(iframe);
          },
          onStylesheetLoad: (link, childSn) => {
            this.stylesheetManager.attachLinkElement(link, childSn);
          },
          onBlockedImageLoad: (_imageEl, serializedNode, { width, height }) => {
            this.mutationCb({
              adds: [],
              removes: [],
              texts: [],
              attributes: [
                {
                  id: serializedNode.id,
                  attributes: {
                    style: {
                      width: `${width}px`,
                      height: `${height}px`
                    }
                  }
                }
              ]
            });
          },
          ignoreCSSAttributes: this.ignoreCSSAttributes
        });
        if (sn) {
          adds.push({
            parentId,
            nextId,
            node: sn
          });
          addedIds.add(sn.id);
        }
      };
      while (this.mapRemoves.length) {
        this.mirror.removeNodeFromMap(this.mapRemoves.shift());
      }
      for (const n2 of this.movedSet) {
        if (isParentRemoved(this.removes, n2, this.mirror) && !this.movedSet.has(n2.parentNode)) {
          continue;
        }
        pushAdd(n2);
      }
      for (const n2 of this.addedSet) {
        if (!isAncestorInSet(this.droppedSet, n2) && !isParentRemoved(this.removes, n2, this.mirror)) {
          pushAdd(n2);
        } else if (isAncestorInSet(this.movedSet, n2)) {
          pushAdd(n2);
        } else {
          this.droppedSet.add(n2);
        }
      }
      let candidate = null;
      while (addList.length) {
        let node = null;
        if (candidate) {
          const parentId = this.mirror.getId(candidate.value.parentNode);
          const nextId = getNextId(candidate.value);
          if (parentId !== -1 && nextId !== -1) {
            node = candidate;
          }
        }
        if (!node) {
          let tailNode = addList.tail;
          while (tailNode) {
            const _node = tailNode;
            tailNode = tailNode.previous;
            if (_node) {
              const parentId = this.mirror.getId(_node.value.parentNode);
              const nextId = getNextId(_node.value);
              if (nextId === -1) continue;
              else if (parentId !== -1) {
                node = _node;
                break;
              } else {
                const unhandledNode = _node.value;
                if (unhandledNode.parentNode && unhandledNode.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                  const shadowHost = unhandledNode.parentNode.host;
                  const parentId2 = this.mirror.getId(shadowHost);
                  if (parentId2 !== -1) {
                    node = _node;
                    break;
                  }
                }
              }
            }
          }
        }
        if (!node) {
          while (addList.head) {
            addList.removeNode(addList.head.value);
          }
          break;
        }
        candidate = node.previous;
        addList.removeNode(node.value);
        pushAdd(node.value);
      }
      const payload = {
        texts: this.texts.map((text) => ({
          id: this.mirror.getId(text.node),
          value: text.value
        })).filter((text) => !addedIds.has(text.id)).filter((text) => this.mirror.has(text.id)),
        attributes: this.attributes.map((attribute) => {
          const { attributes } = attribute;
          if (typeof attributes.style === "string") {
            const diffAsStr = JSON.stringify(attribute.styleDiff);
            const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
            if (diffAsStr.length < attributes.style.length) {
              if ((diffAsStr + unchangedAsStr).split("var(").length === attributes.style.split("var(").length) {
                attributes.style = attribute.styleDiff;
              }
            }
          }
          return {
            id: this.mirror.getId(attribute.node),
            attributes
          };
        }).filter((attribute) => !addedIds.has(attribute.id)).filter((attribute) => this.mirror.has(attribute.id)),
        removes: this.removes,
        adds
      };
      if (!payload.texts.length && !payload.attributes.length && !payload.removes.length && !payload.adds.length) {
        return;
      }
      this.texts = [];
      this.attributes = [];
      this.attributeMap = /* @__PURE__ */ new WeakMap();
      this.removes = [];
      this.addedSet = /* @__PURE__ */ new Set();
      this.movedSet = /* @__PURE__ */ new Set();
      this.droppedSet = /* @__PURE__ */ new Set();
      this.movedMap = {};
      this.mutationCb(payload);
    };
    this.processMutation = (m) => {
      if (isIgnored(m.target, this.mirror)) {
        return;
      }
      switch (m.type) {
        case "characterData": {
          const value = m.target.textContent;
          if (!isBlocked(
            m.target,
            this.blockClass,
            this.blockSelector,
            this.unblockSelector,
            false
          ) && value !== m.oldValue) {
            this.texts.push({
              value: needMaskingText(
                m.target,
                this.maskTextClass,
                this.maskTextSelector,
                this.unmaskTextClass,
                this.unmaskTextSelector,
                this.maskAllText
              ) && value ? this.maskTextFn ? this.maskTextFn(value, closestElementOfNode$1(m.target)) : value.replace(/[\S]/g, "*") : value,
              node: m.target
            });
          }
          break;
        }
        case "attributes": {
          const target = m.target;
          let attributeName = m.attributeName;
          let value = m.target.getAttribute(attributeName);
          if (attributeName === "value") {
            const type = getInputType(target);
            const tagName = target.tagName;
            value = getInputValue(target, tagName, type);
            const isInputMasked = shouldMaskInput({
              maskInputOptions: this.maskInputOptions,
              tagName,
              type
            });
            const forceMask = needMaskingText(
              m.target,
              this.maskTextClass,
              this.maskTextSelector,
              this.unmaskTextClass,
              this.unmaskTextSelector,
              isInputMasked
            );
            value = maskInputValue({
              isMasked: forceMask,
              element: target,
              value,
              maskInputFn: this.maskInputFn
            });
          }
          if (isBlocked(
            m.target,
            this.blockClass,
            this.blockSelector,
            this.unblockSelector,
            false
          ) || value === m.oldValue) {
            return;
          }
          let item = this.attributeMap.get(m.target);
          if (target.tagName === "IFRAME" && attributeName === "src" && !this.keepIframeSrcFn(value)) {
            const iframeDoc = getIFrameContentDocument(
              target
            );
            if (!iframeDoc) {
              attributeName = "rr_src";
            } else {
              return;
            }
          }
          if (!item) {
            item = {
              node: m.target,
              attributes: {},
              styleDiff: {},
              _unchangedStyles: {}
            };
            this.attributes.push(item);
            this.attributeMap.set(m.target, item);
          }
          if (attributeName === "type" && target.tagName === "INPUT" && (m.oldValue || "").toLowerCase() === "password") {
            target.setAttribute("data-rr-is-password", "true");
          }
          if (!ignoreAttribute(target.tagName, attributeName)) {
            item.attributes[attributeName] = transformAttribute(
              this.doc,
              toLowerCase(target.tagName),
              toLowerCase(attributeName),
              value,
              target,
              this.maskAttributeFn
            );
            if (attributeName === "style") {
              if (!this.unattachedDoc) {
                try {
                  this.unattachedDoc = document.implementation.createHTMLDocument();
                } catch (e2) {
                  this.unattachedDoc = this.doc;
                }
              }
              const old = this.unattachedDoc.createElement("span");
              if (m.oldValue) {
                old.setAttribute("style", m.oldValue);
              }
              for (const pname of Array.from(target.style)) {
                const newValue = target.style.getPropertyValue(pname);
                const newPriority = target.style.getPropertyPriority(pname);
                if (newValue !== old.style.getPropertyValue(pname) || newPriority !== old.style.getPropertyPriority(pname)) {
                  if (newPriority === "") {
                    item.styleDiff[pname] = newValue;
                  } else {
                    item.styleDiff[pname] = [newValue, newPriority];
                  }
                } else {
                  item._unchangedStyles[pname] = [newValue, newPriority];
                }
              }
              for (const pname of Array.from(old.style)) {
                if (target.style.getPropertyValue(pname) === "") {
                  item.styleDiff[pname] = false;
                }
              }
            }
          }
          break;
        }
        case "childList": {
          if (isBlocked(
            m.target,
            this.blockClass,
            this.blockSelector,
            this.unblockSelector,
            true
          )) {
            return;
          }
          m.addedNodes.forEach((n2) => this.genAdds(n2, m.target));
          m.removedNodes.forEach((n2) => {
            const nodeId = this.mirror.getId(n2);
            const parentId = isShadowRoot(m.target) ? this.mirror.getId(m.target.host) : this.mirror.getId(m.target);
            if (isBlocked(
              m.target,
              this.blockClass,
              this.blockSelector,
              this.unblockSelector,
              false
            ) || isIgnored(n2, this.mirror) || !isSerialized(n2, this.mirror)) {
              return;
            }
            if (this.addedSet.has(n2)) {
              deepDelete(this.addedSet, n2);
              this.droppedSet.add(n2);
            } else if (this.addedSet.has(m.target) && nodeId === -1) ;
            else if (isAncestorRemoved(m.target, this.mirror)) ;
            else if (this.movedSet.has(n2) && this.movedMap[moveKey(nodeId, parentId)]) {
              deepDelete(this.movedSet, n2);
            } else {
              this.removes.push({
                parentId,
                id: nodeId,
                isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target) ? true : void 0
              });
            }
            this.mapRemoves.push(n2);
          });
          break;
        }
      }
    };
    this.genAdds = (n2, target) => {
      if (this.processedNodeManager.inOtherBuffer(n2, this)) return;
      if (this.addedSet.has(n2) || this.movedSet.has(n2)) return;
      if (this.mirror.hasNode(n2)) {
        if (isIgnored(n2, this.mirror)) {
          return;
        }
        this.movedSet.add(n2);
        let targetId = null;
        if (target && this.mirror.hasNode(target)) {
          targetId = this.mirror.getId(target);
        }
        if (targetId && targetId !== -1) {
          this.movedMap[moveKey(this.mirror.getId(n2), targetId)] = true;
        }
      } else {
        this.addedSet.add(n2);
        this.droppedSet.delete(n2);
      }
      if (!isBlocked(
        n2,
        this.blockClass,
        this.blockSelector,
        this.unblockSelector,
        false
      )) {
        if (n2.childNodes) {
          n2.childNodes.forEach((childN) => this.genAdds(childN));
        }
        if (hasShadowRoot(n2)) {
          n2.shadowRoot.childNodes.forEach((childN) => {
            this.processedNodeManager.add(childN, this);
            this.genAdds(childN, n2);
          });
        }
      }
    };
  }
  init(options) {
    [
      "mutationCb",
      "blockClass",
      "blockSelector",
      "unblockSelector",
      "maskAllText",
      "maskTextClass",
      "unmaskTextClass",
      "maskTextSelector",
      "unmaskTextSelector",
      "inlineStylesheet",
      "maskInputOptions",
      "maskAttributeFn",
      "maskTextFn",
      "maskInputFn",
      "keepIframeSrcFn",
      "recordCanvas",
      "inlineImages",
      "slimDOMOptions",
      "dataURLOptions",
      "doc",
      "mirror",
      "iframeManager",
      "stylesheetManager",
      "shadowDomManager",
      "canvasManager",
      "processedNodeManager",
      "ignoreCSSAttributes"
    ].forEach((key) => {
      this[key] = options[key];
    });
  }
  freeze() {
    this.frozen = true;
    this.canvasManager.freeze();
  }
  unfreeze() {
    this.frozen = false;
    this.canvasManager.unfreeze();
    this.emit();
  }
  isFrozen() {
    return this.frozen;
  }
  lock() {
    this.locked = true;
    this.canvasManager.lock();
  }
  unlock() {
    this.locked = false;
    this.canvasManager.unlock();
    this.emit();
  }
  reset() {
    this.shadowDomManager.reset();
    this.canvasManager.reset();
  }
}
function deepDelete(addsSet, n2) {
  addsSet.delete(n2);
  n2.childNodes?.forEach((childN) => deepDelete(addsSet, childN));
}
function isParentRemoved(removes, n2, mirror2) {
  if (removes.length === 0) return false;
  return _isParentRemoved(removes, n2, mirror2);
}
function _isParentRemoved(removes, n2, mirror2) {
  let node = n2.parentNode;
  while (node) {
    const parentId = mirror2.getId(node);
    if (removes.some((r2) => r2.id === parentId)) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}
function isAncestorInSet(set, n2) {
  if (set.size === 0) return false;
  return _isAncestorInSet(set, n2);
}
function _isAncestorInSet(set, n2) {
  const { parentNode } = n2;
  if (!parentNode) {
    return false;
  }
  if (set.has(parentNode)) {
    return true;
  }
  return _isAncestorInSet(set, parentNode);
}
let errorHandler;
function registerErrorHandler(handler) {
  errorHandler = handler;
}
function unregisterErrorHandler() {
  errorHandler = void 0;
}
const callbackWrapper = (cb) => {
  if (!errorHandler) {
    return cb;
  }
  const rrwebWrapped = (...rest) => {
    try {
      return cb(...rest);
    } catch (error) {
      if (errorHandler && errorHandler(error) === true) {
        return () => {
        };
      }
      throw error;
    }
  };
  return rrwebWrapped;
};
const mutationBuffers = [];
function getEventTarget(event) {
  try {
    if ("composedPath" in event) {
      const path = event.composedPath();
      if (path.length) {
        return path[0];
      }
    } else if ("path" in event && event.path.length) {
      return event.path[0];
    }
  } catch {
  }
  return event && event.target;
}
function initMutationObserver(options, rootEl) {
  const mutationBuffer = new MutationBuffer();
  mutationBuffers.push(mutationBuffer);
  mutationBuffer.init(options);
  let mutationObserverCtor = window.MutationObserver || /**
  * Some websites may disable MutationObserver by removing it from the window object.
  * If someone is using rrweb to build a browser extention or things like it, they
  * could not change the website's code but can have an opportunity to inject some
  * code before the website executing its JS logic.
  * Then they can do this to store the native MutationObserver:
  * window.__rrMutationObserver = MutationObserver
  */
  window.__rrMutationObserver;
  const angularZoneSymbol = window?.Zone?.__symbol__?.("MutationObserver");
  if (angularZoneSymbol && window[angularZoneSymbol]) {
    mutationObserverCtor = window[angularZoneSymbol];
  }
  const observer = new mutationObserverCtor(
    callbackWrapper((mutations) => {
      if (options.onMutation && options.onMutation(mutations) === false) {
        return;
      }
      mutationBuffer.processMutations.bind(mutationBuffer)(mutations);
    })
  );
  observer.observe(rootEl, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true
  });
  return observer;
}
function initMoveObserver({
  mousemoveCb,
  sampling,
  doc,
  mirror: mirror2
}) {
  if (sampling.mousemove === false) {
    return () => {
    };
  }
  const threshold = typeof sampling.mousemove === "number" ? sampling.mousemove : 50;
  const callbackThreshold = typeof sampling.mousemoveCallback === "number" ? sampling.mousemoveCallback : 500;
  let positions = [];
  let timeBaseline;
  const wrappedCb = throttle$1(
    callbackWrapper(
      (source) => {
        const totalOffset = Date.now() - timeBaseline;
        mousemoveCb(
          positions.map((p) => {
            p.timeOffset -= totalOffset;
            return p;
          }),
          source
        );
        positions = [];
        timeBaseline = null;
      }
    ),
    callbackThreshold
  );
  const updatePosition = callbackWrapper(
    throttle$1(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        const { clientX, clientY } = legacy_isTouchEvent(evt) ? evt.changedTouches[0] : evt;
        if (!timeBaseline) {
          timeBaseline = nowTimestamp();
        }
        positions.push({
          x: clientX,
          y: clientY,
          id: mirror2.getId(target),
          timeOffset: nowTimestamp() - timeBaseline
        });
        wrappedCb(
          typeof DragEvent !== "undefined" && evt instanceof DragEvent ? IncrementalSource.Drag : evt instanceof MouseEvent ? IncrementalSource.MouseMove : IncrementalSource.TouchMove
        );
      }),
      threshold,
      {
        trailing: false
      }
    )
  );
  const handlers = [
    on("mousemove", updatePosition, doc),
    on("touchmove", updatePosition, doc),
    on("drag", updatePosition, doc)
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initMouseInteractionObserver({
  mouseInteractionCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  unblockSelector,
  sampling
}) {
  if (sampling.mouseInteraction === false) {
    return () => {
    };
  }
  const disableMap = sampling.mouseInteraction === true || sampling.mouseInteraction === void 0 ? {} : sampling.mouseInteraction;
  const handlers = [];
  let currentPointerType = null;
  const getHandler = (eventKey) => {
    return (event) => {
      const target = getEventTarget(event);
      if (isBlocked(target, blockClass, blockSelector, unblockSelector, true)) {
        return;
      }
      let pointerType = null;
      let thisEventKey = eventKey;
      if ("pointerType" in event) {
        switch (event.pointerType) {
          case "mouse":
            pointerType = PointerTypes.Mouse;
            break;
          case "touch":
            pointerType = PointerTypes.Touch;
            break;
          case "pen":
            pointerType = PointerTypes.Pen;
            break;
        }
        if (pointerType === PointerTypes.Touch) {
          if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) {
            thisEventKey = "TouchStart";
          } else if (MouseInteractions[eventKey] === MouseInteractions.MouseUp) {
            thisEventKey = "TouchEnd";
          }
        } else if (pointerType === PointerTypes.Pen) ;
      } else if (legacy_isTouchEvent(event)) {
        pointerType = PointerTypes.Touch;
      }
      if (pointerType !== null) {
        currentPointerType = pointerType;
        if (thisEventKey.startsWith("Touch") && pointerType === PointerTypes.Touch || thisEventKey.startsWith("Mouse") && pointerType === PointerTypes.Mouse) {
          pointerType = null;
        }
      } else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
        pointerType = currentPointerType;
        currentPointerType = null;
      }
      const e2 = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
      if (!e2) {
        return;
      }
      const id = mirror2.getId(target);
      const { clientX, clientY } = e2;
      callbackWrapper(mouseInteractionCb)({
        type: MouseInteractions[thisEventKey],
        id,
        x: clientX,
        y: clientY,
        ...pointerType !== null && { pointerType }
      });
    };
  };
  Object.keys(MouseInteractions).filter(
    (key) => Number.isNaN(Number(key)) && !key.endsWith("_Departed") && disableMap[key] !== false
  ).forEach((eventKey) => {
    let eventName = toLowerCase(eventKey);
    const handler = getHandler(eventKey);
    if (window.PointerEvent) {
      switch (MouseInteractions[eventKey]) {
        case MouseInteractions.MouseDown:
        case MouseInteractions.MouseUp:
          eventName = eventName.replace(
            "mouse",
            "pointer"
          );
          break;
        case MouseInteractions.TouchStart:
        case MouseInteractions.TouchEnd:
          return;
      }
    }
    handlers.push(on(eventName, handler, doc));
  });
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initScrollObserver({
  scrollCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  unblockSelector,
  sampling
}) {
  const updatePosition = callbackWrapper(
    throttle$1(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        if (!target || isBlocked(
          target,
          blockClass,
          blockSelector,
          unblockSelector,
          true
        )) {
          return;
        }
        const id = mirror2.getId(target);
        if (target === doc && doc.defaultView) {
          const scrollLeftTop = getWindowScroll(doc.defaultView);
          scrollCb({
            id,
            x: scrollLeftTop.left,
            y: scrollLeftTop.top
          });
        } else {
          scrollCb({
            id,
            x: target.scrollLeft,
            y: target.scrollTop
          });
        }
      }),
      sampling.scroll || 100
    )
  );
  return on("scroll", updatePosition, doc);
}
function initViewportResizeObserver({ viewportResizeCb }, { win }) {
  let lastH = -1;
  let lastW = -1;
  const updateDimension = callbackWrapper(
    throttle$1(
      callbackWrapper(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
          viewportResizeCb({
            width: Number(width),
            height: Number(height)
          });
          lastH = height;
          lastW = width;
        }
      }),
      200
    )
  );
  return on("resize", updateDimension, win);
}
const INPUT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
const lastInputValueMap = /* @__PURE__ */ new WeakMap();
function initInputObserver({
  inputCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  unblockSelector,
  ignoreClass,
  ignoreSelector,
  maskInputOptions,
  maskInputFn,
  sampling,
  userTriggeredOnInput,
  maskTextClass,
  unmaskTextClass,
  maskTextSelector,
  unmaskTextSelector
}) {
  function eventHandler(event) {
    let target = getEventTarget(event);
    const userTriggered = event.isTrusted;
    const tagName = target && toUpperCase(target.tagName);
    if (tagName === "OPTION") target = target.parentElement;
    if (!target || !tagName || INPUT_TAGS.indexOf(tagName) < 0 || isBlocked(
      target,
      blockClass,
      blockSelector,
      unblockSelector,
      true
    )) {
      return;
    }
    const el = target;
    if (el.classList.contains(ignoreClass) || ignoreSelector && el.matches(ignoreSelector)) {
      return;
    }
    const type = getInputType(target);
    let text = getInputValue(el, tagName, type);
    let isChecked = false;
    const isInputMasked = shouldMaskInput({
      maskInputOptions,
      tagName,
      type
    });
    const forceMask = needMaskingText(
      target,
      maskTextClass,
      maskTextSelector,
      unmaskTextClass,
      unmaskTextSelector,
      isInputMasked
    );
    if (type === "radio" || type === "checkbox") {
      isChecked = target.checked;
    }
    text = maskInputValue({
      isMasked: forceMask,
      element: target,
      value: text,
      maskInputFn
    });
    cbWithDedup(
      target,
      userTriggeredOnInput ? { text, isChecked, userTriggered } : { text, isChecked }
    );
    const name = target.name;
    if (type === "radio" && name && isChecked) {
      doc.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((el2) => {
        if (el2 !== target) {
          const text2 = maskInputValue({
            // share mask behavior of `target`
            isMasked: forceMask,
            element: el2,
            value: getInputValue(el2, tagName, type),
            maskInputFn
          });
          cbWithDedup(
            el2,
            userTriggeredOnInput ? { text: text2, isChecked: !isChecked, userTriggered: false } : { text: text2, isChecked: !isChecked }
          );
        }
      });
    }
  }
  function cbWithDedup(target, v2) {
    const lastInputValue = lastInputValueMap.get(target);
    if (!lastInputValue || lastInputValue.text !== v2.text || lastInputValue.isChecked !== v2.isChecked) {
      lastInputValueMap.set(target, v2);
      const id = mirror2.getId(target);
      callbackWrapper(inputCb)({
        ...v2,
        id
      });
    }
  }
  const events = sampling.input === "last" ? ["change"] : ["input", "change"];
  const handlers = events.map(
    (eventName) => on(eventName, callbackWrapper(eventHandler), doc)
  );
  const currentWindow = doc.defaultView;
  if (!currentWindow) {
    return () => {
      handlers.forEach((h) => h());
    };
  }
  const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(
    currentWindow.HTMLInputElement.prototype,
    "value"
  );
  const hookProperties = [
    [currentWindow.HTMLInputElement.prototype, "value"],
    [currentWindow.HTMLInputElement.prototype, "checked"],
    [currentWindow.HTMLSelectElement.prototype, "value"],
    [currentWindow.HTMLTextAreaElement.prototype, "value"],
    // Some UI library use selectedIndex to set select value
    [currentWindow.HTMLSelectElement.prototype, "selectedIndex"],
    [currentWindow.HTMLOptionElement.prototype, "selected"]
  ];
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map(
        (p) => hookSetter(
          p[0],
          p[1],
          {
            set() {
              callbackWrapper(eventHandler)({
                target: this,
                isTrusted: false
                // userTriggered to false as this could well be programmatic
              });
            }
          },
          false,
          currentWindow
        )
      )
    );
  }
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function getNestedCSSRulePositions(rule) {
  const positions = [];
  function recurse(childRule, pos) {
    if (hasNestedCSSRule("CSSGroupingRule") && childRule.parentRule instanceof CSSGroupingRule || hasNestedCSSRule("CSSMediaRule") && childRule.parentRule instanceof CSSMediaRule || hasNestedCSSRule("CSSSupportsRule") && childRule.parentRule instanceof CSSSupportsRule || hasNestedCSSRule("CSSConditionRule") && childRule.parentRule instanceof CSSConditionRule) {
      const rules2 = Array.from(
        childRule.parentRule.cssRules
      );
      const index = rules2.indexOf(childRule);
      pos.unshift(index);
    } else if (childRule.parentStyleSheet) {
      const rules2 = Array.from(childRule.parentStyleSheet.cssRules);
      const index = rules2.indexOf(childRule);
      pos.unshift(index);
    }
    return pos;
  }
  return recurse(rule, positions);
}
function getIdAndStyleId(sheet, mirror2, styleMirror) {
  let id, styleId;
  if (!sheet) return {};
  if (sheet.ownerNode) id = mirror2.getId(sheet.ownerNode);
  else styleId = styleMirror.getId(sheet);
  return {
    styleId,
    id
  };
}
function initStyleSheetObserver({ styleSheetRuleCb, mirror: mirror2, stylesheetManager }, { win }) {
  if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) {
    return () => {
    };
  }
  const insertRule = win.CSSStyleSheet.prototype.insertRule;
  win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [rule, index] = argumentsList;
        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            adds: [{ rule, index }]
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
  win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [index] = argumentsList;
        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            removes: [{ index }]
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  let replace;
  if (win.CSSStyleSheet.prototype.replace) {
    replace = win.CSSStyleSheet.prototype.replace;
    win.CSSStyleSheet.prototype.replace = new Proxy(replace, {
      apply: callbackWrapper(
        (target, thisArg, argumentsList) => {
          const [text] = argumentsList;
          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror2,
            stylesheetManager.styleMirror
          );
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replace: text
            });
          }
          return target.apply(thisArg, argumentsList);
        }
      )
    });
  }
  let replaceSync;
  if (win.CSSStyleSheet.prototype.replaceSync) {
    replaceSync = win.CSSStyleSheet.prototype.replaceSync;
    win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, {
      apply: callbackWrapper(
        (target, thisArg, argumentsList) => {
          const [text] = argumentsList;
          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror2,
            stylesheetManager.styleMirror
          );
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replaceSync: text
            });
          }
          return target.apply(thisArg, argumentsList);
        }
      )
    });
  }
  const supportedNestedCSSRuleTypes = {};
  if (canMonkeyPatchNestedCSSRule("CSSGroupingRule")) {
    supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
  } else {
    if (canMonkeyPatchNestedCSSRule("CSSMediaRule")) {
      supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
    }
    if (canMonkeyPatchNestedCSSRule("CSSConditionRule")) {
      supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
    }
    if (canMonkeyPatchNestedCSSRule("CSSSupportsRule")) {
      supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
    }
  }
  const unmodifiedFunctions = {};
  Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
    unmodifiedFunctions[typeKey] = {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      insertRule: type.prototype.insertRule,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      deleteRule: type.prototype.deleteRule
    };
    type.prototype.insertRule = new Proxy(
      unmodifiedFunctions[typeKey].insertRule,
      {
        apply: callbackWrapper(
          (target, thisArg, argumentsList) => {
            const [rule, index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror2,
              stylesheetManager.styleMirror
            );
            if (id && id !== -1 || styleId && styleId !== -1) {
              styleSheetRuleCb({
                id,
                styleId,
                adds: [
                  {
                    rule,
                    index: [
                      ...getNestedCSSRulePositions(thisArg),
                      index || 0
                      // defaults to 0
                    ]
                  }
                ]
              });
            }
            return target.apply(thisArg, argumentsList);
          }
        )
      }
    );
    type.prototype.deleteRule = new Proxy(
      unmodifiedFunctions[typeKey].deleteRule,
      {
        apply: callbackWrapper(
          (target, thisArg, argumentsList) => {
            const [index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror2,
              stylesheetManager.styleMirror
            );
            if (id && id !== -1 || styleId && styleId !== -1) {
              styleSheetRuleCb({
                id,
                styleId,
                removes: [
                  { index: [...getNestedCSSRulePositions(thisArg), index] }
                ]
              });
            }
            return target.apply(thisArg, argumentsList);
          }
        )
      }
    );
  });
  return callbackWrapper(() => {
    win.CSSStyleSheet.prototype.insertRule = insertRule;
    win.CSSStyleSheet.prototype.deleteRule = deleteRule;
    replace && (win.CSSStyleSheet.prototype.replace = replace);
    replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
    Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
      type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
      type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
    });
  });
}
function initAdoptedStyleSheetObserver({
  mirror: mirror2,
  stylesheetManager
}, host) {
  let hostId = null;
  if (host.nodeName === "#document") hostId = mirror2.getId(host);
  else hostId = mirror2.getId(host.host);
  const patchTarget = host.nodeName === "#document" ? host.defaultView?.Document : host.ownerDocument?.defaultView?.ShadowRoot;
  const originalPropertyDescriptor = patchTarget?.prototype ? Object.getOwnPropertyDescriptor(
    patchTarget?.prototype,
    "adoptedStyleSheets"
  ) : void 0;
  if (hostId === null || hostId === -1 || !patchTarget || !originalPropertyDescriptor)
    return () => {
    };
  Object.defineProperty(host, "adoptedStyleSheets", {
    configurable: originalPropertyDescriptor.configurable,
    enumerable: originalPropertyDescriptor.enumerable,
    get() {
      return originalPropertyDescriptor.get?.call(this);
    },
    set(sheets) {
      const result = originalPropertyDescriptor.set?.call(this, sheets);
      if (hostId !== null && hostId !== -1) {
        try {
          stylesheetManager.adoptStyleSheets(sheets, hostId);
        } catch (e2) {
        }
      }
      return result;
    }
  });
  return callbackWrapper(() => {
    Object.defineProperty(host, "adoptedStyleSheets", {
      configurable: originalPropertyDescriptor.configurable,
      enumerable: originalPropertyDescriptor.enumerable,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      get: originalPropertyDescriptor.get,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      set: originalPropertyDescriptor.set
    });
  });
}
function initStyleDeclarationObserver({
  styleDeclarationCb,
  mirror: mirror2,
  ignoreCSSAttributes,
  stylesheetManager
}, { win }) {
  const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
  win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [property, value, priority] = argumentsList;
        if (ignoreCSSAttributes.has(property)) {
          return setProperty.apply(thisArg, [property, value, priority]);
        }
        const { id, styleId } = getIdAndStyleId(
          thisArg.parentRule?.parentStyleSheet,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            set: {
              property,
              value,
              priority
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule)
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
  win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [property] = argumentsList;
        if (ignoreCSSAttributes.has(property)) {
          return removeProperty.apply(thisArg, [property]);
        }
        const { id, styleId } = getIdAndStyleId(
          thisArg.parentRule?.parentStyleSheet,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            remove: {
              property
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule)
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  return callbackWrapper(() => {
    win.CSSStyleDeclaration.prototype.setProperty = setProperty;
    win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
  });
}
function initMediaInteractionObserver({
  mediaInteractionCb,
  blockClass,
  blockSelector,
  unblockSelector,
  mirror: mirror2,
  sampling,
  doc
}) {
  const handler = callbackWrapper(
    (type) => throttle$1(
      callbackWrapper((event) => {
        const target = getEventTarget(event);
        if (!target || isBlocked(
          target,
          blockClass,
          blockSelector,
          unblockSelector,
          true
        )) {
          return;
        }
        const { currentTime, volume, muted, playbackRate } = target;
        mediaInteractionCb({
          type,
          id: mirror2.getId(target),
          currentTime,
          volume,
          muted,
          playbackRate
        });
      }),
      sampling.media || 500
    )
  );
  const handlers = [
    on("play", handler(MediaInteractions.Play), doc),
    on("pause", handler(MediaInteractions.Pause), doc),
    on("seeked", handler(MediaInteractions.Seeked), doc),
    on("volumechange", handler(MediaInteractions.VolumeChange), doc),
    on("ratechange", handler(MediaInteractions.RateChange), doc)
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initFontObserver({ fontCb, doc }) {
  const win = doc.defaultView;
  if (!win) {
    return () => {
    };
  }
  const handlers = [];
  const fontMap = /* @__PURE__ */ new WeakMap();
  const originalFontFace = win.FontFace;
  win.FontFace = function FontFace2(family, source, descriptors) {
    const fontFace = new originalFontFace(family, source, descriptors);
    fontMap.set(fontFace, {
      family,
      buffer: typeof source !== "string",
      descriptors,
      fontSource: typeof source === "string" ? source : JSON.stringify(Array.from(new Uint8Array(source)))
    });
    return fontFace;
  };
  const restoreHandler = patch(
    doc.fonts,
    "add",
    function(original) {
      return function(fontFace) {
        setTimeout$1(
          callbackWrapper(() => {
            const p = fontMap.get(fontFace);
            if (p) {
              fontCb(p);
              fontMap.delete(fontFace);
            }
          }),
          0
        );
        return original.apply(this, [fontFace]);
      };
    }
  );
  handlers.push(() => {
    win.FontFace = originalFontFace;
  });
  handlers.push(restoreHandler);
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initSelectionObserver(param) {
  const {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    unblockSelector,
    selectionCb
  } = param;
  let collapsed = true;
  const updateSelection = callbackWrapper(() => {
    const selection = doc.getSelection();
    if (!selection || collapsed && selection?.isCollapsed) return;
    collapsed = selection.isCollapsed || false;
    const ranges = [];
    const count = selection.rangeCount || 0;
    for (let i2 = 0; i2 < count; i2++) {
      const range = selection.getRangeAt(i2);
      const { startContainer, startOffset, endContainer, endOffset } = range;
      const blocked = isBlocked(
        startContainer,
        blockClass,
        blockSelector,
        unblockSelector,
        true
      ) || isBlocked(
        endContainer,
        blockClass,
        blockSelector,
        unblockSelector,
        true
      );
      if (blocked) continue;
      ranges.push({
        start: mirror2.getId(startContainer),
        startOffset,
        end: mirror2.getId(endContainer),
        endOffset
      });
    }
    selectionCb({ ranges });
  });
  updateSelection();
  return on("selectionchange", updateSelection);
}
function initCustomElementObserver({
  doc,
  customElementCb
}) {
  const win = doc.defaultView;
  if (!win || !win.customElements) return () => {
  };
  const restoreHandler = patch(
    win.customElements,
    "define",
    function(original) {
      return function(name, constructor, options) {
        try {
          customElementCb({
            define: {
              name
            }
          });
        } catch (e2) {
        }
        return original.apply(this, [name, constructor, options]);
      };
    }
  );
  return restoreHandler;
}
function initObservers(o2, _hooks = {}) {
  const currentWindow = o2.doc.defaultView;
  if (!currentWindow) {
    return () => {
    };
  }
  let mutationObserver;
  if (o2.recordDOM) {
    mutationObserver = initMutationObserver(o2, o2.doc);
  }
  const mousemoveHandler = initMoveObserver(o2);
  const mouseInteractionHandler = initMouseInteractionObserver(o2);
  const scrollHandler = initScrollObserver(o2);
  const viewportResizeHandler = initViewportResizeObserver(o2, {
    win: currentWindow
  });
  const inputHandler = initInputObserver(o2);
  const mediaInteractionHandler = initMediaInteractionObserver(o2);
  let styleSheetObserver = () => {
  };
  let adoptedStyleSheetObserver = () => {
  };
  let styleDeclarationObserver = () => {
  };
  let fontObserver = () => {
  };
  if (o2.recordDOM) {
    styleSheetObserver = initStyleSheetObserver(o2, { win: currentWindow });
    adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o2, o2.doc);
    styleDeclarationObserver = initStyleDeclarationObserver(o2, {
      win: currentWindow
    });
    if (o2.collectFonts) {
      fontObserver = initFontObserver(o2);
    }
  }
  const selectionObserver = initSelectionObserver(o2);
  const customElementObserver = initCustomElementObserver(o2);
  const pluginHandlers = [];
  for (const plugin of o2.plugins) {
    pluginHandlers.push(
      plugin.observer(plugin.callback, currentWindow, plugin.options)
    );
  }
  return callbackWrapper(() => {
    mutationBuffers.forEach((b) => b.reset());
    mutationObserver?.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
    adoptedStyleSheetObserver();
    styleDeclarationObserver();
    fontObserver();
    selectionObserver();
    customElementObserver();
    pluginHandlers.forEach((h) => h());
  });
}
function hasNestedCSSRule(prop) {
  return typeof window[prop] !== "undefined";
}
function canMonkeyPatchNestedCSSRule(prop) {
  return Boolean(
    typeof window[prop] !== "undefined" && // Note: Generally, this check _shouldn't_ be necessary
    // However, in some scenarios (e.g. jsdom) this can sometimes fail, so we check for it here
    window[prop].prototype && "insertRule" in window[prop].prototype && "deleteRule" in window[prop].prototype
  );
}
class CrossOriginIframeMirror {
  constructor(generateIdFn) {
    this.generateIdFn = generateIdFn;
    this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
    this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
  }
  getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
    const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
    let id = idToRemoteIdMap.get(remoteId);
    if (!id) {
      id = this.generateIdFn();
      idToRemoteIdMap.set(remoteId, id);
      remoteIdToIdMap.set(id, remoteId);
    }
    return id;
  }
  getIds(iframe, remoteId) {
    const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return remoteId.map(
      (id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap)
    );
  }
  getRemoteId(iframe, id, map) {
    const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
    if (typeof id !== "number") return id;
    const remoteId = remoteIdToIdMap.get(id);
    if (!remoteId) return -1;
    return remoteId;
  }
  getRemoteIds(iframe, ids) {
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
  }
  reset(iframe) {
    if (!iframe) {
      this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
      this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
      return;
    }
    this.iframeIdToRemoteIdMap.delete(iframe);
    this.iframeRemoteIdToIdMap.delete(iframe);
  }
  getIdToRemoteIdMap(iframe) {
    let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
    if (!idToRemoteIdMap) {
      idToRemoteIdMap = /* @__PURE__ */ new Map();
      this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
    }
    return idToRemoteIdMap;
  }
  getRemoteIdToIdMap(iframe) {
    let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
    if (!remoteIdToIdMap) {
      remoteIdToIdMap = /* @__PURE__ */ new Map();
      this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
    }
    return remoteIdToIdMap;
  }
}
class IframeManagerNoop {
  constructor() {
    this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
    this.crossOriginIframeRootIdMap = /* @__PURE__ */ new WeakMap();
  }
  addIframe() {
  }
  addLoadListener() {
  }
  attachIframe() {
  }
}
class IframeManager {
  constructor(options) {
    this.iframes = /* @__PURE__ */ new WeakMap();
    this.crossOriginIframeMap = /* @__PURE__ */ new WeakMap();
    this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
    this.crossOriginIframeRootIdMap = /* @__PURE__ */ new WeakMap();
    this.mutationCb = options.mutationCb;
    this.wrappedEmit = options.wrappedEmit;
    this.stylesheetManager = options.stylesheetManager;
    this.recordCrossOriginIframes = options.recordCrossOriginIframes;
    this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(
      this.stylesheetManager.styleMirror.generateId.bind(
        this.stylesheetManager.styleMirror
      )
    );
    this.mirror = options.mirror;
    if (this.recordCrossOriginIframes) {
      window.addEventListener("message", this.handleMessage.bind(this));
    }
  }
  addIframe(iframeEl) {
    this.iframes.set(iframeEl, true);
    if (iframeEl.contentWindow)
      this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
  }
  addLoadListener(cb) {
    this.loadListener = cb;
  }
  attachIframe(iframeEl, childSn) {
    this.mutationCb({
      adds: [
        {
          parentId: this.mirror.getId(iframeEl),
          nextId: null,
          node: childSn
        }
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true
    });
    if (this.recordCrossOriginIframes)
      iframeEl.contentWindow?.addEventListener(
        "message",
        this.handleMessage.bind(this)
      );
    this.loadListener?.(iframeEl);
    const iframeDoc = getIFrameContentDocument(iframeEl);
    if (iframeDoc && iframeDoc.adoptedStyleSheets && iframeDoc.adoptedStyleSheets.length > 0)
      this.stylesheetManager.adoptStyleSheets(
        iframeDoc.adoptedStyleSheets,
        this.mirror.getId(iframeDoc)
      );
  }
  handleMessage(message) {
    const crossOriginMessageEvent = message;
    if (crossOriginMessageEvent.data.type !== "rrweb" || // To filter out the rrweb messages which are forwarded by some sites.
    crossOriginMessageEvent.origin !== crossOriginMessageEvent.data.origin)
      return;
    const iframeSourceWindow = message.source;
    if (!iframeSourceWindow) return;
    const iframeEl = this.crossOriginIframeMap.get(message.source);
    if (!iframeEl) return;
    const transformedEvent = this.transformCrossOriginEvent(
      iframeEl,
      crossOriginMessageEvent.data.event
    );
    if (transformedEvent)
      this.wrappedEmit(
        transformedEvent,
        crossOriginMessageEvent.data.isCheckout
      );
  }
  transformCrossOriginEvent(iframeEl, e2) {
    switch (e2.type) {
      case EventType.FullSnapshot: {
        this.crossOriginIframeMirror.reset(iframeEl);
        this.crossOriginIframeStyleMirror.reset(iframeEl);
        this.replaceIdOnNode(e2.data.node, iframeEl);
        const rootId = e2.data.node.id;
        this.crossOriginIframeRootIdMap.set(iframeEl, rootId);
        this.patchRootIdOnNode(e2.data.node, rootId);
        return {
          timestamp: e2.timestamp,
          type: EventType.IncrementalSnapshot,
          data: {
            source: IncrementalSource.Mutation,
            adds: [
              {
                parentId: this.mirror.getId(iframeEl),
                nextId: null,
                node: e2.data.node
              }
            ],
            removes: [],
            texts: [],
            attributes: [],
            isAttachIframe: true
          }
        };
      }
      case EventType.Meta:
      case EventType.Load:
      case EventType.DomContentLoaded: {
        return false;
      }
      case EventType.Plugin: {
        return e2;
      }
      case EventType.Custom: {
        this.replaceIds(
          e2.data.payload,
          iframeEl,
          ["id", "parentId", "previousId", "nextId"]
        );
        return e2;
      }
      case EventType.IncrementalSnapshot: {
        switch (e2.data.source) {
          case IncrementalSource.Mutation: {
            e2.data.adds.forEach((n2) => {
              this.replaceIds(n2, iframeEl, [
                "parentId",
                "nextId",
                "previousId"
              ]);
              this.replaceIdOnNode(n2.node, iframeEl);
              const rootId = this.crossOriginIframeRootIdMap.get(iframeEl);
              rootId && this.patchRootIdOnNode(n2.node, rootId);
            });
            e2.data.removes.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["parentId", "id"]);
            });
            e2.data.attributes.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["id"]);
            });
            e2.data.texts.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["id"]);
            });
            return e2;
          }
          case IncrementalSource.Drag:
          case IncrementalSource.TouchMove:
          case IncrementalSource.MouseMove: {
            e2.data.positions.forEach((p) => {
              this.replaceIds(p, iframeEl, ["id"]);
            });
            return e2;
          }
          case IncrementalSource.ViewportResize: {
            return false;
          }
          case IncrementalSource.MediaInteraction:
          case IncrementalSource.MouseInteraction:
          case IncrementalSource.Scroll:
          case IncrementalSource.CanvasMutation:
          case IncrementalSource.Input: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            return e2;
          }
          case IncrementalSource.StyleSheetRule:
          case IncrementalSource.StyleDeclaration: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            this.replaceStyleIds(e2.data, iframeEl, ["styleId"]);
            return e2;
          }
          case IncrementalSource.Font: {
            return e2;
          }
          case IncrementalSource.Selection: {
            e2.data.ranges.forEach((range) => {
              this.replaceIds(range, iframeEl, ["start", "end"]);
            });
            return e2;
          }
          case IncrementalSource.AdoptedStyleSheet: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            this.replaceStyleIds(e2.data, iframeEl, ["styleIds"]);
            e2.data.styles?.forEach((style) => {
              this.replaceStyleIds(style, iframeEl, ["styleId"]);
            });
            return e2;
          }
        }
      }
    }
    return false;
  }
  replace(iframeMirror, obj, iframeEl, keys) {
    for (const key of keys) {
      if (!Array.isArray(obj[key]) && typeof obj[key] !== "number") continue;
      if (Array.isArray(obj[key])) {
        obj[key] = iframeMirror.getIds(
          iframeEl,
          obj[key]
        );
      } else {
        obj[key] = iframeMirror.getId(iframeEl, obj[key]);
      }
    }
    return obj;
  }
  replaceIds(obj, iframeEl, keys) {
    return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
  }
  replaceStyleIds(obj, iframeEl, keys) {
    return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
  }
  replaceIdOnNode(node, iframeEl) {
    this.replaceIds(node, iframeEl, ["id", "rootId"]);
    if ("childNodes" in node) {
      node.childNodes.forEach((child) => {
        this.replaceIdOnNode(child, iframeEl);
      });
    }
  }
  patchRootIdOnNode(node, rootId) {
    if (node.type !== NodeType$2.Document && !node.rootId) node.rootId = rootId;
    if ("childNodes" in node) {
      node.childNodes.forEach((child) => {
        this.patchRootIdOnNode(child, rootId);
      });
    }
  }
}
class ShadowDomManagerNoop {
  init() {
  }
  addShadowRoot() {
  }
  observeAttachShadow() {
  }
  reset() {
  }
}
class ShadowDomManager {
  constructor(options) {
    this.shadowDoms = /* @__PURE__ */ new WeakSet();
    this.restoreHandlers = [];
    this.mutationCb = options.mutationCb;
    this.scrollCb = options.scrollCb;
    this.bypassOptions = options.bypassOptions;
    this.mirror = options.mirror;
    this.init();
  }
  init() {
    this.reset();
    this.patchAttachShadow(Element, document);
  }
  addShadowRoot(shadowRoot, doc) {
    if (!isNativeShadowDom(shadowRoot)) return;
    if (this.shadowDoms.has(shadowRoot)) return;
    this.shadowDoms.add(shadowRoot);
    this.bypassOptions.canvasManager.addShadowRoot(shadowRoot);
    const observer = initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this
      },
      shadowRoot
    );
    this.restoreHandlers.push(() => observer.disconnect());
    this.restoreHandlers.push(
      initScrollObserver({
        ...this.bypassOptions,
        scrollCb: this.scrollCb,
        // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
        // scroll is not allowed to pass the boundary, so we need to listen the shadow document
        doc: shadowRoot,
        mirror: this.mirror
      })
    );
    setTimeout$1(() => {
      if (shadowRoot.adoptedStyleSheets && shadowRoot.adoptedStyleSheets.length > 0)
        this.bypassOptions.stylesheetManager.adoptStyleSheets(
          shadowRoot.adoptedStyleSheets,
          this.mirror.getId(shadowRoot.host)
        );
      this.restoreHandlers.push(
        initAdoptedStyleSheetObserver(
          {
            mirror: this.mirror,
            stylesheetManager: this.bypassOptions.stylesheetManager
          },
          shadowRoot
        )
      );
    }, 0);
  }
  /**
   * Monkey patch 'attachShadow' of an IFrameElement to observe newly added shadow doms.
   */
  observeAttachShadow(iframeElement) {
    const iframeDoc = getIFrameContentDocument(iframeElement);
    const iframeWindow = getIFrameContentWindow(iframeElement);
    if (!iframeDoc || !iframeWindow) return;
    this.patchAttachShadow(
      iframeWindow.Element,
      iframeDoc
    );
  }
  /**
   * Patch 'attachShadow' to observe newly added shadow doms.
   */
  patchAttachShadow(element, doc) {
    const manager = this;
    this.restoreHandlers.push(
      patch(
        element.prototype,
        "attachShadow",
        function(original) {
          return function(option) {
            const shadowRoot = original.call(this, option);
            if (this.shadowRoot && inDom(this))
              manager.addShadowRoot(this.shadowRoot, doc);
            return shadowRoot;
          };
        }
      )
    );
  }
  reset() {
    this.restoreHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e2) {
      }
    });
    this.restoreHandlers = [];
    this.shadowDoms = /* @__PURE__ */ new WeakSet();
    this.bypassOptions.canvasManager.resetShadowRoots();
  }
}
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
for (var i$1 = 0; i$1 < chars.length; i$1++) {
  lookup[chars.charCodeAt(i$1)] = i$1;
}
class CanvasManagerNoop {
  reset() {
  }
  freeze() {
  }
  unfreeze() {
  }
  lock() {
  }
  unlock() {
  }
  snapshot() {
  }
  addWindow() {
  }
  addShadowRoot() {
  }
  resetShadowRoots() {
  }
}
class StylesheetManager {
  constructor(options) {
    this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
    this.styleMirror = new StyleSheetMirror();
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
  }
  attachLinkElement(linkEl, childSn) {
    if ("_cssText" in childSn.attributes)
      this.mutationCb({
        adds: [],
        removes: [],
        texts: [],
        attributes: [
          {
            id: childSn.id,
            attributes: childSn.attributes
          }
        ]
      });
    this.trackLinkElement(linkEl);
  }
  trackLinkElement(linkEl) {
    if (this.trackedLinkElements.has(linkEl)) return;
    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }
  adoptStyleSheets(sheets, hostId) {
    if (sheets.length === 0) return;
    const adoptedStyleSheetData = {
      id: hostId,
      styleIds: []
    };
    const styles = [];
    for (const sheet of sheets) {
      let styleId;
      if (!this.styleMirror.has(sheet)) {
        styleId = this.styleMirror.add(sheet);
        styles.push({
          styleId,
          rules: Array.from(sheet.rules || CSSRule, (r2, index) => ({
            rule: stringifyRule(r2),
            index
          }))
        });
      } else styleId = this.styleMirror.getId(sheet);
      adoptedStyleSheetData.styleIds.push(styleId);
    }
    if (styles.length > 0) adoptedStyleSheetData.styles = styles;
    this.adoptedStyleSheetCb(adoptedStyleSheetData);
  }
  reset() {
    this.styleMirror.reset();
    this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
  }
  // TODO: take snapshot on stylesheet reload by applying event listener
  trackStylesheetInLinkElement(_linkEl) {
  }
}
class ProcessedNodeManager {
  constructor() {
    this.nodeMap = /* @__PURE__ */ new WeakMap();
    this.active = false;
  }
  inOtherBuffer(node, thisBuffer) {
    const buffers = this.nodeMap.get(node);
    return buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer);
  }
  add(node, buffer) {
    if (!this.active) {
      this.active = true;
      onRequestAnimationFrame(() => {
        this.nodeMap = /* @__PURE__ */ new WeakMap();
        this.active = false;
      });
    }
    this.nodeMap.set(node, (this.nodeMap.get(node) || /* @__PURE__ */ new Set()).add(buffer));
  }
  destroy() {
  }
}
let wrappedEmit;
let _takeFullSnapshot;
try {
  if (Array.from([1], (x) => x * 2)[0] !== 2) {
    const cleanFrame = document.createElement("iframe");
    document.body.appendChild(cleanFrame);
    Array.from = cleanFrame.contentWindow?.Array.from || Array.from;
    document.body.removeChild(cleanFrame);
  }
} catch (err) {
  console.debug("Unable to override Array.from", err);
}
const mirror = createMirror$2();
function record(options = {}) {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = "rr-block",
    blockSelector = null,
    unblockSelector = null,
    ignoreClass = "rr-ignore",
    ignoreSelector = null,
    maskAllText = false,
    maskTextClass = "rr-mask",
    unmaskTextClass = null,
    maskTextSelector = null,
    unmaskTextSelector = null,
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskAttributeFn,
    maskInputFn,
    maskTextFn,
    maxCanvasSize = null,
    packFn,
    sampling = {},
    dataURLOptions = {},
    mousemoveWait,
    recordDOM = true,
    recordCanvas = false,
    recordCrossOriginIframes = false,
    recordAfter = options.recordAfter === "DOMContentLoaded" ? options.recordAfter : "load",
    userTriggeredOnInput = false,
    collectFonts = false,
    inlineImages = false,
    plugins,
    keepIframeSrcFn = () => false,
    ignoreCSSAttributes = /* @__PURE__ */ new Set([]),
    errorHandler: errorHandler2,
    onMutation,
    getCanvasManager
  } = options;
  registerErrorHandler(errorHandler2);
  const inEmittingFrame = recordCrossOriginIframes ? window.parent === window : true;
  let passEmitsToParent = false;
  if (!inEmittingFrame) {
    try {
      if (window.parent.document) {
        passEmitsToParent = false;
      }
    } catch (e2) {
      passEmitsToParent = true;
    }
  }
  if (inEmittingFrame && !emit) {
    throw new Error("emit function is required");
  }
  if (!inEmittingFrame && !passEmitsToParent) {
    return () => {
    };
  }
  if (mousemoveWait !== void 0 && sampling.mousemove === void 0) {
    sampling.mousemove = mousemoveWait;
  }
  mirror.reset();
  const maskInputOptions = maskAllInputs === true ? {
    color: true,
    date: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true,
    textarea: true,
    select: true,
    radio: true,
    checkbox: true
  } : _maskInputOptions !== void 0 ? _maskInputOptions : {};
  const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === "all" ? {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaSocial: true,
    headMetaRobots: true,
    headMetaHttpEquiv: true,
    headMetaVerification: true,
    // the following are off for slimDOMOptions === true,
    // as they destroy some (hidden) info:
    headMetaAuthorship: _slimDOMOptions === "all",
    headMetaDescKeywords: _slimDOMOptions === "all"
  } : _slimDOMOptions ? _slimDOMOptions : {};
  polyfill$1();
  let lastFullSnapshotEvent;
  let incrementalSnapshotCount = 0;
  const eventProcessor = (e2) => {
    for (const plugin of plugins || []) {
      if (plugin.eventProcessor) {
        e2 = plugin.eventProcessor(e2);
      }
    }
    if (packFn && // Disable packing events which will be emitted to parent frames.
    !passEmitsToParent) {
      e2 = packFn(e2);
    }
    return e2;
  };
  wrappedEmit = (r2, isCheckout) => {
    const e2 = r2;
    e2.timestamp = nowTimestamp();
    if (mutationBuffers[0]?.isFrozen() && e2.type !== EventType.FullSnapshot && !(e2.type === EventType.IncrementalSnapshot && e2.data.source === IncrementalSource.Mutation)) {
      mutationBuffers.forEach((buf) => buf.unfreeze());
    }
    if (inEmittingFrame) {
      emit?.(eventProcessor(e2), isCheckout);
    } else if (passEmitsToParent) {
      const message = {
        type: "rrweb",
        event: eventProcessor(e2),
        origin: window.location.origin,
        isCheckout
      };
      window.parent.postMessage(message, "*");
    }
    if (e2.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e2;
      incrementalSnapshotCount = 0;
    } else if (e2.type === EventType.IncrementalSnapshot) {
      if (e2.data.source === IncrementalSource.Mutation && e2.data.isAttachIframe) {
        return;
      }
      incrementalSnapshotCount++;
      const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
      const exceedTime = checkoutEveryNms && lastFullSnapshotEvent && e2.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
      if (exceedCount || exceedTime) {
        takeFullSnapshot2(true);
      }
    }
  };
  const wrappedMutationEmit = (m) => {
    wrappedEmit({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Mutation,
        ...m
      }
    });
  };
  const wrappedScrollEmit = (p) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Scroll,
      ...p
    }
  });
  const wrappedCanvasMutationEmit = (p) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.CanvasMutation,
      ...p
    }
  });
  const wrappedAdoptedStyleSheetEmit = (a2) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      ...a2
    }
  });
  const stylesheetManager = new StylesheetManager({
    mutationCb: wrappedMutationEmit,
    adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit
  });
  const iframeManager = typeof __RRWEB_EXCLUDE_IFRAME__ === "boolean" && __RRWEB_EXCLUDE_IFRAME__ ? new IframeManagerNoop() : new IframeManager({
    mirror,
    mutationCb: wrappedMutationEmit,
    stylesheetManager,
    recordCrossOriginIframes,
    wrappedEmit
  });
  for (const plugin of plugins || []) {
    if (plugin.getMirror)
      plugin.getMirror({
        nodeMirror: mirror,
        crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
        crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror
      });
  }
  const processedNodeManager = new ProcessedNodeManager();
  const canvasManager = _getCanvasManager(
    getCanvasManager,
    {
      mirror,
      win: window,
      mutationCb: (p) => wrappedEmit({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.CanvasMutation,
          ...p
        }
      }),
      recordCanvas,
      blockClass,
      blockSelector,
      unblockSelector,
      maxCanvasSize,
      sampling: sampling["canvas"],
      dataURLOptions,
      errorHandler: errorHandler2
    }
  );
  const shadowDomManager = typeof __RRWEB_EXCLUDE_SHADOW_DOM__ === "boolean" && __RRWEB_EXCLUDE_SHADOW_DOM__ ? new ShadowDomManagerNoop() : new ShadowDomManager({
    mutationCb: wrappedMutationEmit,
    scrollCb: wrappedScrollEmit,
    bypassOptions: {
      onMutation,
      blockClass,
      blockSelector,
      unblockSelector,
      maskAllText,
      maskTextClass,
      unmaskTextClass,
      maskTextSelector,
      unmaskTextSelector,
      inlineStylesheet,
      maskInputOptions,
      dataURLOptions,
      maskAttributeFn,
      maskTextFn,
      maskInputFn,
      recordCanvas,
      inlineImages,
      sampling,
      slimDOMOptions,
      iframeManager,
      stylesheetManager,
      canvasManager,
      keepIframeSrcFn,
      processedNodeManager,
      ignoreCSSAttributes
    },
    mirror
  });
  const takeFullSnapshot2 = (isCheckout = false) => {
    if (!recordDOM) {
      return;
    }
    wrappedEmit(
      {
        type: EventType.Meta,
        data: {
          href: window.location.href,
          width: getWindowWidth(),
          height: getWindowHeight()
        }
      },
      isCheckout
    );
    stylesheetManager.reset();
    shadowDomManager.init();
    mutationBuffers.forEach((buf) => buf.lock());
    const node = snapshot(document, {
      mirror,
      blockClass,
      blockSelector,
      unblockSelector,
      maskAllText,
      maskTextClass,
      unmaskTextClass,
      maskTextSelector,
      unmaskTextSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      maskAttributeFn,
      maskInputFn,
      maskTextFn,
      slimDOM: slimDOMOptions,
      dataURLOptions,
      recordCanvas,
      inlineImages,
      onSerialize: (n2) => {
        if (isSerializedIframe(n2, mirror)) {
          iframeManager.addIframe(n2);
        }
        if (isSerializedStylesheet(n2, mirror)) {
          stylesheetManager.trackLinkElement(n2);
        }
        if (hasShadowRoot(n2)) {
          shadowDomManager.addShadowRoot(n2.shadowRoot, document);
        }
      },
      onIframeLoad: (iframe, childSn) => {
        iframeManager.attachIframe(iframe, childSn);
        if (iframe.contentWindow) {
          canvasManager.addWindow(iframe.contentWindow);
        }
        shadowDomManager.observeAttachShadow(iframe);
      },
      onStylesheetLoad: (linkEl, childSn) => {
        stylesheetManager.attachLinkElement(linkEl, childSn);
      },
      onBlockedImageLoad: (_imageEl, serializedNode, { width, height }) => {
        wrappedMutationEmit({
          adds: [],
          removes: [],
          texts: [],
          attributes: [
            {
              id: serializedNode.id,
              attributes: {
                style: {
                  width: `${width}px`,
                  height: `${height}px`
                }
              }
            }
          ]
        });
      },
      keepIframeSrcFn,
      ignoreCSSAttributes
    });
    if (!node) {
      return console.warn("Failed to snapshot the document");
    }
    wrappedEmit({
      type: EventType.FullSnapshot,
      data: {
        node,
        initialOffset: getWindowScroll(window)
      }
    });
    mutationBuffers.forEach((buf) => buf.unlock());
    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
      stylesheetManager.adoptStyleSheets(
        document.adoptedStyleSheets,
        mirror.getId(document)
      );
  };
  _takeFullSnapshot = takeFullSnapshot2;
  try {
    const handlers = [];
    const observe = (doc) => {
      return callbackWrapper(initObservers)(
        {
          onMutation,
          mutationCb: wrappedMutationEmit,
          mousemoveCb: (positions, source) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source,
              positions
            }
          }),
          mouseInteractionCb: (d) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.MouseInteraction,
              ...d
            }
          }),
          scrollCb: wrappedScrollEmit,
          viewportResizeCb: (d) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.ViewportResize,
              ...d
            }
          }),
          inputCb: (v2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Input,
              ...v2
            }
          }),
          mediaInteractionCb: (p) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.MediaInteraction,
              ...p
            }
          }),
          styleSheetRuleCb: (r2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.StyleSheetRule,
              ...r2
            }
          }),
          styleDeclarationCb: (r2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.StyleDeclaration,
              ...r2
            }
          }),
          canvasMutationCb: wrappedCanvasMutationEmit,
          fontCb: (p) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Font,
              ...p
            }
          }),
          selectionCb: (p) => {
            wrappedEmit({
              type: EventType.IncrementalSnapshot,
              data: {
                source: IncrementalSource.Selection,
                ...p
              }
            });
          },
          customElementCb: (c2) => {
            wrappedEmit({
              type: EventType.IncrementalSnapshot,
              data: {
                source: IncrementalSource.CustomElement,
                ...c2
              }
            });
          },
          blockClass,
          ignoreClass,
          ignoreSelector,
          maskAllText,
          maskTextClass,
          unmaskTextClass,
          maskTextSelector,
          unmaskTextSelector,
          maskInputOptions,
          inlineStylesheet,
          sampling,
          recordDOM,
          recordCanvas,
          inlineImages,
          userTriggeredOnInput,
          collectFonts,
          doc,
          maskAttributeFn,
          maskInputFn,
          maskTextFn,
          keepIframeSrcFn,
          blockSelector,
          unblockSelector,
          slimDOMOptions,
          dataURLOptions,
          mirror,
          iframeManager,
          stylesheetManager,
          shadowDomManager,
          processedNodeManager,
          canvasManager,
          ignoreCSSAttributes,
          plugins: plugins?.filter((p) => p.observer)?.map((p) => ({
            observer: p.observer,
            options: p.options,
            callback: (payload) => wrappedEmit({
              type: EventType.Plugin,
              data: {
                plugin: p.name,
                payload
              }
            })
          })) || []
        },
        {}
      );
    };
    iframeManager.addLoadListener((iframeEl) => {
      try {
        handlers.push(observe(iframeEl.contentDocument));
      } catch (error) {
        console.warn(error);
      }
    });
    const init = () => {
      takeFullSnapshot2();
      handlers.push(observe(document));
    };
    if (document.readyState === "interactive" || document.readyState === "complete") {
      init();
    } else {
      handlers.push(
        on("DOMContentLoaded", () => {
          wrappedEmit({
            type: EventType.DomContentLoaded,
            data: {}
          });
          if (recordAfter === "DOMContentLoaded") init();
        })
      );
      handlers.push(
        on(
          "load",
          () => {
            wrappedEmit({
              type: EventType.Load,
              data: {}
            });
            if (recordAfter === "load") init();
          },
          window
        )
      );
    }
    return () => {
      handlers.forEach((h) => h());
      processedNodeManager.destroy();
      _takeFullSnapshot = void 0;
      unregisterErrorHandler();
    };
  } catch (error) {
    console.warn(error);
  }
}
function takeFullSnapshot(isCheckout) {
  if (!_takeFullSnapshot) {
    throw new Error("please take full snapshot after start recording");
  }
  _takeFullSnapshot(isCheckout);
}
record.mirror = mirror;
record.takeFullSnapshot = takeFullSnapshot;
function _getCanvasManager(getCanvasManagerFn, options) {
  try {
    return getCanvasManagerFn ? getCanvasManagerFn(options) : new CanvasManagerNoop();
  } catch {
    console.warn("Unable to initialize CanvasManager");
    return new CanvasManagerNoop();
  }
}
var n;
!function(t2) {
  t2[t2.NotStarted = 0] = "NotStarted", t2[t2.Running = 1] = "Running", t2[t2.Stopped = 2] = "Stopped";
}(n || (n = {}));

const ReplayEventTypeIncrementalSnapshot = 3;
const ReplayEventTypeCustom = 5;

/**
 * Converts a timestamp to ms, if it was in s, or keeps it as ms.
 */
function timestampToMs(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp : timestamp * 1000;
}

/**
 * Converts a timestamp to s, if it was in ms, or keeps it as s.
 */
function timestampToS(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp / 1000 : timestamp;
}

/**
 * Add a breadcrumb event to replay.
 */
function addBreadcrumbEvent(replay, breadcrumb) {
  if (breadcrumb.category === 'sentry.transaction') {
    return;
  }

  if (['ui.click', 'ui.input'].includes(breadcrumb.category )) {
    replay.triggerUserActivity();
  } else {
    replay.checkAndHandleExpiredSession();
  }

  replay.addUpdate(() => {
    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    replay.throttledAddEvent({
      type: EventType.Custom,
      // TODO: We were converting from ms to seconds for breadcrumbs, spans,
      // but maybe we should just keep them as milliseconds
      timestamp: (breadcrumb.timestamp || 0) * 1000,
      data: {
        tag: 'breadcrumb',
        // normalize to max. 10 depth and 1_000 properties per object
        payload: core.normalize(breadcrumb, 10, 1000),
      },
    });

    // Do not flush after console log messages
    return breadcrumb.category === 'console';
  });
}

const INTERACTIVE_SELECTOR = 'button,a';

/** Get the closest interactive parent element, or else return the given element. */
function getClosestInteractive(element) {
  const closestInteractive = element.closest(INTERACTIVE_SELECTOR);
  return closestInteractive || element;
}

/**
 * For clicks, we check if the target is inside of a button or link
 * If so, we use this as the target instead
 * This is useful because if you click on the image in <button><img></button>,
 * The target will be the image, not the button, which we don't want here
 */
function getClickTargetNode(event) {
  const target = getTargetNode(event);

  if (!target || !(target instanceof Element)) {
    return target;
  }

  return getClosestInteractive(target);
}

/** Get the event target node. */
function getTargetNode(event) {
  if (isEventWithTarget(event)) {
    return event.target ;
  }

  return event;
}

function isEventWithTarget(event) {
  return typeof event === 'object' && !!event && 'target' in event;
}

let handlers;

/**
 * Register a handler to be called when `window.open()` is called.
 * Returns a cleanup function.
 */
function onWindowOpen(cb) {
  // Ensure to only register this once
  if (!handlers) {
    handlers = [];
    monkeyPatchWindowOpen();
  }

  handlers.push(cb);

  return () => {
    const pos = handlers ? handlers.indexOf(cb) : -1;
    if (pos > -1) {
      (handlers ).splice(pos, 1);
    }
  };
}

function monkeyPatchWindowOpen() {
  core.fill(WINDOW, 'open', function (originalWindowOpen) {
    return function (...args) {
      if (handlers) {
        try {
          handlers.forEach(handler => handler());
        } catch {
          // ignore errors in here
        }
      }

      return originalWindowOpen.apply(WINDOW, args);
    };
  });
}

/** Any IncrementalSource for rrweb that we interpret as a kind of mutation. */
const IncrementalMutationSources = new Set([
  IncrementalSource.Mutation,
  IncrementalSource.StyleSheetRule,
  IncrementalSource.StyleDeclaration,
  IncrementalSource.AdoptedStyleSheet,
  IncrementalSource.CanvasMutation,
  IncrementalSource.Selection,
  IncrementalSource.MediaInteraction,
]);

/** Handle a click. */
function handleClick(clickDetector, clickBreadcrumb, node) {
  clickDetector.handleClick(clickBreadcrumb, node);
}

/** A click detector class that can be used to detect slow or rage clicks on elements. */
class ClickDetector  {
  // protected for testing

   constructor(
    replay,
    slowClickConfig,
    // Just for easier testing
    _addBreadcrumbEvent = addBreadcrumbEvent,
  ) {
    this._lastMutation = 0;
    this._lastScroll = 0;
    this._clicks = [];

    // We want everything in s, but options are in ms
    this._timeout = slowClickConfig.timeout / 1000;
    this._threshold = slowClickConfig.threshold / 1000;
    this._scrollTimeout = slowClickConfig.scrollTimeout / 1000;
    this._replay = replay;
    this._ignoreSelector = slowClickConfig.ignoreSelector;
    this._addBreadcrumbEvent = _addBreadcrumbEvent;
  }

  /** Register click detection handlers on mutation or scroll. */
   addListeners() {
    const cleanupWindowOpen = onWindowOpen(() => {
      // Treat window.open as mutation
      this._lastMutation = nowInSeconds();
    });

    this._teardown = () => {
      cleanupWindowOpen();

      this._clicks = [];
      this._lastMutation = 0;
      this._lastScroll = 0;
    };
  }

  /** Clean up listeners. */
   removeListeners() {
    if (this._teardown) {
      this._teardown();
    }

    if (this._checkClickTimeout) {
      clearTimeout(this._checkClickTimeout);
    }
  }

  /** @inheritDoc */
   handleClick(breadcrumb, node) {
    if (ignoreElement(node, this._ignoreSelector) || !isClickBreadcrumb(breadcrumb)) {
      return;
    }

    const newClick = {
      timestamp: timestampToS(breadcrumb.timestamp),
      clickBreadcrumb: breadcrumb,
      // Set this to 0 so we know it originates from the click breadcrumb
      clickCount: 0,
      node,
    };

    // If there was a click in the last 1s on the same element, ignore it - only keep a single reference per second
    if (
      this._clicks.some(click => click.node === newClick.node && Math.abs(click.timestamp - newClick.timestamp) < 1)
    ) {
      return;
    }

    this._clicks.push(newClick);

    // If this is the first new click, set a timeout to check for multi clicks
    if (this._clicks.length === 1) {
      this._scheduleCheckClicks();
    }
  }

  /** @inheritDoc */
   registerMutation(timestamp = Date.now()) {
    this._lastMutation = timestampToS(timestamp);
  }

  /** @inheritDoc */
   registerScroll(timestamp = Date.now()) {
    this._lastScroll = timestampToS(timestamp);
  }

  /** @inheritDoc */
   registerClick(element) {
    const node = getClosestInteractive(element);
    this._handleMultiClick(node );
  }

  /** Count multiple clicks on elements. */
   _handleMultiClick(node) {
    this._getClicks(node).forEach(click => {
      click.clickCount++;
    });
  }

  /** Get all pending clicks for a given node. */
   _getClicks(node) {
    return this._clicks.filter(click => click.node === node);
  }

  /** Check the clicks that happened. */
   _checkClicks() {
    const timedOutClicks = [];

    const now = nowInSeconds();

    this._clicks.forEach(click => {
      if (!click.mutationAfter && this._lastMutation) {
        click.mutationAfter = click.timestamp <= this._lastMutation ? this._lastMutation - click.timestamp : undefined;
      }
      if (!click.scrollAfter && this._lastScroll) {
        click.scrollAfter = click.timestamp <= this._lastScroll ? this._lastScroll - click.timestamp : undefined;
      }

      // All of these are in seconds!
      if (click.timestamp + this._timeout <= now) {
        timedOutClicks.push(click);
      }
    });

    // Remove "old" clicks
    for (const click of timedOutClicks) {
      const pos = this._clicks.indexOf(click);

      if (pos > -1) {
        this._generateBreadcrumbs(click);
        this._clicks.splice(pos, 1);
      }
    }

    // Trigger new check, unless no clicks left
    if (this._clicks.length) {
      this._scheduleCheckClicks();
    }
  }

  /** Generate matching breadcrumb(s) for the click. */
   _generateBreadcrumbs(click) {
    const replay = this._replay;
    const hadScroll = click.scrollAfter && click.scrollAfter <= this._scrollTimeout;
    const hadMutation = click.mutationAfter && click.mutationAfter <= this._threshold;

    const isSlowClick = !hadScroll && !hadMutation;
    const { clickCount, clickBreadcrumb } = click;

    // Slow click
    if (isSlowClick) {
      // If `mutationAfter` is set, it means a mutation happened after the threshold, but before the timeout
      // If not, it means we just timed out without scroll & mutation
      const timeAfterClickMs = Math.min(click.mutationAfter || this._timeout, this._timeout) * 1000;
      const endReason = timeAfterClickMs < this._timeout * 1000 ? 'mutation' : 'timeout';

      const breadcrumb = {
        type: 'default',
        message: clickBreadcrumb.message,
        timestamp: clickBreadcrumb.timestamp,
        category: 'ui.slowClickDetected',
        data: {
          ...clickBreadcrumb.data,
          url: WINDOW.location.href,
          route: replay.getCurrentRoute(),
          timeAfterClickMs,
          endReason,
          // If clickCount === 0, it means multiClick was not correctly captured here
          // - we still want to send 1 in this case
          clickCount: clickCount || 1,
        },
      };

      this._addBreadcrumbEvent(replay, breadcrumb);
      return;
    }

    // Multi click
    if (clickCount > 1) {
      const breadcrumb = {
        type: 'default',
        message: clickBreadcrumb.message,
        timestamp: clickBreadcrumb.timestamp,
        category: 'ui.multiClick',
        data: {
          ...clickBreadcrumb.data,
          url: WINDOW.location.href,
          route: replay.getCurrentRoute(),
          clickCount,
          metric: true,
        },
      };

      this._addBreadcrumbEvent(replay, breadcrumb);
    }
  }

  /** Schedule to check current clicks. */
   _scheduleCheckClicks() {
    if (this._checkClickTimeout) {
      clearTimeout(this._checkClickTimeout);
    }

    this._checkClickTimeout = browserUtils.setTimeout(() => this._checkClicks(), 1000);
  }
}

const SLOW_CLICK_TAGS = ['A', 'BUTTON', 'INPUT'];

/** exported for tests only */
function ignoreElement(node, ignoreSelector) {
  if (!SLOW_CLICK_TAGS.includes(node.tagName)) {
    return true;
  }

  // If <input> tag, we only want to consider input[type='submit'] & input[type='button']
  if (node.tagName === 'INPUT' && !['submit', 'button'].includes(node.getAttribute('type') || '')) {
    return true;
  }

  // If <a> tag, detect special variants that may not lead to an action
  // If target !== _self, we may open the link somewhere else, which would lead to no action
  // Also, when downloading a file, we may not leave the page, but still not trigger an action
  if (
    node.tagName === 'A' &&
    (node.hasAttribute('download') || (node.hasAttribute('target') && node.getAttribute('target') !== '_self'))
  ) {
    return true;
  }

  if (ignoreSelector && node.matches(ignoreSelector)) {
    return true;
  }

  return false;
}

function isClickBreadcrumb(breadcrumb) {
  return !!(breadcrumb.data && typeof breadcrumb.data.nodeId === 'number' && breadcrumb.timestamp);
}

// This is good enough for us, and is easier to test/mock than `timestampInSeconds`
function nowInSeconds() {
  return Date.now() / 1000;
}

/** Update the click detector based on a recording event of rrweb. */
function updateClickDetectorForRecordingEvent(clickDetector, event) {
  try {
    // note: We only consider incremental snapshots here
    // This means that any full snapshot is ignored for mutation detection - the reason is that we simply cannot know if a mutation happened here.
    // E.g. think that we are buffering, an error happens and we take a full snapshot because we switched to session mode -
    // in this scenario, we would not know if a dead click happened because of the error, which is a key dead click scenario.
    // Instead, by ignoring full snapshots, we have the risk that we generate a false positive
    // (if a mutation _did_ happen but was "swallowed" by the full snapshot)
    // But this should be more unlikely as we'd generally capture the incremental snapshot right away

    if (!isIncrementalEvent(event)) {
      return;
    }

    const { source } = event.data;
    if (IncrementalMutationSources.has(source)) {
      clickDetector.registerMutation(event.timestamp);
    }

    if (source === IncrementalSource.Scroll) {
      clickDetector.registerScroll(event.timestamp);
    }

    if (isIncrementalMouseInteraction(event)) {
      const { type, id } = event.data;
      const node = record.mirror.getNode(id);

      if (node instanceof HTMLElement && type === MouseInteractions.Click) {
        clickDetector.registerClick(node);
      }
    }
  } catch {
    // ignore errors here, e.g. if accessing something that does not exist
  }
}

function isIncrementalEvent(event) {
  return event.type === ReplayEventTypeIncrementalSnapshot;
}

function isIncrementalMouseInteraction(
  event,
) {
  return event.data.source === IncrementalSource.MouseInteraction;
}

/**
 * Create a breadcrumb for a replay.
 */
function createBreadcrumb(
  breadcrumb,
) {
  return {
    timestamp: Date.now() / 1000,
    type: 'default',
    ...breadcrumb,
  };
}

var NodeType = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["Document"] = 0] = "Document";
  NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
  NodeType2[NodeType2["Element"] = 2] = "Element";
  NodeType2[NodeType2["Text"] = 3] = "Text";
  NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
  NodeType2[NodeType2["Comment"] = 5] = "Comment";
  return NodeType2;
})(NodeType || {});

// Note that these are the serialized attributes and not attributes directly on
// the DOM Node. Attributes we are interested in:
const ATTRIBUTES_TO_RECORD = new Set([
  'id',
  'class',
  'aria-label',
  'role',
  'name',
  'alt',
  'title',
  'data-test-id',
  'data-testid',
  'disabled',
  'aria-disabled',
  'data-sentry-component',
]);

/**
 * Inclusion list of attributes that we want to record from the DOM element
 */
function getAttributesToRecord(attributes) {
  const obj = {};
  if (!attributes['data-sentry-component'] && attributes['data-sentry-element']) {
    attributes['data-sentry-component'] = attributes['data-sentry-element'];
  }
  for (const key in attributes) {
    if (ATTRIBUTES_TO_RECORD.has(key)) {
      let normalizedKey = key;

      if (key === 'data-testid' || key === 'data-test-id') {
        normalizedKey = 'testId';
      }

      obj[normalizedKey] = attributes[key];
    }
  }

  return obj;
}

const handleDomListener = (
  replay,
) => {
  return (handlerData) => {
    if (!replay.isEnabled()) {
      return;
    }

    const result = handleDom(handlerData);

    if (!result) {
      return;
    }

    const isClick = handlerData.name === 'click';
    const event = isClick ? (handlerData.event ) : undefined;
    // Ignore clicks if ctrl/alt/meta/shift keys are held down as they alter behavior of clicks (e.g. open in new tab)
    if (
      isClick &&
      replay.clickDetector &&
      event?.target &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      handleClick(
        replay.clickDetector,
        result ,
        getClickTargetNode(handlerData.event ) ,
      );
    }

    addBreadcrumbEvent(replay, result);
  };
};

/** Get the base DOM breadcrumb. */
function getBaseDomBreadcrumb(target, message) {
  const nodeId = record.mirror.getId(target);
  const node = nodeId && record.mirror.getNode(nodeId);
  const meta = node && record.mirror.getMeta(node);
  const element = meta && isElement(meta) ? meta : null;

  return {
    message,
    data: element
      ? {
          nodeId,
          node: {
            id: nodeId,
            tagName: element.tagName,
            textContent: Array.from(element.childNodes)
              .map((node) => node.type === NodeType.Text && node.textContent)
              .filter(Boolean) // filter out empty values
              .map(text => (text ).trim())
              .join(''),
            attributes: getAttributesToRecord(element.attributes),
          },
        }
      : {},
  };
}

/**
 * An event handler to react to DOM events.
 * Exported for tests.
 */
function handleDom(handlerData) {
  const { target, message } = getDomTarget(handlerData);

  return createBreadcrumb({
    category: `ui.${handlerData.name}`,
    ...getBaseDomBreadcrumb(target, message),
  });
}

function getDomTarget(handlerData) {
  const isClick = handlerData.name === 'click';

  let message;
  let target = null;

  // Accessing event.target can throw (see getsentry/raven-js#838, #768)
  try {
    target = isClick ? getClickTargetNode(handlerData.event ) : getTargetNode(handlerData.event );
    message = core.htmlTreeAsString(target, { maxStringLength: 200 }) || '<unknown>';
  } catch {
    message = '<unknown>';
  }

  return { target, message };
}

function isElement(node) {
  return node.type === NodeType.Element;
}

/** Handle keyboard events & create breadcrumbs. */
function handleKeyboardEvent(replay, event) {
  if (!replay.isEnabled()) {
    return;
  }

  // Update user activity, but do not restart recording as it can create
  // noisy/low-value replays (e.g. user comes back from idle, hits alt-tab, new
  // session with a single "keydown" breadcrumb is created)
  replay.updateUserActivity();

  const breadcrumb = getKeyboardBreadcrumb(event);

  if (!breadcrumb) {
    return;
  }

  addBreadcrumbEvent(replay, breadcrumb);
}

/** exported only for tests */
function getKeyboardBreadcrumb(event) {
  const { metaKey, shiftKey, ctrlKey, altKey, key, target } = event;

  // never capture for input fields
  if (!target || isInputElement(target ) || !key) {
    return null;
  }

  // Note: We do not consider shift here, as that means "uppercase"
  const hasModifierKey = metaKey || ctrlKey || altKey;
  const isCharacterKey = key.length === 1; // other keys like Escape, Tab, etc have a longer length

  // Do not capture breadcrumb if only a word key is pressed
  // This could leak e.g. user input
  if (!hasModifierKey && isCharacterKey) {
    return null;
  }

  const message = core.htmlTreeAsString(target, { maxStringLength: 200 }) || '<unknown>';
  const baseBreadcrumb = getBaseDomBreadcrumb(target , message);

  return createBreadcrumb({
    category: 'ui.keyDown',
    message,
    data: {
      ...baseBreadcrumb.data,
      metaKey,
      shiftKey,
      ctrlKey,
      altKey,
      key,
    },
  });
}

function isInputElement(target) {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

// Map entryType -> function to normalize data for event
const ENTRY_TYPES

 = {
  // @ts-expect-error TODO: entry type does not fit the create* functions entry type
  resource: createResourceEntry,
  paint: createPaintEntry,
  // @ts-expect-error TODO: entry type does not fit the create* functions entry type
  navigation: createNavigationEntry,
};

/**
 * Handler creater for web vitals
 */
function webVitalHandler(
  getter,
  replay,
) {
  return ({ metric }) => void replay.replayPerformanceEntries.push(getter(metric));
}

/**
 * Create replay performance entries from the browser performance entries.
 */
function createPerformanceEntries(
  entries,
) {
  return entries.map(createPerformanceEntry).filter(Boolean) ;
}

function createPerformanceEntry(entry) {
  const entryType = ENTRY_TYPES[entry.entryType];
  if (!entryType) {
    return null;
  }

  return entryType(entry);
}

function getAbsoluteTime(time) {
  // browserPerformanceTimeOrigin can be undefined if `performance` or
  // `performance.now` doesn't exist, but this is already checked by this integration
  return ((core.browserPerformanceTimeOrigin() || WINDOW.performance.timeOrigin) + time) / 1000;
}

function createPaintEntry(entry) {
  const { duration, entryType, name, startTime } = entry;

  const start = getAbsoluteTime(startTime);
  return {
    type: entryType,
    name,
    start,
    end: start + duration,
    data: undefined,
  };
}

function createNavigationEntry(entry) {
  const {
    entryType,
    name,
    decodedBodySize,
    duration,
    domComplete,
    encodedBodySize,
    domContentLoadedEventStart,
    domContentLoadedEventEnd,
    domInteractive,
    loadEventStart,
    loadEventEnd,
    redirectCount,
    startTime,
    transferSize,
    type,
  } = entry;

  // Ignore entries with no duration, they do not seem to be useful and cause dupes
  if (duration === 0) {
    return null;
  }

  return {
    type: `${entryType}.${type}`,
    start: getAbsoluteTime(startTime),
    end: getAbsoluteTime(domComplete),
    name,
    data: {
      size: transferSize,
      decodedBodySize,
      encodedBodySize,
      duration,
      domInteractive,
      domContentLoadedEventStart,
      domContentLoadedEventEnd,
      loadEventStart,
      loadEventEnd,
      domComplete,
      redirectCount,
    },
  };
}

function createResourceEntry(
  entry,
) {
  const {
    entryType,
    initiatorType,
    name,
    responseEnd,
    startTime,
    decodedBodySize,
    encodedBodySize,
    responseStatus,
    transferSize,
  } = entry;

  // Core SDK handles these
  if (['fetch', 'xmlhttprequest'].includes(initiatorType)) {
    return null;
  }

  return {
    type: `${entryType}.${initiatorType}`,
    start: getAbsoluteTime(startTime),
    end: getAbsoluteTime(responseEnd),
    name,
    data: {
      size: transferSize,
      statusCode: responseStatus,
      decodedBodySize,
      encodedBodySize,
    },
  };
}

/**
 * Add a LCP event to the replay based on a LCP metric.
 */
function getLargestContentfulPaint(metric) {
  const lastEntry = metric.entries[metric.entries.length - 1] ;
  const node = lastEntry?.element ? [lastEntry.element] : undefined;
  return getWebVital(metric, 'largest-contentful-paint', node);
}

function isLayoutShift(entry) {
  return (entry ).sources !== undefined;
}

/**
 * Add a CLS event to the replay based on a CLS metric.
 */
function getCumulativeLayoutShift(metric) {
  const layoutShifts = [];
  const nodes = [];
  for (const entry of metric.entries) {
    if (isLayoutShift(entry)) {
      const nodeIds = [];
      for (const source of entry.sources) {
        if (source.node) {
          nodes.push(source.node);
          const nodeId = record.mirror.getId(source.node);
          if (nodeId) {
            nodeIds.push(nodeId);
          }
        }
      }
      layoutShifts.push({ value: entry.value, nodeIds: nodeIds.length ? nodeIds : undefined });
    }
  }

  return getWebVital(metric, 'cumulative-layout-shift', nodes, layoutShifts);
}

/**
 * Add an INP event to the replay based on an INP metric.
 */
function getInteractionToNextPaint(metric) {
  const lastEntry = metric.entries[metric.entries.length - 1] ;
  const node = lastEntry?.target ? [lastEntry.target] : undefined;
  return getWebVital(metric, 'interaction-to-next-paint', node);
}

/**
 * Add an web vital event to the replay based on the web vital metric.
 */
function getWebVital(
  metric,
  name,
  nodes,
  attributions,
) {
  const value = metric.value;
  const rating = metric.rating;

  const end = getAbsoluteTime(value);

  return {
    type: 'web-vital',
    name,
    start: end,
    end,
    data: {
      value,
      size: value,
      rating,
      nodeIds: nodes ? nodes.map(node => record.mirror.getId(node)) : undefined,
      attributions,
    },
  };
}

/**
 * Sets up a PerformanceObserver to listen to all performance entry types.
 * Returns a callback to stop observing.
 */
function setupPerformanceObserver(replay) {
  function addPerformanceEntry(entry) {
    // It is possible for entries to come up multiple times
    if (!replay.performanceEntries.includes(entry)) {
      replay.performanceEntries.push(entry);
    }
  }

  function onEntries({ entries }) {
    entries.forEach(addPerformanceEntry);
  }

  const clearCallbacks = [];

  (['navigation', 'paint', 'resource'] ).forEach(type => {
    clearCallbacks.push(browserUtils.addPerformanceInstrumentationHandler(type, onEntries));
  });

  clearCallbacks.push(
    browserUtils.addLcpInstrumentationHandler(webVitalHandler(getLargestContentfulPaint, replay)),
    browserUtils.addClsInstrumentationHandler(webVitalHandler(getCumulativeLayoutShift, replay)),
    browserUtils.addInpInstrumentationHandler(webVitalHandler(getInteractionToNextPaint, replay)),
  );

  // A callback to cleanup all handlers
  return () => {
    clearCallbacks.forEach(clearCallback => clearCallback());
  };
}

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
const DEBUG_BUILD = (typeof __SENTRY_DEBUG__ === 'undefined' || __SENTRY_DEBUG__);

const r = `var t=Uint8Array,n=Uint16Array,r=Int32Array,e=new t([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new t([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),s=new t([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),a=function(t,e){for(var i=new n(31),s=0;s<31;++s)i[s]=e+=1<<t[s-1];var a=new r(i[30]);for(s=1;s<30;++s)for(var o=i[s];o<i[s+1];++o)a[o]=o-i[s]<<5|s;return{b:i,r:a}},o=a(e,2),h=o.b,f=o.r;h[28]=258,f[258]=28;for(var l=a(i,0).r,u=new n(32768),c=0;c<32768;++c){var v=(43690&c)>>1|(21845&c)<<1;v=(61680&(v=(52428&v)>>2|(13107&v)<<2))>>4|(3855&v)<<4,u[c]=((65280&v)>>8|(255&v)<<8)>>1}var d=function(t,r,e){for(var i=t.length,s=0,a=new n(r);s<i;++s)t[s]&&++a[t[s]-1];var o,h=new n(r);for(s=1;s<r;++s)h[s]=h[s-1]+a[s-1]<<1;if(e){o=new n(1<<r);var f=15-r;for(s=0;s<i;++s)if(t[s])for(var l=s<<4|t[s],c=r-t[s],v=h[t[s]-1]++<<c,d=v|(1<<c)-1;v<=d;++v)o[u[v]>>f]=l}else for(o=new n(i),s=0;s<i;++s)t[s]&&(o[s]=u[h[t[s]-1]++]>>15-t[s]);return o},p=new t(288);for(c=0;c<144;++c)p[c]=8;for(c=144;c<256;++c)p[c]=9;for(c=256;c<280;++c)p[c]=7;for(c=280;c<288;++c)p[c]=8;var g=new t(32);for(c=0;c<32;++c)g[c]=5;var w=d(p,9,0),y=d(g,5,0),m=function(t){return(t+7)/8|0},b=function(n,r,e){return(null==e||e>n.length)&&(e=n.length),new t(n.subarray(r,e))},M=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],E=function(t,n,r){var e=new Error(n||M[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,E),!r)throw e;return e},z=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8},_=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8,t[e+2]|=r>>16},x=function(r,e){for(var i=[],s=0;s<r.length;++s)r[s]&&i.push({s:s,f:r[s]});var a=i.length,o=i.slice();if(!a)return{t:F,l:0};if(1==a){var h=new t(i[0].s+1);return h[i[0].s]=1,{t:h,l:1}}i.sort(function(t,n){return t.f-n.f}),i.push({s:-1,f:25001});var f=i[0],l=i[1],u=0,c=1,v=2;for(i[0]={s:-1,f:f.f+l.f,l:f,r:l};c!=a-1;)f=i[i[u].f<i[v].f?u++:v++],l=i[u!=c&&i[u].f<i[v].f?u++:v++],i[c++]={s:-1,f:f.f+l.f,l:f,r:l};var d=o[0].s;for(s=1;s<a;++s)o[s].s>d&&(d=o[s].s);var p=new n(d+1),g=A(i[c-1],p,0);if(g>e){s=0;var w=0,y=g-e,m=1<<y;for(o.sort(function(t,n){return p[n.s]-p[t.s]||t.f-n.f});s<a;++s){var b=o[s].s;if(!(p[b]>e))break;w+=m-(1<<g-p[b]),p[b]=e}for(w>>=y;w>0;){var M=o[s].s;p[M]<e?w-=1<<e-p[M]++-1:++s}for(;s>=0&&w;--s){var E=o[s].s;p[E]==e&&(--p[E],++w)}g=e}return{t:new t(p),l:g}},A=function(t,n,r){return-1==t.s?Math.max(A(t.l,n,r+1),A(t.r,n,r+1)):n[t.s]=r},D=function(t){for(var r=t.length;r&&!t[--r];);for(var e=new n(++r),i=0,s=t[0],a=1,o=function(t){e[i++]=t},h=1;h<=r;++h)if(t[h]==s&&h!=r)++a;else{if(!s&&a>2){for(;a>138;a-=138)o(32754);a>2&&(o(a>10?a-11<<5|28690:a-3<<5|12305),a=0)}else if(a>3){for(o(s),--a;a>6;a-=6)o(8304);a>2&&(o(a-3<<5|8208),a=0)}for(;a--;)o(s);a=1,s=t[h]}return{c:e.subarray(0,i),n:r}},T=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},k=function(t,n,r){var e=r.length,i=m(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var s=0;s<e;++s)t[i+s+4]=r[s];return 8*(i+4+e)},U=function(t,r,a,o,h,f,l,u,c,v,m){z(r,m++,a),++h[256];for(var b=x(h,15),M=b.t,E=b.l,A=x(f,15),U=A.t,C=A.l,F=D(M),I=F.c,S=F.n,L=D(U),O=L.c,j=L.n,q=new n(19),B=0;B<I.length;++B)++q[31&I[B]];for(B=0;B<O.length;++B)++q[31&O[B]];for(var G=x(q,7),H=G.t,J=G.l,K=19;K>4&&!H[s[K-1]];--K);var N,P,Q,R,V=v+5<<3,W=T(h,p)+T(f,g)+l,X=T(h,M)+T(f,U)+l+14+3*K+T(q,H)+2*q[16]+3*q[17]+7*q[18];if(c>=0&&V<=W&&V<=X)return k(r,m,t.subarray(c,c+v));if(z(r,m,1+(X<W)),m+=2,X<W){N=d(M,E,0),P=M,Q=d(U,C,0),R=U;var Y=d(H,J,0);z(r,m,S-257),z(r,m+5,j-1),z(r,m+10,K-4),m+=14;for(B=0;B<K;++B)z(r,m+3*B,H[s[B]]);m+=3*K;for(var Z=[I,O],$=0;$<2;++$){var tt=Z[$];for(B=0;B<tt.length;++B){var nt=31&tt[B];z(r,m,Y[nt]),m+=H[nt],nt>15&&(z(r,m,tt[B]>>5&127),m+=tt[B]>>12)}}}else N=w,P=p,Q=y,R=g;for(B=0;B<u;++B){var rt=o[B];if(rt>255){_(r,m,N[(nt=rt>>18&31)+257]),m+=P[nt+257],nt>7&&(z(r,m,rt>>23&31),m+=e[nt]);var et=31&rt;_(r,m,Q[et]),m+=R[et],et>3&&(_(r,m,rt>>5&8191),m+=i[et])}else _(r,m,N[rt]),m+=P[rt]}return _(r,m,N[256]),m+P[256]},C=new r([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),F=new t(0),I=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),S=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,s=0|r.length,a=0;a!=s;){for(var o=Math.min(a+2655,s);a<o;++a)i+=e+=r[a];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},L=function(s,a,o,h,u){if(!u&&(u={l:1},a.dictionary)){var c=a.dictionary.subarray(-32768),v=new t(c.length+s.length);v.set(c),v.set(s,c.length),s=v,u.w=c.length}return function(s,a,o,h,u,c){var v=c.z||s.length,d=new t(h+v+5*(1+Math.ceil(v/7e3))+u),p=d.subarray(h,d.length-u),g=c.l,w=7&(c.r||0);if(a){w&&(p[0]=c.r>>3);for(var y=C[a-1],M=y>>13,E=8191&y,z=(1<<o)-1,_=c.p||new n(32768),x=c.h||new n(z+1),A=Math.ceil(o/3),D=2*A,T=function(t){return(s[t]^s[t+1]<<A^s[t+2]<<D)&z},F=new r(25e3),I=new n(288),S=new n(32),L=0,O=0,j=c.i||0,q=0,B=c.w||0,G=0;j+2<v;++j){var H=T(j),J=32767&j,K=x[H];if(_[J]=K,x[H]=J,B<=j){var N=v-j;if((L>7e3||q>24576)&&(N>423||!g)){w=U(s,p,0,F,I,S,O,q,G,j-G,w),q=L=O=0,G=j;for(var P=0;P<286;++P)I[P]=0;for(P=0;P<30;++P)S[P]=0}var Q=2,R=0,V=E,W=J-K&32767;if(N>2&&H==T(j-W))for(var X=Math.min(M,N)-1,Y=Math.min(32767,j),Z=Math.min(258,N);W<=Y&&--V&&J!=K;){if(s[j+Q]==s[j+Q-W]){for(var $=0;$<Z&&s[j+$]==s[j+$-W];++$);if($>Q){if(Q=$,R=W,$>X)break;var tt=Math.min(W,$-2),nt=0;for(P=0;P<tt;++P){var rt=j-W+P&32767,et=rt-_[rt]&32767;et>nt&&(nt=et,K=rt)}}}W+=(J=K)-(K=_[J])&32767}if(R){F[q++]=268435456|f[Q]<<18|l[R];var it=31&f[Q],st=31&l[R];O+=e[it]+i[st],++I[257+it],++S[st],B=j+Q,++L}else F[q++]=s[j],++I[s[j]]}}for(j=Math.max(j,B);j<v;++j)F[q++]=s[j],++I[s[j]];w=U(s,p,g,F,I,S,O,q,G,j-G,w),g||(c.r=7&w|p[w/8|0]<<3,w-=7,c.h=x,c.p=_,c.i=j,c.w=B)}else{for(j=c.w||0;j<v+g;j+=65535){var at=j+65535;at>=v&&(p[w/8|0]=g,at=v),w=k(p,w+1,s.subarray(j,at))}c.i=v}return b(d,0,h+m(w)+u)}(s,null==a.level?6:a.level,null==a.mem?u.l?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(s.length)))):20:12+a.mem,o,h,u)},O=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},j=function(){function n(n,r){if("function"==typeof n&&(r=n,n={}),this.ondata=r,this.o=n||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new t(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return n.prototype.p=function(t,n){this.ondata(L(t,this.o,0,0,this.s),n)},n.prototype.push=function(n,r){this.ondata||E(5),this.s.l&&E(4);var e=n.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new t(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var s=this.b.length-this.s.z;this.b.set(n.subarray(0,s),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(n.subarray(s),32768),this.s.z=n.length-s+32768,this.s.i=32766,this.s.w=32768}else this.b.set(n,this.s.z),this.s.z+=n.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},n.prototype.flush=function(){this.ondata||E(5),this.s.l&&E(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2},n}();function q(t,n){n||(n={});var r=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=I[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}}(),e=t.length;r.p(t);var i,s=L(t,n,10+((i=n).filename?i.filename.length+1:0),8),a=s.length;return function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&O(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}}(s,n),O(s,a-8,r.d()),O(s,a-4,e),s}var B=function(){function t(t,n){this.c=S(),this.v=1,j.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),j.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=L(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=S();i.p(n.dictionary),O(t,2,i.d())}}(r,this.o),this.v=0),n&&O(r,r.length-4,this.c.d()),this.ondata(r,n)},t.prototype.flush=function(){j.prototype.flush.call(this)},t}(),G="undefined"!=typeof TextEncoder&&new TextEncoder,H="undefined"!=typeof TextDecoder&&new TextDecoder;try{H.decode(F,{stream:!0})}catch(t){}var J=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||E(5),this.d&&E(4),this.ondata(K(t),this.d=n||!1)},t}();function K(n,r){if(G)return G.encode(n);for(var e=n.length,i=new t(n.length+(n.length>>1)),s=0,a=function(t){i[s++]=t},o=0;o<e;++o){if(s+5>i.length){var h=new t(s+8+(e-o<<1));h.set(i),i=h}var f=n.charCodeAt(o);f<128||r?a(f):f<2048?(a(192|f>>6),a(128|63&f)):f>55295&&f<57344?(a(240|(f=65536+(1047552&f)|1023&n.charCodeAt(++o))>>18),a(128|f>>12&63),a(128|f>>6&63),a(128|63&f)):(a(224|f>>12),a(128|f>>6&63),a(128|63&f))}return b(i,0,s)}const N=new class{constructor(){this._init()}clear(){this._init()}addEvent(t){if(!t)throw new Error("Adding invalid event");const n=this._hasEvents?",":"";this.stream.push(n+t),this._hasEvents=!0}finish(){this.stream.push("]",!0);const t=function(t){let n=0;for(const r of t)n+=r.length;const r=new Uint8Array(n);for(let n=0,e=0,i=t.length;n<i;n++){const i=t[n];r.set(i,e),e+=i.length}return r}(this._deflatedData);return this._init(),t}_init(){this._hasEvents=!1,this._deflatedData=[],this.deflate=new B,this.deflate.ondata=(t,n)=>{this._deflatedData.push(t)},this.stream=new J((t,n)=>{this.deflate.push(t,n)}),this.stream.push("[")}},P={clear:()=>{N.clear()},addEvent:t=>N.addEvent(t),finish:()=>N.finish(),compress:t=>function(t){return q(K(t))}(t)};addEventListener("message",function(t){const n=t.data.method,r=t.data.id,e=t.data.arg;if(n in P&&"function"==typeof P[n])try{const t=P[n](e);postMessage({id:r,method:n,success:!0,response:t})}catch(t){postMessage({id:r,method:n,success:!1,response:t.message}),console.error(t)}}),postMessage({id:void 0,method:"init",success:!0,response:void 0});`;

function e(){const e=new Blob([r]);return URL.createObjectURL(e)}

const CONSOLE_LEVELS = ['log', 'warn', 'error'] ;
const PREFIX = '[Replay] ';

function _addBreadcrumb(message, level = 'info') {
  core.addBreadcrumb(
    {
      category: 'console',
      data: {
        logger: 'replay',
      },
      level,
      message: `${PREFIX}${message}`,
    },
    { level },
  );
}

function makeReplayDebugLogger() {
  let _capture = false;
  let _trace = false;

  const _debug = {
    exception: () => undefined,
    infoTick: () => undefined,
    setConfig: (opts) => {
      _capture = !!opts.captureExceptions;
      _trace = !!opts.traceInternals;
    },
  };

  if (DEBUG_BUILD) {
    CONSOLE_LEVELS.forEach(name => {
      _debug[name] = (...args) => {
        core.debug[name](PREFIX, ...args);
        if (_trace) {
          _addBreadcrumb(args.join(''), core.severityLevelFromString(name));
        }
      };
    });

    _debug.exception = (error, ...message) => {
      if (message.length && _debug.error) {
        _debug.error(...message);
      }

      core.debug.error(PREFIX, error);

      if (_capture) {
        core.captureException(error, {
          mechanism: {
            handled: true,
            type: 'auto.function.replay.debug',
          },
        });
      } else if (_trace) {
        // No need for a breadcrumb if `_capture` is enabled since it should be
        // captured as an exception
        _addBreadcrumb(error, 'error');
      }
    };

    _debug.infoTick = (...args) => {
      core.debug.log(PREFIX, ...args);
      if (_trace) {
        // Wait a tick here to avoid race conditions for some initial logs
        // which may be added before replay is initialized
        setTimeout(() => _addBreadcrumb(args[0]), 0);
      }
    };
  } else {
    CONSOLE_LEVELS.forEach(name => {
      _debug[name] = () => undefined;
    });
  }

  return _debug ;
}

const debug = makeReplayDebugLogger();

/** This error indicates that the event buffer size exceeded the limit.. */
class EventBufferSizeExceededError extends Error {
   constructor() {
    super(`Event buffer exceeded maximum size of ${REPLAY_MAX_EVENT_BUFFER_SIZE}.`);
  }
}

/**
 * A basic event buffer that does not do any compression.
 * Used as fallback if the compression worker cannot be loaded or is disabled.
 */
class EventBufferArray  {
  /** All the events that are buffered to be sent. */

  /** @inheritdoc */

  /** @inheritdoc */

   constructor() {
    this.events = [];
    this._totalSize = 0;
    this.hasCheckout = false;
    this.waitForCheckout = false;
  }

  /** @inheritdoc */
   get hasEvents() {
    return this.events.length > 0;
  }

  /** @inheritdoc */
   get type() {
    return 'sync';
  }

  /** @inheritdoc */
   destroy() {
    this.events = [];
  }

  /** @inheritdoc */
   async addEvent(event) {
    const eventSize = JSON.stringify(event).length;
    this._totalSize += eventSize;
    if (this._totalSize > REPLAY_MAX_EVENT_BUFFER_SIZE) {
      throw new EventBufferSizeExceededError();
    }

    this.events.push(event);
  }

  /** @inheritdoc */
   finish() {
    return new Promise(resolve => {
      // Make a copy of the events array reference and immediately clear the
      // events member so that we do not lose new events while uploading
      // attachment.
      const eventsRet = this.events;
      this.clear();
      resolve(JSON.stringify(eventsRet));
    });
  }

  /** @inheritdoc */
   clear() {
    this.events = [];
    this._totalSize = 0;
    this.hasCheckout = false;
  }

  /** @inheritdoc */
   getEarliestTimestamp() {
    const timestamp = this.events.map(event => event.timestamp).sort()[0];

    if (!timestamp) {
      return null;
    }

    return timestampToMs(timestamp);
  }
}

/**
 * Event buffer that uses a web worker to compress events.
 * Exported only for testing.
 */
class WorkerHandler {

   constructor(worker) {
    this._worker = worker;
    this._id = 0;
  }

  /**
   * Ensure the worker is ready (or not).
   * This will either resolve when the worker is ready, or reject if an error occurred.
   */
   ensureReady() {
    // Ensure we only check once
    if (this._ensureReadyPromise) {
      return this._ensureReadyPromise;
    }

    this._ensureReadyPromise = new Promise((resolve, reject) => {
      this._worker.addEventListener(
        'message',
        ({ data }) => {
          if ((data ).success) {
            resolve();
          } else {
            reject();
          }
        },
        { once: true },
      );

      this._worker.addEventListener(
        'error',
        error => {
          reject(error);
        },
        { once: true },
      );
    });

    return this._ensureReadyPromise;
  }

  /**
   * Destroy the worker.
   */
   destroy() {
    DEBUG_BUILD && debug.log('Destroying compression worker');
    this._worker.terminate();
  }

  /**
   * Post message to worker and wait for response before resolving promise.
   */
   postMessage(method, arg) {
    const id = this._getAndIncrementId();

    return new Promise((resolve, reject) => {
      const listener = ({ data }) => {
        const response = data ;
        if (response.method !== method) {
          return;
        }

        // There can be multiple listeners for a single method, the id ensures
        // that the response matches the caller.
        if (response.id !== id) {
          return;
        }

        // At this point, we'll always want to remove listener regardless of result status
        this._worker.removeEventListener('message', listener);

        if (!response.success) {
          // TODO: Do some error handling, not sure what
          DEBUG_BUILD && debug.error('Error in compression worker: ', response.response);

          reject(new Error('Error in compression worker'));
          return;
        }

        resolve(response.response );
      };

      // Note: we can't use `once` option because it's possible it needs to
      // listen to multiple messages
      this._worker.addEventListener('message', listener);
      this._worker.postMessage({ id, method, arg });
    });
  }

  /** Get the current ID and increment it for the next call. */
   _getAndIncrementId() {
    return this._id++;
  }
}

/**
 * Event buffer that uses a web worker to compress events.
 * Exported only for testing.
 */
class EventBufferCompressionWorker  {
  /** @inheritdoc */

  /** @inheritdoc */

   constructor(worker) {
    this._worker = new WorkerHandler(worker);
    this._earliestTimestamp = null;
    this._totalSize = 0;
    this.hasCheckout = false;
    this.waitForCheckout = false;
  }

  /** @inheritdoc */
   get hasEvents() {
    return !!this._earliestTimestamp;
  }

  /** @inheritdoc */
   get type() {
    return 'worker';
  }

  /**
   * Ensure the worker is ready (or not).
   * This will either resolve when the worker is ready, or reject if an error occurred.
   */
   ensureReady() {
    return this._worker.ensureReady();
  }

  /**
   * Destroy the event buffer.
   */
   destroy() {
    this._worker.destroy();
  }

  /**
   * Add an event to the event buffer.
   *
   * Returns true if event was successfully received and processed by worker.
   */
   addEvent(event) {
    const timestamp = timestampToMs(event.timestamp);
    if (!this._earliestTimestamp || timestamp < this._earliestTimestamp) {
      this._earliestTimestamp = timestamp;
    }

    const data = JSON.stringify(event);
    this._totalSize += data.length;

    if (this._totalSize > REPLAY_MAX_EVENT_BUFFER_SIZE) {
      return Promise.reject(new EventBufferSizeExceededError());
    }

    return this._sendEventToWorker(data);
  }

  /**
   * Finish the event buffer and return the compressed data.
   */
   finish() {
    return this._finishRequest();
  }

  /** @inheritdoc */
   clear() {
    this._earliestTimestamp = null;
    this._totalSize = 0;
    this.hasCheckout = false;

    // We do not wait on this, as we assume the order of messages is consistent for the worker
    this._worker.postMessage('clear').then(null, e => {
      DEBUG_BUILD && debug.exception(e, 'Sending "clear" message to worker failed', e);
    });
  }

  /** @inheritdoc */
   getEarliestTimestamp() {
    return this._earliestTimestamp;
  }

  /**
   * Send the event to the worker.
   */
   _sendEventToWorker(data) {
    return this._worker.postMessage('addEvent', data);
  }

  /**
   * Finish the request and return the compressed data from the worker.
   */
   async _finishRequest() {
    const response = await this._worker.postMessage('finish');

    this._earliestTimestamp = null;
    this._totalSize = 0;

    return response;
  }
}

/**
 * This proxy will try to use the compression worker, and fall back to use the simple buffer if an error occurs there.
 * This can happen e.g. if the worker cannot be loaded.
 * Exported only for testing.
 */
class EventBufferProxy  {

   constructor(worker) {
    this._fallback = new EventBufferArray();
    this._compression = new EventBufferCompressionWorker(worker);
    this._used = this._fallback;

    this._ensureWorkerIsLoadedPromise = this._ensureWorkerIsLoaded();
  }

  /** @inheritdoc */
   get waitForCheckout() {
    return this._used.waitForCheckout;
  }

  /** @inheritdoc */
   get type() {
    return this._used.type;
  }

  /** @inheritDoc */
   get hasEvents() {
    return this._used.hasEvents;
  }

  /** @inheritdoc */
   get hasCheckout() {
    return this._used.hasCheckout;
  }
  /** @inheritdoc */
   set hasCheckout(value) {
    this._used.hasCheckout = value;
  }

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
   set waitForCheckout(value) {
    this._used.waitForCheckout = value;
  }

  /** @inheritDoc */
   destroy() {
    this._fallback.destroy();
    this._compression.destroy();
  }

  /** @inheritdoc */
   clear() {
    return this._used.clear();
  }

  /** @inheritdoc */
   getEarliestTimestamp() {
    return this._used.getEarliestTimestamp();
  }

  /**
   * Add an event to the event buffer.
   *
   * Returns true if event was successfully added.
   */
   addEvent(event) {
    return this._used.addEvent(event);
  }

  /** @inheritDoc */
   async finish() {
    // Ensure the worker is loaded, so the sent event is compressed
    await this.ensureWorkerIsLoaded();

    return this._used.finish();
  }

  /** Ensure the worker has loaded. */
   ensureWorkerIsLoaded() {
    return this._ensureWorkerIsLoadedPromise;
  }

  /** Actually check if the worker has been loaded. */
   async _ensureWorkerIsLoaded() {
    try {
      await this._compression.ensureReady();
    } catch (error) {
      // If the worker fails to load, we fall back to the simple buffer.
      // Nothing more to do from our side here
      DEBUG_BUILD && debug.exception(error, 'Failed to load the compression worker, falling back to simple buffer');
      return;
    }

    // Now we need to switch over the array buffer to the compression worker
    await this._switchToCompressionWorker();
  }

  /** Switch the used buffer to the compression worker. */
   async _switchToCompressionWorker() {
    const { events, hasCheckout, waitForCheckout } = this._fallback;

    const addEventPromises = [];
    for (const event of events) {
      addEventPromises.push(this._compression.addEvent(event));
    }

    this._compression.hasCheckout = hasCheckout;
    this._compression.waitForCheckout = waitForCheckout;

    // We switch over to the new buffer immediately - any further events will be added
    // after the previously buffered ones
    this._used = this._compression;

    // Wait for original events to be re-added before resolving
    try {
      await Promise.all(addEventPromises);

      // Can now clear fallback buffer as it's no longer necessary
      this._fallback.clear();
    } catch (error) {
      DEBUG_BUILD && debug.exception(error, 'Failed to add events when switching buffers.');
    }
  }
}

/**
 * Create an event buffer for replays.
 */
function createEventBuffer({
  useCompression,
  workerUrl: customWorkerUrl,
}) {
  if (
    useCompression &&
    // eslint-disable-next-line no-restricted-globals
    window.Worker
  ) {
    const worker = _loadWorker(customWorkerUrl);

    if (worker) {
      return worker;
    }
  }

  DEBUG_BUILD && debug.log('Using simple buffer');
  return new EventBufferArray();
}

function _loadWorker(customWorkerUrl) {
  try {
    const workerUrl = customWorkerUrl || _getWorkerUrl();

    if (!workerUrl) {
      return;
    }

    DEBUG_BUILD && debug.log(`Using compression worker${customWorkerUrl ? ` from ${customWorkerUrl}` : ''}`);
    const worker = new Worker(workerUrl);
    return new EventBufferProxy(worker);
  } catch (error) {
    DEBUG_BUILD && debug.exception(error, 'Failed to create compression worker');
    // Fall back to use simple event buffer array
  }
}

function _getWorkerUrl() {
  if (typeof __SENTRY_EXCLUDE_REPLAY_WORKER__ === 'undefined' || !__SENTRY_EXCLUDE_REPLAY_WORKER__) {
    return e();
  }

  return '';
}

/** If sessionStorage is available. */
function hasSessionStorage() {
  try {
    // This can throw, e.g. when being accessed in a sandboxed iframe
    return 'sessionStorage' in WINDOW && !!WINDOW.sessionStorage;
  } catch {
    return false;
  }
}

/**
 * Removes the session from Session Storage and unsets session in replay instance
 */
function clearSession(replay) {
  deleteSession();
  replay.session = undefined;
}

/**
 * Deletes a session from storage
 */
function deleteSession() {
  if (!hasSessionStorage()) {
    return;
  }

  try {
    WINDOW.sessionStorage.removeItem(REPLAY_SESSION_KEY);
  } catch {
    // Ignore potential SecurityError exceptions
  }
}

/**
 * Given a sample rate, returns true if replay should be sampled.
 *
 * 1.0 = 100% sampling
 * 0.0 = 0% sampling
 */
function isSampled(sampleRate) {
  if (sampleRate === undefined) {
    return false;
  }

  // Math.random() returns a number in range of 0 to 1 (inclusive of 0, but not 1)
  return Math.random() < sampleRate;
}

/**
 * Save a session to session storage.
 */
function saveSession(session) {
  if (!hasSessionStorage()) {
    return;
  }

  try {
    WINDOW.sessionStorage.setItem(REPLAY_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore potential SecurityError exceptions
  }
}

/**
 * Get a session with defaults & applied sampling.
 */
function makeSession(session) {
  const now = Date.now();
  const id = session.id || core.uuid4();
  // Note that this means we cannot set a started/lastActivity of `0`, but this should not be relevant outside of tests.
  const started = session.started || now;
  const lastActivity = session.lastActivity || now;
  const segmentId = session.segmentId || 0;
  const sampled = session.sampled;
  const previousSessionId = session.previousSessionId;
  const dirty = session.dirty || false;

  return {
    id,
    started,
    lastActivity,
    segmentId,
    sampled,
    previousSessionId,
    dirty,
  };
}

/**
 * Get the sampled status for a session based on sample rates & current sampled status.
 */
function getSessionSampleType(sessionSampleRate, allowBuffering) {
  return isSampled(sessionSampleRate) ? 'session' : allowBuffering ? 'buffer' : false;
}

/**
 * Create a new session, which in its current implementation is a Sentry event
 * that all replays will be saved to as attachments. Currently, we only expect
 * one of these Sentry events per "replay session".
 */
function createSession(
  { sessionSampleRate, allowBuffering, stickySession = false },
  { previousSessionId } = {},
) {
  const sampled = getSessionSampleType(sessionSampleRate, allowBuffering);
  const session = makeSession({
    sampled,
    previousSessionId,
  });

  if (stickySession) {
    saveSession(session);
  }

  return session;
}

/**
 * Fetches a session from storage
 */
function fetchSession() {
  if (!hasSessionStorage()) {
    return null;
  }

  try {
    // This can throw if cookies are disabled
    const sessionStringFromStorage = WINDOW.sessionStorage.getItem(REPLAY_SESSION_KEY);

    if (!sessionStringFromStorage) {
      return null;
    }

    const sessionObj = JSON.parse(sessionStringFromStorage) ;

    DEBUG_BUILD && debug.infoTick('Loading existing session');

    return makeSession(sessionObj);
  } catch {
    return null;
  }
}

/**
 * Given an initial timestamp and an expiry duration, checks to see if current
 * time should be considered as expired.
 */
function isExpired(
  initialTime,
  expiry,
  targetTime = +new Date(),
) {
  // Always expired if < 0
  if (initialTime === null || expiry === undefined || expiry < 0) {
    return true;
  }

  // Never expires if == 0
  if (expiry === 0) {
    return false;
  }

  return initialTime + expiry <= targetTime;
}

/**
 * Checks to see if session is expired
 */
function isSessionExpired(
  session,
  {
    maxReplayDuration,
    sessionIdleExpire,
    targetTime = Date.now(),
  },
) {
  return (
    // First, check that maximum session length has not been exceeded
    isExpired(session.started, maxReplayDuration, targetTime) ||
    // check that the idle timeout has not been exceeded (i.e. user has
    // performed an action within the last `sessionIdleExpire` ms)
    isExpired(session.lastActivity, sessionIdleExpire, targetTime)
  );
}

/** If the session should be refreshed or not. */
function shouldRefreshSession(
  session,
  { sessionIdleExpire, maxReplayDuration },
) {
  // If not expired, all good, just keep the session
  if (!isSessionExpired(session, { sessionIdleExpire, maxReplayDuration })) {
    return false;
  }

  // If we are buffering & haven't ever flushed yet, always continue
  if (session.sampled === 'buffer' && session.segmentId === 0) {
    return false;
  }

  return true;
}

/**
 * Get or create a session, when initializing the replay.
 * Returns a session that may be unsampled.
 */
function loadOrCreateSession(
  {
    sessionIdleExpire,
    maxReplayDuration,
    previousSessionId,
  }

,
  sessionOptions,
) {
  const existingSession = sessionOptions.stickySession && fetchSession();

  // No session exists yet, just create a new one
  if (!existingSession) {
    DEBUG_BUILD && debug.infoTick('Creating new session');
    return createSession(sessionOptions, { previousSessionId });
  }

  if (!shouldRefreshSession(existingSession, { sessionIdleExpire, maxReplayDuration })) {
    return existingSession;
  }

  DEBUG_BUILD && debug.infoTick('Session in sessionStorage is expired, creating new one...');
  return createSession(sessionOptions, { previousSessionId: existingSession.id });
}

function isCustomEvent(event) {
  return event.type === EventType.Custom;
}

/**
 * Add an event to the event buffer.
 * In contrast to `addEvent`, this does not return a promise & does not wait for the adding of the event to succeed/fail.
 * Instead this returns `true` if we tried to add the event, else false.
 * It returns `false` e.g. if we are paused, disabled, or out of the max replay duration.
 *
 * `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
 */
function addEventSync(replay, event, isCheckout) {
  if (!shouldAddEvent(replay, event)) {
    return false;
  }

  // This should never reject
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  _addEvent(replay, event, isCheckout);

  return true;
}

/**
 * Add an event to the event buffer.
 * Resolves to `null` if no event was added, else to `void`.
 *
 * `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
 */
function addEvent(
  replay,
  event,
  isCheckout,
) {
  if (!shouldAddEvent(replay, event)) {
    return Promise.resolve(null);
  }

  return _addEvent(replay, event, isCheckout);
}

async function _addEvent(
  replay,
  event,
  isCheckout,
) {
  const { eventBuffer } = replay;

  if (!eventBuffer || (eventBuffer.waitForCheckout && !isCheckout)) {
    return null;
  }

  const isBufferMode = replay.recordingMode === 'buffer';

  try {
    if (isCheckout && isBufferMode) {
      eventBuffer.clear();
    }

    if (isCheckout) {
      eventBuffer.hasCheckout = true;
      eventBuffer.waitForCheckout = false;
    }

    const replayOptions = replay.getOptions();

    const eventAfterPossibleCallback = maybeApplyCallback(event, replayOptions.beforeAddRecordingEvent);

    if (!eventAfterPossibleCallback) {
      return;
    }

    return await eventBuffer.addEvent(eventAfterPossibleCallback);
  } catch (error) {
    const isExceeded = error && error instanceof EventBufferSizeExceededError;
    const reason = isExceeded ? 'addEventSizeExceeded' : 'addEvent';
    const client = core.getClient();

    if (client) {
      // We are limited in the drop reasons:
      // https://github.com/getsentry/snuba/blob/6c73be60716c2fb1c30ca627883207887c733cbd/rust_snuba/src/processors/outcomes.rs#L39
      const dropReason = isExceeded ? 'buffer_overflow' : 'internal_sdk_error';
      client.recordDroppedEvent(dropReason, 'replay');
    }

    if (isExceeded && isBufferMode) {
      // Clear buffer and wait for next checkout
      eventBuffer.clear();
      eventBuffer.waitForCheckout = true;

      return null;
    }

    replay.handleException(error);

    await replay.stop({ reason });
  }
}

/** Exported only for tests. */
function shouldAddEvent(replay, event) {
  if (!replay.eventBuffer || replay.isPaused() || !replay.isEnabled()) {
    return false;
  }

  const timestampInMs = timestampToMs(event.timestamp);

  // Throw out events that happen more than 5 minutes ago. This can happen if
  // page has been left open and idle for a long period of time and user
  // comes back to trigger a new session. The performance entries rely on
  // `performance.timeOrigin`, which is when the page first opened.
  if (timestampInMs + replay.timeouts.sessionIdlePause < Date.now()) {
    return false;
  }

  // Throw out events that are +60min from the initial timestamp
  if (timestampInMs > replay.getContext().initialTimestamp + replay.getOptions().maxReplayDuration) {
    DEBUG_BUILD &&
      debug.infoTick(`Skipping event with timestamp ${timestampInMs} because it is after maxReplayDuration`);
    return false;
  }

  return true;
}

function maybeApplyCallback(
  event,
  callback,
) {
  try {
    if (typeof callback === 'function' && isCustomEvent(event)) {
      return callback(event);
    }
  } catch (error) {
    DEBUG_BUILD &&
      debug.exception(error, 'An error occurred in the `beforeAddRecordingEvent` callback, skipping the event...');
    return null;
  }

  return event;
}

/** If the event is an error event */
function isErrorEvent(event) {
  return !event.type;
}

/** If the event is a transaction event */
function isTransactionEvent(event) {
  return event.type === 'transaction';
}

/** If the event is an replay event */
function isReplayEvent(event) {
  return event.type === 'replay_event';
}

/** If the event is a feedback event */
function isFeedbackEvent(event) {
  return event.type === 'feedback';
}

/**
 * Returns a listener to be added to `client.on('afterSendErrorEvent, listener)`.
 */
function handleAfterSendEvent(replay) {
  return (event, sendResponse) => {
    if (!replay.isEnabled() || (!isErrorEvent(event) && !isTransactionEvent(event))) {
      return;
    }

    const statusCode = sendResponse.statusCode;

    // We only want to do stuff on successful error sending, otherwise you get error replays without errors attached
    // We skip if we encountered an non-OK status code
    if (!statusCode || statusCode < 200 || statusCode >= 300) {
      return;
    }

    if (isTransactionEvent(event)) {
      handleTransactionEvent(replay, event);
      return;
    }

    handleErrorEvent(replay, event);
  };
}

function handleTransactionEvent(replay, event) {
  const replayContext = replay.getContext();

  // Collect traceIds in _context regardless of `recordingMode`
  // In error mode, _context gets cleared on every checkout
  // We limit to max. 100 transactions linked
  if (event.contexts?.trace?.trace_id && replayContext.traceIds.size < 100) {
    replayContext.traceIds.add(event.contexts.trace.trace_id);
  }
}

function handleErrorEvent(replay, event) {
  const replayContext = replay.getContext();

  // Add error to list of errorIds of replay. This is ok to do even if not
  // sampled because context will get reset at next checkout.
  // XXX: There is also a race condition where it's possible to capture an
  // error to Sentry before Replay SDK has loaded, but response returns after
  // it was loaded, and this gets called.
  // We limit to max. 100 errors linked
  if (event.event_id && replayContext.errorIds.size < 100) {
    replayContext.errorIds.add(event.event_id);
  }

  // If error event is tagged with replay id it means it was sampled (when in buffer mode)
  // Need to be very careful that this does not cause an infinite loop
  if (replay.recordingMode !== 'buffer' || !event.tags || !event.tags.replayId) {
    return;
  }

  const { beforeErrorSampling } = replay.getOptions();
  if (typeof beforeErrorSampling === 'function' && !beforeErrorSampling(event)) {
    return;
  }

  browserUtils.setTimeout(async () => {
    try {
      // Capture current event buffer as new replay
      await replay.sendBufferedReplayOrFlush();
    } catch (err) {
      replay.handleException(err);
    }
  });
}

/**
 * Returns a listener to be added to `client.on('afterSendErrorEvent, listener)`.
 */
function handleBeforeSendEvent(replay) {
  return (event) => {
    if (!replay.isEnabled() || !isErrorEvent(event)) {
      return;
    }

    handleHydrationError(replay, event);
  };
}

function handleHydrationError(replay, event) {
  const exceptionValue = event.exception?.values?.[0]?.value;
  if (typeof exceptionValue !== 'string') {
    return;
  }

  if (
    // Only matches errors in production builds of react-dom
    // Example https://reactjs.org/docs/error-decoder.html?invariant=423
    // With newer React versions, the messages changed to a different website https://react.dev/errors/418
    exceptionValue.match(
      /(reactjs\.org\/docs\/error-decoder\.html\?invariant=|react\.dev\/errors\/)(418|419|422|423|425)/,
    ) ||
    // Development builds of react-dom
    // Error 1: Hydration failed because the initial UI does not match what was rendered on the server.
    // Error 2: Text content does not match server-rendered HTML. Warning: Text content did not match.
    exceptionValue.match(/(does not match server-rendered HTML|Hydration failed because)/i)
  ) {
    const breadcrumb = createBreadcrumb({
      category: 'replay.hydrate-error',
      data: {
        url: core.getLocationHref(),
      },
    });
    addBreadcrumbEvent(replay, breadcrumb);
  }
}

/**
 * Handle breadcrumbs that Sentry captures, and make sure to capture relevant breadcrumbs to Replay as well.
 */
function handleBreadcrumbs(replay) {
  const client = core.getClient();

  if (!client) {
    return;
  }

  client.on('beforeAddBreadcrumb', breadcrumb => beforeAddBreadcrumb(replay, breadcrumb));
}

function beforeAddBreadcrumb(replay, breadcrumb) {
  if (!replay.isEnabled() || !isBreadcrumbWithCategory(breadcrumb)) {
    return;
  }

  const result = normalizeBreadcrumb(breadcrumb);
  if (result) {
    addBreadcrumbEvent(replay, result);
  }
}

/** Exported only for tests. */
function normalizeBreadcrumb(breadcrumb) {
  if (
    !isBreadcrumbWithCategory(breadcrumb) ||
    [
      // fetch & xhr are handled separately,in handleNetworkBreadcrumbs
      'fetch',
      'xhr',
      // These two are breadcrumbs for emitted sentry events, we don't care about them
      'sentry.event',
      'sentry.transaction',
    ].includes(breadcrumb.category) ||
    // We capture UI breadcrumbs separately
    breadcrumb.category.startsWith('ui.')
  ) {
    return null;
  }

  if (breadcrumb.category === 'console') {
    return normalizeConsoleBreadcrumb(breadcrumb);
  }

  return createBreadcrumb(breadcrumb);
}

/** exported for tests only */
function normalizeConsoleBreadcrumb(
  breadcrumb,
) {
  const args = breadcrumb.data?.arguments;

  if (!Array.isArray(args) || args.length === 0) {
    return createBreadcrumb(breadcrumb);
  }

  let isTruncated = false;

  // Avoid giant args captures
  const normalizedArgs = args.map(arg => {
    if (!arg) {
      return arg;
    }
    if (typeof arg === 'string') {
      if (arg.length > CONSOLE_ARG_MAX_SIZE) {
        isTruncated = true;
        return `${arg.slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
      }

      return arg;
    }
    if (typeof arg === 'object') {
      try {
        const normalizedArg = core.normalize(arg, 7);
        const stringified = JSON.stringify(normalizedArg);
        if (stringified.length > CONSOLE_ARG_MAX_SIZE) {
          isTruncated = true;
          // We use the pretty printed JSON string here as a base
          return `${JSON.stringify(normalizedArg, null, 2).slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
        }
        return normalizedArg;
      } catch {
        // fall back to default
      }
    }

    return arg;
  });

  return createBreadcrumb({
    ...breadcrumb,
    data: {
      ...breadcrumb.data,
      arguments: normalizedArgs,
      ...(isTruncated ? { _meta: { warnings: ['CONSOLE_ARG_TRUNCATED'] } } : {}),
    },
  });
}

function isBreadcrumbWithCategory(breadcrumb) {
  return !!breadcrumb.category;
}

/**
 * Returns true if we think the given event is an error originating inside of rrweb.
 */
function isRrwebError(event, hint) {
  if (event.type || !event.exception?.values?.length) {
    return false;
  }

  // @ts-expect-error this may be set by rrweb when it finds errors
  if (hint.originalException?.__rrweb__) {
    return true;
  }

  return false;
}

/**
 * Reset the `replay_id` field on the DSC.
 */
function resetReplayIdOnDynamicSamplingContext() {
  // Reset DSC on the current scope, if there is one
  const dsc = core.getCurrentScope().getPropagationContext().dsc;
  if (dsc) {
    delete dsc.replay_id;
  }

  // Clear it from frozen DSC on the active span
  const activeSpan = core.getActiveSpan();
  if (activeSpan) {
    const dsc = core.getDynamicSamplingContextFromSpan(activeSpan);
    delete (dsc ).replay_id;
  }
}

/**
 * Add a feedback breadcrumb event to replay.
 */
function addFeedbackBreadcrumb(replay, event) {
  replay.triggerUserActivity();
  replay.addUpdate(() => {
    if (!event.timestamp) {
      // Ignore events that don't have timestamps (this shouldn't happen, more of a typing issue)
      // Return true here so that we don't flush
      return true;
    }

    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    replay.throttledAddEvent({
      type: EventType.Custom,
      timestamp: event.timestamp * 1000,
      data: {
        tag: 'breadcrumb',
        payload: {
          timestamp: event.timestamp,
          type: 'default',
          category: 'sentry.feedback',
          data: {
            feedbackId: event.event_id,
          },
        },
      },
    } );

    return false;
  });
}

/**
 * Determine if event should be sampled (only applies in buffer mode).
 * When an event is captured by `handleGlobalEvent`, when in buffer mode
 * we determine if we want to sample the error or not.
 */
function shouldSampleForBufferEvent(replay, event) {
  if (replay.recordingMode !== 'buffer') {
    return false;
  }

  // ignore this error because otherwise we could loop indefinitely with
  // trying to capture replay and failing
  if (event.message === UNABLE_TO_SEND_REPLAY) {
    return false;
  }

  // Require the event to be an error event & to have an exception
  if (!event.exception || event.type) {
    return false;
  }

  return isSampled(replay.getOptions().errorSampleRate);
}

/**
 * Returns a listener to be added to `addEventProcessor(listener)`.
 */
function handleGlobalEventListener(replay) {
  return Object.assign(
    (event, hint) => {
      // Do nothing if replay has been disabled or paused
      if (!replay.isEnabled() || replay.isPaused()) {
        return event;
      }

      if (isReplayEvent(event)) {
        // Replays have separate set of breadcrumbs, do not include breadcrumbs
        // from core SDK
        delete event.breadcrumbs;
        return event;
      }

      // We only want to handle errors, transactions, and feedbacks, nothing else
      if (!isErrorEvent(event) && !isTransactionEvent(event) && !isFeedbackEvent(event)) {
        return event;
      }

      // Ensure we do not add replay_id if the session is expired
      const isSessionActive = replay.checkAndHandleExpiredSession();
      if (!isSessionActive) {
        // prevent exceeding replay durations by removing the expired replayId from the DSC
        resetReplayIdOnDynamicSamplingContext();
        return event;
      }

      if (isFeedbackEvent(event)) {
        // This should never reject
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        replay.flush();
        event.contexts.feedback.replay_id = replay.getSessionId();
        // Add a replay breadcrumb for this piece of feedback
        addFeedbackBreadcrumb(replay, event);
        return event;
      }

      // Unless `captureExceptions` is enabled, we want to ignore errors coming from rrweb
      // As there can be a bunch of stuff going wrong in internals there, that we don't want to bubble up to users
      if (isRrwebError(event, hint) && !replay.getOptions()._experiments.captureExceptions) {
        DEBUG_BUILD && debug.log('Ignoring error from rrweb internals', event);
        return null;
      }

      // When in buffer mode, we decide to sample here.
      // Later, in `handleAfterSendEvent`, if the replayId is set, we know that we sampled
      // And convert the buffer session to a full session
      const isErrorEventSampled = shouldSampleForBufferEvent(replay, event);

      // Tag errors if it has been sampled in buffer mode, or if it is session mode
      // Only tag transactions if in session mode
      const shouldTagReplayId = isErrorEventSampled || replay.recordingMode === 'session';

      if (shouldTagReplayId) {
        event.tags = { ...event.tags, replayId: replay.getSessionId() };
      }

      // If we sampled this error in buffer mode, immediately mark the session as "sampled"
      // by changing the sampled state from 'buffer' to 'session'. Otherwise, if the application is interrupte
      // before `afterSendEvent` occurs, then the session would remain as "buffer" but we have an error event
      // that is tagged with a replay id. This could end up creating replays w/ excessive durations because
      // of the linked error.
      if (isErrorEventSampled && replay.recordingMode === 'buffer' && replay.session?.sampled === 'buffer') {
        const session = replay.session;
        session.dirty = true;
        // Save the session if sticky sessions are enabled to persist the state change
        if (replay.getOptions().stickySession) {
          saveSession(session);
        }
      }

      return event;
    },
    { id: 'Replay' },
  );
}

/**
 * Create a "span" for each performance entry.
 */
function createPerformanceSpans(
  replay,
  entries,
) {
  return entries.map(({ type, start, end, name, data }) => {
    const response = replay.throttledAddEvent({
      type: EventType.Custom,
      timestamp: start,
      data: {
        tag: 'performanceSpan',
        payload: {
          op: type,
          description: name,
          startTimestamp: start,
          endTimestamp: end,
          data,
        },
      },
    });

    // If response is a string, it means its either THROTTLED or SKIPPED
    return typeof response === 'string' ? Promise.resolve(null) : response;
  });
}

function handleHistory(handlerData) {
  const { from, to } = handlerData;

  const now = Date.now() / 1000;

  return {
    type: 'navigation.push',
    start: now,
    end: now,
    name: to,
    data: {
      previous: from,
    },
  };
}

/**
 * Returns a listener to be added to `addHistoryInstrumentationHandler(listener)`.
 */
function handleHistorySpanListener(replay) {
  return (handlerData) => {
    if (!replay.isEnabled()) {
      return;
    }

    const result = handleHistory(handlerData);

    if (result === null) {
      return;
    }

    // Need to collect visited URLs
    replay.getContext().urls.push(result.name);
    replay.triggerUserActivity();

    replay.addUpdate(() => {
      createPerformanceSpans(replay, [result]);
      // Returning false to flush
      return false;
    });
  };
}

/**
 * Check whether a given request URL should be filtered out. This is so we
 * don't log Sentry ingest requests.
 */
function shouldFilterRequest(replay, url) {
  // If we enabled the `traceInternals` experiment, we want to trace everything
  if (DEBUG_BUILD && replay.getOptions()._experiments.traceInternals) {
    return false;
  }

  return core.isSentryRequestUrl(url, core.getClient());
}

/** Add a performance entry breadcrumb */
function addNetworkBreadcrumb(
  replay,
  result,
) {
  if (!replay.isEnabled()) {
    return;
  }

  if (result === null) {
    return;
  }

  if (shouldFilterRequest(replay, result.name)) {
    return;
  }

  replay.addUpdate(() => {
    createPerformanceSpans(replay, [result]);
    // Returning true will cause `addUpdate` to not flush
    // We do not want network requests to cause a flush. This will prevent
    // recurring/polling requests from keeping the replay session alive.
    return true;
  });
}

/** Get the size of a body. */
function getBodySize(body) {
  if (!body) {
    return undefined;
  }

  const textEncoder = new TextEncoder();

  try {
    if (typeof body === 'string') {
      return textEncoder.encode(body).length;
    }

    if (body instanceof URLSearchParams) {
      return textEncoder.encode(body.toString()).length;
    }

    if (body instanceof FormData) {
      const formDataStr = browserUtils.serializeFormData(body);
      return textEncoder.encode(formDataStr).length;
    }

    if (body instanceof Blob) {
      return body.size;
    }

    if (body instanceof ArrayBuffer) {
      return body.byteLength;
    }

    // Currently unhandled types: ArrayBufferView, ReadableStream
  } catch {
    // just return undefined
  }

  return undefined;
}

/** Convert a Content-Length header to number/undefined.  */
function parseContentLengthHeader(header) {
  if (!header) {
    return undefined;
  }

  const size = parseInt(header, 10);
  return isNaN(size) ? undefined : size;
}

/** Merge a warning into an existing network request/response. */
function mergeWarning(
  info,
  warning,
) {
  if (!info) {
    return {
      headers: {},
      size: undefined,
      _meta: {
        warnings: [warning],
      },
    };
  }

  const newMeta = { ...info._meta };
  const existingWarnings = newMeta.warnings || [];
  newMeta.warnings = [...existingWarnings, warning];

  info._meta = newMeta;
  return info;
}

/** Convert ReplayNetworkRequestData to a PerformanceEntry. */
function makeNetworkReplayBreadcrumb(
  type,
  data,
) {
  if (!data) {
    return null;
  }

  const { startTimestamp, endTimestamp, url, method, statusCode, request, response } = data;

  const result = {
    type,
    start: startTimestamp / 1000,
    end: endTimestamp / 1000,
    name: url,
    data: {
      method,
      statusCode,
      request,
      response,
    },
  };

  return result;
}

/** Build the request or response part of a replay network breadcrumb that was skipped. */
function buildSkippedNetworkRequestOrResponse(bodySize) {
  return {
    headers: {},
    size: bodySize,
    _meta: {
      warnings: ['URL_SKIPPED'],
    },
  };
}

/** Build the request or response part of a replay network breadcrumb. */
function buildNetworkRequestOrResponse(
  headers,
  bodySize,
  body,
) {
  if (!bodySize && Object.keys(headers).length === 0) {
    return undefined;
  }

  if (!bodySize) {
    return {
      headers,
    };
  }

  if (!body) {
    return {
      headers,
      size: bodySize,
    };
  }

  const info = {
    headers,
    size: bodySize,
  };

  const { body: normalizedBody, warnings } = normalizeNetworkBody(body);
  info.body = normalizedBody;
  if (warnings?.length) {
    info._meta = {
      warnings,
    };
  }

  return info;
}

/** Filter a set of headers */
function getAllowedHeaders(headers, allowedHeaders) {
  return Object.entries(headers).reduce((filteredHeaders, [key, value]) => {
    const normalizedKey = key.toLowerCase();
    // Avoid putting empty strings into the headers
    if (allowedHeaders.includes(normalizedKey) && headers[key]) {
      filteredHeaders[normalizedKey] = value;
    }
    return filteredHeaders;
  }, {});
}

function normalizeNetworkBody(body)

 {
  if (!body || typeof body !== 'string') {
    return {
      body,
    };
  }

  const exceedsSizeLimit = body.length > NETWORK_BODY_MAX_SIZE;
  const isProbablyJson = _strIsProbablyJson(body);

  if (exceedsSizeLimit) {
    const truncatedBody = body.slice(0, NETWORK_BODY_MAX_SIZE);

    if (isProbablyJson) {
      return {
        body: truncatedBody,
        warnings: ['MAYBE_JSON_TRUNCATED'],
      };
    }

    return {
      body: `${truncatedBody}…`,
      warnings: ['TEXT_TRUNCATED'],
    };
  }

  if (isProbablyJson) {
    try {
      const jsonBody = JSON.parse(body);
      return {
        body: jsonBody,
      };
    } catch {
      // fall back to just send the body as string
    }
  }

  return {
    body,
  };
}

function _strIsProbablyJson(str) {
  const first = str[0];
  const last = str[str.length - 1];

  // Simple check: If this does not start & end with {} or [], it's not JSON
  return (first === '[' && last === ']') || (first === '{' && last === '}');
}

/** Match an URL against a list of strings/Regex. */
function urlMatches(url, urls) {
  const fullUrl = getFullUrl(url);

  return core.stringMatchesSomePattern(fullUrl, urls);
}

/** exported for tests */
function getFullUrl(url, baseURI = WINDOW.document.baseURI) {
  // Short circuit for common cases:
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith(WINDOW.location.origin)) {
    return url;
  }
  const fixedUrl = new URL(url, baseURI);

  // If these do not match, we are not dealing with a relative URL, so just return it
  if (fixedUrl.origin !== new URL(baseURI).origin) {
    return url;
  }

  const fullUrl = fixedUrl.href;

  // Remove trailing slashes, if they don't match the original URL
  if (!url.endsWith('/') && fullUrl.endsWith('/')) {
    return fullUrl.slice(0, -1);
  }

  return fullUrl;
}

/**
 * Capture a fetch breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
async function captureFetchBreadcrumbToReplay(
  breadcrumb,
  hint,
  options

,
) {
  try {
    const data = await _prepareFetchData(breadcrumb, hint, options);

    // Create a replay performance entry from this breadcrumb
    const result = makeNetworkReplayBreadcrumb('resource.fetch', data);
    addNetworkBreadcrumb(options.replay, result);
  } catch (error) {
    DEBUG_BUILD && debug.exception(error, 'Failed to capture fetch breadcrumb');
  }
}

/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
function enrichFetchBreadcrumb(
  breadcrumb,
  hint,
) {
  const { input, response } = hint;

  const body = input ? browserUtils.getFetchRequestArgBody(input) : undefined;
  const reqSize = getBodySize(body);

  const resSize = response ? parseContentLengthHeader(response.headers.get('content-length')) : undefined;

  if (reqSize !== undefined) {
    breadcrumb.data.request_body_size = reqSize;
  }
  if (resSize !== undefined) {
    breadcrumb.data.response_body_size = resSize;
  }
}

async function _prepareFetchData(
  breadcrumb,
  hint,
  options,
) {
  const now = Date.now();
  const { startTimestamp = now, endTimestamp = now } = hint;

  const {
    url,
    method,
    status_code: statusCode = 0,
    request_body_size: requestBodySize,
    response_body_size: responseBodySize,
  } = breadcrumb.data;

  const captureDetails =
    urlMatches(url, options.networkDetailAllowUrls) && !urlMatches(url, options.networkDetailDenyUrls);

  const request = captureDetails
    ? _getRequestInfo(options, hint.input, requestBodySize)
    : buildSkippedNetworkRequestOrResponse(requestBodySize);
  const response = await _getResponseInfo(captureDetails, options, hint.response, responseBodySize);

  return {
    startTimestamp,
    endTimestamp,
    url,
    method,
    statusCode,
    request,
    response,
  };
}

function _getRequestInfo(
  { networkCaptureBodies, networkRequestHeaders },
  input,
  requestBodySize,
) {
  const headers = input ? getRequestHeaders(input, networkRequestHeaders) : {};

  if (!networkCaptureBodies) {
    return buildNetworkRequestOrResponse(headers, requestBodySize, undefined);
  }

  // We only want to transmit string or string-like bodies
  const requestBody = browserUtils.getFetchRequestArgBody(input);
  const [bodyStr, warning] = browserUtils.getBodyString(requestBody, debug);
  const data = buildNetworkRequestOrResponse(headers, requestBodySize, bodyStr);

  if (warning) {
    return mergeWarning(data, warning);
  }

  return data;
}

/** Exported only for tests. */
async function _getResponseInfo(
  captureDetails,
  {
    networkCaptureBodies,
    networkResponseHeaders,
  },
  response,
  responseBodySize,
) {
  if (!captureDetails && responseBodySize !== undefined) {
    return buildSkippedNetworkRequestOrResponse(responseBodySize);
  }

  const headers = response ? getAllHeaders(response.headers, networkResponseHeaders) : {};

  if (!response || (!networkCaptureBodies && responseBodySize !== undefined)) {
    return buildNetworkRequestOrResponse(headers, responseBodySize, undefined);
  }

  const [bodyText, warning] = await _parseFetchResponseBody(response);
  const result = getResponseData(bodyText, {
    networkCaptureBodies,

    responseBodySize,
    captureDetails,
    headers,
  });

  if (warning) {
    return mergeWarning(result, warning);
  }

  return result;
}

function getResponseData(
  bodyText,
  {
    networkCaptureBodies,
    responseBodySize,
    captureDetails,
    headers,
  }

,
) {
  try {
    const size = bodyText?.length && responseBodySize === undefined ? getBodySize(bodyText) : responseBodySize;

    if (!captureDetails) {
      return buildSkippedNetworkRequestOrResponse(size);
    }

    if (networkCaptureBodies) {
      return buildNetworkRequestOrResponse(headers, size, bodyText);
    }

    return buildNetworkRequestOrResponse(headers, size, undefined);
  } catch (error) {
    DEBUG_BUILD && debug.exception(error, 'Failed to serialize response body');
    // fallback
    return buildNetworkRequestOrResponse(headers, responseBodySize, undefined);
  }
}

async function _parseFetchResponseBody(response) {
  const res = _tryCloneResponse(response);

  if (!res) {
    return [undefined, 'BODY_PARSE_ERROR'];
  }

  try {
    const text = await _tryGetResponseText(res);
    return [text];
  } catch (error) {
    if (error instanceof Error && error.message.indexOf('Timeout') > -1) {
      DEBUG_BUILD && debug.warn('Parsing text body from response timed out');
      return [undefined, 'BODY_PARSE_TIMEOUT'];
    }

    DEBUG_BUILD && debug.exception(error, 'Failed to get text body from response');
    return [undefined, 'BODY_PARSE_ERROR'];
  }
}

function getAllHeaders(headers, allowedHeaders) {
  const allHeaders = {};

  allowedHeaders.forEach(header => {
    if (headers.get(header)) {
      allHeaders[header] = headers.get(header) ;
    }
  });

  return allHeaders;
}

function getRequestHeaders(fetchArgs, allowedHeaders) {
  if (fetchArgs.length === 1 && typeof fetchArgs[0] !== 'string') {
    return getHeadersFromOptions(fetchArgs[0] , allowedHeaders);
  }

  if (fetchArgs.length === 2) {
    return getHeadersFromOptions(fetchArgs[1] , allowedHeaders);
  }

  return {};
}

function getHeadersFromOptions(
  input,
  allowedHeaders,
) {
  if (!input) {
    return {};
  }

  const headers = input.headers;

  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return getAllHeaders(headers, allowedHeaders);
  }

  // We do not support this, as it is not really documented (anymore?)
  if (Array.isArray(headers)) {
    return {};
  }

  return getAllowedHeaders(headers, allowedHeaders);
}

function _tryCloneResponse(response) {
  try {
    // We have to clone this, as the body can only be read once
    return response.clone();
  } catch (error) {
    // this can throw if the response was already consumed before
    DEBUG_BUILD && debug.exception(error, 'Failed to clone response body');
  }
}

/**
 * Get the response body of a fetch request, or timeout after 500ms.
 * Fetch can return a streaming body, that may not resolve (or not for a long time).
 * If that happens, we rather abort after a short time than keep waiting for this.
 */
function _tryGetResponseText(response) {
  return new Promise((resolve, reject) => {
    const timeout = browserUtils.setTimeout(() => reject(new Error('Timeout while trying to read response body')), 500);

    _getResponseText(response)
      .then(
        txt => resolve(txt),
        reason => reject(reason),
      )
      .finally(() => clearTimeout(timeout));
  });
}

async function _getResponseText(response) {
  // Force this to be a promise, just to be safe
  // eslint-disable-next-line no-return-await
  return await response.text();
}

/**
 * Capture an XHR breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
async function captureXhrBreadcrumbToReplay(
  breadcrumb,
  hint,
  options,
) {
  try {
    const data = _prepareXhrData(breadcrumb, hint, options);

    // Create a replay performance entry from this breadcrumb
    const result = makeNetworkReplayBreadcrumb('resource.xhr', data);
    addNetworkBreadcrumb(options.replay, result);
  } catch (error) {
    DEBUG_BUILD && debug.exception(error, 'Failed to capture xhr breadcrumb');
  }
}

/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
function enrichXhrBreadcrumb(
  breadcrumb,
  hint,
) {
  const { xhr, input } = hint;

  if (!xhr) {
    return;
  }

  const reqSize = getBodySize(input);
  const resSize = xhr.getResponseHeader('content-length')
    ? parseContentLengthHeader(xhr.getResponseHeader('content-length'))
    : _getBodySize(xhr.response, xhr.responseType);

  if (reqSize !== undefined) {
    breadcrumb.data.request_body_size = reqSize;
  }
  if (resSize !== undefined) {
    breadcrumb.data.response_body_size = resSize;
  }
}

function _prepareXhrData(
  breadcrumb,
  hint,
  options,
) {
  const now = Date.now();
  const { startTimestamp = now, endTimestamp = now, input, xhr } = hint;

  const {
    url,
    method,
    status_code: statusCode = 0,
    request_body_size: requestBodySize,
    response_body_size: responseBodySize,
  } = breadcrumb.data;

  if (!url) {
    return null;
  }

  if (!xhr || !urlMatches(url, options.networkDetailAllowUrls) || urlMatches(url, options.networkDetailDenyUrls)) {
    const request = buildSkippedNetworkRequestOrResponse(requestBodySize);
    const response = buildSkippedNetworkRequestOrResponse(responseBodySize);
    return {
      startTimestamp,
      endTimestamp,
      url,
      method,
      statusCode,
      request,
      response,
    };
  }

  // ---- This additional network data below is only captured for URLs defined in `networkDetailAllowUrls` ----

  const xhrInfo = xhr[browserUtils.SENTRY_XHR_DATA_KEY];
  const networkRequestHeaders = xhrInfo
    ? getAllowedHeaders(xhrInfo.request_headers, options.networkRequestHeaders)
    : {};
  const networkResponseHeaders = getAllowedHeaders(browserUtils.parseXhrResponseHeaders(xhr), options.networkResponseHeaders);

  const [requestBody, requestWarning] = options.networkCaptureBodies ? browserUtils.getBodyString(input, debug) : [undefined];
  const [responseBody, responseWarning] = options.networkCaptureBodies ? _getXhrResponseBody(xhr) : [undefined];

  const request = buildNetworkRequestOrResponse(networkRequestHeaders, requestBodySize, requestBody);
  const response = buildNetworkRequestOrResponse(networkResponseHeaders, responseBodySize, responseBody);

  return {
    startTimestamp,
    endTimestamp,
    url,
    method,
    statusCode,
    request: requestWarning ? mergeWarning(request, requestWarning) : request,
    response: responseWarning ? mergeWarning(response, responseWarning) : response,
  };
}

function _getXhrResponseBody(xhr) {
  // We collect errors that happen, but only log them if we can't get any response body
  const errors = [];

  try {
    return [xhr.responseText];
  } catch (e) {
    errors.push(e);
  }

  // Try to manually parse the response body, if responseText fails
  try {
    return _parseXhrResponse(xhr.response, xhr.responseType);
  } catch (e) {
    errors.push(e);
  }

  DEBUG_BUILD && debug.warn('Failed to get xhr response body', ...errors);

  return [undefined];
}

/**
 * Get the string representation of the XHR response.
 * Based on MDN, these are the possible types of the response:
 * string
 * ArrayBuffer
 * Blob
 * Document
 * POJO
 *
 * Exported only for tests.
 */
function _parseXhrResponse(
  body,
  responseType,
) {
  try {
    if (typeof body === 'string') {
      return [body];
    }

    if (body instanceof Document) {
      return [body.body.outerHTML];
    }

    if (responseType === 'json' && body && typeof body === 'object') {
      return [JSON.stringify(body)];
    }

    if (!body) {
      return [undefined];
    }
  } catch (error) {
    DEBUG_BUILD && debug.exception(error, 'Failed to serialize body', body);
    return [undefined, 'BODY_PARSE_ERROR'];
  }

  DEBUG_BUILD && debug.log('Skipping network body because of body type', body);

  return [undefined, 'UNPARSEABLE_BODY_TYPE'];
}

function _getBodySize(
  body,
  responseType,
) {
  try {
    const bodyStr = responseType === 'json' && body && typeof body === 'object' ? JSON.stringify(body) : body;
    return getBodySize(bodyStr);
  } catch {
    return undefined;
  }
}

/**
 * This method does two things:
 * - It enriches the regular XHR/fetch breadcrumbs with request/response size data
 * - It captures the XHR/fetch breadcrumbs to the replay
 *   (enriching it with further data that is _not_ added to the regular breadcrumbs)
 */
function handleNetworkBreadcrumbs(replay) {
  const client = core.getClient();

  try {
    const {
      networkDetailAllowUrls,
      networkDetailDenyUrls,
      networkCaptureBodies,
      networkRequestHeaders,
      networkResponseHeaders,
    } = replay.getOptions();

    const options = {
      replay,
      networkDetailAllowUrls,
      networkDetailDenyUrls,
      networkCaptureBodies,
      networkRequestHeaders,
      networkResponseHeaders,
    };

    if (client) {
      client.on('beforeAddBreadcrumb', (breadcrumb, hint) => beforeAddNetworkBreadcrumb(options, breadcrumb, hint));
    }
  } catch {
    // Do nothing
  }
}

/** just exported for tests */
function beforeAddNetworkBreadcrumb(
  options,
  breadcrumb,
  hint,
) {
  if (!breadcrumb.data) {
    return;
  }

  try {
    if (_isXhrBreadcrumb(breadcrumb) && _isXhrHint(hint)) {
      // This has to be sync, as we need to ensure the breadcrumb is enriched in the same tick
      // Because the hook runs synchronously, and the breadcrumb is afterwards passed on
      // So any async mutations to it will not be reflected in the final breadcrumb
      enrichXhrBreadcrumb(breadcrumb, hint);

      // This call should not reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      captureXhrBreadcrumbToReplay(breadcrumb, hint, options);
    }

    if (_isFetchBreadcrumb(breadcrumb) && _isFetchHint(hint)) {
      // This has to be sync, as we need to ensure the breadcrumb is enriched in the same tick
      // Because the hook runs synchronously, and the breadcrumb is afterwards passed on
      // So any async mutations to it will not be reflected in the final breadcrumb
      enrichFetchBreadcrumb(breadcrumb, hint);

      // This call should not reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      captureFetchBreadcrumbToReplay(breadcrumb, hint, options);
    }
  } catch (e) {
    DEBUG_BUILD && debug.exception(e, 'Error when enriching network breadcrumb');
  }
}

function _isXhrBreadcrumb(breadcrumb) {
  return breadcrumb.category === 'xhr';
}

function _isFetchBreadcrumb(breadcrumb) {
  return breadcrumb.category === 'fetch';
}

function _isXhrHint(hint) {
  return hint?.xhr;
}

function _isFetchHint(hint) {
  return hint?.response;
}

/**
 * Add global listeners that cannot be removed.
 */
function addGlobalListeners(replay) {
  // Listeners from core SDK //
  const client = core.getClient();

  browserUtils.addClickKeypressInstrumentationHandler(handleDomListener(replay));
  browserUtils.addHistoryInstrumentationHandler(handleHistorySpanListener(replay));
  handleBreadcrumbs(replay);
  handleNetworkBreadcrumbs(replay);

  // Tag all (non replay) events that get sent to Sentry with the current
  // replay ID so that we can reference them later in the UI
  const eventProcessor = handleGlobalEventListener(replay);
  core.addEventProcessor(eventProcessor);

  // If a custom client has no hooks yet, we continue to use the "old" implementation
  if (client) {
    client.on('beforeSendEvent', handleBeforeSendEvent(replay));
    client.on('afterSendEvent', handleAfterSendEvent(replay));
    client.on('createDsc', (dsc) => {
      const replayId = replay.getSessionId();
      // We do not want to set the DSC when in buffer mode, as that means the replay has not been sent (yet)
      if (replayId && replay.isEnabled() && replay.recordingMode === 'session') {
        // Ensure to check that the session is still active - it could have expired in the meanwhile
        const isSessionActive = replay.checkAndHandleExpiredSession();
        if (isSessionActive) {
          dsc.replay_id = replayId;
        }
      }
    });

    client.on('spanStart', span => {
      replay.lastActiveSpan = span;
    });

    // We may be missing the initial spanStart due to timing issues,
    // so we capture it on finish again.
    client.on('spanEnd', span => {
      replay.lastActiveSpan = span;
    });

    // We want to attach the replay id to the feedback event
    client.on('beforeSendFeedback', async (feedbackEvent, options) => {
      const replayId = replay.getSessionId();
      if (options?.includeReplay && replay.isEnabled() && replayId && feedbackEvent.contexts?.feedback) {
        // In case the feedback is sent via API and not through our widget, we want to flush replay
        if (feedbackEvent.contexts.feedback.source === 'api') {
          await replay.sendBufferedReplayOrFlush();
        }
        feedbackEvent.contexts.feedback.replay_id = replayId;
      }
    });

    client.on('openFeedbackWidget', async () => {
      await replay.sendBufferedReplayOrFlush();
    });
  }
}

/**
 * Create a "span" for the total amount of memory being used by JS objects
 * (including v8 internal objects).
 */
async function addMemoryEntry(replay) {
  // window.performance.memory is a non-standard API and doesn't work on all browsers, so we try-catch this
  try {
    return Promise.all(
      createPerformanceSpans(replay, [
        // @ts-expect-error memory doesn't exist on type Performance as the API is non-standard (we check that it exists above)
        createMemoryEntry(WINDOW.performance.memory),
      ]),
    );
  } catch {
    // Do nothing
    return [];
  }
}

function createMemoryEntry(memoryEntry) {
  const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = memoryEntry;
  // we don't want to use `getAbsoluteTime` because it adds the event time to the
  // time origin, so we get the current timestamp instead
  const time = Date.now() / 1000;
  return {
    type: 'memory',
    name: 'memory',
    start: time,
    end: time,
    data: {
      memory: {
        jsHeapSizeLimit,
        totalJSHeapSize,
        usedJSHeapSize,
      },
    },
  };
}

/**
 * Heavily simplified debounce function based on lodash.debounce.
 *
 * This function takes a callback function (@param fun) and delays its invocation
 * by @param wait milliseconds. Optionally, a maxWait can be specified in @param options,
 * which ensures that the callback is invoked at least once after the specified max. wait time.
 *
 * @param func the function whose invocation is to be debounced
 * @param wait the minimum time until the function is invoked after it was called once
 * @param options the options object, which can contain the `maxWait` property
 *
 * @returns the debounced version of the function, which needs to be called at least once to start the
 *          debouncing process. Subsequent calls will reset the debouncing timer and, in case @paramfunc
 *          was already invoked in the meantime, return @param func's return value.
 *          The debounced function has two additional properties:
 *          - `flush`: Invokes the debounced function immediately and returns its return value
 *          - `cancel`: Cancels the debouncing process and resets the debouncing timer
 */
function debounce(func, wait, options) {
  return core.debounce(func, wait, {
    ...options,
    // @ts-expect-error - Not quite sure why these types do not match, but this is fine
    setTimeoutImpl: browserUtils.setTimeout,
  });
}

const NAVIGATOR = core.GLOBAL_OBJ.navigator;

/**
 *  Disable sampling mousemove events on iOS browsers as this can cause blocking the main thread
 *  https://github.com/getsentry/sentry-javascript/issues/14534
 */
function getRecordingSamplingOptions() {
  if (
    /iPhone|iPad|iPod/i.test(NAVIGATOR?.userAgent ?? '') ||
    (/Macintosh/i.test(NAVIGATOR?.userAgent ?? '') && NAVIGATOR?.maxTouchPoints && NAVIGATOR?.maxTouchPoints > 1)
  ) {
    return {
      sampling: {
        mousemove: false,
      },
    };
  }

  return {};
}

/**
 * Handler for recording events.
 *
 * Adds to event buffer, and has varying flushing behaviors if the event was a checkout.
 */
function getHandleRecordingEmit(replay) {
  let hadFirstEvent = false;

  return (event, _isCheckout) => {
    // If this is false, it means session is expired, create and a new session and wait for checkout
    if (!replay.checkAndHandleExpiredSession()) {
      DEBUG_BUILD && debug.warn('Received replay event after session expired.');

      return;
    }

    // `_isCheckout` is only set when the checkout is due to `checkoutEveryNms`
    // We also want to treat the first event as a checkout, so we handle this specifically here
    const isCheckout = _isCheckout || !hadFirstEvent;
    hadFirstEvent = true;

    if (replay.clickDetector) {
      updateClickDetectorForRecordingEvent(replay.clickDetector, event);
    }

    // The handler returns `true` if we do not want to trigger debounced flush, `false` if we want to debounce flush.
    replay.addUpdate(() => {
      // The session is always started immediately on pageload/init, but for
      // error-only replays, it should reflect the most recent checkout
      // when an error occurs. Clear any state that happens before this current
      // checkout. This needs to happen before `addEvent()` which updates state
      // dependent on this reset.
      if (replay.recordingMode === 'buffer' && isCheckout) {
        replay.setInitialState();
      }

      // If the event is not added (e.g. due to being paused, disabled, or out of the max replay duration),
      // Skip all further steps
      if (!addEventSync(replay, event, isCheckout)) {
        // Return true to skip scheduling a debounced flush
        return true;
      }

      // Different behavior for full snapshots (type=2), ignore other event types
      // See https://github.com/rrweb-io/rrweb/blob/d8f9290ca496712aa1e7d472549480c4e7876594/packages/rrweb/src/types.ts#L16
      if (!isCheckout) {
        return false;
      }

      const session = replay.session;

      // Additionally, create a meta event that will capture certain SDK settings.
      // In order to handle buffer mode, this needs to either be done when we
      // receive checkout events or at flush time. We have an experimental mode
      // to perform multiple checkouts a session (the idea is to improve
      // seeking during playback), so also only include if segmentId is 0
      // (handled in `addSettingsEvent`).
      //
      // `isCheckout` is always true, but want to be explicit that it should
      // only be added for checkouts
      addSettingsEvent(replay, isCheckout);

      // When in buffer mode, make sure we adjust the session started date to the current earliest event of the buffer
      // this should usually be the timestamp of the checkout event, but to be safe...
      if (replay.recordingMode === 'buffer' && session && replay.eventBuffer && !session.dirty) {
        const earliestEvent = replay.eventBuffer.getEarliestTimestamp();
        if (earliestEvent) {
          DEBUG_BUILD &&
            debug.log(`Updating session start time to earliest event in buffer to ${new Date(earliestEvent)}`);

          session.started = earliestEvent;

          if (replay.getOptions().stickySession) {
            saveSession(session);
          }
        }
      }

      // If there is a previousSessionId after a full snapshot occurs, then
      // the replay session was started due to session expiration. The new session
      // is started before triggering a new checkout and contains the id
      // of the previous session. Do not immediately flush in this case
      // to avoid capturing only the checkout and instead the replay will
      // be captured if they perform any follow-up actions.
      if (session?.previousSessionId) {
        return true;
      }

      if (replay.recordingMode === 'session') {
        // If the full snapshot is due to an initial load, we will not have
        // a previous session ID. In this case, we want to buffer events
        // for a set amount of time before flushing. This can help avoid
        // capturing replays of users that immediately close the window.

        // This should never reject
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void replay.flush();
      }

      return true;
    });
  };
}

/**
 * Exported for tests
 */
function createOptionsEvent(replay) {
  const options = replay.getOptions();
  return {
    type: EventType.Custom,
    timestamp: Date.now(),
    data: {
      tag: 'options',
      payload: {
        shouldRecordCanvas: replay.isRecordingCanvas(),
        sessionSampleRate: options.sessionSampleRate,
        errorSampleRate: options.errorSampleRate,
        useCompressionOption: options.useCompression,
        blockAllMedia: options.blockAllMedia,
        maskAllText: options.maskAllText,
        maskAllInputs: options.maskAllInputs,
        useCompression: replay.eventBuffer ? replay.eventBuffer.type === 'worker' : false,
        networkDetailHasUrls: options.networkDetailAllowUrls.length > 0,
        networkCaptureBodies: options.networkCaptureBodies,
        networkRequestHasHeaders: options.networkRequestHeaders.length > 0,
        networkResponseHasHeaders: options.networkResponseHeaders.length > 0,
      },
    },
  };
}

/**
 * Add a "meta" event that contains a simplified view on current configuration
 * options. This should only be included on the first segment of a recording.
 */
function addSettingsEvent(replay, isCheckout) {
  // Only need to add this event when sending the first segment
  if (!isCheckout || !replay.session || replay.session.segmentId !== 0) {
    return;
  }

  addEventSync(replay, createOptionsEvent(replay), false);
}

/**
 * Vendored in from @sentry-internal/rrweb.
 *
 * This is a copy of the function from rrweb, it is not nicely exported there.
 */
function closestElementOfNode(node) {
  if (!node) {
    return null;
  }

  // Catch access to node properties to avoid Firefox "permission denied" errors
  try {
    const el = node.nodeType === node.ELEMENT_NODE ? (node ) : node.parentElement;
    return el;
  } catch {
    return null;
  }
}

/**
 * Create a replay envelope ready to be sent.
 * This includes both the replay event, as well as the recording data.
 */
function createReplayEnvelope(
  replayEvent,
  recordingData,
  dsn,
  tunnel,
) {
  return core.createEnvelope(
    core.createEventEnvelopeHeaders(replayEvent, core.getSdkMetadataForEnvelopeHeader(replayEvent), tunnel, dsn),
    [
      [{ type: 'replay_event' }, replayEvent],
      [
        {
          type: 'replay_recording',
          // If string then we need to encode to UTF8, otherwise will have
          // wrong size. TextEncoder has similar browser support to
          // MutationObserver, although it does not accept IE11.
          length:
            typeof recordingData === 'string' ? new TextEncoder().encode(recordingData).length : recordingData.length,
        },
        recordingData,
      ],
    ],
  );
}

/**
 * Prepare the recording data ready to be sent.
 */
function prepareRecordingData({
  recordingData,
  headers,
}

) {
  let payloadWithSequence;

  // XXX: newline is needed to separate sequence id from events
  const replayHeaders = `${JSON.stringify(headers)}
`;

  if (typeof recordingData === 'string') {
    payloadWithSequence = `${replayHeaders}${recordingData}`;
  } else {
    const enc = new TextEncoder();
    // XXX: newline is needed to separate sequence id from events
    const sequence = enc.encode(replayHeaders);
    // Merge the two Uint8Arrays
    payloadWithSequence = new Uint8Array(sequence.length + recordingData.length);
    payloadWithSequence.set(sequence);
    payloadWithSequence.set(recordingData, sequence.length);
  }

  return payloadWithSequence;
}

/**
 * Prepare a replay event & enrich it with the SDK metadata.
 */
async function prepareReplayEvent({
  client,
  scope,
  replayId: event_id,
  event,
}

) {
  const integrations =
    typeof client['_integrations'] === 'object' &&
    client['_integrations'] !== null &&
    !Array.isArray(client['_integrations'])
      ? Object.keys(client['_integrations'])
      : undefined;

  const eventHint = { event_id, integrations };

  client.emit('preprocessEvent', event, eventHint);

  const preparedEvent = (await core.prepareEvent(
    client.getOptions(),
    event,
    eventHint,
    scope,
    client,
    core.getIsolationScope(),
  )) ;

  // If e.g. a global event processor returned null
  if (!preparedEvent) {
    return null;
  }

  client.emit('postprocessEvent', preparedEvent, eventHint);

  // This normally happens in browser client "_prepareEvent"
  // but since we do not use this private method from the client, but rather the plain import
  // we need to do this manually.
  preparedEvent.platform = preparedEvent.platform || 'javascript';

  // extract the SDK name because `client._prepareEvent` doesn't add it to the event
  const metadata = client.getSdkMetadata();
  const { name, version, settings } = metadata?.sdk || {};

  preparedEvent.sdk = {
    ...preparedEvent.sdk,
    name: name || 'sentry.javascript.unknown',
    version: version || '0.0.0',
    settings,
  };

  return preparedEvent;
}

/**
 * Send replay attachment using `fetch()`
 */
async function sendReplayRequest({
  recordingData,
  replayId,
  segmentId: segment_id,
  eventContext,
  timestamp,
  session,
}) {
  const preparedRecordingData = prepareRecordingData({
    recordingData,
    headers: {
      segment_id,
    },
  });

  const { urls, errorIds, traceIds, initialTimestamp } = eventContext;

  const client = core.getClient();
  const scope = core.getCurrentScope();
  const transport = client?.getTransport();
  const dsn = client?.getDsn();

  if (!client || !transport || !dsn || !session.sampled) {
    return Promise.resolve({});
  }

  const baseEvent = {
    type: REPLAY_EVENT_NAME,
    replay_start_timestamp: initialTimestamp / 1000,
    timestamp: timestamp / 1000,
    error_ids: errorIds,
    trace_ids: traceIds,
    urls,
    replay_id: replayId,
    segment_id,
    replay_type: session.sampled,
  };

  const replayEvent = await prepareReplayEvent({ scope, client, replayId, event: baseEvent });

  if (!replayEvent) {
    // Taken from baseclient's `_processEvent` method, where this is handled for errors/transactions
    client.recordDroppedEvent('event_processor', 'replay');
    DEBUG_BUILD && debug.log('An event processor returned `null`, will not send event.');
    return Promise.resolve({});
  }

  /*
  For reference, the fully built event looks something like this:
  {
      "type": "replay_event",
      "timestamp": 1670837008.634,
      "error_ids": [
          "errorId"
      ],
      "trace_ids": [
          "traceId"
      ],
      "urls": [
          "https://example.com"
      ],
      "replay_id": "eventId",
      "segment_id": 3,
      "replay_type": "error",
      "platform": "javascript",
      "event_id": "eventId",
      "environment": "production",
      "sdk": {
          "integrations": [
              "BrowserTracing",
              "Replay"
          ],
          "name": "sentry.javascript.browser",
          "version": "7.25.0"
      },
      "sdkProcessingMetadata": {},
      "contexts": {
      },
  }
  */

  // Prevent this data (which, if it exists, was used in earlier steps in the processing pipeline) from being sent to
  // sentry. (Note: Our use of this property comes and goes with whatever we might be debugging, whatever hacks we may
  // have temporarily added, etc. Even if we don't happen to be using it at some point in the future, let's not get rid
  // of this `delete`, lest we miss putting it back in the next time the property is in use.)
  delete replayEvent.sdkProcessingMetadata;

  const envelope = createReplayEnvelope(replayEvent, preparedRecordingData, dsn, client.getOptions().tunnel);

  let response;

  try {
    response = await transport.send(envelope);
  } catch (err) {
    const error = new Error(UNABLE_TO_SEND_REPLAY);

    try {
      // In case browsers don't allow this property to be writable
      // @ts-expect-error This needs lib es2022 and newer
      error.cause = err;
    } catch {
      // nothing to do
    }
    throw error;
  }

  // If the status code is invalid, we want to immediately stop & not retry
  if (typeof response.statusCode === 'number' && (response.statusCode < 200 || response.statusCode >= 300)) {
    throw new TransportStatusCodeError(response.statusCode);
  }

  const rateLimits = core.updateRateLimits({}, response);
  if (core.isRateLimited(rateLimits, 'replay')) {
    throw new RateLimitError(rateLimits);
  }

  return response;
}

/**
 * This error indicates that the transport returned an invalid status code.
 */
class TransportStatusCodeError extends Error {
   constructor(statusCode) {
    super(`Transport returned status code ${statusCode}`);
  }
}

/**
 * This error indicates that we hit a rate limit API error.
 */
class RateLimitError extends Error {

   constructor(rateLimits) {
    super('Rate limit hit');
    this.rateLimits = rateLimits;
  }
}

/**
 * Finalize and send the current replay event to Sentry
 */
async function sendReplay(
  replayData,
  retryConfig = {
    count: 0,
    interval: RETRY_BASE_INTERVAL,
  },
) {
  const { recordingData, onError } = replayData;

  // short circuit if there's no events to upload (this shouldn't happen as _runFlush makes this check)
  if (!recordingData.length) {
    return;
  }

  try {
    await sendReplayRequest(replayData);
    return true;
  } catch (err) {
    if (err instanceof TransportStatusCodeError || err instanceof RateLimitError) {
      throw err;
    }

    // Capture error for every failed replay
    core.setContext('Replays', {
      _retryCount: retryConfig.count,
    });

    if (onError) {
      onError(err);
    }

    // If an error happened here, it's likely that uploading the attachment
    // failed, we'll can retry with the same events payload
    if (retryConfig.count >= RETRY_MAX_COUNT) {
      const error = new Error(`${UNABLE_TO_SEND_REPLAY} - max retries exceeded`);

      try {
        // In case browsers don't allow this property to be writable
        // @ts-expect-error This needs lib es2022 and newer
        error.cause = err;
      } catch {
        // nothing to do
      }

      throw error;
    }

    // will retry in intervals of 5, 10, 30
    retryConfig.interval *= ++retryConfig.count;

    return new Promise((resolve, reject) => {
      browserUtils.setTimeout(async () => {
        try {
          await sendReplay(replayData, retryConfig);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      }, retryConfig.interval);
    });
  }
}

const THROTTLED = '__THROTTLED';
const SKIPPED = '__SKIPPED';

/**
 * Create a throttled function off a given function.
 * When calling the throttled function, it will call the original function only
 * if it hasn't been called more than `maxCount` times in the last `durationSeconds`.
 *
 * Returns `THROTTLED` if throttled for the first time, after that `SKIPPED`,
 * or else the return value of the original function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throttle(
  fn,
  maxCount,
  durationSeconds,
) {
  const counter = new Map();

  const _cleanup = (now) => {
    const threshold = now - durationSeconds;
    counter.forEach((_value, key) => {
      if (key < threshold) {
        counter.delete(key);
      }
    });
  };

  const _getTotalCount = () => {
    return [...counter.values()].reduce((a, b) => a + b, 0);
  };

  let isThrottled = false;

  return (...rest) => {
    // Date in second-precision, which we use as basis for the throttling
    const now = Math.floor(Date.now() / 1000);

    // First, make sure to delete any old entries
    _cleanup(now);

    // If already over limit, do nothing
    if (_getTotalCount() >= maxCount) {
      const wasThrottled = isThrottled;
      isThrottled = true;
      return wasThrottled ? SKIPPED : THROTTLED;
    }

    isThrottled = false;
    const count = counter.get(now) || 0;
    counter.set(now, count + 1);

    return fn(...rest);
  };
}

/**
 * The main replay container class, which holds all the state and methods for recording and sending replays.
 */
class ReplayContainer  {

  /**
   * Recording can happen in one of two modes:
   *   - session: Record the whole session, sending it continuously
   *   - buffer: Always keep the last 60s of recording, requires:
   *     - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
   *     - or calling `flush()` to send the replay
   */

  /**
   * The current or last active span.
   * This is only available when performance is enabled.
   */

  /**
   * These are here so we can overwrite them in tests etc.
   * @hidden
   */

  /** The replay has to be manually started, because no sample rate (neither session or error) was provided. */

  /**
   * Options to pass to `rrweb.record()`
   */

  /**
   * Timestamp of the last user activity. This lives across sessions.
   */

  /**
   * Is the integration currently active?
   */

  /**
   * Paused is a state where:
   * - DOM Recording is not listening at all
   * - Nothing will be added to event buffer (e.g. core SDK events)
   */

  /**
   * Have we attached listeners to the core SDK?
   * Note we have to track this as there is no way to remove instrumentation handlers.
   */

  /**
   * Function to stop recording
   */

  /**
   * Internal use for canvas recording options
   */

  /**
   * Handle when visibility of the page content changes. Opening a new tab will
   * cause the state to change to hidden because of content of current page will
   * be hidden. Likewise, moving a different window to cover the contents of the
   * page will also trigger a change to a hidden state.
   */

  /**
   * Handle when page is blurred
   */

  /**
   * Handle when page is focused
   */

  /** Ensure page remains active when a key is pressed. */

   constructor({
    options,
    recordingOptions,
  }

) {
    this.eventBuffer = null;
    this.performanceEntries = [];
    this.replayPerformanceEntries = [];
    this.recordingMode = 'session';
    this.timeouts = {
      sessionIdlePause: SESSION_IDLE_PAUSE_DURATION,
      sessionIdleExpire: SESSION_IDLE_EXPIRE_DURATION,
    } ;
    this._lastActivity = Date.now();
    this._isEnabled = false;
    this._isPaused = false;
    this._requiresManualStart = false;
    this._hasInitializedCoreListeners = false;
    this._context = {
      errorIds: new Set(),
      traceIds: new Set(),
      urls: [],
      initialTimestamp: Date.now(),
      initialUrl: '',
    };

    this._recordingOptions = recordingOptions;
    this._options = options;

    this._debouncedFlush = debounce(() => this._flush(), this._options.flushMinDelay, {
      maxWait: this._options.flushMaxDelay,
    });

    this._throttledAddEvent = throttle(
      (event, isCheckout) => addEvent(this, event, isCheckout),
      // Max 300 events...
      300,
      // ... per 5s
      5,
    );

    const { slowClickTimeout, slowClickIgnoreSelectors } = this.getOptions();

    const slowClickConfig = slowClickTimeout
      ? {
          threshold: Math.min(SLOW_CLICK_THRESHOLD, slowClickTimeout),
          timeout: slowClickTimeout,
          scrollTimeout: SLOW_CLICK_SCROLL_TIMEOUT,
          ignoreSelector: slowClickIgnoreSelectors ? slowClickIgnoreSelectors.join(',') : '',
        }
      : undefined;

    if (slowClickConfig) {
      this.clickDetector = new ClickDetector(this, slowClickConfig);
    }

    // Configure replay debug logger w/ experimental options
    if (DEBUG_BUILD) {
      const experiments = options._experiments;
      debug.setConfig({
        captureExceptions: !!experiments.captureExceptions,
        traceInternals: !!experiments.traceInternals,
      });
    }

    // We set these handler properties as class properties, to make binding/unbinding them easier
    this._handleVisibilityChange = () => {
      if (WINDOW.document.visibilityState === 'visible') {
        this._doChangeToForegroundTasks();
      } else {
        this._doChangeToBackgroundTasks();
      }
    };

    /**
     * Handle when page is blurred
     */
    this._handleWindowBlur = () => {
      const breadcrumb = createBreadcrumb({
        category: 'ui.blur',
      });

      // Do not count blur as a user action -- it's part of the process of them
      // leaving the page
      this._doChangeToBackgroundTasks(breadcrumb);
    };

    this._handleWindowFocus = () => {
      const breadcrumb = createBreadcrumb({
        category: 'ui.focus',
      });

      // Do not count focus as a user action -- instead wait until they focus and
      // interactive with page
      this._doChangeToForegroundTasks(breadcrumb);
    };

    /** Ensure page remains active when a key is pressed. */
    this._handleKeyboardEvent = (event) => {
      handleKeyboardEvent(this, event);
    };
  }

  /** Get the event context. */
   getContext() {
    return this._context;
  }

  /** If recording is currently enabled. */
   isEnabled() {
    return this._isEnabled;
  }

  /** If recording is currently paused. */
   isPaused() {
    return this._isPaused;
  }

  /**
   * Determine if canvas recording is enabled
   */
   isRecordingCanvas() {
    return Boolean(this._canvas);
  }

  /** Get the replay integration options. */
   getOptions() {
    return this._options;
  }

  /** A wrapper to conditionally capture exceptions. */
   handleException(error) {
    DEBUG_BUILD && debug.exception(error);
    if (this._options.onError) {
      this._options.onError(error);
    }
  }

  /**
   * Initializes the plugin based on sampling configuration. Should not be
   * called outside of constructor.
   */
   initializeSampling(previousSessionId) {
    const { errorSampleRate, sessionSampleRate } = this._options;

    // If neither sample rate is > 0, then do nothing - user will need to call one of
    // `start()` or `startBuffering` themselves.
    const requiresManualStart = errorSampleRate <= 0 && sessionSampleRate <= 0;

    this._requiresManualStart = requiresManualStart;

    if (requiresManualStart) {
      return;
    }

    // Otherwise if there is _any_ sample rate set, try to load an existing
    // session, or create a new one.
    this._initializeSessionForSampling(previousSessionId);

    if (!this.session) {
      // This should not happen, something wrong has occurred
      DEBUG_BUILD && debug.exception(new Error('Unable to initialize and create session'));
      return;
    }

    if (this.session.sampled === false) {
      // This should only occur if `errorSampleRate` is 0 and was unsampled for
      // session-based replay. In this case there is nothing to do.
      return;
    }

    // If segmentId > 0, it means we've previously already captured this session
    // In this case, we still want to continue in `session` recording mode
    this.recordingMode = this.session.sampled === 'buffer' && this.session.segmentId === 0 ? 'buffer' : 'session';

    DEBUG_BUILD && debug.infoTick(`Starting replay in ${this.recordingMode} mode`);

    this._initializeRecording();
  }

  /**
   * Start a replay regardless of sampling rate. Calling this will always
   * create a new session. Will log a message if replay is already in progress.
   *
   * Creates or loads a session, attaches listeners to varying events (DOM,
   * _performanceObserver, Recording, Sentry SDK, etc)
   */
   start() {
    if (this._isEnabled && this.recordingMode === 'session') {
      DEBUG_BUILD && debug.log('Recording is already in progress');
      return;
    }

    if (this._isEnabled && this.recordingMode === 'buffer') {
      DEBUG_BUILD && debug.log('Buffering is in progress, call `flush()` to save the replay');
      return;
    }

    DEBUG_BUILD && debug.infoTick('Starting replay in session mode');

    // Required as user activity is initially set in
    // constructor, so if `start()` is called after
    // session idle expiration, a replay will not be
    // created due to an idle timeout.
    this._updateUserActivity();

    const session = loadOrCreateSession(
      {
        maxReplayDuration: this._options.maxReplayDuration,
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
      },
      {
        stickySession: this._options.stickySession,
        // This is intentional: create a new session-based replay when calling `start()`
        sessionSampleRate: 1,
        allowBuffering: false,
      },
    );

    this.session = session;
    this.recordingMode = 'session';

    this._initializeRecording();
  }

  /**
   * Start replay buffering. Buffers until `flush()` is called or, if
   * `replaysOnErrorSampleRate` > 0, an error occurs.
   */
   startBuffering() {
    if (this._isEnabled) {
      DEBUG_BUILD && debug.log('Buffering is in progress, call `flush()` to save the replay');
      return;
    }

    DEBUG_BUILD && debug.infoTick('Starting replay in buffer mode');

    const session = loadOrCreateSession(
      {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
      },
      {
        stickySession: this._options.stickySession,
        sessionSampleRate: 0,
        allowBuffering: true,
      },
    );

    this.session = session;

    this.recordingMode = 'buffer';
    this._initializeRecording();
  }

  /**
   * Start recording.
   *
   * Note that this will cause a new DOM checkout
   */
   startRecording() {
    try {
      const canvasOptions = this._canvas;

      this._stopRecording = record({
        ...this._recordingOptions,
        // When running in error sampling mode, we need to overwrite `checkoutEveryNms`
        // Without this, it would record forever, until an error happens, which we don't want
        // instead, we'll always keep the last 60 seconds of replay before an error happened
        ...(this.recordingMode === 'buffer'
          ? { checkoutEveryNms: BUFFER_CHECKOUT_TIME }
          : // Otherwise, use experimental option w/ min checkout time of 6 minutes
            // This is to improve playback seeking as there could potentially be
            // less mutations to process in the worse cases.
            //
            // checkout by "N" events is probably ideal, but means we have less
            // control about the number of checkouts we make (which generally
            // increases replay size)
            this._options._experiments.continuousCheckout && {
              // Minimum checkout time is 6 minutes
              checkoutEveryNms: Math.max(360000, this._options._experiments.continuousCheckout),
            }),
        emit: getHandleRecordingEmit(this),
        ...getRecordingSamplingOptions(),
        onMutation: this._onMutationHandler.bind(this),
        ...(canvasOptions
          ? {
              recordCanvas: canvasOptions.recordCanvas,
              getCanvasManager: canvasOptions.getCanvasManager,
              sampling: canvasOptions.sampling,
              dataURLOptions: canvasOptions.dataURLOptions,
            }
          : {}),
      });
    } catch (err) {
      this.handleException(err);
    }
  }

  /**
   * Stops the recording, if it was running.
   *
   * Returns true if it was previously stopped, or is now stopped,
   * otherwise false.
   */
   stopRecording() {
    try {
      if (this._stopRecording) {
        this._stopRecording();
        this._stopRecording = undefined;
      }

      return true;
    } catch (err) {
      this.handleException(err);
      return false;
    }
  }

  /**
   * Currently, this needs to be manually called (e.g. for tests). Sentry SDK
   * does not support a teardown
   */
   async stop({ forceFlush = false, reason } = {}) {
    if (!this._isEnabled) {
      return;
    }

    // We can't move `_isEnabled` after awaiting a flush, otherwise we can
    // enter into an infinite loop when `stop()` is called while flushing.
    this._isEnabled = false;

    // Make sure to reset `recordingMode` to `buffer` to avoid any additional
    // breadcrumbs to trigger a flush (e.g. in `addUpdate()`)
    this.recordingMode = 'buffer';

    try {
      DEBUG_BUILD && debug.log(`Stopping Replay${reason ? ` triggered by ${reason}` : ''}`);

      resetReplayIdOnDynamicSamplingContext();

      this._removeListeners();
      this.stopRecording();

      this._debouncedFlush.cancel();
      // See comment above re: `_isEnabled`, we "force" a flush, ignoring the
      // `_isEnabled` state of the plugin since it was disabled above.
      if (forceFlush) {
        await this._flush({ force: true });
      }

      // After flush, destroy event buffer
      this.eventBuffer?.destroy();
      this.eventBuffer = null;

      // Clear session from session storage, note this means if a new session
      // is started after, it will not have `previousSessionId`
      clearSession(this);
    } catch (err) {
      this.handleException(err);
    }
  }

  /**
   * Pause some replay functionality. See comments for `_isPaused`.
   * This differs from stop as this only stops DOM recording, it is
   * not as thorough of a shutdown as `stop()`.
   */
   pause() {
    if (this._isPaused) {
      return;
    }

    this._isPaused = true;
    this.stopRecording();

    DEBUG_BUILD && debug.log('Pausing replay');
  }

  /**
   * Resumes recording, see notes for `pause().
   *
   * Note that calling `startRecording()` here will cause a
   * new DOM checkout.`
   */
   resume() {
    if (!this._isPaused || !this._checkSession()) {
      return;
    }

    this._isPaused = false;
    this.startRecording();

    DEBUG_BUILD && debug.log('Resuming replay');
  }

  /**
   * If not in "session" recording mode, flush event buffer which will create a new replay.
   * Unless `continueRecording` is false, the replay will continue to record and
   * behave as a "session"-based replay.
   *
   * Otherwise, queue up a flush.
   */
   async sendBufferedReplayOrFlush({ continueRecording = true } = {}) {
    if (this.recordingMode === 'session') {
      return this.flushImmediate();
    }

    const activityTime = Date.now();

    DEBUG_BUILD && debug.log('Converting buffer to session');

    // Allow flush to complete before resuming as a session recording, otherwise
    // the checkout from `startRecording` may be included in the payload.
    // Prefer to keep the error replay as a separate (and smaller) segment
    // than the session replay.
    await this.flushImmediate();

    const hasStoppedRecording = this.stopRecording();

    if (!continueRecording || !hasStoppedRecording) {
      return;
    }

    // To avoid race conditions where this is called multiple times, we check here again that we are still buffering
    if ((this.recordingMode ) === 'session') {
      return;
    }

    // Re-start recording in session-mode
    this.recordingMode = 'session';

    // Once this session ends, we do not want to refresh it
    if (this.session) {
      this.session.dirty = false;
      this._updateUserActivity(activityTime);
      this._updateSessionActivity(activityTime);
      this._maybeSaveSession();
    }

    this.startRecording();
  }

  /**
   * We want to batch uploads of replay events. Save events only if
   * `<flushMinDelay>` milliseconds have elapsed since the last event
   * *OR* if `<flushMaxDelay>` milliseconds have elapsed.
   *
   * Accepts a callback to perform side-effects and returns true to stop batch
   * processing and hand back control to caller.
   */
   addUpdate(cb) {
    // We need to always run `cb` (e.g. in the case of `this.recordingMode == 'buffer'`)
    const cbResult = cb();

    // If this option is turned on then we will only want to call `flush`
    // explicitly
    if (this.recordingMode === 'buffer' || !this._isEnabled) {
      return;
    }

    // If callback is true, we do not want to continue with flushing -- the
    // caller will need to handle it.
    if (cbResult === true) {
      return;
    }

    // addUpdate is called quite frequently - use _debouncedFlush so that it
    // respects the flush delays and does not flush immediately
    this._debouncedFlush();
  }

  /**
   * Updates the user activity timestamp and resumes recording. This should be
   * called in an event handler for a user action that we consider as the user
   * being "active" (e.g. a mouse click).
   */
   triggerUserActivity() {
    this._updateUserActivity();

    // This case means that recording was once stopped due to inactivity.
    // Ensure that recording is resumed.
    if (!this._stopRecording) {
      // Create a new session, otherwise when the user action is flushed, it
      // will get rejected due to an expired session.
      if (!this._checkSession()) {
        return;
      }

      // Note: This will cause a new DOM checkout
      this.resume();
      return;
    }

    // Otherwise... recording was never suspended, continue as normalish
    this.checkAndHandleExpiredSession();

    this._updateSessionActivity();
  }

  /**
   * Updates the user activity timestamp *without* resuming
   * recording. Some user events (e.g. keydown) can be create
   * low-value replays that only contain the keypress as a
   * breadcrumb. Instead this would require other events to
   * create a new replay after a session has expired.
   */
   updateUserActivity() {
    this._updateUserActivity();
    this._updateSessionActivity();
  }

  /**
   * Only flush if `this.recordingMode === 'session'`
   */
   conditionalFlush() {
    if (this.recordingMode === 'buffer') {
      return Promise.resolve();
    }

    return this.flushImmediate();
  }

  /**
   * Flush using debounce flush
   */
   flush() {
    return this._debouncedFlush() ;
  }

  /**
   * Always flush via `_debouncedFlush` so that we do not have flushes triggered
   * from calling both `flush` and `_debouncedFlush`. Otherwise, there could be
   * cases of multiple flushes happening closely together.
   */
   flushImmediate() {
    this._debouncedFlush();
    // `.flush` is provided by the debounced function, analogously to lodash.debounce
    return this._debouncedFlush.flush() ;
  }

  /**
   * Cancels queued up flushes.
   */
   cancelFlush() {
    this._debouncedFlush.cancel();
  }

  /** Get the current session (=replay) ID
   *
   * @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
   */
   getSessionId(onlyIfSampled) {
    if (onlyIfSampled && this.session?.sampled === false) {
      return undefined;
    }

    return this.session?.id;
  }

  /**
   * Checks if recording should be stopped due to user inactivity. Otherwise
   * check if session is expired and create a new session if so. Triggers a new
   * full snapshot on new session.
   *
   * Returns true if session is not expired, false otherwise.
   * @hidden
   */
   checkAndHandleExpiredSession() {
    // Prevent starting a new session if the last user activity is older than
    // SESSION_IDLE_PAUSE_DURATION. Otherwise non-user activity can trigger a new
    // session+recording. This creates noisy replays that do not have much
    // content in them.
    if (
      this._lastActivity &&
      isExpired(this._lastActivity, this.timeouts.sessionIdlePause) &&
      this.session &&
      this.session.sampled === 'session'
    ) {
      // Pause recording only for session-based replays. Otherwise, resuming
      // will create a new replay and will conflict with users who only choose
      // to record error-based replays only. (e.g. the resumed replay will not
      // contain a reference to an error)
      this.pause();
      return;
    }

    // --- There is recent user activity --- //
    // This will create a new session if expired, based on expiry length
    if (!this._checkSession()) {
      // Check session handles the refreshing itself
      return false;
    }

    return true;
  }

  /**
   * Capture some initial state that can change throughout the lifespan of the
   * replay. This is required because otherwise they would be captured at the
   * first flush.
   */
   setInitialState() {
    const urlPath = `${WINDOW.location.pathname}${WINDOW.location.hash}${WINDOW.location.search}`;
    const url = `${WINDOW.location.origin}${urlPath}`;

    this.performanceEntries = [];
    this.replayPerformanceEntries = [];

    // Reset _context as well
    this._clearContext();

    this._context.initialUrl = url;
    this._context.initialTimestamp = Date.now();
    this._context.urls.push(url);
  }

  /**
   * Add a breadcrumb event, that may be throttled.
   * If it was throttled, we add a custom breadcrumb to indicate that.
   */
   throttledAddEvent(
    event,
    isCheckout,
  ) {
    const res = this._throttledAddEvent(event, isCheckout);

    // If this is THROTTLED, it means we have throttled the event for the first time
    // In this case, we want to add a breadcrumb indicating that something was skipped
    if (res === THROTTLED) {
      const breadcrumb = createBreadcrumb({
        category: 'replay.throttled',
      });

      this.addUpdate(() => {
        // Return `false` if the event _was_ added, as that means we schedule a flush
        return !addEventSync(this, {
          type: ReplayEventTypeCustom,
          timestamp: breadcrumb.timestamp || 0,
          data: {
            tag: 'breadcrumb',
            payload: breadcrumb,
            metric: true,
          },
        });
      });
    }

    return res;
  }

  /**
   * This will get the parametrized route name of the current page.
   * This is only available if performance is enabled, and if an instrumented router is used.
   */
   getCurrentRoute() {
    const lastActiveSpan = this.lastActiveSpan || core.getActiveSpan();
    const lastRootSpan = lastActiveSpan && core.getRootSpan(lastActiveSpan);

    const attributes = (lastRootSpan && core.spanToJSON(lastRootSpan).data) || {};
    const source = attributes[core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];
    if (!lastRootSpan || !source || !['route', 'custom'].includes(source)) {
      return undefined;
    }

    return core.spanToJSON(lastRootSpan).description;
  }

  /**
   * Initialize and start all listeners to varying events (DOM,
   * Performance Observer, Recording, Sentry SDK, etc)
   */
   _initializeRecording() {
    this.setInitialState();

    // this method is generally called on page load or manually - in both cases
    // we should treat it as an activity
    this._updateSessionActivity();

    this.eventBuffer = createEventBuffer({
      useCompression: this._options.useCompression,
      workerUrl: this._options.workerUrl,
    });

    this._removeListeners();
    this._addListeners();

    // Need to set as enabled before we start recording, as `record()` can trigger a flush with a new checkout
    this._isEnabled = true;
    this._isPaused = false;

    this.startRecording();
  }

  /**
   * Loads (or refreshes) the current session.
   */
   _initializeSessionForSampling(previousSessionId) {
    // Whenever there is _any_ error sample rate, we always allow buffering
    // Because we decide on sampling when an error occurs, we need to buffer at all times if sampling for errors
    const allowBuffering = this._options.errorSampleRate > 0;

    const session = loadOrCreateSession(
      {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
        previousSessionId,
      },
      {
        stickySession: this._options.stickySession,
        sessionSampleRate: this._options.sessionSampleRate,
        allowBuffering,
      },
    );

    this.session = session;
  }

  /**
   * Checks and potentially refreshes the current session.
   * Returns false if session is not recorded.
   */
   _checkSession() {
    // If there is no session yet, we do not want to refresh anything
    // This should generally not happen, but to be safe....
    if (!this.session) {
      return false;
    }

    const currentSession = this.session;

    if (
      shouldRefreshSession(currentSession, {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
      })
    ) {
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._refreshSession(currentSession);
      return false;
    }

    return true;
  }

  /**
   * Refresh a session with a new one.
   * This stops the current session (without forcing a flush, as that would never work since we are expired),
   * and then does a new sampling based on the refreshed session.
   */
   async _refreshSession(session) {
    if (!this._isEnabled) {
      return;
    }
    await this.stop({ reason: 'refresh session' });
    this.initializeSampling(session.id);
  }

  /**
   * Adds listeners to record events for the replay
   */
   _addListeners() {
    try {
      WINDOW.document.addEventListener('visibilitychange', this._handleVisibilityChange);
      WINDOW.addEventListener('blur', this._handleWindowBlur);
      WINDOW.addEventListener('focus', this._handleWindowFocus);
      WINDOW.addEventListener('keydown', this._handleKeyboardEvent);

      if (this.clickDetector) {
        this.clickDetector.addListeners();
      }

      // There is no way to remove these listeners, so ensure they are only added once
      if (!this._hasInitializedCoreListeners) {
        addGlobalListeners(this);

        this._hasInitializedCoreListeners = true;
      }
    } catch (err) {
      this.handleException(err);
    }

    this._performanceCleanupCallback = setupPerformanceObserver(this);
  }

  /**
   * Cleans up listeners that were created in `_addListeners`
   */
   _removeListeners() {
    try {
      WINDOW.document.removeEventListener('visibilitychange', this._handleVisibilityChange);

      WINDOW.removeEventListener('blur', this._handleWindowBlur);
      WINDOW.removeEventListener('focus', this._handleWindowFocus);
      WINDOW.removeEventListener('keydown', this._handleKeyboardEvent);

      if (this.clickDetector) {
        this.clickDetector.removeListeners();
      }

      if (this._performanceCleanupCallback) {
        this._performanceCleanupCallback();
      }
    } catch (err) {
      this.handleException(err);
    }
  }

  /**
   * Tasks to run when we consider a page to be hidden (via blurring and/or visibility)
   */
   _doChangeToBackgroundTasks(breadcrumb) {
    if (!this.session) {
      return;
    }

    const expired = isSessionExpired(this.session, {
      maxReplayDuration: this._options.maxReplayDuration,
      sessionIdleExpire: this.timeouts.sessionIdleExpire,
    });

    if (expired) {
      return;
    }

    if (breadcrumb) {
      this._createCustomBreadcrumb(breadcrumb);
    }

    // Send replay when the page/tab becomes hidden. There is no reason to send
    // replay if it becomes visible, since no actions we care about were done
    // while it was hidden
    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    void this.conditionalFlush();
  }

  /**
   * Tasks to run when we consider a page to be visible (via focus and/or visibility)
   */
   _doChangeToForegroundTasks(breadcrumb) {
    if (!this.session) {
      return;
    }

    const isSessionActive = this.checkAndHandleExpiredSession();

    if (!isSessionActive) {
      // If the user has come back to the page within SESSION_IDLE_PAUSE_DURATION
      // ms, we will re-use the existing session, otherwise create a new
      // session
      DEBUG_BUILD && debug.log('Document has become active, but session has expired');
      return;
    }

    if (breadcrumb) {
      this._createCustomBreadcrumb(breadcrumb);
    }
  }

  /**
   * Update user activity (across session lifespans)
   */
   _updateUserActivity(_lastActivity = Date.now()) {
    this._lastActivity = _lastActivity;
  }

  /**
   * Updates the session's last activity timestamp
   */
   _updateSessionActivity(_lastActivity = Date.now()) {
    if (this.session) {
      this.session.lastActivity = _lastActivity;
      this._maybeSaveSession();
    }
  }

  /**
   * Helper to create (and buffer) a replay breadcrumb from a core SDK breadcrumb
   */
   _createCustomBreadcrumb(breadcrumb) {
    this.addUpdate(() => {
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.throttledAddEvent({
        type: EventType.Custom,
        timestamp: breadcrumb.timestamp || 0,
        data: {
          tag: 'breadcrumb',
          payload: breadcrumb,
        },
      });
    });
  }

  /**
   * Observed performance events are added to `this.performanceEntries`. These
   * are included in the replay event before it is finished and sent to Sentry.
   */
   _addPerformanceEntries() {
    let performanceEntries = createPerformanceEntries(this.performanceEntries).concat(this.replayPerformanceEntries);

    this.performanceEntries = [];
    this.replayPerformanceEntries = [];

    // If we are manually starting, we want to ensure we only include performance entries
    // that are after the initial timestamp
    // The reason for this is that we may have performance entries from the page load, but may decide to start
    // the replay later on, in which case we do not want to include these entries.
    // without this, manually started replays can have events long before the actual replay recording starts,
    // which messes with the timeline etc.
    if (this._requiresManualStart) {
      const initialTimestampInSeconds = this._context.initialTimestamp / 1000;
      performanceEntries = performanceEntries.filter(entry => entry.start >= initialTimestampInSeconds);
    }

    return Promise.all(createPerformanceSpans(this, performanceEntries));
  }

  /**
   * Clear _context
   */
   _clearContext() {
    // XXX: `initialTimestamp` and `initialUrl` do not get cleared
    this._context.errorIds.clear();
    this._context.traceIds.clear();
    this._context.urls = [];
  }

  /** Update the initial timestamp based on the buffer content. */
   _updateInitialTimestampFromEventBuffer() {
    const { session, eventBuffer } = this;
    // If replay was started manually (=no sample rate was given),
    // We do not want to back-port the initial timestamp
    if (!session || !eventBuffer || this._requiresManualStart) {
      return;
    }

    // we only ever update this on the initial segment
    if (session.segmentId) {
      return;
    }

    const earliestEvent = eventBuffer.getEarliestTimestamp();
    if (earliestEvent && earliestEvent < this._context.initialTimestamp) {
      this._context.initialTimestamp = earliestEvent;
    }
  }

  /**
   * Return and clear _context
   */
   _popEventContext() {
    const _context = {
      initialTimestamp: this._context.initialTimestamp,
      initialUrl: this._context.initialUrl,
      errorIds: Array.from(this._context.errorIds),
      traceIds: Array.from(this._context.traceIds),
      urls: this._context.urls,
    };

    this._clearContext();

    return _context;
  }

  /**
   * Flushes replay event buffer to Sentry.
   *
   * Performance events are only added right before flushing - this is
   * due to the buffered performance observer events.
   *
   * Should never be called directly, only by `flush`
   */
   async _runFlush() {
    const replayId = this.getSessionId();

    if (!this.session || !this.eventBuffer || !replayId) {
      DEBUG_BUILD && debug.error('No session or eventBuffer found to flush.');
      return;
    }

    await this._addPerformanceEntries();

    // Check eventBuffer again, as it could have been stopped in the meanwhile
    if (!this.eventBuffer?.hasEvents) {
      return;
    }

    // Only attach memory event if eventBuffer is not empty
    await addMemoryEntry(this);

    // Check eventBuffer again, as it could have been stopped in the meanwhile
    if (!this.eventBuffer) {
      return;
    }

    // if this changed in the meanwhile, e.g. because the session was refreshed or similar, we abort here
    if (replayId !== this.getSessionId()) {
      return;
    }

    try {
      // This uses the data from the eventBuffer, so we need to call this before `finish()
      this._updateInitialTimestampFromEventBuffer();

      const timestamp = Date.now();

      // Check total duration again, to avoid sending outdated stuff
      // We leave 30s wiggle room to accommodate late flushing etc.
      // This _could_ happen when the browser is suspended during flushing, in which case we just want to stop
      if (timestamp - this._context.initialTimestamp > this._options.maxReplayDuration + 30000) {
        throw new Error('Session is too long, not sending replay');
      }

      const eventContext = this._popEventContext();
      // Always increment segmentId regardless of outcome of sending replay
      const segmentId = this.session.segmentId++;
      this._maybeSaveSession();

      // Note this empties the event buffer regardless of outcome of sending replay
      const recordingData = await this.eventBuffer.finish();

      await sendReplay({
        replayId,
        recordingData,
        segmentId,
        eventContext,
        session: this.session,
        timestamp,
        onError: err => this.handleException(err),
      });
    } catch (err) {
      this.handleException(err);

      // This means we retried 3 times and all of them failed,
      // or we ran into a problem we don't want to retry, like rate limiting.
      // In this case, we want to completely stop the replay - otherwise, we may get inconsistent segments
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.stop({ reason: 'sendReplay' });

      const client = core.getClient();

      if (client) {
        const dropReason = err instanceof RateLimitError ? 'ratelimit_backoff' : 'send_error';
        client.recordDroppedEvent(dropReason, 'replay');
      }
    }
  }

  /**
   * Flush recording data to Sentry. Creates a lock so that only a single flush
   * can be active at a time. Do not call this directly.
   */
   async _flush({
    force = false,
  }

 = {}) {
    if (!this._isEnabled && !force) {
      // This can happen if e.g. the replay was stopped because of exceeding the retry limit
      return;
    }

    if (!this.checkAndHandleExpiredSession()) {
      DEBUG_BUILD && debug.error('Attempting to finish replay event after session expired.');
      return;
    }

    if (!this.session) {
      // should never happen, as we would have bailed out before
      return;
    }

    const start = this.session.started;
    const now = Date.now();
    const duration = now - start;

    // A flush is about to happen, cancel any queued flushes
    this._debouncedFlush.cancel();

    // If session is too short, or too long (allow some wiggle room over maxReplayDuration), do not send it
    // This _should_ not happen, but it may happen if flush is triggered due to a page activity change or similar
    const tooShort = duration < this._options.minReplayDuration;
    const tooLong = duration > this._options.maxReplayDuration + 5000;
    if (tooShort || tooLong) {
      DEBUG_BUILD &&
        debug.log(
          `Session duration (${Math.floor(duration / 1000)}s) is too ${
            tooShort ? 'short' : 'long'
          }, not sending replay.`,
        );

      if (tooShort) {
        this._debouncedFlush();
      }
      return;
    }

    const eventBuffer = this.eventBuffer;
    if (eventBuffer && this.session.segmentId === 0 && !eventBuffer.hasCheckout) {
      DEBUG_BUILD && debug.log('Flushing initial segment without checkout.');
      // TODO FN: Evaluate if we want to stop here, or remove this again?
    }

    const _flushInProgress = !!this._flushLock;

    // this._flushLock acts as a lock so that future calls to `_flush()` will
    // be blocked until current flush is finished (i.e. this promise resolves)
    if (!this._flushLock) {
      this._flushLock = this._runFlush();
    }

    try {
      await this._flushLock;
    } catch (err) {
      this.handleException(err);
    } finally {
      this._flushLock = undefined;

      if (_flushInProgress) {
        // Wait for previous flush to finish, then call the debounced
        // `_flush()`. It's possible there are other flush requests queued and
        // waiting for it to resolve. We want to reduce all outstanding
        // requests (as well as any new flush requests that occur within a
        // second of the locked flush completing) into a single flush.
        this._debouncedFlush();
      }
    }
  }

  /** Save the session, if it is sticky */
   _maybeSaveSession() {
    if (this.session && this._options.stickySession) {
      saveSession(this.session);
    }
  }

  /** Handler for rrweb.record.onMutation */
   _onMutationHandler(mutations) {
    const { ignoreMutations } = this._options._experiments;
    if (ignoreMutations?.length) {
      if (
        mutations.some(mutation => {
          const el = closestElementOfNode(mutation.target);
          const selector = ignoreMutations.join(',');
          return el?.matches(selector);
        })
      ) {
        return false;
      }
    }

    const count = mutations.length;

    const mutationLimit = this._options.mutationLimit;
    const mutationBreadcrumbLimit = this._options.mutationBreadcrumbLimit;
    const overMutationLimit = mutationLimit && count > mutationLimit;

    // Create a breadcrumb if a lot of mutations happen at the same time
    // We can show this in the UI as an information with potential performance improvements
    if (count > mutationBreadcrumbLimit || overMutationLimit) {
      const breadcrumb = createBreadcrumb({
        category: 'replay.mutations',
        data: {
          count,
          limit: overMutationLimit,
        },
      });
      this._createCustomBreadcrumb(breadcrumb);
    }

    // Stop replay if over the mutation limit
    if (overMutationLimit) {
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.stop({ reason: 'mutationLimit', forceFlush: this.recordingMode === 'session' });
      return false;
    }

    // `true` means we use the regular mutation handling by rrweb
    return true;
  }
}

function getOption(selectors, defaultSelectors) {
  return [
    ...selectors,
    // sentry defaults
    ...defaultSelectors,
  ].join(',');
}

/**
 * Returns privacy related configuration for use in rrweb
 */
function getPrivacyOptions({ mask, unmask, block, unblock, ignore }) {
  const defaultBlockedElements = ['base', 'iframe[srcdoc]:not([src])'];

  const maskSelector = getOption(mask, ['.sentry-mask', '[data-sentry-mask]']);
  const unmaskSelector = getOption(unmask, []);

  const options = {
    // We are making the decision to make text and input selectors the same
    maskTextSelector: maskSelector,
    unmaskTextSelector: unmaskSelector,

    blockSelector: getOption(block, ['.sentry-block', '[data-sentry-block]', ...defaultBlockedElements]),
    unblockSelector: getOption(unblock, []),
    ignoreSelector: getOption(ignore, ['.sentry-ignore', '[data-sentry-ignore]', 'input[type="file"]']),
  };

  return options;
}

/**
 * Masks an attribute if necessary, otherwise return attribute value as-is.
 */
function maskAttribute({
  el,
  key,
  maskAttributes,
  maskAllText,
  privacyOptions,
  value,
}) {
  // We only mask attributes if `maskAllText` is true
  if (!maskAllText) {
    return value;
  }

  // unmaskTextSelector takes precedence
  if (privacyOptions.unmaskTextSelector && el.matches(privacyOptions.unmaskTextSelector)) {
    return value;
  }

  if (
    maskAttributes.includes(key) ||
    // Need to mask `value` attribute for `<input>` if it's a button-like
    // type
    (key === 'value' && el.tagName === 'INPUT' && ['submit', 'button'].includes(el.getAttribute('type') || ''))
  ) {
    return value.replace(/[\S]/g, '*');
  }

  return value;
}

const MEDIA_SELECTORS =
  'img,image,svg,video,object,picture,embed,map,audio,link[rel="icon"],link[rel="apple-touch-icon"]';

const DEFAULT_NETWORK_HEADERS = ['content-length', 'content-type', 'accept'];

// Symbol to store the original body on Request objects
const ORIGINAL_BODY = Symbol.for('sentry__originalRequestBody');

let _initialized = false;
let _isRequestInstrumented = false;

/**
 * Instruments the global Request constructor to store the original body.
 * This allows us to retrieve the original body value later, since Request
 * converts string bodies to ReadableStreams.
 */
function _INTERNAL_instrumentRequestInterface() {
  if (typeof Request === 'undefined' || _isRequestInstrumented) {
    return;
  }

  const OriginalRequest = Request;

  try {
    const SentryRequest = function (input, init) {
      const request = new OriginalRequest(input, init);
      if (init?.body != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
        (request )[ORIGINAL_BODY] = init.body;
      }
      return request;
    };

    SentryRequest.prototype = OriginalRequest.prototype;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
    (core.GLOBAL_OBJ ).Request = SentryRequest;

    _isRequestInstrumented = true;
  } catch {
    // Fail silently if Request is frozen
  }
}

/**
 * Sentry integration for [Session Replay](https://sentry.io/for/session-replay/).
 *
 * See the [Replay documentation](https://docs.sentry.io/platforms/javascript/guides/session-replay/) for more information.
 *
 * @example
 *
 * ```
 * Sentry.init({
 *   dsn: '__DSN__',
 *   integrations: [Sentry.replayIntegration()],
 * });
 * ```
 */
const replayIntegration = ((options) => {
  return new Replay(options);
}) ;

/**
 * Replay integration
 */
class Replay  {
  /**
   * @inheritDoc
   */

  /**
   * Options to pass to `rrweb.record()`
   */

  /**
   * Initial options passed to the replay integration, merged with default values.
   * Note: `sessionSampleRate` and `errorSampleRate` are not required here, as they
   * can only be finally set when setupOnce() is called.
   *
   * @private
   */

   constructor({
    flushMinDelay = DEFAULT_FLUSH_MIN_DELAY,
    flushMaxDelay = DEFAULT_FLUSH_MAX_DELAY,
    minReplayDuration = MIN_REPLAY_DURATION,
    maxReplayDuration = MAX_REPLAY_DURATION,
    stickySession = true,
    useCompression = true,
    workerUrl,
    _experiments = {},
    maskAllText = true,
    maskAllInputs = true,
    blockAllMedia = true,

    mutationBreadcrumbLimit = 750,
    mutationLimit = 10000,

    slowClickTimeout = 7000,
    slowClickIgnoreSelectors = [],

    networkDetailAllowUrls = [],
    networkDetailDenyUrls = [],
    networkCaptureBodies = true,
    networkRequestHeaders = [],
    networkResponseHeaders = [],

    mask = [],
    maskAttributes = ['title', 'placeholder', 'aria-label'],
    unmask = [],
    block = [],
    unblock = [],
    ignore = [],
    maskFn,

    beforeAddRecordingEvent,
    beforeErrorSampling,
    onError,
    attachRawBodyFromRequest = false,
  } = {}) {
    this.name = 'Replay';

    const privacyOptions = getPrivacyOptions({
      mask,
      unmask,
      block,
      unblock,
      ignore,
    });

    this._recordingOptions = {
      maskAllInputs,
      maskAllText,
      maskInputOptions: { password: true },
      maskTextFn: maskFn,
      maskInputFn: maskFn,
      maskAttributeFn: (key, value, el) =>
        maskAttribute({
          maskAttributes,
          maskAllText,
          privacyOptions,
          key,
          value,
          el,
        }),

      ...privacyOptions,

      // Our defaults
      slimDOMOptions: 'all',
      inlineStylesheet: true,
      // Disable inline images as it will increase segment/replay size
      inlineImages: false,
      // collect fonts, but be aware that `sentry.io` needs to be an allowed
      // origin for playback
      collectFonts: true,
      errorHandler: (err) => {
        try {
          err.__rrweb__ = true;
        } catch {
          // ignore errors here
          // this can happen if the error is frozen or does not allow mutation for other reasons
        }
      },
      // experimental support for recording iframes from different origins
      recordCrossOriginIframes: Boolean(_experiments.recordCrossOriginIframes),
    };

    this._initialOptions = {
      flushMinDelay,
      flushMaxDelay,
      minReplayDuration: Math.min(minReplayDuration, MIN_REPLAY_DURATION_LIMIT),
      maxReplayDuration: Math.min(maxReplayDuration, MAX_REPLAY_DURATION),
      stickySession,
      useCompression,
      workerUrl,
      blockAllMedia,
      maskAllInputs,
      maskAllText,
      mutationBreadcrumbLimit,
      mutationLimit,
      slowClickTimeout,
      slowClickIgnoreSelectors,
      networkDetailAllowUrls,
      networkDetailDenyUrls,
      networkCaptureBodies,
      networkRequestHeaders: _getMergedNetworkHeaders(networkRequestHeaders),
      networkResponseHeaders: _getMergedNetworkHeaders(networkResponseHeaders),
      beforeAddRecordingEvent,
      beforeErrorSampling,
      onError,
      attachRawBodyFromRequest,

      _experiments,
    };

    if (this._initialOptions.blockAllMedia) {
      // `blockAllMedia` is a more user friendly option to configure blocking
      // embedded media elements
      this._recordingOptions.blockSelector = !this._recordingOptions.blockSelector
        ? MEDIA_SELECTORS
        : `${this._recordingOptions.blockSelector},${MEDIA_SELECTORS}`;
      this._recordingOptions.ignoreCSSAttributes = new Set(['background-image']);
    }

    if (this._isInitialized && core.isBrowser()) {
      throw new Error('Multiple Sentry Session Replay instances are not supported');
    }

    this._isInitialized = true;
  }

  /** If replay has already been initialized */
   get _isInitialized() {
    return _initialized;
  }

  /** Update _isInitialized */
   set _isInitialized(value) {
    _initialized = value;
  }

  /**
   * Setup and initialize replay container
   */
   afterAllSetup(client) {
    if (!core.isBrowser() || this._replay) {
      return;
    }

    if (this._initialOptions.attachRawBodyFromRequest) {
      _INTERNAL_instrumentRequestInterface();
    }

    this._setup(client);
    this._initialize(client);
  }

  /**
   * Start a replay regardless of sampling rate. Calling this will always
   * create a new session. Will log a message if replay is already in progress.
   *
   * Creates or loads a session, attaches listeners to varying events (DOM,
   * PerformanceObserver, Recording, Sentry SDK, etc)
   */
   start() {
    if (!this._replay) {
      return;
    }
    this._replay.start();
  }

  /**
   * Start replay buffering. Buffers until `flush()` is called or, if
   * `replaysOnErrorSampleRate` > 0, until an error occurs.
   */
   startBuffering() {
    if (!this._replay) {
      return;
    }

    this._replay.startBuffering();
  }

  /**
   * Currently, this needs to be manually called (e.g. for tests). Sentry SDK
   * does not support a teardown
   */
   stop() {
    if (!this._replay) {
      return Promise.resolve();
    }

    return this._replay.stop({ forceFlush: this._replay.recordingMode === 'session' });
  }

  /**
   * If not in "session" recording mode, flush event buffer which will create a new replay.
   * If replay is not enabled, a new session replay is started.
   * Unless `continueRecording` is false, the replay will continue to record and
   * behave as a "session"-based replay.
   *
   * Otherwise, queue up a flush.
   */
   flush(options) {
    if (!this._replay) {
      return Promise.resolve();
    }

    // assuming a session should be recorded in this case
    if (!this._replay.isEnabled()) {
      this._replay.start();
      return Promise.resolve();
    }

    return this._replay.sendBufferedReplayOrFlush(options);
  }

  /**
   * Get the current session ID.
   *
   * @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
   *
   */
   getReplayId(onlyIfSampled) {
    if (!this._replay?.isEnabled()) {
      return;
    }

    return this._replay.getSessionId(onlyIfSampled);
  }

  /**
   * Get the current recording mode. This can be either `session` or `buffer`.
   *
   * `session`: Recording the whole session, sending it continuously
   * `buffer`: Always keeping the last 60s of recording, requires:
   *   - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
   *   - or calling `flush()` to send the replay
   */
   getRecordingMode() {
    if (!this._replay?.isEnabled()) {
      return;
    }

    return this._replay.recordingMode;
  }

  /**
   * Initializes replay.
   */
   _initialize(client) {
    if (!this._replay) {
      return;
    }

    this._maybeLoadFromReplayCanvasIntegration(client);
    this._replay.initializeSampling();
  }

  /** Setup the integration. */
   _setup(client) {
    // Client is not available in constructor, so we need to wait until setupOnce
    const finalOptions = loadReplayOptionsFromClient(this._initialOptions, client);

    this._replay = new ReplayContainer({
      options: finalOptions,
      recordingOptions: this._recordingOptions,
    });
  }

  /** Get canvas options from ReplayCanvas integration, if it is also added. */
   _maybeLoadFromReplayCanvasIntegration(client) {
    // To save bundle size, we skip checking for stuff here
    // and instead just try-catch everything - as generally this should all be defined
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    try {
      const canvasIntegration = client.getIntegrationByName('ReplayCanvas')

;
      if (!canvasIntegration) {
        return;
      }

      this._replay['_canvas'] = canvasIntegration.getOptions();
    } catch {
      // ignore errors here
    }
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  }
}

/** Parse Replay-related options from SDK options */
function loadReplayOptionsFromClient(initialOptions, client) {
  const opt = client.getOptions() ;

  const finalOptions = {
    sessionSampleRate: 0,
    errorSampleRate: 0,
    ...initialOptions,
  };

  const replaysSessionSampleRate = core.parseSampleRate(opt.replaysSessionSampleRate);
  const replaysOnErrorSampleRate = core.parseSampleRate(opt.replaysOnErrorSampleRate);

  if (replaysSessionSampleRate == null && replaysOnErrorSampleRate == null) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn(
        'Replay is disabled because neither `replaysSessionSampleRate` nor `replaysOnErrorSampleRate` are set.',
      );
    });
  }

  if (replaysSessionSampleRate != null) {
    finalOptions.sessionSampleRate = replaysSessionSampleRate;
  }

  if (replaysOnErrorSampleRate != null) {
    finalOptions.errorSampleRate = replaysOnErrorSampleRate;
  }

  return finalOptions;
}

function _getMergedNetworkHeaders(headers) {
  return [...DEFAULT_NETWORK_HEADERS, ...headers.map(header => header.toLowerCase())];
}

/**
 * This is a small utility to get a type-safe instance of the Replay integration.
 */
function getReplay() {
  const client = core.getClient();
  return client?.getIntegrationByName('Replay');
}

exports.getReplay = getReplay;
exports.replayIntegration = replayIntegration;
//# sourceMappingURL=index.js.map
