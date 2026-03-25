'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../browser.js');
var core = require('@vueuse/core');

const isInContainer = (el, container) => {
  if (!core.isClient || !el || !container)
    return false;
  const elRect = el.getBoundingClientRect();
  let containerRect;
  if (container instanceof Element) {
    containerRect = container.getBoundingClientRect();
  } else {
    containerRect = {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0
    };
  }
  return elRect.top < containerRect.bottom && elRect.bottom > containerRect.top && elRect.right > containerRect.left && elRect.left < containerRect.right;
};
const getOffsetTop = (el) => {
  let offset = 0;
  let parent = el;
  while (parent) {
    offset += parent.offsetTop;
    parent = parent.offsetParent;
  }
  return offset;
};
const getOffsetTopDistance = (el, containerEl) => {
  return Math.abs(getOffsetTop(el) - getOffsetTop(containerEl));
};
const getClientXY = (event) => {
  let clientX;
  let clientY;
  if (event.type === "touchend") {
    clientY = event.changedTouches[0].clientY;
    clientX = event.changedTouches[0].clientX;
  } else if (event.type.startsWith("touch")) {
    clientY = event.touches[0].clientY;
    clientX = event.touches[0].clientX;
  } else {
    clientY = event.clientY;
    clientX = event.clientX;
  }
  return {
    clientX,
    clientY
  };
};

exports.getClientXY = getClientXY;
exports.getOffsetTop = getOffsetTop;
exports.getOffsetTopDistance = getOffsetTopDistance;
exports.isInContainer = isInContainer;
//# sourceMappingURL=position.js.map
