"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fireEvent = fireEvent;
var _dom = require("@testing-library/dom");
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; } /* eslint-disable testing-library/no-wait-for-empty-callback */
// Vue Testing Lib's version of fireEvent will call DOM Testing Lib's
// version of fireEvent. The reason is because we need to wait another
// event loop tick to allow Vue to flush and update the DOM
// More info: https://vuejs.org/v2/guide/reactivity.html#Async-Update-Queue
function fireEvent() {
  return _fireEvent.apply(this, arguments);
}
function _fireEvent() {
  _fireEvent = _asyncToGenerator(function* () {
    (0, _dom.fireEvent)(...arguments);
    yield (0, _dom.waitFor)(() => {});
  });
  return _fireEvent.apply(this, arguments);
}
Object.keys(_dom.fireEvent).forEach(key => {
  fireEvent[key] = /*#__PURE__*/_asyncToGenerator(function* () {
    warnOnChangeOrInputEventCalledDirectly(arguments.length <= 1 ? undefined : arguments[1], key);
    _dom.fireEvent[key](...arguments);
    yield (0, _dom.waitFor)(() => {});
  });
});
fireEvent.touch = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(function* (elem) {
    yield fireEvent.focus(elem);
    yield fireEvent.blur(elem);
  });
  return function (_x) {
    return _ref2.apply(this, arguments);
  };
}();

// fireEvent.update is a small utility to provide a better experience when
// working with v-model.
// Related upstream issue: https://github.com/vuejs/vue-test-utils/issues/345#issuecomment-380588199
// See some examples in __tests__/form.js
fireEvent.update = (elem, value) => {
  var tagName = elem.tagName;
  var type = elem.type;
  switch (tagName) {
    case 'OPTION':
      {
        elem.selected = true;
        var parentSelectElement = elem.parentElement.tagName === 'OPTGROUP' ? elem.parentElement.parentElement : elem.parentElement;
        return fireEvent.change(parentSelectElement);
      }
    case 'INPUT':
      {
        if (['checkbox', 'radio'].includes(type)) {
          elem.checked = true;
          return fireEvent.change(elem);
        } else if (type === 'file') {
          return fireEvent.change(elem);
        } else {
          elem.value = value;
          return fireEvent.input(elem);
        }
      }
    case 'TEXTAREA':
      {
        elem.value = value;
        return fireEvent.input(elem);
      }
    case 'SELECT':
      {
        elem.value = value;
        return fireEvent.change(elem);
      }
    default:
    // do nothing
  }
  return null;
};
function warnOnChangeOrInputEventCalledDirectly(eventValue, eventKey) {
  if (process.env.VTL_SKIP_WARN_EVENT_UPDATE) return;
  if (eventValue && (eventKey === 'change' || eventKey === 'input')) {
    console.warn("Using \"fireEvent.".concat(eventKey, "\" may lead to unexpected results. Please use fireEvent.update() instead."));
  }
}