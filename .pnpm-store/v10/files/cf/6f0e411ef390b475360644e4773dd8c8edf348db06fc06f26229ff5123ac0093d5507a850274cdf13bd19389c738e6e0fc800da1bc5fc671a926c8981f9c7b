'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElHeader"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: {
    height: {
      type: String,
      default: null
    }
  },
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("header");
    const style = vue.computed(() => {
      return props.height ? ns.cssVarBlock({
        height: props.height
      }) : {};
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("header", {
        class: vue.normalizeClass(vue.unref(ns).b()),
        style: vue.normalizeStyle(vue.unref(style))
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 6);
    };
  }
});
var Header = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/container/src/header.vue"]]);

exports["default"] = Header;
//# sourceMappingURL=header.js.map
