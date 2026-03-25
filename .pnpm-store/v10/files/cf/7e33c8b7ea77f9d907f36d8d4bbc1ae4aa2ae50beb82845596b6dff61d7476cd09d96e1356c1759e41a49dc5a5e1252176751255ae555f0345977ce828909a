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
var snapshotRenderer_exports = {};
__export(snapshotRenderer_exports, {
  SnapshotRenderer: () => SnapshotRenderer,
  rewriteURLForCustomProtocol: () => rewriteURLForCustomProtocol
});
module.exports = __toCommonJS(snapshotRenderer_exports);
var import_stringUtils = require("../stringUtils");
function findClosest(items, metric, target) {
  return items.find((item, index) => {
    if (index === items.length - 1)
      return true;
    const next = items[index + 1];
    return Math.abs(metric(item) - target) < Math.abs(metric(next) - target);
  });
}
function isNodeNameAttributesChildNodesSnapshot(n) {
  return Array.isArray(n) && typeof n[0] === "string";
}
function isSubtreeReferenceSnapshot(n) {
  return Array.isArray(n) && Array.isArray(n[0]);
}
class SnapshotRenderer {
  constructor(htmlCache, resources, snapshots, screencastFrames, index) {
    this._htmlCache = htmlCache;
    this._resources = resources;
    this._snapshots = snapshots;
    this._index = index;
    this._snapshot = snapshots[index];
    this._callId = snapshots[index].callId;
    this._screencastFrames = screencastFrames;
    this.snapshotName = snapshots[index].snapshotName;
  }
  snapshot() {
    return this._snapshots[this._index];
  }
  viewport() {
    return this._snapshots[this._index].viewport;
  }
  closestScreenshot() {
    const { wallTime, timestamp } = this.snapshot();
    const closestFrame = wallTime && this._screencastFrames[0]?.frameSwapWallTime ? findClosest(this._screencastFrames, (frame) => frame.frameSwapWallTime, wallTime) : findClosest(this._screencastFrames, (frame) => frame.timestamp, timestamp);
    return closestFrame?.sha1;
  }
  render() {
    const result = [];
    const visit = (n, snapshotIndex, parentTag, parentAttrs) => {
      if (typeof n === "string") {
        if (parentTag === "STYLE" || parentTag === "style")
          result.push(escapeURLsInStyleSheet(rewriteURLsInStyleSheetForCustomProtocol(n)));
        else
          result.push((0, import_stringUtils.escapeHTML)(n));
        return;
      }
      if (isSubtreeReferenceSnapshot(n)) {
        const referenceIndex = snapshotIndex - n[0][0];
        if (referenceIndex >= 0 && referenceIndex <= snapshotIndex) {
          const nodes = snapshotNodes(this._snapshots[referenceIndex]);
          const nodeIndex = n[0][1];
          if (nodeIndex >= 0 && nodeIndex < nodes.length)
            return visit(nodes[nodeIndex], referenceIndex, parentTag, parentAttrs);
        }
      } else if (isNodeNameAttributesChildNodesSnapshot(n)) {
        const [name, nodeAttrs, ...children] = n;
        const nodeName = name === "NOSCRIPT" ? "X-NOSCRIPT" : name;
        const attrs = Object.entries(nodeAttrs || {});
        result.push("<", nodeName);
        const kCurrentSrcAttribute = "__playwright_current_src__";
        const isFrame = nodeName === "IFRAME" || nodeName === "FRAME";
        const isAnchor = nodeName === "A";
        const isImg = nodeName === "IMG";
        const isImgWithCurrentSrc = isImg && attrs.some((a) => a[0] === kCurrentSrcAttribute);
        const isSourceInsidePictureWithCurrentSrc = nodeName === "SOURCE" && parentTag === "PICTURE" && parentAttrs?.some((a) => a[0] === kCurrentSrcAttribute);
        for (const [attr, value] of attrs) {
          let attrName = attr;
          if (isFrame && attr.toLowerCase() === "src") {
            attrName = "__playwright_src__";
          }
          if (isImg && attr === kCurrentSrcAttribute) {
            attrName = "src";
          }
          if (["src", "srcset"].includes(attr.toLowerCase()) && (isImgWithCurrentSrc || isSourceInsidePictureWithCurrentSrc)) {
            attrName = "_" + attrName;
          }
          let attrValue = value;
          if (!isAnchor && (attr.toLowerCase() === "href" || attr.toLowerCase() === "src" || attr === kCurrentSrcAttribute))
            attrValue = rewriteURLForCustomProtocol(value);
          result.push(" ", attrName, '="', (0, import_stringUtils.escapeHTMLAttribute)(attrValue), '"');
        }
        result.push(">");
        for (const child of children)
          visit(child, snapshotIndex, nodeName, attrs);
        if (!autoClosing.has(nodeName))
          result.push("</", nodeName, ">");
        return;
      } else {
        return;
      }
    };
    const snapshot = this._snapshot;
    const html = this._htmlCache.getOrCompute(this, () => {
      visit(snapshot.html, this._index, void 0, void 0);
      const prefix = snapshot.doctype ? `<!DOCTYPE ${snapshot.doctype}>` : "";
      const html2 = prefix + [
        // Hide the document in order to prevent flickering. We will unhide once script has processed shadow.
        "<style>*,*::before,*::after { visibility: hidden }</style>",
        `<script>${snapshotScript(this.viewport(), this._callId, this.snapshotName)}</script>`
      ].join("") + result.join("");
      return { value: html2, size: html2.length };
    });
    return { html, pageId: snapshot.pageId, frameId: snapshot.frameId, index: this._index };
  }
  resourceByUrl(url, method) {
    const snapshot = this._snapshot;
    let sameFrameResource;
    let otherFrameResource;
    for (const resource of this._resources) {
      if (typeof resource._monotonicTime === "number" && resource._monotonicTime >= snapshot.timestamp)
        break;
      if (resource.response.status === 304) {
        continue;
      }
      if (resource.request.url === url && resource.request.method === method) {
        if (resource._frameref === snapshot.frameId)
          sameFrameResource = resource;
        else
          otherFrameResource = resource;
      }
    }
    let result = sameFrameResource ?? otherFrameResource;
    if (result && method.toUpperCase() === "GET") {
      let override = snapshot.resourceOverrides.find((o) => o.url === url);
      if (override?.ref) {
        const index = this._index - override.ref;
        if (index >= 0 && index < this._snapshots.length)
          override = this._snapshots[index].resourceOverrides.find((o) => o.url === url);
      }
      if (override?.sha1) {
        result = {
          ...result,
          response: {
            ...result.response,
            content: {
              ...result.response.content,
              _sha1: override.sha1
            }
          }
        };
      }
    }
    return result;
  }
}
const autoClosing = /* @__PURE__ */ new Set(["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "MENUITEM", "META", "PARAM", "SOURCE", "TRACK", "WBR"]);
function snapshotNodes(snapshot) {
  if (!snapshot._nodes) {
    const nodes = [];
    const visit = (n) => {
      if (typeof n === "string") {
        nodes.push(n);
      } else if (isNodeNameAttributesChildNodesSnapshot(n)) {
        const [, , ...children] = n;
        for (const child of children)
          visit(child);
        nodes.push(n);
      }
    };
    visit(snapshot.html);
    snapshot._nodes = nodes;
  }
  return snapshot._nodes;
}
function snapshotScript(viewport, ...targetIds) {
  function applyPlaywrightAttributes(viewport2, ...targetIds2) {
    const win = window;
    const searchParams = new URLSearchParams(win.location.search);
    const shouldPopulateCanvasFromScreenshot = searchParams.has("shouldPopulateCanvasFromScreenshot");
    const isUnderTest = searchParams.has("isUnderTest");
    const frameBoundingRectsInfo = {
      viewport: viewport2,
      frames: /* @__PURE__ */ new WeakMap()
    };
    win["__playwright_frame_bounding_rects__"] = frameBoundingRectsInfo;
    const kPointerWarningTitle = "Recorded click position in absolute coordinates did not match the center of the clicked element. This is likely due to a difference between the test runner and the trace viewer operating systems.";
    const scrollTops = [];
    const scrollLefts = [];
    const targetElements = [];
    const canvasElements = [];
    let topSnapshotWindow = win;
    while (topSnapshotWindow !== topSnapshotWindow.parent && !topSnapshotWindow.location.pathname.match(/\/page@[a-z0-9]+$/))
      topSnapshotWindow = topSnapshotWindow.parent;
    const visit = (root) => {
      for (const e of root.querySelectorAll(`[__playwright_scroll_top_]`))
        scrollTops.push(e);
      for (const e of root.querySelectorAll(`[__playwright_scroll_left_]`))
        scrollLefts.push(e);
      for (const element of root.querySelectorAll(`[__playwright_value_]`)) {
        const inputElement = element;
        if (inputElement.type !== "file")
          inputElement.value = inputElement.getAttribute("__playwright_value_");
        element.removeAttribute("__playwright_value_");
      }
      for (const element of root.querySelectorAll(`[__playwright_checked_]`)) {
        element.checked = element.getAttribute("__playwright_checked_") === "true";
        element.removeAttribute("__playwright_checked_");
      }
      for (const element of root.querySelectorAll(`[__playwright_selected_]`)) {
        element.selected = element.getAttribute("__playwright_selected_") === "true";
        element.removeAttribute("__playwright_selected_");
      }
      for (const element of root.querySelectorAll(`[__playwright_popover_open_]`)) {
        try {
          element.showPopover();
        } catch {
        }
        element.removeAttribute("__playwright_popover_open_");
      }
      for (const element of root.querySelectorAll(`[__playwright_dialog_open_]`)) {
        try {
          if (element.getAttribute("__playwright_dialog_open_") === "modal")
            element.showModal();
          else
            element.show();
        } catch {
        }
        element.removeAttribute("__playwright_dialog_open_");
      }
      for (const targetId of targetIds2) {
        for (const target of root.querySelectorAll(`[__playwright_target__="${targetId}"]`)) {
          const style = target.style;
          style.outline = "2px solid #006ab1";
          style.backgroundColor = "#6fa8dc7f";
          targetElements.push(target);
        }
      }
      for (const iframe of root.querySelectorAll("iframe, frame")) {
        const boundingRectJson = iframe.getAttribute("__playwright_bounding_rect__");
        iframe.removeAttribute("__playwright_bounding_rect__");
        const boundingRect = boundingRectJson ? JSON.parse(boundingRectJson) : void 0;
        if (boundingRect)
          frameBoundingRectsInfo.frames.set(iframe, { boundingRect, scrollLeft: 0, scrollTop: 0 });
        const src = iframe.getAttribute("__playwright_src__");
        if (!src) {
          iframe.setAttribute("src", 'data:text/html,<body style="background: #ddd"></body>');
        } else {
          const url = new URL(win.location.href);
          const index = url.pathname.lastIndexOf("/snapshot/");
          if (index !== -1)
            url.pathname = url.pathname.substring(0, index + 1);
          url.pathname += src.substring(1);
          iframe.setAttribute("src", url.toString());
        }
      }
      {
        const body = root.querySelector(`body[__playwright_custom_elements__]`);
        if (body && win.customElements) {
          const customElements = (body.getAttribute("__playwright_custom_elements__") || "").split(",");
          for (const elementName of customElements)
            win.customElements.define(elementName, class extends HTMLElement {
            });
        }
      }
      for (const element of root.querySelectorAll(`template[__playwright_shadow_root_]`)) {
        const template = element;
        const shadowRoot = template.parentElement.attachShadow({ mode: "open" });
        shadowRoot.appendChild(template.content);
        template.remove();
        visit(shadowRoot);
      }
      for (const element of root.querySelectorAll("a"))
        element.addEventListener("click", (event) => {
          event.preventDefault();
        });
      if ("adoptedStyleSheets" in root) {
        const adoptedSheets = [...root.adoptedStyleSheets];
        for (const element of root.querySelectorAll(`template[__playwright_style_sheet_]`)) {
          const template = element;
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(template.getAttribute("__playwright_style_sheet_"));
          adoptedSheets.push(sheet);
        }
        root.adoptedStyleSheets = adoptedSheets;
      }
      canvasElements.push(...root.querySelectorAll("canvas"));
    };
    const onLoad = () => {
      win.removeEventListener("load", onLoad);
      for (const element of scrollTops) {
        element.scrollTop = +element.getAttribute("__playwright_scroll_top_");
        element.removeAttribute("__playwright_scroll_top_");
        if (frameBoundingRectsInfo.frames.has(element))
          frameBoundingRectsInfo.frames.get(element).scrollTop = element.scrollTop;
      }
      for (const element of scrollLefts) {
        element.scrollLeft = +element.getAttribute("__playwright_scroll_left_");
        element.removeAttribute("__playwright_scroll_left_");
        if (frameBoundingRectsInfo.frames.has(element))
          frameBoundingRectsInfo.frames.get(element).scrollLeft = element.scrollLeft;
      }
      win.document.styleSheets[0].disabled = true;
      const search = new URL(win.location.href).searchParams;
      const isTopFrame = win === topSnapshotWindow;
      if (search.get("pointX") && search.get("pointY")) {
        const pointX = +search.get("pointX");
        const pointY = +search.get("pointY");
        const hasInputTarget = search.has("hasInputTarget");
        const hasTargetElements = targetElements.length > 0;
        const roots = win.document.documentElement ? [win.document.documentElement] : [];
        for (const target of hasTargetElements ? targetElements : roots) {
          const pointElement = win.document.createElement("x-pw-pointer");
          pointElement.style.position = "fixed";
          pointElement.style.backgroundColor = "#f44336";
          pointElement.style.width = "20px";
          pointElement.style.height = "20px";
          pointElement.style.borderRadius = "10px";
          pointElement.style.margin = "-10px 0 0 -10px";
          pointElement.style.zIndex = "2147483646";
          pointElement.style.display = "flex";
          pointElement.style.alignItems = "center";
          pointElement.style.justifyContent = "center";
          if (hasTargetElements) {
            const box = target.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            pointElement.style.left = centerX + "px";
            pointElement.style.top = centerY + "px";
            if (isTopFrame && (Math.abs(centerX - pointX) >= 10 || Math.abs(centerY - pointY) >= 10)) {
              const warningElement = win.document.createElement("x-pw-pointer-warning");
              warningElement.textContent = "\u26A0";
              warningElement.style.fontSize = "19px";
              warningElement.style.color = "white";
              warningElement.style.marginTop = "-3.5px";
              warningElement.style.userSelect = "none";
              pointElement.appendChild(warningElement);
              pointElement.setAttribute("title", kPointerWarningTitle);
            }
            win.document.documentElement.appendChild(pointElement);
          } else if (isTopFrame && !hasInputTarget) {
            pointElement.style.left = pointX + "px";
            pointElement.style.top = pointY + "px";
            win.document.documentElement.appendChild(pointElement);
          }
        }
      }
      if (canvasElements.length > 0) {
        let drawCheckerboard2 = function(context, canvas) {
          function createCheckerboardPattern() {
            const pattern = win.document.createElement("canvas");
            pattern.width = pattern.width / Math.floor(pattern.width / 24);
            pattern.height = pattern.height / Math.floor(pattern.height / 24);
            const context2 = pattern.getContext("2d");
            context2.fillStyle = "lightgray";
            context2.fillRect(0, 0, pattern.width, pattern.height);
            context2.fillStyle = "white";
            context2.fillRect(0, 0, pattern.width / 2, pattern.height / 2);
            context2.fillRect(pattern.width / 2, pattern.height / 2, pattern.width, pattern.height);
            return context2.createPattern(pattern, "repeat");
          }
          context.fillStyle = createCheckerboardPattern();
          context.fillRect(0, 0, canvas.width, canvas.height);
        };
        var drawCheckerboard = drawCheckerboard2;
        const img = new Image();
        img.onload = () => {
          for (const canvas of canvasElements) {
            const context = canvas.getContext("2d");
            const boundingRectAttribute = canvas.getAttribute("__playwright_bounding_rect__");
            canvas.removeAttribute("__playwright_bounding_rect__");
            if (!boundingRectAttribute)
              continue;
            let boundingRect;
            try {
              boundingRect = JSON.parse(boundingRectAttribute);
            } catch (e) {
              continue;
            }
            let currWindow = win;
            while (currWindow !== topSnapshotWindow) {
              const iframe = currWindow.frameElement;
              currWindow = currWindow.parent;
              const iframeInfo = currWindow["__playwright_frame_bounding_rects__"]?.frames.get(iframe);
              if (!iframeInfo?.boundingRect)
                break;
              const leftOffset = iframeInfo.boundingRect.left - iframeInfo.scrollLeft;
              const topOffset = iframeInfo.boundingRect.top - iframeInfo.scrollTop;
              boundingRect.left += leftOffset;
              boundingRect.top += topOffset;
              boundingRect.right += leftOffset;
              boundingRect.bottom += topOffset;
            }
            const { width, height } = topSnapshotWindow["__playwright_frame_bounding_rects__"].viewport;
            boundingRect.left = boundingRect.left / width;
            boundingRect.top = boundingRect.top / height;
            boundingRect.right = boundingRect.right / width;
            boundingRect.bottom = boundingRect.bottom / height;
            const partiallyUncaptured = boundingRect.right > 1 || boundingRect.bottom > 1;
            const fullyUncaptured = boundingRect.left > 1 || boundingRect.top > 1;
            if (fullyUncaptured) {
              canvas.title = `Playwright couldn't capture canvas contents because it's located outside the viewport.`;
              continue;
            }
            drawCheckerboard2(context, canvas);
            if (shouldPopulateCanvasFromScreenshot) {
              context.drawImage(img, boundingRect.left * img.width, boundingRect.top * img.height, (boundingRect.right - boundingRect.left) * img.width, (boundingRect.bottom - boundingRect.top) * img.height, 0, 0, canvas.width, canvas.height);
              if (partiallyUncaptured)
                canvas.title = `Playwright couldn't capture full canvas contents because it's located partially outside the viewport.`;
              else
                canvas.title = `Canvas contents are displayed on a best-effort basis based on viewport screenshots taken during test execution.`;
            } else {
              canvas.title = "Canvas content display is disabled.";
            }
            if (isUnderTest)
              console.log(`canvas drawn:`, JSON.stringify([boundingRect.left, boundingRect.top, boundingRect.right - boundingRect.left, boundingRect.bottom - boundingRect.top].map((v) => Math.floor(v * 100))));
          }
        };
        img.onerror = () => {
          for (const canvas of canvasElements) {
            const context = canvas.getContext("2d");
            drawCheckerboard2(context, canvas);
            canvas.title = `Playwright couldn't show canvas contents because the screenshot failed to load.`;
          }
        };
        img.src = location.href.replace("/snapshot", "/closest-screenshot");
      }
    };
    const onDOMContentLoaded = () => visit(win.document);
    win.addEventListener("load", onLoad);
    win.addEventListener("DOMContentLoaded", onDOMContentLoaded);
  }
  return `
(${applyPlaywrightAttributes.toString()})(${JSON.stringify(viewport)}${targetIds.map((id) => `, "${id}"`).join("")})`;
}
const schemas = ["about:", "blob:", "data:", "file:", "ftp:", "http:", "https:", "mailto:", "sftp:", "ws:", "wss:"];
const kLegacyBlobPrefix = "http://playwright.bloburl/#";
function rewriteURLForCustomProtocol(href) {
  if (href.startsWith(kLegacyBlobPrefix))
    href = href.substring(kLegacyBlobPrefix.length);
  try {
    const url = new URL(href);
    if (url.protocol === "javascript:" || url.protocol === "vbscript:")
      return "javascript:void(0)";
    const isBlob = url.protocol === "blob:";
    const isFile = url.protocol === "file:";
    if (!isBlob && !isFile && schemas.includes(url.protocol))
      return href;
    const prefix = "pw-" + url.protocol.slice(0, url.protocol.length - 1);
    if (!isFile)
      url.protocol = "https:";
    url.hostname = url.hostname ? `${prefix}--${url.hostname}` : prefix;
    if (isFile) {
      url.protocol = "https:";
    }
    return url.toString();
  } catch {
    return href;
  }
}
const urlInCSSRegex = /url\(['"]?([\w-]+:)\/\//ig;
function rewriteURLsInStyleSheetForCustomProtocol(text) {
  return text.replace(urlInCSSRegex, (match, protocol) => {
    const isBlob = protocol === "blob:";
    const isFile = protocol === "file:";
    if (!isBlob && !isFile && schemas.includes(protocol))
      return match;
    return match.replace(protocol + "//", `https://pw-${protocol.slice(0, -1)}--`);
  });
}
const urlToEscapeRegex1 = /url\(\s*'([^']*)'\s*\)/ig;
const urlToEscapeRegex2 = /url\(\s*"([^"]*)"\s*\)/ig;
function escapeURLsInStyleSheet(text) {
  const replacer = (match, url) => {
    if (url.includes("</"))
      return match.replace(url, encodeURI(url));
    return match;
  };
  return text.replace(urlToEscapeRegex1, replacer).replace(urlToEscapeRegex2, replacer);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SnapshotRenderer,
  rewriteURLForCustomProtocol
});
