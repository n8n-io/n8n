'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElAside"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: {
    width: {
      type: String,
      default: null
    }
  },
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("aside");
    const style = vue.computed(() => props.width ? ns.cssVarBlock({ width: props.width }) : {});
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("aside", {
        class: vue.normalizeClass(vue.unref(ns).b()),
        style: vue.normalizeStyle(vue.unref(style))
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 6);
    };
  }
});
var Aside = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/container/src/aside.vue"]]);

exports["default"] = Aside;
//# sourceMappingURL=aside.js.map
