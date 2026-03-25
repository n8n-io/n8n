'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var types = require('../types.js');
require('../browser.js');
require('../strings.js');
var objects = require('../objects.js');
var error = require('../error.js');
var core = require('@vueuse/core');
var shared = require('@vue/shared');

const SCOPE = "utils/dom/style";
const classNameToArray = (cls = "") => cls.split(" ").filter((item) => !!item.trim());
const hasClass = (el, cls) => {
  if (!el || !cls)
    return false;
  if (cls.includes(" "))
    throw new Error("className should not contain space.");
  return el.classList.contains(cls);
};
const addClass = (el, cls) => {
  if (!el || !cls.trim())
    return;
  el.classList.add(...classNameToArray(cls));
};
const removeClass = (el, cls) => {
  if (!el || !cls.trim())
    return;
  el.classList.remove(...classNameToArray(cls));
};
const getStyle = (element, styleName) => {
  var _a;
  if (!core.isClient || !element || !styleName)
    return "";
  let key = shared.camelize(styleName);
  if (key === "float")
    key = "cssFloat";
  try {
    const style = element.style[key];
    if (style)
      return style;
    const computed = (_a = document.defaultView) == null ? void 0 : _a.getComputedStyle(element, "");
    return computed ? computed[key] : "";
  } catch (e) {
    return element.style[key];
  }
};
const setStyle = (element, styleName, value) => {
  if (!element || !styleName)
    return;
  if (shared.isObject(styleName)) {
    objects.entriesOf(styleName).forEach(([prop, value2]) => setStyle(element, prop, value2));
  } else {
    const key = shared.camelize(styleName);
    element.style[key] = value;
  }
};
const removeStyle = (element, style) => {
  if (!element || !style)
    return;
  if (shared.isObject(style)) {
    objects.keysOf(style).forEach((prop) => removeStyle(element, prop));
  } else {
    setStyle(element, style, "");
  }
};
function addUnit(value, defaultUnit = "px") {
  if (!value)
    return "";
  if (types.isNumber(value) || types.isStringNumber(value)) {
    return `${value}${defaultUnit}`;
  } else if (shared.isString(value)) {
    return value;
  }
  error.debugWarn(SCOPE, "binding value must be a string or number");
}

exports.addClass = addClass;
exports.addUnit = addUnit;
exports.classNameToArray = classNameToArray;
exports.getStyle = getStyle;
exports.hasClass = hasClass;
exports.removeClass = removeClass;
exports.removeStyle = removeStyle;
exports.setStyle = setStyle;
//# sourceMappingURL=style.js.map
