'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var token = require('./token.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _sfc_main = vue.defineComponent({
  name: "ElOptionGroup",
  componentName: "ElOptionGroup",
  props: {
    label: String,
    disabled: Boolean
  },
  setup(props) {
    const ns = index.useNamespace("select");
    const visible = vue.ref(true);
    const instance = vue.getCurrentInstance();
    const children = vue.ref([]);
    vue.provide(token.selectGroupKey, vue.reactive({
      ...vue.toRefs(props)
    }));
    const select = vue.inject(token.selectKey);
    vue.onMounted(() => {
      children.value = flattedChildren(instance.subTree);
    });
    const flattedChildren = (node) => {
      const children2 = [];
      if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
          var _a;
          if (child.type && child.type.name === "ElOption" && child.component && child.component.proxy) {
            children2.push(child.component.proxy);
          } else if ((_a = child.children) == null ? void 0 : _a.length) {
            children2.push(...flattedChildren(child));
          }
        });
      }
      return children2;
    };
    const { groupQueryChange } = vue.toRaw(select);
    vue.watch(groupQueryChange, () => {
      visible.value = children.value.some((option) => option.visible === true);
    }, { flush: "post" });
    return {
      visible,
      ns
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return vue.withDirectives((vue.openBlock(), vue.createElementBlock("ul", {
    class: vue.normalizeClass(_ctx.ns.be("group", "wrap"))
  }, [
    vue.createElementVNode("li", {
      class: vue.normalizeClass(_ctx.ns.be("group", "title"))
    }, vue.toDisplayString(_ctx.label), 3),
    vue.createElementVNode("li", null, [
      vue.createElementVNode("ul", {
        class: vue.normalizeClass(_ctx.ns.b("group"))
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 2)
    ])
  ], 2)), [
    [vue.vShow, _ctx.visible]
  ]);
}
var OptionGroup = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select/src/option-group.vue"]]);

exports["default"] = OptionGroup;
//# sourceMappingURL=option-group.js.map
