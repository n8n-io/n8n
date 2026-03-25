import { defineComponent, computed, openBlock, createElementBlock, mergeProps, unref, renderSlot } from 'vue';
import { visualHiddenProps } from './visual-hidden.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const __default__ = defineComponent({
  name: "ElVisuallyHidden"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: visualHiddenProps,
  setup(__props) {
    const props = __props;
    const computedStyle = computed(() => {
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
      return openBlock(), createElementBlock("span", mergeProps(_ctx.$attrs, { style: unref(computedStyle) }), [
        renderSlot(_ctx.$slots, "default")
      ], 16);
    };
  }
});
var ElVisuallyHidden = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/visual-hidden/src/visual-hidden.vue"]]);

export { ElVisuallyHidden as default };
//# sourceMappingURL=visual-hidden2.mjs.map
