'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var result = require('./result.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElResult"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: result.resultProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("result");
    const resultIcon = vue.computed(() => {
      const icon = props.icon;
      const iconClass = icon && result.IconMap[icon] ? result.IconMap[icon] : "icon-info";
      const iconComponent = result.IconComponentMap[iconClass] || result.IconComponentMap["icon-info"];
      return {
        class: iconClass,
        component: iconComponent
      };
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("icon"))
        }, [
          vue.renderSlot(_ctx.$slots, "icon", {}, () => [
            vue.unref(resultIcon).component ? (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(resultIcon).component), {
              key: 0,
              class: vue.normalizeClass(vue.unref(resultIcon).class)
            }, null, 8, ["class"])) : vue.createCommentVNode("v-if", true)
          ])
        ], 2),
        _ctx.title || _ctx.$slots.title ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("title"))
        }, [
          vue.renderSlot(_ctx.$slots, "title", {}, () => [
            vue.createElementVNode("p", null, vue.toDisplayString(_ctx.title), 1)
          ])
        ], 2)) : vue.createCommentVNode("v-if", true),
        _ctx.subTitle || _ctx.$slots["sub-title"] ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).e("subtitle"))
        }, [
          vue.renderSlot(_ctx.$slots, "sub-title", {}, () => [
            vue.createElementVNode("p", null, vue.toDisplayString(_ctx.subTitle), 1)
          ])
        ], 2)) : vue.createCommentVNode("v-if", true),
        _ctx.$slots.extra ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 2,
          class: vue.normalizeClass(vue.unref(ns).e("extra"))
        }, [
          vue.renderSlot(_ctx.$slots, "extra")
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Result = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/result/src/result.vue"]]);

exports["default"] = Result;
//# sourceMappingURL=result2.js.map
