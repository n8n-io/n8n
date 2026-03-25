'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var menuItemGroup = require('./menu-item-group.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const COMPONENT_NAME = "ElMenuItemGroup";
const _sfc_main = vue.defineComponent({
  name: COMPONENT_NAME,
  props: menuItemGroup.menuItemGroupProps,
  setup() {
    const ns = index.useNamespace("menu-item-group");
    return {
      ns
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return vue.openBlock(), vue.createElementBlock("li", {
    class: vue.normalizeClass(_ctx.ns.b())
  }, [
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("title"))
    }, [
      !_ctx.$slots.title ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
        vue.createTextVNode(vue.toDisplayString(_ctx.title), 1)
      ], 64)) : vue.renderSlot(_ctx.$slots, "title", { key: 1 })
    ], 2),
    vue.createElementVNode("ul", null, [
      vue.renderSlot(_ctx.$slots, "default")
    ])
  ], 2);
}
var MenuItemGroup = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/menu/src/menu-item-group.vue"]]);

exports["default"] = MenuItemGroup;
//# sourceMappingURL=menu-item-group2.js.map
