'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var visualHidden = require('./visual-hidden.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const __default__ = vue.defineComponent({
  name: "ElVisuallyHidden"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: visualHidden.visualHiddenProps,
  setup(__props) {
    const props = __props;
    const computedStyle = vue.computed(() => {
      return [
        props.style,
        {
          position: "absolute",
          border: 0,
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          wordWrap: "normal"
        }
      ];
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", vue.mergeProps(_ctx.$attrs, { style: vue.unref(computedStyle) }), [
        vue.renderSlot(_ctx.$slots, "default")
      ], 16);
    };
  }
});
var ElVisuallyHidden = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/visual-hidden/src/visual-hidden.vue"]]);

exports["default"] = ElVisuallyHidden;
//# sourceMappingURL=visual-hidden2.js.map
