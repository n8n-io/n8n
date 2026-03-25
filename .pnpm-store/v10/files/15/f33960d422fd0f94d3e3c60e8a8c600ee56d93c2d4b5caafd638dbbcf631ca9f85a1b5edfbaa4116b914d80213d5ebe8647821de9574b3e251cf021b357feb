import { defineComponent, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, normalizeStyle } from 'vue';
import { alphaSliderProps } from '../props/alpha-slider.mjs';
import { useAlphaSlider, useAlphaSliderDOM } from '../composables/use-alpha-slider.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';

const COMPONENT_NAME = "ElColorAlphaSlider";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: alphaSliderProps,
  setup(__props, { expose }) {
    const props = __props;
    const { bar, thumb, handleDrag, handleClick } = useAlphaSlider(props);
    const { rootKls, barKls, barStyle, thumbKls, thumbStyle, update } = useAlphaSliderDOM(props, {
      bar,
      thumb,
      handleDrag
    });
    expose({
      update,
      bar,
      thumb
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(rootKls))
      }, [
        createElementVNode("div", {
          ref_key: "bar",
          ref: bar,
          class: normalizeClass(unref(barKls)),
          style: normalizeStyle(unref(barStyle)),
          onClick: _cache[0] || (_cache[0] = (...args) => unref(handleClick) && unref(handleClick)(...args))
        }, null, 6),
        createElementVNode("div", {
          ref_key: "thumb",
          ref: thumb,
          class: normalizeClass(unref(thumbKls)),
          style: normalizeStyle(unref(thumbStyle))
        }, null, 6)
      ], 2);
    };
  }
});
var AlphaSlider = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/alpha-slider.vue"]]);

export { AlphaSlider as default };
//# sourceMappingURL=alpha-slider.mjs.map
