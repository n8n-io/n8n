'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var divider = require('./divider.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElDivider"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: divider.dividerProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("divider");
    const dividerStyle = vue.computed(() => {
      return ns.cssVar({
        "border-style": props.borderStyle
      });
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).b(), vue.unref(ns).m(_ctx.direction)]),
        style: vue.normalizeStyle(vue.unref(dividerStyle)),
        role: "separator"
      }, [
        _ctx.$slots.default && _ctx.direction !== "vertical" ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass([vue.unref(ns).e("text"), vue.unref(ns).is(_ctx.contentPosition)])
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 6);
    };
  }
});
var Divider = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/divider/src/divider.vue"]]);

exports["default"] = Divider;
//# sourceMappingURL=divider2.js.map
