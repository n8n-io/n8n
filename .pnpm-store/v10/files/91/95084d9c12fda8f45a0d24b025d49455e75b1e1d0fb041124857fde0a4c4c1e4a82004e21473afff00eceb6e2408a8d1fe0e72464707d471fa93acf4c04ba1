import {
  _objectWithoutPropertiesLoose
} from "./chunk-45UGUKRX.js";
import {
  _extends
} from "./chunk-CHUV5WSW.js";
import {
  require_memoizerific
} from "./chunk-WJYERY3R.js";
import {
  __commonJS,
  __toESM
} from "./chunk-A242L54C.js";

// ../node_modules/react-fast-compare/index.js
var require_react_fast_compare = __commonJS({
  "../node_modules/react-fast-compare/index.js"(exports, module) {
    var hasElementType = typeof Element < "u", hasMap = typeof Map == "function", hasSet = typeof Set == "function", hasArrayBuffer = typeof ArrayBuffer == "function" && !!ArrayBuffer.isView;
    function equal(a, b) {
      if (a === b) return !0;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return !1;
        var length, i, keys;
        if (Array.isArray(a)) {
          if (length = a.length, length != b.length) return !1;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return !1;
          return !0;
        }
        var it;
        if (hasMap && a instanceof Map && b instanceof Map) {
          if (a.size !== b.size) return !1;
          for (it = a.entries(); !(i = it.next()).done; )
            if (!b.has(i.value[0])) return !1;
          for (it = a.entries(); !(i = it.next()).done; )
            if (!equal(i.value[1], b.get(i.value[0]))) return !1;
          return !0;
        }
        if (hasSet && a instanceof Set && b instanceof Set) {
          if (a.size !== b.size) return !1;
          for (it = a.entries(); !(i = it.next()).done; )
            if (!b.has(i.value[0])) return !1;
          return !0;
        }
        if (hasArrayBuffer && ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
          if (length = a.length, length != b.length) return !1;
          for (i = length; i-- !== 0; )
            if (a[i] !== b[i]) return !1;
          return !0;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf && typeof a.valueOf == "function" && typeof b.valueOf == "function") return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString && typeof a.toString == "function" && typeof b.toString == "function") return a.toString() === b.toString();
        if (keys = Object.keys(a), length = keys.length, length !== Object.keys(b).length) return !1;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return !1;
        if (hasElementType && a instanceof Element) return !1;
        for (i = length; i-- !== 0; )
          if (!((keys[i] === "_owner" || keys[i] === "__v" || keys[i] === "__o") && a.$$typeof) && !equal(a[keys[i]], b[keys[i]]))
            return !1;
        return !0;
      }
      return a !== a && b !== b;
    }
    module.exports = function(a, b) {
      try {
        return equal(a, b);
      } catch (error) {
        if ((error.message || "").match(/stack|recursion/i))
          return console.warn("react-fast-compare cannot handle circular refs"), !1;
        throw error;
      }
    };
  }
});

// ../node_modules/warning/warning.js
var require_warning = __commonJS({
  "../node_modules/warning/warning.js"(exports, module) {
    "use strict";
    var __DEV__ = process.env.NODE_ENV !== "production", warning2 = function() {
    };
    __DEV__ && (printWarning = function(format, args) {
      var len = arguments.length;
      args = new Array(len > 1 ? len - 1 : 0);
      for (var key = 1; key < len; key++)
        args[key - 1] = arguments[key];
      var argIndex = 0, message = "Warning: " + format.replace(/%s/g, function() {
        return args[argIndex++];
      });
      typeof console < "u" && console.error(message);
      try {
        throw new Error(message);
      } catch {
      }
    }, warning2 = function(condition, format, args) {
      var len = arguments.length;
      args = new Array(len > 2 ? len - 2 : 0);
      for (var key = 2; key < len; key++)
        args[key - 2] = arguments[key];
      if (format === void 0)
        throw new Error(
          "`warning(condition, format, ...args)` requires a warning message argument"
        );
      condition || printWarning.apply(null, [format].concat(args));
    });
    var printWarning;
    module.exports = warning2;
  }
});

// src/components/components/tooltip/WithTooltip.tsx
var import_memoizerific = __toESM(require_memoizerific(), 1);
import React7, { useCallback as useCallback4, useEffect as useEffect6, useState as useState5 } from "react";
import ReactDOM2 from "react-dom";
import { deprecate } from "storybook/internal/client-logger";
import { global } from "@storybook/global";

// ../node_modules/react-popper-tooltip/dist/esm/react-popper-tooltip.js
import * as React6 from "react";

// ../node_modules/react-popper/lib/esm/Popper.js
import * as React4 from "react";

// ../node_modules/react-popper/lib/esm/Manager.js
import * as React from "react";
var ManagerReferenceNodeContext = React.createContext(), ManagerReferenceNodeSetterContext = React.createContext();

// ../node_modules/react-popper/lib/esm/utils.js
import * as React2 from "react";
var fromEntries = function(entries) {
  return entries.reduce(function(acc, _ref) {
    var key = _ref[0], value = _ref[1];
    return acc[key] = value, acc;
  }, {});
}, useIsomorphicLayoutEffect = typeof window < "u" && window.document && window.document.createElement ? React2.useLayoutEffect : React2.useEffect;

// ../node_modules/react-popper/lib/esm/usePopper.js
import * as React3 from "react";
import * as ReactDOM from "react-dom";

// ../node_modules/@popperjs/core/lib/enums.js
var top = "top", bottom = "bottom", right = "right", left = "left", auto = "auto", basePlacements = [top, bottom, right, left], start = "start", end = "end", clippingParents = "clippingParents", viewport = "viewport", popper = "popper", reference = "reference", variationPlacements = basePlacements.reduce(function(acc, placement) {
  return acc.concat([placement + "-" + start, placement + "-" + end]);
}, []), placements = [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
  return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
}, []), beforeRead = "beforeRead", read = "read", afterRead = "afterRead", beforeMain = "beforeMain", main = "main", afterMain = "afterMain", beforeWrite = "beforeWrite", write = "write", afterWrite = "afterWrite", modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

// ../node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
function getNodeName(element) {
  return element ? (element.nodeName || "").toLowerCase() : null;
}

// ../node_modules/@popperjs/core/lib/dom-utils/getWindow.js
function getWindow(node) {
  if (node == null)
    return window;
  if (node.toString() !== "[object Window]") {
    var ownerDocument = node.ownerDocument;
    return ownerDocument && ownerDocument.defaultView || window;
  }
  return node;
}

// ../node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
function isElement(node) {
  var OwnElement = getWindow(node).Element;
  return node instanceof OwnElement || node instanceof Element;
}
function isHTMLElement(node) {
  var OwnElement = getWindow(node).HTMLElement;
  return node instanceof OwnElement || node instanceof HTMLElement;
}
function isShadowRoot(node) {
  if (typeof ShadowRoot > "u")
    return !1;
  var OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

// ../node_modules/@popperjs/core/lib/modifiers/applyStyles.js
function applyStyles(_ref) {
  var state = _ref.state;
  Object.keys(state.elements).forEach(function(name) {
    var style = state.styles[name] || {}, attributes = state.attributes[name] || {}, element = state.elements[name];
    !isHTMLElement(element) || !getNodeName(element) || (Object.assign(element.style, style), Object.keys(attributes).forEach(function(name2) {
      var value = attributes[name2];
      value === !1 ? element.removeAttribute(name2) : element.setAttribute(name2, value === !0 ? "" : value);
    }));
  });
}
function effect(_ref2) {
  var state = _ref2.state, initialStyles = {
    popper: {
      position: state.options.strategy,
      left: "0",
      top: "0",
      margin: "0"
    },
    arrow: {
      position: "absolute"
    },
    reference: {}
  };
  return Object.assign(state.elements.popper.style, initialStyles.popper), state.styles = initialStyles, state.elements.arrow && Object.assign(state.elements.arrow.style, initialStyles.arrow), function() {
    Object.keys(state.elements).forEach(function(name) {
      var element = state.elements[name], attributes = state.attributes[name] || {}, styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]), style = styleProperties.reduce(function(style2, property) {
        return style2[property] = "", style2;
      }, {});
      !isHTMLElement(element) || !getNodeName(element) || (Object.assign(element.style, style), Object.keys(attributes).forEach(function(attribute) {
        element.removeAttribute(attribute);
      }));
    });
  };
}
var applyStyles_default = {
  name: "applyStyles",
  enabled: !0,
  phase: "write",
  fn: applyStyles,
  effect,
  requires: ["computeStyles"]
};

