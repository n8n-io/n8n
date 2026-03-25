'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var badge = require('./badge.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var types = require('../../../utils/types.js');

const _hoisted_1 = ["textContent"];
const __default__ = vue.defineComponent({
  name: "ElBadge"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: badge.badgeProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("badge");
    const content = vue.computed(() => {
      if (props.isDot)
        return "";
      if (types.isNumber(props.value) && types.isNumber(props.max)) {
        return props.max < props.value ? `${props.max}+` : `${props.value}`;
      }
      return `${props.value}`;
    });
    expose({
      content
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        vue.renderSlot(_ctx.$slots, "default"),
        vue.createVNode(vue.Transition, {
          name: `${vue.unref(ns).namespace.value}-zoom-in-center`,
          persisted: ""
        }, {
          default: vue.withCtx(() => [
            vue.withDirectives(vue.createElementVNode("sup", {
              class: vue.normalizeClass([
                vue.unref(ns).e("content"),
                vue.unref(ns).em("content", _ctx.type),
                vue.unref(ns).is("fixed", !!_ctx.$slots.default),
                vue.unref(ns).is("dot", _ctx.isDot)
              ]),
              textContent: vue.toDisplayString(vue.unref(content))
            }, null, 10, _hoisted_1), [
              [vue.vShow, !_ctx.hidden && (vue.unref(content) || _ctx.isDot)]
            ])
          ]),
          _: 1
        }, 8, ["name"])
      ], 2);
    };
  }
});
var Badge = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/badge/src/badge.vue"]]);

exports["default"] = Badge;
//# sourceMappingURL=badge2.js.map
