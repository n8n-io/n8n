'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var teleport = require('./teleport.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "teleport",
  props: teleport.teleportProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("teleport");
    const containerRef = vue.ref();
    const containerStyle = vue.computed(() => {
      return props.container === "body" ? [
        props.style,
        {
          position: "absolute",
          top: `0px`,
          left: `0px`,
          zIndex: props.zIndex
        }
      ] : {};
    });
    expose({
      containerRef
    });
    return (_ctx, _cache) => {
      return _ctx.container ? (vue.openBlock(), vue.createBlock(vue.Teleport, {
        key: 0,
        to: _ctx.container,
        disabled: _ctx.disabled
      }, [
        vue.createElementVNode("div", {
          ref_key: "containerRef",
          ref: containerRef,
          class: vue.normalizeClass(vue.unref(ns).b()),
          style: vue.normalizeStyle(vue.unref(containerStyle))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 6)
      ], 8, ["to", "disabled"])) : vue.createCommentVNode("v-if", true);
    };
  }
});
var Teleport = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/teleport/src/teleport.vue"]]);

exports["default"] = Teleport;
//# sourceMappingURL=teleport2.js.map