// ../node_modules/@popperjs/core/lib/utils/getBasePlacement.js
function getBasePlacement(placement) {
  return placement.split("-")[0];
}

// ../node_modules/@popperjs/core/lib/utils/math.js
var max = Math.max, min = Math.min, round = Math.round;

// ../node_modules/@popperjs/core/lib/utils/userAgent.js
function getUAString() {
  var uaData = navigator.userAgentData;
  return uaData != null && uaData.brands && Array.isArray(uaData.brands) ? uaData.brands.map(function(item) {
    return item.brand + "/" + item.version;
  }).join(" ") : navigator.userAgent;
}

// ../node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
function isLayoutViewport() {
  return !/^((?!chrome|android).)*safari/i.test(getUAString());
}

// ../node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
function getBoundingClientRect(element, includeScale, isFixedStrategy) {
  includeScale === void 0 && (includeScale = !1), isFixedStrategy === void 0 && (isFixedStrategy = !1);
  var clientRect = element.getBoundingClientRect(), scaleX = 1, scaleY = 1;
  includeScale && isHTMLElement(element) && (scaleX = element.offsetWidth > 0 && round(clientRect.width) / element.offsetWidth || 1, scaleY = element.offsetHeight > 0 && round(clientRect.height) / element.offsetHeight || 1);
  var _ref = isElement(element) ? getWindow(element) : window, visualViewport = _ref.visualViewport, addVisualOffsets = !isLayoutViewport() && isFixedStrategy, x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX, y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY, width = clientRect.width / scaleX, height = clientRect.height / scaleY;
  return {
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    x,
    y
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
function getLayoutRect(element) {
  var clientRect = getBoundingClientRect(element), width = element.offsetWidth, height = element.offsetHeight;
  return Math.abs(clientRect.width - width) <= 1 && (width = clientRect.width), Math.abs(clientRect.height - height) <= 1 && (height = clientRect.height), {
    x: element.offsetLeft,
    y: element.offsetTop,
    width,
    height
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/contains.js
function contains(parent, child) {
  var rootNode = child.getRootNode && child.getRootNode();
  if (parent.contains(child))
    return !0;
  if (rootNode && isShadowRoot(rootNode)) {
    var next = child;
    do {
      if (next && parent.isSameNode(next))
        return !0;
      next = next.parentNode || next.host;
    } while (next);
  }
  return !1;
}

// ../node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
function getComputedStyle(element) {
  return getWindow(element).getComputedStyle(element);
}

// ../node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
function isTableElement(element) {
  return ["table", "td", "th"].indexOf(getNodeName(element)) >= 0;
}

// ../node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
function getDocumentElement(element) {
  return ((isElement(element) ? element.ownerDocument : (
    // $FlowFixMe[prop-missing]
    element.document
  )) || window.document).documentElement;
}

// ../node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
function getParentNode(element) {
  return getNodeName(element) === "html" ? element : (
    // this is a quicker (but less type safe) way to save quite some bytes from the bundle
    // $FlowFixMe[incompatible-return]
    // $FlowFixMe[prop-missing]
    element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
    element.parentNode || // DOM Element detected
    (isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
    // $FlowFixMe[incompatible-call]: HTMLElement is a Node
    getDocumentElement(element)
  );
}

// ../node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
function getTrueOffsetParent(element) {
  return !isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
  getComputedStyle(element).position === "fixed" ? null : element.offsetParent;
}
function getContainingBlock(element) {
  var isFirefox = /firefox/i.test(getUAString()), isIE = /Trident/i.test(getUAString());
  if (isIE && isHTMLElement(element)) {
    var elementCss = getComputedStyle(element);
    if (elementCss.position === "fixed")
      return null;
  }
  var currentNode = getParentNode(element);
  for (isShadowRoot(currentNode) && (currentNode = currentNode.host); isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0; ) {
    var css = getComputedStyle(currentNode);
    if (css.transform !== "none" || css.perspective !== "none" || css.contain === "paint" || ["transform", "perspective"].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === "filter" || isFirefox && css.filter && css.filter !== "none")
      return currentNode;
    currentNode = currentNode.parentNode;
  }
  return null;
}
function getOffsetParent(element) {
  for (var window2 = getWindow(element), offsetParent = getTrueOffsetParent(element); offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === "static"; )
    offsetParent = getTrueOffsetParent(offsetParent);
  return offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle(offsetParent).position === "static") ? window2 : offsetParent || getContainingBlock(element) || window2;
}

// ../node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
function getMainAxisFromPlacement(placement) {
  return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
}

// ../node_modules/@popperjs/core/lib/utils/within.js
function within(min2, value, max2) {
  return max(min2, min(value, max2));
}
function withinMaxClamp(min2, value, max2) {
  var v = within(min2, value, max2);
  return v > max2 ? max2 : v;
}

// ../node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
function getFreshSideObject() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
}

// ../node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
function mergePaddingObject(paddingObject) {
  return Object.assign({}, getFreshSideObject(), paddingObject);
}

// ../node_modules/@popperjs/core/lib/utils/expandToHashMap.js
function expandToHashMap(value, keys) {
  return keys.reduce(function(hashMap, key) {
    return hashMap[key] = value, hashMap;
  }, {});
}

// ../node_modules/@popperjs/core/lib/modifiers/arrow.js
var toPaddingObject = function(padding, state) {
  return padding = typeof padding == "function" ? padding(Object.assign({}, state.rects, {
    placement: state.placement
  })) : padding, mergePaddingObject(typeof padding != "number" ? padding : expandToHashMap(padding, basePlacements));
};
function arrow(_ref) {
  var _state$modifiersData$, state = _ref.state, name = _ref.name, options = _ref.options, arrowElement = state.elements.arrow, popperOffsets2 = state.modifiersData.popperOffsets, basePlacement = getBasePlacement(state.placement), axis = getMainAxisFromPlacement(basePlacement), isVertical = [left, right].indexOf(basePlacement) >= 0, len = isVertical ? "height" : "width";
  if (!(!arrowElement || !popperOffsets2)) {
    var paddingObject = toPaddingObject(options.padding, state), arrowRect = getLayoutRect(arrowElement), minProp = axis === "y" ? top : left, maxProp = axis === "y" ? bottom : right, endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets2[axis] - state.rects.popper[len], startDiff = popperOffsets2[axis] - state.rects.reference[axis], arrowOffsetParent = getOffsetParent(arrowElement), clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0, centerToReference = endDiff / 2 - startDiff / 2, min2 = paddingObject[minProp], max2 = clientSize - arrowRect[len] - paddingObject[maxProp], center = clientSize / 2 - arrowRect[len] / 2 + centerToReference, offset2 = within(min2, center, max2), axisProp = axis;
    state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset2, _state$modifiersData$.centerOffset = offset2 - center, _state$modifiersData$);
  }
}
function effect2(_ref2) {
  var state = _ref2.state, options = _ref2.options, _options$element = options.element, arrowElement = _options$element === void 0 ? "[data-popper-arrow]" : _options$element;
  arrowElement != null && (typeof arrowElement == "string" && (arrowElement = state.elements.popper.querySelector(arrowElement), !arrowElement) || contains(state.elements.popper, arrowElement) && (state.elements.arrow = arrowElement));
}
var arrow_default = {
  name: "arrow",
  enabled: !0,
  phase: "main",
  fn: arrow,
  effect: effect2,
  requires: ["popperOffsets"],
  requiresIfExists: ["preventOverflow"]
};

// ../node_modules/@popperjs/core/lib/utils/getVariation.js
function getVariation(placement) {
  return placement.split("-")[1];
}

// ../node_modules/@popperjs/core/lib/modifiers/computeStyles.js
var unsetSides = {
  top: "auto",
  right: "auto",
  bottom: "auto",
  left: "auto"
};
function roundOffsetsByDPR(_ref, win) {
  var x = _ref.x, y = _ref.y, dpr = win.devicePixelRatio || 1;
  return {
    x: round(x * dpr) / dpr || 0,
    y: round(y * dpr) / dpr || 0
  };
}
function mapToStyles(_ref2) {
  var _Object$assign2, popper2 = _ref2.popper, popperRect = _ref2.popperRect, placement = _ref2.placement, variation = _ref2.variation, offsets = _ref2.offsets, position = _ref2.position, gpuAcceleration = _ref2.gpuAcceleration, adaptive = _ref2.adaptive, roundOffsets = _ref2.roundOffsets, isFixed = _ref2.isFixed, _offsets$x = offsets.x, x = _offsets$x === void 0 ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === void 0 ? 0 : _offsets$y, _ref3 = typeof roundOffsets == "function" ? roundOffsets({
    x,
    y
  }) : {
    x,
    y
  };
  x = _ref3.x, y = _ref3.y;
  var hasX = offsets.hasOwnProperty("x"), hasY = offsets.hasOwnProperty("y"), sideX = left, sideY = top, win = window;
  if (adaptive) {
    var offsetParent = getOffsetParent(popper2), heightProp = "clientHeight", widthProp = "clientWidth";
    if (offsetParent === getWindow(popper2) && (offsetParent = getDocumentElement(popper2), getComputedStyle(offsetParent).position !== "static" && position === "absolute" && (heightProp = "scrollHeight", widthProp = "scrollWidth")), offsetParent = offsetParent, placement === top || (placement === left || placement === right) && variation === end) {
      sideY = bottom;
      var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : (
        // $FlowFixMe[prop-missing]
        offsetParent[heightProp]
      );
      y -= offsetY - popperRect.height, y *= gpuAcceleration ? 1 : -1;
    }
    if (placement === left || (placement === top || placement === bottom) && variation === end) {
      sideX = right;
      var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : (
        // $FlowFixMe[prop-missing]
        offsetParent[widthProp]
      );
      x -= offsetX - popperRect.width, x *= gpuAcceleration ? 1 : -1;
    }
  }
  var commonStyles = Object.assign({
    position
  }, adaptive && unsetSides), _ref4 = roundOffsets === !0 ? roundOffsetsByDPR({
    x,
    y
  }, getWindow(popper2)) : {
    x,
    y
  };
  if (x = _ref4.x, y = _ref4.y, gpuAcceleration) {
    var _Object$assign;
    return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
  }
  return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
}
function computeStyles(_ref5) {
  var state = _ref5.state, options = _ref5.options, _options$gpuAccelerat = options.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === void 0 ? !0 : _options$gpuAccelerat, _options$adaptive = options.adaptive, adaptive = _options$adaptive === void 0 ? !0 : _options$adaptive, _options$roundOffsets = options.roundOffsets, roundOffsets = _options$roundOffsets === void 0 ? !0 : _options$roundOffsets, commonStyles = {
    placement: getBasePlacement(state.placement),
    variation: getVariation(state.placement),
    popper: state.elements.popper,
    popperRect: state.rects.popper,
    gpuAcceleration,
    isFixed: state.options.strategy === "fixed"
  };
  state.modifiersData.popperOffsets != null && (state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
    offsets: state.modifiersData.popperOffsets,
    position: state.options.strategy,
    adaptive,
    roundOffsets
  })))), state.modifiersData.arrow != null && (state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
    offsets: state.modifiersData.arrow,
    position: "absolute",
    adaptive: !1,
    roundOffsets
  })))), state.attributes.popper = Object.assign({}, state.attributes.popper, {
    "data-popper-placement": state.placement
  });
}
var computeStyles_default = {
  name: "computeStyles",
  enabled: !0,
  phase: "beforeWrite",
  fn: computeStyles,
  data: {}
};

