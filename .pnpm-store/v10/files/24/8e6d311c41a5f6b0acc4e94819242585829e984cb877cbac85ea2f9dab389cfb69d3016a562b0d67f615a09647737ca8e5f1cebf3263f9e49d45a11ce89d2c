import { defineComponent, inject, ref, watch, watchEffect, openBlock, createElementBlock, normalizeClass, createElementVNode, Fragment, renderList, normalizeStyle } from 'vue';
import '../../../../hooks/index.mjs';
import { colorPickerContextKey } from '../color-picker.mjs';
import Color from '../utils/color.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';

const _sfc_main = defineComponent({
  props: {
    colors: {
      type: Array,
      required: true
    },
    color: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const ns = useNamespace("color-predefine");
    const { currentColor } = inject(colorPickerContextKey);
    const rgbaColors = ref(parseColors(props.colors, props.color));
    watch(() => currentColor.value, (val) => {
      const color = new Color();
      color.fromString(val);
      rgbaColors.value.forEach((item) => {
        item.selected = color.compare(item);
      });
    });
    watchEffect(() => {
      rgbaColors.value = parseColors(props.colors, props.color);
    });
    function handleSelect(index) {
      props.color.fromString(props.colors[index]);
    }
    function parseColors(colors, color) {
      return colors.map((value) => {
        const c = new Color();
        c.enableAlpha = true;
        c.format = "rgba";
        c.fromString(value);
        c.selected = c.value === color.value;
        return c;
      });
    }
    return {
      rgbaColors,
      handleSelect,
      ns
    };
  }
});
const _hoisted_1 = ["onClick"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", {
    class: normalizeClass(_ctx.ns.b())
  }, [
    createElementVNode("div", {
      class: normalizeClass(_ctx.ns.e("colors"))
    }, [
      (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.rgbaColors, (item, index) => {
        return openBlock(), createElementBlock("div", {
          key: _ctx.colors[index],
          class: normalizeClass([
            _ctx.ns.e("color-selector"),
            _ctx.ns.is("alpha", item._alpha < 100),
            { selected: item.selected }
          ]),
          onClick: ($event) => _ctx.handleSelect(index)
        }, [
          createElementVNode("div", {
            style: normalizeStyle({ backgroundColor: item.value })
          }, null, 4)
        ], 10, _hoisted_1);
      }), 128))
    ], 2)
  ], 2);
}
var Predefine = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/predefine.vue"]]);

export { Predefine as default };
//# sourceMappingURL=predefine.mjs.map
