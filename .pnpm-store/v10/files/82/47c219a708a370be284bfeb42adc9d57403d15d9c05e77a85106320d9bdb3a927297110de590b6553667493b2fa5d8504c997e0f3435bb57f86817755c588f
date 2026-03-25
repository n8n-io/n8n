'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var arrow = require('./arrow.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElPopperArrow",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: arrow.popperArrowProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("popper");
    const { arrowOffset, arrowRef, arrowStyle } = vue.inject(constants.POPPER_CONTENT_INJECTION_KEY, void 0);
    vue.watch(() => props.arrowOffset, (val) => {
      arrowOffset.value = val;
    });
    vue.onBeforeUnmount(() => {
      arrowRef.value = void 0;
    });
    expose({
      arrowRef
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", {
        ref_key: "arrowRef",
        ref: arrowRef,
        class: vue.normalizeClass(vue.unref(ns).e("arrow")),
        style: vue.normalizeStyle(vue.unref(arrowStyle)),
        "data-popper-arrow": ""
      }, null, 6);
    };
  }
});
var ElPopperArrow = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/popper/src/arrow.vue"]]);

exports["default"] = ElPopperArrow;
//# sourceMappingURL=arrow2.js.map