// ../node_modules/@popperjs/core/lib/modifiers/eventListeners.js
var passive = {
  passive: !0
};
function effect3(_ref) {
  var state = _ref.state, instance = _ref.instance, options = _ref.options, _options$scroll = options.scroll, scroll = _options$scroll === void 0 ? !0 : _options$scroll, _options$resize = options.resize, resize = _options$resize === void 0 ? !0 : _options$resize, window2 = getWindow(state.elements.popper), scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
  return scroll && scrollParents.forEach(function(scrollParent) {
    scrollParent.addEventListener("scroll", instance.update, passive);
  }), resize && window2.addEventListener("resize", instance.update, passive), function() {
    scroll && scrollParents.forEach(function(scrollParent) {
      scrollParent.removeEventListener("scroll", instance.update, passive);
    }), resize && window2.removeEventListener("resize", instance.update, passive);
  };
}
var eventListeners_default = {
  name: "eventListeners",
  enabled: !0,
  phase: "write",
  fn: function() {
  },
  effect: effect3,
  data: {}
};

// ../node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
var hash = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, function(matched) {
    return hash[matched];
  });
}

// ../node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
var hash2 = {
  start: "end",
  end: "start"
};
function getOppositeVariationPlacement(placement) {
  return placement.replace(/start|end/g, function(matched) {
    return hash2[matched];
  });
}

// ../node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
function getWindowScroll(node) {
  var win = getWindow(node), scrollLeft = win.pageXOffset, scrollTop = win.pageYOffset;
  return {
    scrollLeft,
    scrollTop
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
function getWindowScrollBarX(element) {
  return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
}

// ../node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
function getViewportRect(element, strategy) {
  var win = getWindow(element), html = getDocumentElement(element), visualViewport = win.visualViewport, width = html.clientWidth, height = html.clientHeight, x = 0, y = 0;
  if (visualViewport) {
    width = visualViewport.width, height = visualViewport.height;
    var layoutViewport = isLayoutViewport();
    (layoutViewport || !layoutViewport && strategy === "fixed") && (x = visualViewport.offsetLeft, y = visualViewport.offsetTop);
  }
  return {
    width,
    height,
    x: x + getWindowScrollBarX(element),
    y
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
function getDocumentRect(element) {
  var _element$ownerDocumen, html = getDocumentElement(element), winScroll = getWindowScroll(element), body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body, width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0), height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0), x = -winScroll.scrollLeft + getWindowScrollBarX(element), y = -winScroll.scrollTop;
  return getComputedStyle(body || html).direction === "rtl" && (x += max(html.clientWidth, body ? body.clientWidth : 0) - width), {
    width,
    height,
    x,
    y
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
function isScrollParent(element) {
  var _getComputedStyle = getComputedStyle(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

// ../node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
function getScrollParent(node) {
  return ["html", "body", "#document"].indexOf(getNodeName(node)) >= 0 ? node.ownerDocument.body : isHTMLElement(node) && isScrollParent(node) ? node : getScrollParent(getParentNode(node));
}

// ../node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
function listScrollParents(element, list) {
  var _element$ownerDocumen;
  list === void 0 && (list = []);
  var scrollParent = getScrollParent(element), isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body), win = getWindow(scrollParent), target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent, updatedList = list.concat(target);
  return isBody ? updatedList : (
    // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
    updatedList.concat(listScrollParents(getParentNode(target)))
  );
}

// ../node_modules/@popperjs/core/lib/utils/rectToClientRect.js
function rectToClientRect(rect) {
  return Object.assign({}, rect, {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  });
}

// ../node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
function getInnerBoundingClientRect(element, strategy) {
  var rect = getBoundingClientRect(element, !1, strategy === "fixed");
  return rect.top = rect.top + element.clientTop, rect.left = rect.left + element.clientLeft, rect.bottom = rect.top + element.clientHeight, rect.right = rect.left + element.clientWidth, rect.width = element.clientWidth, rect.height = element.clientHeight, rect.x = rect.left, rect.y = rect.top, rect;
}
function getClientRectFromMixedType(element, clippingParent, strategy) {
  return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
}
function getClippingParents(element) {
  var clippingParents2 = listScrollParents(getParentNode(element)), canEscapeClipping = ["absolute", "fixed"].indexOf(getComputedStyle(element).position) >= 0, clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;
  return isElement(clipperElement) ? clippingParents2.filter(function(clippingParent) {
    return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
  }) : [];
}
function getClippingRect(element, boundary, rootBoundary, strategy) {
  var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary), clippingParents2 = [].concat(mainClippingParents, [rootBoundary]), firstClippingParent = clippingParents2[0], clippingRect = clippingParents2.reduce(function(accRect, clippingParent) {
    var rect = getClientRectFromMixedType(element, clippingParent, strategy);
    return accRect.top = max(rect.top, accRect.top), accRect.right = min(rect.right, accRect.right), accRect.bottom = min(rect.bottom, accRect.bottom), accRect.left = max(rect.left, accRect.left), accRect;
  }, getClientRectFromMixedType(element, firstClippingParent, strategy));
  return clippingRect.width = clippingRect.right - clippingRect.left, clippingRect.height = clippingRect.bottom - clippingRect.top, clippingRect.x = clippingRect.left, clippingRect.y = clippingRect.top, clippingRect;
}

// ../node_modules/@popperjs/core/lib/utils/computeOffsets.js
function computeOffsets(_ref) {
  var reference2 = _ref.reference, element = _ref.element, placement = _ref.placement, basePlacement = placement ? getBasePlacement(placement) : null, variation = placement ? getVariation(placement) : null, commonX = reference2.x + reference2.width / 2 - element.width / 2, commonY = reference2.y + reference2.height / 2 - element.height / 2, offsets;
  switch (basePlacement) {
    case top:
      offsets = {
        x: commonX,
        y: reference2.y - element.height
      };
      break;
    case bottom:
      offsets = {
        x: commonX,
        y: reference2.y + reference2.height
      };
      break;
    case right:
      offsets = {
        x: reference2.x + reference2.width,
        y: commonY
      };
      break;
    case left:
      offsets = {
        x: reference2.x - element.width,
        y: commonY
      };
      break;
    default:
      offsets = {
        x: reference2.x,
        y: reference2.y
      };
  }
  var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
  if (mainAxis != null) {
    var len = mainAxis === "y" ? "height" : "width";
    switch (variation) {
      case start:
        offsets[mainAxis] = offsets[mainAxis] - (reference2[len] / 2 - element[len] / 2);
        break;
      case end:
        offsets[mainAxis] = offsets[mainAxis] + (reference2[len] / 2 - element[len] / 2);
        break;
      default:
    }
  }
  return offsets;
}

// ../node_modules/@popperjs/core/lib/utils/detectOverflow.js
function detectOverflow(state, options) {
  options === void 0 && (options = {});
  var _options = options, _options$placement = _options.placement, placement = _options$placement === void 0 ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === void 0 ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === void 0 ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === void 0 ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === void 0 ? !1 : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === void 0 ? 0 : _options$padding, paddingObject = mergePaddingObject(typeof padding != "number" ? padding : expandToHashMap(padding, basePlacements)), altContext = elementContext === popper ? reference : popper, popperRect = state.rects.popper, element = state.elements[altBoundary ? altContext : elementContext], clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy), referenceClientRect = getBoundingClientRect(state.elements.reference), popperOffsets2 = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: "absolute",
    placement
  }), popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets2)), elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect, overflowOffsets = {
    top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
    bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
    left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
    right: elementClientRect.right - clippingClientRect.right + paddingObject.right
  }, offsetData = state.modifiersData.offset;
  if (elementContext === popper && offsetData) {
    var offset2 = offsetData[placement];
    Object.keys(overflowOffsets).forEach(function(key) {
      var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1, axis = [top, bottom].indexOf(key) >= 0 ? "y" : "x";
      overflowOffsets[key] += offset2[axis] * multiply;
    });
  }
  return overflowOffsets;
}

