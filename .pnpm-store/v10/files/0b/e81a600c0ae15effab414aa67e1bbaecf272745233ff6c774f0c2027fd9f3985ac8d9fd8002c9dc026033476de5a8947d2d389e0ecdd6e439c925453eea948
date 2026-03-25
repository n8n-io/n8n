'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
var link = require('./link.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _hoisted_1 = ["href"];
const __default__ = vue.defineComponent({
  name: "ElLink"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: link.linkProps,
  emits: link.linkEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("link");
    const linkKls = vue.computed(() => [
      ns.b(),
      ns.m(props.type),
      ns.is("disabled", props.disabled),
      ns.is("underline", props.underline && !props.disabled)
    ]);
    function handleClick(event) {
      if (!props.disabled)
        emit("click", event);
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("a", {
        class: vue.normalizeClass(vue.unref(linkKls)),
        href: _ctx.disabled || !_ctx.href ? void 0 : _ctx.href,
        onClick: handleClick
      }, [
        _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 0 }, {
          default: vue.withCtx(() => [
            (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
          ]),
          _: 1
        })) : vue.createCommentVNode("v-if", true),
        _ctx.$slots.default ? (vue.openBlock(), vue.createElementBlock("span", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).e("inner"))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2)) : vue.createCommentVNode("v-if", true),
        _ctx.$slots.icon ? vue.renderSlot(_ctx.$slots, "icon", { key: 2 }) : vue.createCommentVNode("v-if", true)
      ], 10, _hoisted_1);
    };
  }
});
var Link = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/link/src/link.vue"]]);

exports["default"] = Link;
//# sourceMappingURL=link2.js.map
