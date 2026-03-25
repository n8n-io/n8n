'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _sfc_main = vue.defineComponent({
  props: {
    item: {
      type: Object,
      required: true
    },
    style: Object,
    height: Number
  },
  setup() {
    const ns = index.useNamespace("select");
    return {
      ns
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return _ctx.item.isTitle ? (vue.openBlock(), vue.createElementBlock("div", {
    key: 0,
    class: vue.normalizeClass(_ctx.ns.be("group", "title")),
    style: vue.normalizeStyle([_ctx.style, { lineHeight: `${_ctx.height}px` }])
  }, vue.toDisplayString(_ctx.item.label), 7)) : (vue.openBlock(), vue.createElementBlock("div", {
    key: 1,
    class: vue.normalizeClass(_ctx.ns.be("group", "split")),
    style: vue.normalizeStyle(_ctx.style)
  }, [
    vue.createElementVNode("span", {
      class: vue.normalizeClass(_ctx.ns.be("group", "split-dash")),
      style: vue.normalizeStyle({ top: `${_ctx.height / 2}px` })
    }, null, 6)
  ], 6));
}
var GroupItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select-v2/src/group-item.vue"]]);

exports["default"] = GroupItem;
//# sourceMappingURL=group-item.js.map