// ../node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
function computeAutoPlacement(state, options) {
  options === void 0 && (options = {});
  var _options = options, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP, variation = getVariation(placement), placements2 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement2) {
    return getVariation(placement2) === variation;
  }) : basePlacements, allowedPlacements = placements2.filter(function(placement2) {
    return allowedAutoPlacements.indexOf(placement2) >= 0;
  });
  allowedPlacements.length === 0 && (allowedPlacements = placements2);
  var overflows = allowedPlacements.reduce(function(acc, placement2) {
    return acc[placement2] = detectOverflow(state, {
      placement: placement2,
      boundary,
      rootBoundary,
      padding
    })[getBasePlacement(placement2)], acc;
  }, {});
  return Object.keys(overflows).sort(function(a, b) {
    return overflows[a] - overflows[b];
  });
}

// ../node_modules/@popperjs/core/lib/modifiers/flip.js
function getExpandedFallbackPlacements(placement) {
  if (getBasePlacement(placement) === auto)
    return [];
  var oppositePlacement = getOppositePlacement(placement);
  return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
}
function flip(_ref) {
  var state = _ref.state, options = _ref.options, name = _ref.name;
  if (!state.modifiersData[name]._skip) {
    for (var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? !0 : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? !0 : _options$altAxis, specifiedFallbackPlacements = options.fallbackPlacements, padding = options.padding, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, _options$flipVariatio = options.flipVariations, flipVariations = _options$flipVariatio === void 0 ? !0 : _options$flipVariatio, allowedAutoPlacements = options.allowedAutoPlacements, preferredPlacement = state.options.placement, basePlacement = getBasePlacement(preferredPlacement), isBasePlacement = basePlacement === preferredPlacement, fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement)), placements2 = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement2) {
      return acc.concat(getBasePlacement(placement2) === auto ? computeAutoPlacement(state, {
        placement: placement2,
        boundary,
        rootBoundary,
        padding,
        flipVariations,
        allowedAutoPlacements
      }) : placement2);
    }, []), referenceRect = state.rects.reference, popperRect = state.rects.popper, checksMap = /* @__PURE__ */ new Map(), makeFallbackChecks = !0, firstFittingPlacement = placements2[0], i = 0; i < placements2.length; i++) {
      var placement = placements2[i], _basePlacement = getBasePlacement(placement), isStartVariation = getVariation(placement) === start, isVertical = [top, bottom].indexOf(_basePlacement) >= 0, len = isVertical ? "width" : "height", overflow = detectOverflow(state, {
        placement,
        boundary,
        rootBoundary,
        altBoundary,
        padding
      }), mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;
      referenceRect[len] > popperRect[len] && (mainVariationSide = getOppositePlacement(mainVariationSide));
      var altVariationSide = getOppositePlacement(mainVariationSide), checks = [];
      if (checkMainAxis && checks.push(overflow[_basePlacement] <= 0), checkAltAxis && checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0), checks.every(function(check) {
        return check;
      })) {
        firstFittingPlacement = placement, makeFallbackChecks = !1;
        break;
      }
      checksMap.set(placement, checks);
    }
    if (makeFallbackChecks)
      for (var numberOfChecks = flipVariations ? 3 : 1, _loop = function(_i2) {
        var fittingPlacement = placements2.find(function(placement2) {
          var checks2 = checksMap.get(placement2);
          if (checks2)
            return checks2.slice(0, _i2).every(function(check) {
              return check;
            });
        });
        if (fittingPlacement)
          return firstFittingPlacement = fittingPlacement, "break";
      }, _i = numberOfChecks; _i > 0; _i--) {
        var _ret = _loop(_i);
        if (_ret === "break") break;
      }
    state.placement !== firstFittingPlacement && (state.modifiersData[name]._skip = !0, state.placement = firstFittingPlacement, state.reset = !0);
  }
}
var flip_default = {
  name: "flip",
  enabled: !0,
  phase: "main",
  fn: flip,
  requiresIfExists: ["offset"],
  data: {
    _skip: !1
  }
};

// ../node_modules/@popperjs/core/lib/modifiers/hide.js
function getSideOffsets(overflow, rect, preventedOffsets) {
  return preventedOffsets === void 0 && (preventedOffsets = {
    x: 0,
    y: 0
  }), {
    top: overflow.top - rect.height - preventedOffsets.y,
    right: overflow.right - rect.width + preventedOffsets.x,
    bottom: overflow.bottom - rect.height + preventedOffsets.y,
    left: overflow.left - rect.width - preventedOffsets.x
  };
}
function isAnySideFullyClipped(overflow) {
  return [top, right, bottom, left].some(function(side) {
    return overflow[side] >= 0;
  });
}
function hide(_ref) {
  var state = _ref.state, name = _ref.name, referenceRect = state.rects.reference, popperRect = state.rects.popper, preventedOffsets = state.modifiersData.preventOverflow, referenceOverflow = detectOverflow(state, {
    elementContext: "reference"
  }), popperAltOverflow = detectOverflow(state, {
    altBoundary: !0
  }), referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect), popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets), isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets), hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
  state.modifiersData[name] = {
    referenceClippingOffsets,
    popperEscapeOffsets,
    isReferenceHidden,
    hasPopperEscaped
  }, state.attributes.popper = Object.assign({}, state.attributes.popper, {
    "data-popper-reference-hidden": isReferenceHidden,
    "data-popper-escaped": hasPopperEscaped
  });
}
var hide_default = {
  name: "hide",
  enabled: !0,
  phase: "main",
  requiresIfExists: ["preventOverflow"],
  fn: hide
};

