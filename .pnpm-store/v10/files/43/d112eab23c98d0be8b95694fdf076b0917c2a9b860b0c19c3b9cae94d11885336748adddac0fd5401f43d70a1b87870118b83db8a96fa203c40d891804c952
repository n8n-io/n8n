'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var reactivity = require('@vue/reactivity');
require('../../utils/index.js');
var index = require('../use-namespace/index.js');
var error = require('../../utils/error.js');
var core = require('@vueuse/core');
var style = require('../../utils/dom/style.js');
var scroll = require('../../utils/dom/scroll.js');

const useLockscreen = (trigger, options = {}) => {
  if (!vue.isRef(trigger)) {
    error.throwError("[useLockscreen]", "You need to pass a ref param to this function");
  }
  const ns = options.ns || index.useNamespace("popup");
  const hiddenCls = reactivity.computed(() => ns.bm("parent", "hidden"));
  if (!core.isClient || style.hasClass(document.body, hiddenCls.value)) {
    return;
  }
  let scrollBarWidth = 0;
  let withoutHiddenClass = false;
  let bodyWidth = "0";
  const cleanup = () => {
    setTimeout(() => {
      style.removeClass(document == null ? void 0 : document.body, hiddenCls.value);
      if (withoutHiddenClass && document) {
        document.body.style.width = bodyWidth;
      }
    }, 200);
  };
  vue.watch(trigger, (val) => {
    if (!val) {
      cleanup();
      return;
    }
    withoutHiddenClass = !style.hasClass(document.body, hiddenCls.value);
    if (withoutHiddenClass) {
      bodyWidth = document.body.style.width;
    }
    scrollBarWidth = scroll.getScrollBarWidth(ns.namespace.value);
    const bodyHasOverflow = document.documentElement.clientHeight < document.body.scrollHeight;
    const bodyOverflowY = style.getStyle(document.body, "overflowY");
    if (scrollBarWidth > 0 && (bodyHasOverflow || bodyOverflowY === "scroll") && withoutHiddenClass) {
      document.body.style.width = `calc(100% - ${scrollBarWidth}px)`;
    }
    style.addClass(document.body, hiddenCls.value);
  });
  vue.onScopeDispose(() => cleanup());
};

exports.useLockscreen = useLockscreen;
//# sourceMappingURL=index.js.map
