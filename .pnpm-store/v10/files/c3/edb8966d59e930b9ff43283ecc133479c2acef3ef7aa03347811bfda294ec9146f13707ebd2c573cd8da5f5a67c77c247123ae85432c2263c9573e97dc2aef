"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanup = cleanup;
exports.render = render;
var _testUtils = require("@vue/test-utils");
var _dom = require("@testing-library/dom");
var _excluded = ["store", "routes", "container", "baseElement"];
/* eslint-disable testing-library/no-wait-for-empty-callback */
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } } return target; }
var mountedWrappers = new Set();
function render(Component) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
    {
      store = null,
      routes = null,
      container: customContainer,
      baseElement: customBaseElement
    } = _ref,
    mountOptions = _objectWithoutProperties(_ref, _excluded);
  var div = document.createElement('div');
  var baseElement = customBaseElement || customContainer || document.body;
  var container = customContainer || baseElement.appendChild(div);
  if (store || routes) {
    console.warn("Providing 'store' or 'routes' options is no longer available.\nYou need to create a router/vuex instance and provide it through 'global.plugins'.\nCheck out the test examples on GitHub for further details.");
  }
  var wrapper = (0, _testUtils.mount)(Component, _objectSpread(_objectSpread({}, mountOptions), {}, {
    attachTo: container
  }));

  // this removes the additional wrapping div node from VTU:
  // https://github.com/vuejs/vue-test-utils-next/blob/master/src/mount.ts#L309
  unwrapNode(wrapper.parentElement);
  mountedWrappers.add(wrapper);
  return _objectSpread({
    container,
    baseElement,
    debug: function debug() {
      var el = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : baseElement;
      var maxLength = arguments.length > 1 ? arguments[1] : undefined;
      var options = arguments.length > 2 ? arguments[2] : undefined;
      return Array.isArray(el) ? el.forEach(e => console.log((0, _dom.prettyDOM)(e, maxLength, options))) : console.log((0, _dom.prettyDOM)(el, maxLength, options));
    },
    unmount: () => wrapper.unmount(),
    html: () => wrapper.html(),
    emitted: name => wrapper.emitted(name),
    rerender: props => wrapper.setProps(props)
  }, (0, _dom.getQueriesForElement)(baseElement));
}
function unwrapNode(node) {
  node.replaceWith(...node.childNodes);
}
function cleanup() {
  mountedWrappers.forEach(cleanupAtWrapper);
}
function cleanupAtWrapper(wrapper) {
  var _wrapper$element;
  if (((_wrapper$element = wrapper.element) === null || _wrapper$element === void 0 || (_wrapper$element = _wrapper$element.parentNode) === null || _wrapper$element === void 0 ? void 0 : _wrapper$element.parentNode) === document.body) {
    document.body.removeChild(wrapper.element.parentNode);
  }
  wrapper.unmount();
  mountedWrappers.delete(wrapper);
}