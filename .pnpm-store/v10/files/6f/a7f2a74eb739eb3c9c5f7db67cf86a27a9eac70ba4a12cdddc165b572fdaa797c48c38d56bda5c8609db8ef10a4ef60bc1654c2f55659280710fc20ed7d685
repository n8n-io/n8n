'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../utils/index.js');
var shared = require('@vue/shared');

function useFocusController(target, { afterFocus, beforeBlur, afterBlur } = {}) {
  const instance = vue.getCurrentInstance();
  const { emit } = instance;
  const wrapperRef = vue.shallowRef();
  const isFocused = vue.ref(false);
  const handleFocus = (event) => {
    if (isFocused.value)
      return;
    isFocused.value = true;
    emit("focus", event);
    afterFocus == null ? void 0 : afterFocus();
  };
  const handleBlur = (event) => {
    var _a;
    const cancelBlur = shared.isFunction(beforeBlur) ? beforeBlur(event) : false;
    if (cancelBlur || event.relatedTarget && ((_a = wrapperRef.value) == null ? void 0 : _a.contains(event.relatedTarget)))
      return;
    isFocused.value = false;
    emit("blur", event);
    afterBlur == null ? void 0 : afterBlur();
  };
  const handleClick = () => {
    var _a;
    (_a = target.value) == null ? void 0 : _a.focus();
  };
  vue.watch(wrapperRef, (el) => {
    if (el) {
      el.setAttribute("tabindex", "-1");
    }
  });
  core.useEventListener(wrapperRef, "click", handleClick);
  return {
    wrapperRef,
    isFocused,
    handleFocus,
    handleBlur
  };
}

exports.useFocusController = useFocusController;
//# sourceMappingURL=index.js.map