// ../node_modules/@popperjs/core/lib/modifiers/offset.js
function distanceAndSkiddingToXY(placement, rects, offset2) {
  var basePlacement = getBasePlacement(placement), invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1, _ref = typeof offset2 == "function" ? offset2(Object.assign({}, rects, {
    placement
  })) : offset2, skidding = _ref[0], distance = _ref[1];
  return skidding = skidding || 0, distance = (distance || 0) * invertDistance, [left, right].indexOf(basePlacement) >= 0 ? {
    x: distance,
    y: skidding
  } : {
    x: skidding,
    y: distance
  };
}
function offset(_ref2) {
  var state = _ref2.state, options = _ref2.options, name = _ref2.name, _options$offset = options.offset, offset2 = _options$offset === void 0 ? [0, 0] : _options$offset, data = placements.reduce(function(acc, placement) {
    return acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset2), acc;
  }, {}), _data$state$placement = data[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
  state.modifiersData.popperOffsets != null && (state.modifiersData.popperOffsets.x += x, state.modifiersData.popperOffsets.y += y), state.modifiersData[name] = data;
}
var offset_default = {
  name: "offset",
  enabled: !0,
  phase: "main",
  requires: ["popperOffsets"],
  fn: offset
};

// ../node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
function popperOffsets(_ref) {
  var state = _ref.state, name = _ref.name;
  state.modifiersData[name] = computeOffsets({
    reference: state.rects.reference,
    element: state.rects.popper,
    strategy: "absolute",
    placement: state.placement
  });
}
var popperOffsets_default = {
  name: "popperOffsets",
  enabled: !0,
  phase: "read",
  fn: popperOffsets,
  data: {}
};

// ../node_modules/@popperjs/core/lib/utils/getAltAxis.js
function getAltAxis(axis) {
  return axis === "x" ? "y" : "x";
}

// ../node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
function preventOverflow(_ref) {
  var state = _ref.state, options = _ref.options, name = _ref.name, _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? !0 : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? !1 : _options$altAxis, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, padding = options.padding, _options$tether = options.tether, tether = _options$tether === void 0 ? !0 : _options$tether, _options$tetherOffset = options.tetherOffset, tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset, overflow = detectOverflow(state, {
    boundary,
    rootBoundary,
    padding,
    altBoundary
  }), basePlacement = getBasePlacement(state.placement), variation = getVariation(state.placement), isBasePlacement = !variation, mainAxis = getMainAxisFromPlacement(basePlacement), altAxis = getAltAxis(mainAxis), popperOffsets2 = state.modifiersData.popperOffsets, referenceRect = state.rects.reference, popperRect = state.rects.popper, tetherOffsetValue = typeof tetherOffset == "function" ? tetherOffset(Object.assign({}, state.rects, {
    placement: state.placement
  })) : tetherOffset, normalizedTetherOffsetValue = typeof tetherOffsetValue == "number" ? {
    mainAxis: tetherOffsetValue,
    altAxis: tetherOffsetValue
  } : Object.assign({
    mainAxis: 0,
    altAxis: 0
  }, tetherOffsetValue), offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null, data = {
    x: 0,
    y: 0
  };
  if (popperOffsets2) {
    if (checkMainAxis) {
      var _offsetModifierState$, mainSide = mainAxis === "y" ? top : left, altSide = mainAxis === "y" ? bottom : right, len = mainAxis === "y" ? "height" : "width", offset2 = popperOffsets2[mainAxis], min2 = offset2 + overflow[mainSide], max2 = offset2 - overflow[altSide], additive = tether ? -popperRect[len] / 2 : 0, minLen = variation === start ? referenceRect[len] : popperRect[len], maxLen = variation === start ? -popperRect[len] : -referenceRect[len], arrowElement = state.elements.arrow, arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
        width: 0,
        height: 0
      }, arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject(), arrowPaddingMin = arrowPaddingObject[mainSide], arrowPaddingMax = arrowPaddingObject[altSide], arrowLen = within(0, referenceRect[len], arrowRect[len]), minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis, maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis, arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow), clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0, offsetModifierValue = (_offsetModifierState$ = offsetModifierState?.[mainAxis]) != null ? _offsetModifierState$ : 0, tetherMin = offset2 + minOffset - offsetModifierValue - clientOffset, tetherMax = offset2 + maxOffset - offsetModifierValue, preventedOffset = within(tether ? min(min2, tetherMin) : min2, offset2, tether ? max(max2, tetherMax) : max2);
      popperOffsets2[mainAxis] = preventedOffset, data[mainAxis] = preventedOffset - offset2;
    }
    if (checkAltAxis) {
      var _offsetModifierState$2, _mainSide = mainAxis === "x" ? top : left, _altSide = mainAxis === "x" ? bottom : right, _offset = popperOffsets2[altAxis], _len = altAxis === "y" ? "height" : "width", _min = _offset + overflow[_mainSide], _max = _offset - overflow[_altSide], isOriginSide = [top, left].indexOf(basePlacement) !== -1, _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState?.[altAxis]) != null ? _offsetModifierState$2 : 0, _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis, _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max, _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
      popperOffsets2[altAxis] = _preventedOffset, data[altAxis] = _preventedOffset - _offset;
    }
    state.modifiersData[name] = data;
  }
}
var preventOverflow_default = {
  name: "preventOverflow",
  enabled: !0,
  phase: "main",
  fn: preventOverflow,
  requiresIfExists: ["offset"]
};

// ../node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
function getHTMLElementScroll(element) {
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop
  };
}

// ../node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
function getNodeScroll(node) {
  return node === getWindow(node) || !isHTMLElement(node) ? getWindowScroll(node) : getHTMLElementScroll(node);
}

// ../node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
function isElementScaled(element) {
  var rect = element.getBoundingClientRect(), scaleX = round(rect.width) / element.offsetWidth || 1, scaleY = round(rect.height) / element.offsetHeight || 1;
  return scaleX !== 1 || scaleY !== 1;
}
function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
  isFixed === void 0 && (isFixed = !1);
  var isOffsetParentAnElement = isHTMLElement(offsetParent), offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent), documentElement = getDocumentElement(offsetParent), rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed), scroll = {
    scrollLeft: 0,
    scrollTop: 0
  }, offsets = {
    x: 0,
    y: 0
  };
  return (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) && ((getNodeName(offsetParent) !== "body" || // https://github.com/popperjs/popper-core/issues/1078
  isScrollParent(documentElement)) && (scroll = getNodeScroll(offsetParent)), isHTMLElement(offsetParent) ? (offsets = getBoundingClientRect(offsetParent, !0), offsets.x += offsetParent.clientLeft, offsets.y += offsetParent.clientTop) : documentElement && (offsets.x = getWindowScrollBarX(documentElement))), {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  };
}

// ../node_modules/@popperjs/core/lib/utils/orderModifiers.js
function order(modifiers) {
  var map = /* @__PURE__ */ new Map(), visited = /* @__PURE__ */ new Set(), result = [];
  modifiers.forEach(function(modifier) {
    map.set(modifier.name, modifier);
  });
  function sort(modifier) {
    visited.add(modifier.name);
    var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
    requires.forEach(function(dep) {
      if (!visited.has(dep)) {
        var depModifier = map.get(dep);
        depModifier && sort(depModifier);
      }
    }), result.push(modifier);
  }
  return modifiers.forEach(function(modifier) {
    visited.has(modifier.name) || sort(modifier);
  }), result;
}
function orderModifiers(modifiers) {
  var orderedModifiers = order(modifiers);
  return modifierPhases.reduce(function(acc, phase) {
    return acc.concat(orderedModifiers.filter(function(modifier) {
      return modifier.phase === phase;
    }));
  }, []);
}

// ../node_modules/@popperjs/core/lib/utils/debounce.js
function debounce(fn2) {
  var pending;
  return function() {
    return pending || (pending = new Promise(function(resolve) {
      Promise.resolve().then(function() {
        pending = void 0, resolve(fn2());
      });
    })), pending;
  };
}

// ../node_modules/@popperjs/core/lib/utils/mergeByName.js
function mergeByName(modifiers) {
  var merged = modifiers.reduce(function(merged2, current) {
    var existing = merged2[current.name];
    return merged2[current.name] = existing ? Object.assign({}, existing, current, {
      options: Object.assign({}, existing.options, current.options),
      data: Object.assign({}, existing.data, current.data)
    }) : current, merged2;
  }, {});
  return Object.keys(merged).map(function(key) {
    return merged[key];
  });
}

