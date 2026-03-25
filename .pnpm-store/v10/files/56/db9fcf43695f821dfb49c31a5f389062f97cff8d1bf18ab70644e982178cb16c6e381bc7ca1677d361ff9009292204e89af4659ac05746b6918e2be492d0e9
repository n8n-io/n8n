'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const FOCUSABLE_ELEMENT_SELECTORS = `a[href],button:not([disabled]),button:not([hidden]),:not([tabindex="-1"]),input:not([disabled]),input:not([type="hidden"]),select:not([disabled]),textarea:not([disabled])`;
const isVisible = (element) => {
  if (process.env.NODE_ENV === "test")
    return true;
  const computed = getComputedStyle(element);
  return computed.position === "fixed" ? false : element.offsetParent !== null;
};
const obtainAllFocusableElements = (element) => {
  return Array.from(element.querySelectorAll(FOCUSABLE_ELEMENT_SELECTORS)).filter((item) => isFocusable(item) && isVisible(item));
};
const isFocusable = (element) => {
  if (element.tabIndex > 0 || element.tabIndex === 0 && element.getAttribute("tabIndex") !== null) {
    return true;
  }
  if (element.disabled) {
    return false;
  }
  switch (element.nodeName) {
    case "A": {
      return !!element.href && element.rel !== "ignore";
    }
    case "INPUT": {
      return !(element.type === "hidden" || element.type === "file");
    }
    case "BUTTON":
    case "SELECT":
    case "TEXTAREA": {
      return true;
    }
    default: {
      return false;
    }
  }
};
const attemptFocus = (element) => {
  var _a;
  if (!isFocusable(element)) {
    return false;
  }
  (_a = element.focus) == null ? void 0 : _a.call(element);
  return document.activeElement === element;
};
const triggerEvent = function(elm, name, ...opts) {
  let eventName;
  if (name.includes("mouse") || name.includes("click")) {
    eventName = "MouseEvents";
  } else if (name.includes("key")) {
    eventName = "KeyboardEvent";
  } else {
    eventName = "HTMLEvents";
  }
  const evt = document.createEvent(eventName);
  evt.initEvent(name, ...opts);
  elm.dispatchEvent(evt);
  return elm;
};
const isLeaf = (el) => !el.getAttribute("aria-owns");
const getSibling = (el, distance, elClass) => {
  const { parentNode } = el;
  if (!parentNode)
    return null;
  const siblings = parentNode.querySelectorAll(elClass);
  const index = Array.prototype.indexOf.call(siblings, el);
  return siblings[index + distance] || null;
};
const focusNode = (el) => {
  if (!el)
    return;
  el.focus();
  !isLeaf(el) && el.click();
};

exports.attemptFocus = attemptFocus;
exports.focusNode = focusNode;
exports.getSibling = getSibling;
exports.isFocusable = isFocusable;
exports.isLeaf = isLeaf;
exports.isVisible = isVisible;
exports.obtainAllFocusableElements = obtainAllFocusableElements;
exports.triggerEvent = triggerEvent;
//# sourceMappingURL=aria.js.map
