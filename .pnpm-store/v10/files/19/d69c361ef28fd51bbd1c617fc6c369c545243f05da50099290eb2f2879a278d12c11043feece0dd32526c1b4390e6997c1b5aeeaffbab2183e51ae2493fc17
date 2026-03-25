'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
var shared = require('@vue/shared');
var style = require('../../../utils/dom/style.js');

const sumReducer = (sum2, num) => sum2 + num;
const sum = (listLike) => {
  return shared.isArray(listLike) ? listLike.reduce(sumReducer, 0) : listLike;
};
const tryCall = (fLike, params, defaultRet = {}) => {
  return shared.isFunction(fLike) ? fLike(params) : fLike != null ? fLike : defaultRet;
};
const enforceUnit = (style$1) => {
  ;
  ["width", "maxWidth", "minWidth", "height"].forEach((key) => {
    style$1[key] = style.addUnit(style$1[key]);
  });
  return style$1;
};
const componentToSlot = (ComponentLike) => vue.isVNode(ComponentLike) ? (props) => vue.h(ComponentLike, props) : ComponentLike;

exports.componentToSlot = componentToSlot;
exports.enforceUnit = enforceUnit;
exports.sum = sum;
exports.tryCall = tryCall;
//# sourceMappingURL=utils.js.map