// ../node_modules/@popperjs/core/lib/createPopper.js
var DEFAULT_OPTIONS = {
  placement: "bottom",
  modifiers: [],
  strategy: "absolute"
};
function areValidElements() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
    args[_key] = arguments[_key];
  return !args.some(function(element) {
    return !(element && typeof element.getBoundingClientRect == "function");
  });
}
function popperGenerator(generatorOptions) {
  generatorOptions === void 0 && (generatorOptions = {});
  var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers3 = _generatorOptions$def === void 0 ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
  return function(reference2, popper2, options) {
    options === void 0 && (options = defaultOptions);
    var state = {
      placement: "bottom",
      orderedModifiers: [],
      options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
      modifiersData: {},
      elements: {
        reference: reference2,
        popper: popper2
      },
      attributes: {},
      styles: {}
    }, effectCleanupFns = [], isDestroyed = !1, instance = {
      state,
      setOptions: function(setOptionsAction) {
        var options2 = typeof setOptionsAction == "function" ? setOptionsAction(state.options) : setOptionsAction;
        cleanupModifierEffects(), state.options = Object.assign({}, defaultOptions, state.options, options2), state.scrollParents = {
          reference: isElement(reference2) ? listScrollParents(reference2) : reference2.contextElement ? listScrollParents(reference2.contextElement) : [],
          popper: listScrollParents(popper2)
        };
        var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers3, state.options.modifiers)));
        return state.orderedModifiers = orderedModifiers.filter(function(m) {
          return m.enabled;
        }), runModifierEffects(), instance.update();
      },
      // Sync update – it will always be executed, even if not necessary. This
      // is useful for low frequency updates where sync behavior simplifies the
      // logic.
      // For high frequency updates (e.g. `resize` and `scroll` events), always
      // prefer the async Popper#update method
      forceUpdate: function() {
        if (!isDestroyed) {
          var _state$elements = state.elements, reference3 = _state$elements.reference, popper3 = _state$elements.popper;
          if (areValidElements(reference3, popper3)) {
            state.rects = {
              reference: getCompositeRect(reference3, getOffsetParent(popper3), state.options.strategy === "fixed"),
              popper: getLayoutRect(popper3)
            }, state.reset = !1, state.placement = state.options.placement, state.orderedModifiers.forEach(function(modifier) {
              return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
            });
            for (var index = 0; index < state.orderedModifiers.length; index++) {
              if (state.reset === !0) {
                state.reset = !1, index = -1;
                continue;
              }
              var _state$orderedModifie = state.orderedModifiers[index], fn2 = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
              typeof fn2 == "function" && (state = fn2({
                state,
                options: _options,
                name,
                instance
              }) || state);
            }
          }
        }
      },
      // Async and optimistically optimized update – it will not be executed if
      // not necessary (debounced to run at most once-per-tick)
      update: debounce(function() {
        return new Promise(function(resolve) {
          instance.forceUpdate(), resolve(state);
        });
      }),
      destroy: function() {
        cleanupModifierEffects(), isDestroyed = !0;
      }
    };
    if (!areValidElements(reference2, popper2))
      return instance;
    instance.setOptions(options).then(function(state2) {
      !isDestroyed && options.onFirstUpdate && options.onFirstUpdate(state2);
    });
    function runModifierEffects() {
      state.orderedModifiers.forEach(function(_ref) {
        var name = _ref.name, _ref$options = _ref.options, options2 = _ref$options === void 0 ? {} : _ref$options, effect4 = _ref.effect;
        if (typeof effect4 == "function") {
          var cleanupFn = effect4({
            state,
            name,
            instance,
            options: options2
          }), noopFn = function() {
          };
          effectCleanupFns.push(cleanupFn || noopFn);
        }
      });
    }
    function cleanupModifierEffects() {
      effectCleanupFns.forEach(function(fn2) {
        return fn2();
      }), effectCleanupFns = [];
    }
    return instance;
  };
}
var createPopper = popperGenerator();

// ../node_modules/@popperjs/core/lib/popper-lite.js
var defaultModifiers = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default], createPopper2 = popperGenerator({
  defaultModifiers
});

// ../node_modules/@popperjs/core/lib/popper.js
var defaultModifiers2 = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default, offset_default, flip_default, preventOverflow_default, arrow_default, hide_default], createPopper3 = popperGenerator({
  defaultModifiers: defaultModifiers2
});

// ../node_modules/react-popper/lib/esm/usePopper.js
var import_react_fast_compare = __toESM(require_react_fast_compare());
var EMPTY_MODIFIERS = [], usePopper = function(referenceElement, popperElement, options) {
  options === void 0 && (options = {});
  var prevOptions = React3.useRef(null), optionsWithDefaults = {
    onFirstUpdate: options.onFirstUpdate,
    placement: options.placement || "bottom",
    strategy: options.strategy || "absolute",
    modifiers: options.modifiers || EMPTY_MODIFIERS
  }, _React$useState = React3.useState({
    styles: {
      popper: {
        position: optionsWithDefaults.strategy,
        left: "0",
        top: "0"
      },
      arrow: {
        position: "absolute"
      }
    },
    attributes: {}
  }), state = _React$useState[0], setState = _React$useState[1], updateStateModifier = React3.useMemo(function() {
    return {
      name: "updateState",
      enabled: !0,
      phase: "write",
      fn: function(_ref) {
        var state2 = _ref.state, elements = Object.keys(state2.elements);
        ReactDOM.flushSync(function() {
          setState({
            styles: fromEntries(elements.map(function(element) {
              return [element, state2.styles[element] || {}];
            })),
            attributes: fromEntries(elements.map(function(element) {
              return [element, state2.attributes[element]];
            }))
          });
        });
      },
      requires: ["computeStyles"]
    };
  }, []), popperOptions = React3.useMemo(function() {
    var newOptions = {
      onFirstUpdate: optionsWithDefaults.onFirstUpdate,
      placement: optionsWithDefaults.placement,
      strategy: optionsWithDefaults.strategy,
      modifiers: [].concat(optionsWithDefaults.modifiers, [updateStateModifier, {
        name: "applyStyles",
        enabled: !1
      }])
    };
    return (0, import_react_fast_compare.default)(prevOptions.current, newOptions) ? prevOptions.current || newOptions : (prevOptions.current = newOptions, newOptions);
  }, [optionsWithDefaults.onFirstUpdate, optionsWithDefaults.placement, optionsWithDefaults.strategy, optionsWithDefaults.modifiers, updateStateModifier]), popperInstanceRef = React3.useRef();
  return useIsomorphicLayoutEffect(function() {
    popperInstanceRef.current && popperInstanceRef.current.setOptions(popperOptions);
  }, [popperOptions]), useIsomorphicLayoutEffect(function() {
    if (!(referenceElement == null || popperElement == null)) {
      var createPopper4 = options.createPopper || createPopper3, popperInstance = createPopper4(referenceElement, popperElement, popperOptions);
      return popperInstanceRef.current = popperInstance, function() {
        popperInstance.destroy(), popperInstanceRef.current = null;
      };
    }
  }, [referenceElement, popperElement, options.createPopper]), {
    state: popperInstanceRef.current ? popperInstanceRef.current.state : null,
    styles: state.styles,
    attributes: state.attributes,
    update: popperInstanceRef.current ? popperInstanceRef.current.update : null,
    forceUpdate: popperInstanceRef.current ? popperInstanceRef.current.forceUpdate : null
  };
};

// ../node_modules/react-popper/lib/esm/Reference.js
var import_warning = __toESM(require_warning());
import * as React5 from "react";

