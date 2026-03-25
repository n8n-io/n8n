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
var snapshotterInjected_exports = {};
__export(snapshotterInjected_exports, {
  frameSnapshotStreamer: () => frameSnapshotStreamer
});
module.exports = __toCommonJS(snapshotterInjected_exports);
function frameSnapshotStreamer(snapshotStreamer, removeNoScript) {
  if (window[snapshotStreamer])
    return;
  const kShadowAttribute = "__playwright_shadow_root_";
  const kValueAttribute = "__playwright_value_";
  const kCheckedAttribute = "__playwright_checked_";
  const kSelectedAttribute = "__playwright_selected_";
  const kScrollTopAttribute = "__playwright_scroll_top_";
  const kScrollLeftAttribute = "__playwright_scroll_left_";
  const kStyleSheetAttribute = "__playwright_style_sheet_";
  const kTargetAttribute = "__playwright_target__";
  const kCustomElementsAttribute = "__playwright_custom_elements__";
  const kCurrentSrcAttribute = "__playwright_current_src__";
  const kBoundingRectAttribute = "__playwright_bounding_rect__";
  const kPopoverOpenAttribute = "__playwright_popover_open_";
  const kDialogOpenAttribute = "__playwright_dialog_open_";
  const kSnapshotFrameId = Symbol("__playwright_snapshot_frameid_");
  const kCachedData = Symbol("__playwright_snapshot_cache_");
  const kEndOfList = Symbol("__playwright_end_of_list_");
  function resetCachedData(obj) {
    delete obj[kCachedData];
  }
  function ensureCachedData(obj) {
    if (!obj[kCachedData])
      obj[kCachedData] = {};
    return obj[kCachedData];
  }
  function removeHash(url) {
    try {
      const u = new URL(url);
      u.hash = "";
      return u.toString();
    } catch (e) {
      return url;
    }
  }
  class Streamer {
    constructor() {
      this._lastSnapshotNumber = 0;
      this._staleStyleSheets = /* @__PURE__ */ new Set();
      this._modifiedStyleSheets = /* @__PURE__ */ new Set();
      this._readingStyleSheet = false;
      const invalidateCSSGroupingRule = (rule) => {
        if (rule.parentStyleSheet)
          this._invalidateStyleSheet(rule.parentStyleSheet);
      };
      this._interceptNativeMethod(window.CSSStyleSheet.prototype, "insertRule", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeMethod(window.CSSStyleSheet.prototype, "deleteRule", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeMethod(window.CSSStyleSheet.prototype, "addRule", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeMethod(window.CSSStyleSheet.prototype, "removeRule", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeGetter(window.CSSStyleSheet.prototype, "rules", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeGetter(window.CSSStyleSheet.prototype, "cssRules", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeMethod(window.CSSStyleSheet.prototype, "replaceSync", (sheet) => this._invalidateStyleSheet(sheet));
      this._interceptNativeMethod(window.CSSGroupingRule.prototype, "insertRule", invalidateCSSGroupingRule);
      this._interceptNativeMethod(window.CSSGroupingRule.prototype, "deleteRule", invalidateCSSGroupingRule);
      this._interceptNativeGetter(window.CSSGroupingRule.prototype, "cssRules", invalidateCSSGroupingRule);
      this._interceptNativeSetter(window.StyleSheet.prototype, "disabled", (sheet) => {
        if (sheet instanceof CSSStyleSheet)
          this._invalidateStyleSheet(sheet);
      });
      this._interceptNativeAsyncMethod(window.CSSStyleSheet.prototype, "replace", (sheet) => this._invalidateStyleSheet(sheet));
      this._fakeBase = document.createElement("base");
      this._observer = new MutationObserver((list) => this._handleMutations(list));
      const observerConfig = { attributes: true, subtree: true };
      this._observer.observe(document, observerConfig);
      this._refreshListenersWhenNeeded();
    }
    _refreshListenersWhenNeeded() {
      this._refreshListeners();
      const customEventName = "__playwright_snapshotter_global_listeners_check__";
      let seenEvent = false;
      const handleCustomEvent = () => seenEvent = true;
      window.addEventListener(customEventName, handleCustomEvent);
      const observer = new MutationObserver((entries) => {
        const newDocumentElement = entries.some((entry) => Array.from(entry.addedNodes).includes(document.documentElement));
        if (newDocumentElement) {
          seenEvent = false;
          window.dispatchEvent(new CustomEvent(customEventName));
          if (!seenEvent) {
            window.addEventListener(customEventName, handleCustomEvent);
            this._refreshListeners();
          }
        }
      });
      observer.observe(document, { childList: true });
    }
    _refreshListeners() {
      document.addEventListener("__playwright_mark_target__", (event) => {
        if (!event.detail)
          return;
        const callId = event.detail;
        event.composedPath()[0].__playwright_target__ = callId;
      });
      document.addEventListener("__playwright_unmark_target__", (event) => {
        if (!event.detail)
          return;
        const callId = event.detail;
        if (event.composedPath()[0].__playwright_target__ === callId)
          delete event.composedPath()[0].__playwright_target__;
      });
    }
    _interceptNativeMethod(obj, method, cb) {
      const native = obj[method];
      if (!native)
        return;
      obj[method] = function(...args) {
        const result = native.call(this, ...args);
        cb(this, result);
        return result;
      };
    }
    _interceptNativeAsyncMethod(obj, method, cb) {
      const native = obj[method];
      if (!native)
        return;
      obj[method] = async function(...args) {
        const result = await native.call(this, ...args);
        cb(this, result);
        return result;
      };
    }
    _interceptNativeGetter(obj, prop, cb) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      Object.defineProperty(obj, prop, {
        ...descriptor,
        get: function() {
          const result = descriptor.get.call(this);
          cb(this, result);
          return result;
        }
      });
    }
    _interceptNativeSetter(obj, prop, cb) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      Object.defineProperty(obj, prop, {
        ...descriptor,
        set: function(value) {
          const result = descriptor.set.call(this, value);
          cb(this, value);
          return result;
        }
      });
    }
    _handleMutations(list) {
      for (const mutation of list)
        ensureCachedData(mutation.target).attributesCached = void 0;
    }
    _invalidateStyleSheet(sheet) {
      if (this._readingStyleSheet)
        return;
      this._staleStyleSheets.add(sheet);
      if (sheet.href !== null)
        this._modifiedStyleSheets.add(sheet);
    }
    _updateStyleElementStyleSheetTextIfNeeded(sheet, forceText) {
      const data = ensureCachedData(sheet);
      if (this._staleStyleSheets.has(sheet) || forceText && data.cssText === void 0) {
        this._staleStyleSheets.delete(sheet);
        try {
          data.cssText = this._getSheetText(sheet);
        } catch (e) {
          data.cssText = "";
        }
      }
      return data.cssText;
    }
    // Returns either content, ref, or no override.
    _updateLinkStyleSheetTextIfNeeded(sheet, snapshotNumber) {
      const data = ensureCachedData(sheet);
      if (this._staleStyleSheets.has(sheet)) {
        this._staleStyleSheets.delete(sheet);
        try {
          data.cssText = this._getSheetText(sheet);
          data.cssRef = snapshotNumber;
          return data.cssText;
        } catch (e) {
        }
      }
      return data.cssRef === void 0 ? void 0 : snapshotNumber - data.cssRef;
    }
    markIframe(iframeElement, frameId) {
      iframeElement[kSnapshotFrameId] = frameId;
    }
    reset() {
      this._staleStyleSheets.clear();
      const visitNode = (node) => {
        resetCachedData(node);
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node;
          if (element.shadowRoot)
            visitNode(element.shadowRoot);
        }
        for (let child = node.firstChild; child; child = child.nextSibling)
          visitNode(child);
      };
      visitNode(document.documentElement);
      visitNode(this._fakeBase);
    }
    __sanitizeMetaAttribute(name, value, httpEquiv) {
      if (name === "charset")
        return "utf-8";
      if (httpEquiv.toLowerCase() !== "content-type" || name !== "content")
        return value;
      const [type, ...params] = value.split(";");
      if (type !== "text/html" || params.length <= 0)
        return value;
      const charsetParamIdx = params.findIndex((param) => param.trim().startsWith("charset="));
      if (charsetParamIdx > -1)
        params[charsetParamIdx] = "charset=utf-8";
      return `${type}; ${params.join("; ")}`;
    }
    _sanitizeUrl(url) {
      if (url.startsWith("javascript:") || url.startsWith("vbscript:"))
        return "";
      return url;
    }
    _sanitizeSrcSet(srcset) {
      return srcset.split(",").map((src) => {
        src = src.trim();
        const spaceIndex = src.lastIndexOf(" ");
        if (spaceIndex === -1)
          return this._sanitizeUrl(src);
        return this._sanitizeUrl(src.substring(0, spaceIndex).trim()) + src.substring(spaceIndex);
      }).join(", ");
    }
    _resolveUrl(base, url) {
      if (url === "")
        return "";
      try {
        return new URL(url, base).href;
      } catch (e) {
        return url;
      }
    }
    _getSheetBase(sheet) {
      let rootSheet = sheet;
      while (rootSheet.parentStyleSheet)
        rootSheet = rootSheet.parentStyleSheet;
      if (rootSheet.ownerNode)
        return rootSheet.ownerNode.baseURI;
      return document.baseURI;
    }
    _getSheetText(sheet) {
      this._readingStyleSheet = true;
      try {
        if (sheet.disabled)
          return "";
        const rules = [];
        for (const rule of sheet.cssRules)
          rules.push(rule.cssText);
        return rules.join("\n");
      } finally {
        this._readingStyleSheet = false;
      }
    }
    captureSnapshot(needsReset) {
      const timestamp = performance.now();
      const snapshotNumber = ++this._lastSnapshotNumber;
      if (needsReset)
        this.reset();
      let nodeCounter = 0;
      let shadowDomNesting = 0;
      let headNesting = 0;
      this._handleMutations(this._observer.takeRecords());
      const definedCustomElements = /* @__PURE__ */ new Set();
      const visitNode = (node) => {
        const nodeType = node.nodeType;
        const nodeName = nodeType === Node.DOCUMENT_FRAGMENT_NODE ? "template" : node.nodeName;
        if (nodeType !== Node.ELEMENT_NODE && nodeType !== Node.DOCUMENT_FRAGMENT_NODE && nodeType !== Node.TEXT_NODE)
          return;
        if (nodeName === "SCRIPT")
          return;
        if (nodeName === "LINK" && nodeType === Node.ELEMENT_NODE) {
          const rel = node.getAttribute("rel")?.toLowerCase();
          if (rel === "preload" || rel === "prefetch")
            return;
        }
        if (removeNoScript && nodeName === "NOSCRIPT")
          return;
        if (nodeName === "META" && node.httpEquiv.toLowerCase() === "content-security-policy")
          return;
        if ((nodeName === "IFRAME" || nodeName === "FRAME") && headNesting)
          return;
        const data = ensureCachedData(node);
        const values = [];
        let equals = !!data.cached;
        let extraNodes = 0;
        const expectValue = (value) => {
          equals = equals && data.cached[values.length] === value;
          values.push(value);
        };
        const checkAndReturn = (n) => {
          data.attributesCached = true;
          if (equals)
            return { equals: true, n: [[snapshotNumber - data.ref[0], data.ref[1]]] };
          nodeCounter += extraNodes;
          data.ref = [snapshotNumber, nodeCounter++];
          data.cached = values;
          return { equals: false, n };
        };
        if (nodeType === Node.TEXT_NODE) {
          const value = node.nodeValue || "";
          expectValue(value);
          return checkAndReturn(value);
        }
        if (nodeName === "STYLE") {
          const sheet = node.sheet;
          let cssText;
          if (sheet)
            cssText = this._updateStyleElementStyleSheetTextIfNeeded(sheet);
          cssText = cssText || node.textContent || "";
          expectValue(cssText);
          extraNodes++;
          return checkAndReturn([nodeName, {}, cssText]);
        }
        const attrs = {};
        const result2 = [nodeName, attrs];
        const visitChild = (child) => {
          const snapshot = visitNode(child);
          if (snapshot) {
            result2.push(snapshot.n);
            expectValue(child);
            equals = equals && snapshot.equals;
          }
        };
        const visitChildStyleSheet = (child) => {
          const snapshot = visitStyleSheet(child);
          if (snapshot) {
            result2.push(snapshot.n);
            expectValue(child);
            equals = equals && snapshot.equals;
          }
        };
        if (nodeType === Node.DOCUMENT_FRAGMENT_NODE)
          attrs[kShadowAttribute] = "open";
        if (nodeType === Node.ELEMENT_NODE) {
          const element = node;
          if (element.localName.includes("-") && window.customElements?.get(element.localName))
            definedCustomElements.add(element.localName);
          if (nodeName === "INPUT" || nodeName === "TEXTAREA") {
            const value = element.value;
            expectValue(kValueAttribute);
            expectValue(value);
            attrs[kValueAttribute] = value;
          }
          if (nodeName === "INPUT" && ["checkbox", "radio"].includes(element.type)) {
            const value = element.checked ? "true" : "false";
            expectValue(kCheckedAttribute);
            expectValue(value);
            attrs[kCheckedAttribute] = value;
          }
          if (nodeName === "OPTION") {
            const value = element.selected ? "true" : "false";
            expectValue(kSelectedAttribute);
            expectValue(value);
            attrs[kSelectedAttribute] = value;
          }
          if (nodeName === "CANVAS" || nodeName === "IFRAME" || nodeName === "FRAME") {
            const boundingRect = element.getBoundingClientRect();
            const value = JSON.stringify({
              left: boundingRect.left,
              top: boundingRect.top,
              right: boundingRect.right,
              bottom: boundingRect.bottom
            });
            expectValue(kBoundingRectAttribute);
            expectValue(value);
            attrs[kBoundingRectAttribute] = value;
          }
          if (element.popover && element.matches && element.matches(":popover-open")) {
            const value = "true";
            expectValue(kPopoverOpenAttribute);
            expectValue(value);
            attrs[kPopoverOpenAttribute] = value;
          }
          if (nodeName === "DIALOG" && element.open) {
            const value = element.matches(":modal") ? "modal" : "true";
            expectValue(kDialogOpenAttribute);
            expectValue(value);
            attrs[kDialogOpenAttribute] = value;
          }
          if (element.scrollTop) {
            expectValue(kScrollTopAttribute);
            expectValue(element.scrollTop);
            attrs[kScrollTopAttribute] = "" + element.scrollTop;
          }
          if (element.scrollLeft) {
            expectValue(kScrollLeftAttribute);
            expectValue(element.scrollLeft);
            attrs[kScrollLeftAttribute] = "" + element.scrollLeft;
          }
          if (element.shadowRoot) {
            ++shadowDomNesting;
            visitChild(element.shadowRoot);
            --shadowDomNesting;
          }
          if ("__playwright_target__" in element) {
            expectValue(kTargetAttribute);
            expectValue(element["__playwright_target__"]);
            attrs[kTargetAttribute] = element["__playwright_target__"];
          }
        }
        if (nodeName === "HEAD") {
          ++headNesting;
          this._fakeBase.setAttribute("href", document.baseURI);
          visitChild(this._fakeBase);
        }
        for (let child = node.firstChild; child; child = child.nextSibling)
          visitChild(child);
        if (nodeName === "HEAD")
          --headNesting;
        expectValue(kEndOfList);
        let documentOrShadowRoot = null;
        if (node.ownerDocument.documentElement === node)
          documentOrShadowRoot = node.ownerDocument;
        else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
          documentOrShadowRoot = node;
        if (documentOrShadowRoot) {
          for (const sheet of documentOrShadowRoot.adoptedStyleSheets || [])
            visitChildStyleSheet(sheet);
          expectValue(kEndOfList);
        }
        if (nodeName === "IFRAME" || nodeName === "FRAME") {
          const element = node;
          const frameId = element[kSnapshotFrameId];
          const name = "src";
          const value = frameId ? `/snapshot/${frameId}` : "";
          expectValue(name);
          expectValue(value);
          attrs[name] = value;
        }
        if (nodeName === "BODY" && definedCustomElements.size) {
          const value = [...definedCustomElements].join(",");
          expectValue(kCustomElementsAttribute);
          expectValue(value);
          attrs[kCustomElementsAttribute] = value;
        }
        if (nodeName === "IMG" || nodeName === "PICTURE") {
          const value = nodeName === "PICTURE" ? "" : this._sanitizeUrl(node.currentSrc);
          expectValue(kCurrentSrcAttribute);
          expectValue(value);
          attrs[kCurrentSrcAttribute] = value;
        }
        if (equals && data.attributesCached && !shadowDomNesting)
          return checkAndReturn(result2);
        if (nodeType === Node.ELEMENT_NODE) {
          const element = node;
          for (let i = 0; i < element.attributes.length; i++) {
            const name = element.attributes[i].name;
            if (nodeName === "LINK" && name === "integrity")
              continue;
            if (nodeName === "IFRAME" && (name === "src" || name === "srcdoc" || name === "sandbox"))
              continue;
            if (nodeName === "FRAME" && name === "src")
              continue;
            if (nodeName === "DIALOG" && name === "open")
              continue;
            let value = element.attributes[i].value;
            if (nodeName === "META")
              value = this.__sanitizeMetaAttribute(name, value, node.httpEquiv);
            else if (name === "src" && nodeName === "IMG")
              value = this._sanitizeUrl(value);
            else if (name === "srcset" && nodeName === "IMG")
              value = this._sanitizeSrcSet(value);
            else if (name === "srcset" && nodeName === "SOURCE")
              value = this._sanitizeSrcSet(value);
            else if (name === "href" && nodeName === "LINK")
              value = this._sanitizeUrl(value);
            else if (name.startsWith("on"))
              value = "";
            expectValue(name);
            expectValue(value);
            attrs[name] = value;
          }
          expectValue(kEndOfList);
        }
        if (result2.length === 2 && !Object.keys(attrs).length)
          result2.pop();
        return checkAndReturn(result2);
      };
      const visitStyleSheet = (sheet) => {
        const data = ensureCachedData(sheet);
        const oldCSSText = data.cssText;
        const cssText = this._updateStyleElementStyleSheetTextIfNeeded(
          sheet,
          true
          /* forceText */
        );
        if (cssText === oldCSSText)
          return { equals: true, n: [[snapshotNumber - data.ref[0], data.ref[1]]] };
        data.ref = [snapshotNumber, nodeCounter++];
        return {
          equals: false,
          n: ["template", {
            [kStyleSheetAttribute]: cssText
          }]
        };
      };
      let html;
      if (document.documentElement) {
        const { n } = visitNode(document.documentElement);
        html = n;
      } else {
        html = ["html"];
      }
      const result = {
        html,
        doctype: document.doctype ? document.doctype.name : void 0,
        resourceOverrides: [],
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        url: location.href,
        wallTime: Date.now(),
        collectionTime: 0
      };
      for (const sheet of this._modifiedStyleSheets) {
        if (sheet.href === null)
          continue;
        const content = this._updateLinkStyleSheetTextIfNeeded(sheet, snapshotNumber);
        if (content === void 0) {
          continue;
        }
        const base = this._getSheetBase(sheet);
        const url = removeHash(this._resolveUrl(base, sheet.href));
        result.resourceOverrides.push({ url, content, contentType: "text/css" });
      }
      result.collectionTime = performance.now() - timestamp;
      return result;
    }
  }
  window[snapshotStreamer] = new Streamer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  frameSnapshotStreamer
});
