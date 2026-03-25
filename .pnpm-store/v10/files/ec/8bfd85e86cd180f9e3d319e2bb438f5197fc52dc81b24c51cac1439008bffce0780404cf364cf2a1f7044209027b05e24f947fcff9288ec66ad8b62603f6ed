'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../hooks/index.js');
var token = require('./token.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _sfc_main = vue.defineComponent({
  name: "ElSelectDropdown",
  componentName: "ElSelectDropdown",
  setup() {
    const select = vue.inject(token.selectKey);
    const ns = index.useNamespace("select");
    const popperClass = vue.computed(() => select.props.popperClass);
    const isMultiple = vue.computed(() => select.props.multiple);
    const isFitInputWidth = vue.computed(() => select.props.fitInputWidth);
    const minWidth = vue.ref("");
    function updateMinWidth() {
      var _a;
      minWidth.value = `${(_a = select.selectWrapper) == null ? void 0 : _a.offsetWidth}px`;
    }
    vue.onMounted(() => {
      updateMinWidth();
      core.useResizeObserver(select.selectWrapper, updateMinWidth);
    });
    return {
      ns,
      minWidth,
      popperClass,
      isMultiple,
      isFitInputWidth
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass([_ctx.ns.b("dropdown"), _ctx.ns.is("multiple", _ctx.isMultiple), _ctx.popperClass]),
    style: vue.normalizeStyle({ [_ctx.isFitInputWidth ? "width" : "minWidth"]: _ctx.minWidth })
  }, [
    _ctx.$slots.header ? (vue.openBlock(), vue.createElementBlock("div", {
      key: 0,
      class: vue.normalizeClass(_ctx.ns.be("dropdown", "header"))
    }, [
      vue.renderSlot(_ctx.$slots, "header")
    ], 2)) : vue.createCommentVNode("v-if", true),
    vue.renderSlot(_ctx.$slots, "default"),
    _ctx.$slots.footer ? (vue.openBlock(), vue.createElementBlock("div", {
      key: 1,
      class: vue.normalizeClass(_ctx.ns.be("dropdown", "footer"))
    }, [
      vue.renderSlot(_ctx.$slots, "footer")
    ], 2)) : vue.createCommentVNode("v-if", true)
  ], 6);
}
var ElSelectMenu = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select/src/select-dropdown.vue"]]);

exports["default"] = ElSelectMenu;
//# sourceMappingURL=select-dropdown.js.map