// ../node_modules/react-popper-tooltip/dist/esm/react-popper-tooltip.js
function useGetLatest(val) {
  var ref = React6.useRef(val);
  return ref.current = val, React6.useCallback(function() {
    return ref.current;
  }, []);
}
var noop = function() {
};
function useControlledState(_ref) {
  var initial = _ref.initial, value = _ref.value, _ref$onChange = _ref.onChange, onChange = _ref$onChange === void 0 ? noop : _ref$onChange;
  if (initial === void 0 && value === void 0)
    throw new TypeError('Either "value" or "initial" variable must be set. Now both are undefined');
  var _React$useState = React6.useState(initial), state = _React$useState[0], setState = _React$useState[1], getLatest = useGetLatest(state), set = React6.useCallback(function(updater) {
    var state2 = getLatest(), updatedState = typeof updater == "function" ? updater(state2) : updater;
    typeof updatedState.persist == "function" && updatedState.persist(), setState(updatedState), typeof onChange == "function" && onChange(updatedState);
  }, [getLatest, onChange]), isControlled = value !== void 0;
  return [isControlled ? value : state, isControlled ? onChange : set];
}
function generateBoundingClientRect(x, y) {
  return x === void 0 && (x = 0), y === void 0 && (y = 0), function() {
    return {
      width: 0,
      height: 0,
      top: y,
      right: x,
      bottom: y,
      left: x,
      x: 0,
      y: 0,
      toJSON: function() {
        return null;
      }
    };
  };
}
var _excluded = ["styles", "attributes"], virtualElement = {
  getBoundingClientRect: generateBoundingClientRect()
}, defaultConfig = {
  closeOnOutsideClick: !0,
  closeOnTriggerHidden: !1,
  defaultVisible: !1,
  delayHide: 0,
  delayShow: 0,
  followCursor: !1,
  interactive: !1,
  mutationObserverOptions: {
    attributes: !0,
    childList: !0,
    subtree: !0
  },
  offset: [0, 6],
  trigger: "hover"
};
function usePopperTooltip(config, popperOptions) {
  var _popperProps$state, _popperProps$state$mo, _popperProps$state$mo2;
  config === void 0 && (config = {}), popperOptions === void 0 && (popperOptions = {});
  var finalConfig = Object.keys(defaultConfig).reduce(function(config2, key) {
    var _extends2;
    return _extends({}, config2, (_extends2 = {}, _extends2[key] = config2[key] !== void 0 ? config2[key] : defaultConfig[key], _extends2));
  }, config), defaultModifiers3 = React6.useMemo(
    function() {
      return [{
        name: "offset",
        options: {
          offset: finalConfig.offset
        }
      }];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Array.isArray(finalConfig.offset) ? finalConfig.offset : []
  ), finalPopperOptions = _extends({}, popperOptions, {
    placement: popperOptions.placement || finalConfig.placement,
    modifiers: popperOptions.modifiers || defaultModifiers3
  }), _React$useState = React6.useState(null), triggerRef = _React$useState[0], setTriggerRef = _React$useState[1], _React$useState2 = React6.useState(null), tooltipRef = _React$useState2[0], setTooltipRef = _React$useState2[1], _useControlledState = useControlledState({
    initial: finalConfig.defaultVisible,
    value: finalConfig.visible,
    onChange: finalConfig.onVisibleChange
  }), visible = _useControlledState[0], setVisible = _useControlledState[1], timer = React6.useRef();
  React6.useEffect(function() {
    return function() {
      return clearTimeout(timer.current);
    };
  }, []);
  var _usePopper = usePopper(finalConfig.followCursor ? virtualElement : triggerRef, tooltipRef, finalPopperOptions), styles = _usePopper.styles, attributes = _usePopper.attributes, popperProps = _objectWithoutPropertiesLoose(_usePopper, _excluded), update = popperProps.update, getLatest = useGetLatest({
    visible,
    triggerRef,
    tooltipRef,
    finalConfig
  }), isTriggeredBy = React6.useCallback(
    function(trigger) {
      return Array.isArray(finalConfig.trigger) ? finalConfig.trigger.includes(trigger) : finalConfig.trigger === trigger;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Array.isArray(finalConfig.trigger) ? finalConfig.trigger : [finalConfig.trigger]
  ), hideTooltip = React6.useCallback(function() {
    clearTimeout(timer.current), timer.current = window.setTimeout(function() {
      return setVisible(!1);
    }, finalConfig.delayHide);
  }, [finalConfig.delayHide, setVisible]), showTooltip = React6.useCallback(function() {
    clearTimeout(timer.current), timer.current = window.setTimeout(function() {
      return setVisible(!0);
    }, finalConfig.delayShow);
  }, [finalConfig.delayShow, setVisible]), toggleTooltip = React6.useCallback(function() {
    getLatest().visible ? hideTooltip() : showTooltip();
  }, [getLatest, hideTooltip, showTooltip]);
  React6.useEffect(function() {
    if (getLatest().finalConfig.closeOnOutsideClick) {
      var handleClickOutside = function(event) {
        var _event$composedPath, _getLatest = getLatest(), tooltipRef2 = _getLatest.tooltipRef, triggerRef2 = _getLatest.triggerRef, target = (event.composedPath == null || (_event$composedPath = event.composedPath()) == null ? void 0 : _event$composedPath[0]) || event.target;
        target instanceof Node && tooltipRef2 != null && triggerRef2 != null && !tooltipRef2.contains(target) && !triggerRef2.contains(target) && hideTooltip();
      };
      return document.addEventListener("mousedown", handleClickOutside), function() {
        return document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [getLatest, hideTooltip]), React6.useEffect(function() {
    if (!(triggerRef == null || !isTriggeredBy("click")))
      return triggerRef.addEventListener("click", toggleTooltip), function() {
        return triggerRef.removeEventListener("click", toggleTooltip);
      };
  }, [triggerRef, isTriggeredBy, toggleTooltip]), React6.useEffect(function() {
    if (!(triggerRef == null || !isTriggeredBy("double-click")))
      return triggerRef.addEventListener("dblclick", toggleTooltip), function() {
        return triggerRef.removeEventListener("dblclick", toggleTooltip);
      };
  }, [triggerRef, isTriggeredBy, toggleTooltip]), React6.useEffect(function() {
    if (!(triggerRef == null || !isTriggeredBy("right-click"))) {
      var preventDefaultAndToggle = function(event) {
        event.preventDefault(), toggleTooltip();
      };
      return triggerRef.addEventListener("contextmenu", preventDefaultAndToggle), function() {
        return triggerRef.removeEventListener("contextmenu", preventDefaultAndToggle);
      };
    }
  }, [triggerRef, isTriggeredBy, toggleTooltip]), React6.useEffect(function() {
    if (!(triggerRef == null || !isTriggeredBy("focus")))
      return triggerRef.addEventListener("focus", showTooltip), triggerRef.addEventListener("blur", hideTooltip), function() {
        triggerRef.removeEventListener("focus", showTooltip), triggerRef.removeEventListener("blur", hideTooltip);
      };
  }, [triggerRef, isTriggeredBy, showTooltip, hideTooltip]), React6.useEffect(function() {
    if (!(triggerRef == null || !isTriggeredBy("hover")))
      return triggerRef.addEventListener("mouseenter", showTooltip), triggerRef.addEventListener("mouseleave", hideTooltip), function() {
        triggerRef.removeEventListener("mouseenter", showTooltip), triggerRef.removeEventListener("mouseleave", hideTooltip);
      };
  }, [triggerRef, isTriggeredBy, showTooltip, hideTooltip]), React6.useEffect(function() {
    if (!(tooltipRef == null || !isTriggeredBy("hover") || !getLatest().finalConfig.interactive))
      return tooltipRef.addEventListener("mouseenter", showTooltip), tooltipRef.addEventListener("mouseleave", hideTooltip), function() {
        tooltipRef.removeEventListener("mouseenter", showTooltip), tooltipRef.removeEventListener("mouseleave", hideTooltip);
      };
  }, [tooltipRef, isTriggeredBy, showTooltip, hideTooltip, getLatest]);
  var isReferenceHidden = popperProps == null || (_popperProps$state = popperProps.state) == null || (_popperProps$state$mo = _popperProps$state.modifiersData) == null || (_popperProps$state$mo2 = _popperProps$state$mo.hide) == null ? void 0 : _popperProps$state$mo2.isReferenceHidden;
  React6.useEffect(function() {
    finalConfig.closeOnTriggerHidden && isReferenceHidden && hideTooltip();
  }, [finalConfig.closeOnTriggerHidden, hideTooltip, isReferenceHidden]), React6.useEffect(function() {
    if (!finalConfig.followCursor || triggerRef == null) return;
    function setMousePosition(_ref) {
      var clientX = _ref.clientX, clientY = _ref.clientY;
      virtualElement.getBoundingClientRect = generateBoundingClientRect(clientX, clientY), update?.();
    }
    return triggerRef.addEventListener("mousemove", setMousePosition), function() {
      return triggerRef.removeEventListener("mousemove", setMousePosition);
    };
  }, [finalConfig.followCursor, triggerRef, update]), React6.useEffect(function() {
    if (!(tooltipRef == null || update == null || finalConfig.mutationObserverOptions == null)) {
      var observer = new MutationObserver(update);
      return observer.observe(tooltipRef, finalConfig.mutationObserverOptions), function() {
        return observer.disconnect();
      };
    }
  }, [finalConfig.mutationObserverOptions, tooltipRef, update]);
  var getTooltipProps = function(args) {
    return args === void 0 && (args = {}), _extends({}, args, {
      style: _extends({}, args.style, styles.popper)
    }, attributes.popper, {
      "data-popper-interactive": finalConfig.interactive
    });
  }, getArrowProps = function(args) {
    return args === void 0 && (args = {}), _extends({}, args, attributes.arrow, {
      style: _extends({}, args.style, styles.arrow),
      "data-popper-arrow": !0
    });
  };
  return _extends({
    getArrowProps,
    getTooltipProps,
    setTooltipRef,
    setTriggerRef,
    tooltipRef,
    triggerRef,
    visible
  }, popperProps);
}

// src/components/components/tooltip/WithTooltip.tsx
import { lighten, styled } from "storybook/theming";
var { document: document2 } = global, match = (0, import_memoizerific.default)(1e3)(
  (requests, actual, value, fallback = 0) => actual.split("-")[0] === requests ? value : fallback
), ArrowSpacing = 8, Arrow = styled.div(
  {
    position: "absolute",
    borderStyle: "solid"
  },
  ({ placement }) => {
    let x = 0, y = 0;
    switch (!0) {
      case (placement.startsWith("left") || placement.startsWith("right")): {
        y = 8;
        break;
      }
      case (placement.startsWith("top") || placement.startsWith("bottom")): {
        x = 8;
        break;
      }
      default:
    }
    return { transform: `translate3d(${x}px, ${y}px, 0px)` };
  },
  ({ theme, color, placement }) => ({
    bottom: `${match("top", placement, `${ArrowSpacing * -1}px`, "auto")}`,
    top: `${match("bottom", placement, `${ArrowSpacing * -1}px`, "auto")}`,
    right: `${match("left", placement, `${ArrowSpacing * -1}px`, "auto")}`,
    left: `${match("right", placement, `${ArrowSpacing * -1}px`, "auto")}`,
    borderBottomWidth: `${match("top", placement, "0", ArrowSpacing)}px`,
    borderTopWidth: `${match("bottom", placement, "0", ArrowSpacing)}px`,
    borderRightWidth: `${match("left", placement, "0", ArrowSpacing)}px`,
    borderLeftWidth: `${match("right", placement, "0", ArrowSpacing)}px`,
    borderTopColor: match(
      "top",
      placement,
      theme.color[color] || color || theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
      "transparent"
    ),
    borderBottomColor: match(
      "bottom",
      placement,
      theme.color[color] || color || theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
      "transparent"
    ),
    borderLeftColor: match(
      "left",
      placement,
      theme.color[color] || color || theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
      "transparent"
    ),
    borderRightColor: match(
      "right",
      placement,
      theme.color[color] || color || theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
      "transparent"
    )
  })
), Wrapper = styled.div(
  ({ hidden }) => ({
    display: hidden ? "none" : "inline-block",
    zIndex: 2147483647,
    colorScheme: "light dark"
  }),
  ({ theme, color, hasChrome }) => hasChrome ? {
    background: color && theme.color[color] || color || theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
    filter: `
            drop-shadow(0px 5px 5px rgba(0,0,0,0.05))
            drop-shadow(0 1px 3px rgba(0,0,0,0.1))
          `,
    borderRadius: theme.appBorderRadius + 2,
    fontSize: theme.typography.size.s1
  } : {}
), Tooltip = React7.forwardRef(
  ({
    placement = "top",
    hasChrome = !0,
    children,
    arrowProps = {},
    tooltipRef,
    color,
    withArrows,
    ...props
  }, ref) => React7.createElement(Wrapper, { "data-testid": "tooltip", hasChrome, ref, ...props, color }, hasChrome && withArrows && React7.createElement(Arrow, { placement, ...arrowProps, color }), children)
);
Tooltip.displayName = "Tooltip";
var TargetContainer = styled.div`
  display: inline-block;
  cursor: ${(props) => props.trigger === "hover" || props.trigger?.includes("hover") ? "default" : "pointer"};
`, TargetSvgContainer = styled.g`
  cursor: ${(props) => props.trigger === "hover" || props.trigger?.includes("hover") ? "default" : "pointer"};
`, WithTooltipPure = ({
  svg = !1,
  trigger = "click",
  closeOnOutsideClick = !1,
  placement = "top",
  modifiers = [
    {
      name: "preventOverflow",
      options: {
        padding: 8
      }
    },
    {
      name: "offset",
      options: {
        offset: [8, 8]
      }
    },
    {
      name: "arrow",
      options: {
        padding: 8
      }
    }
  ],
  hasChrome = !0,
  defaultVisible = !1,
  withArrows,
  offset: offset2,
  tooltip,
  children,
  closeOnTriggerHidden,
  mutationObserverOptions,
  delayHide = trigger === "hover" ? 200 : 0,
  visible,
  interactive,
  delayShow = trigger === "hover" ? 400 : 0,
  strategy,
  followCursor,
  onVisibleChange,
  portalContainer,
  ...props
}) => {
  let Container = svg ? TargetSvgContainer : TargetContainer, {
    getArrowProps,
    getTooltipProps,
    setTooltipRef,
    setTriggerRef,
    visible: isVisible,
    state
  } = usePopperTooltip(
    {
      trigger,
      placement,
      defaultVisible,
      delayHide,
      interactive,
      closeOnOutsideClick,
      closeOnTriggerHidden,
      onVisibleChange,
      delayShow,
      followCursor,
      mutationObserverOptions,
      visible,
      offset: offset2
    },
    {
      modifiers,
      strategy
    }
  ), portalTarget = (typeof portalContainer == "string" ? document2.querySelector(portalContainer) : portalContainer) || document2.body, tooltipComponent = isVisible ? React7.createElement(
    Tooltip,
    {
      placement: state?.placement,
      ref: setTooltipRef,
      hasChrome,
      arrowProps: getArrowProps(),
      withArrows,
      ...getTooltipProps()
    },
    typeof tooltip == "function" ? tooltip({ onHide: () => onVisibleChange(!1) }) : tooltip
  ) : null;
  return React7.createElement(React7.Fragment, null, React7.createElement(Container, { trigger, ref: setTriggerRef, ...props }, children), isVisible && ReactDOM2.createPortal(tooltipComponent, portalTarget));
}, WithToolTipState = ({
  startOpen = !1,
  onVisibleChange: onChange,
  ...rest
}) => {
  let [tooltipShown, setTooltipShown] = useState5(startOpen), onVisibilityChange = useCallback4(
    (visibility) => {
      onChange && onChange(visibility) === !1 || setTooltipShown(visibility);
    },
    [onChange]
  );
  return useEffect6(() => {
    let hide2 = () => onVisibilityChange(!1), handleKeyDown = (e) => {
      e.key === "Escape" && hide2();
    };
    document2.addEventListener("keydown", handleKeyDown, !1);
    let iframes = Array.from(document2.getElementsByTagName("iframe")), unbinders = [];
    return iframes.forEach((iframe) => {
      let bind = () => {
        try {
          iframe.contentWindow.document && (iframe.contentWindow.document.addEventListener("click", hide2), unbinders.push(() => {
            try {
              iframe.contentWindow.document.removeEventListener("click", hide2);
            } catch {
            }
          }));
        } catch {
        }
      };
      bind(), iframe.addEventListener("load", bind), unbinders.push(() => {
        iframe.removeEventListener("load", bind);
      });
    }), () => {
      document2.removeEventListener("keydown", handleKeyDown), unbinders.forEach((unbind) => {
        unbind();
      });
    };
  }), React7.createElement(WithTooltipPure, { ...rest, visible: tooltipShown, onVisibleChange: onVisibilityChange });
}, DeprecatedPure = (props) => (deprecate(
  "WithTooltipPure is deprecated and will be removed in Storybook 11. Please use WithTooltip instead."
), React7.createElement(WithTooltipPure, { "data-deprecated": "WithTooltipPure", ...props })), DeprecatedState = (props) => (deprecate(
  "WithToolTipState is deprecated and will be removed in Storybook 11. Please use WithTooltip instead."
), React7.createElement(WithToolTipState, { "data-deprecated": "WithToolTipState", ...props }));
export {
  Tooltip,
  DeprecatedState as WithToolTipState,
  WithToolTipState as WithTooltip,
  DeprecatedPure as WithTooltipPure
};
