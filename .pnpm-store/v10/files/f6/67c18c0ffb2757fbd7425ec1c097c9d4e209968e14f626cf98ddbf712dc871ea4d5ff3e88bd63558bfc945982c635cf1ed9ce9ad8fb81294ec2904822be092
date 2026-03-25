'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var colorPicker = require('../color-picker.js');
var color = require('../utils/color.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');

const _sfc_main = vue.defineComponent({
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
    const ns = index.useNamespace("color-predefine");
    const { currentColor } = vue.inject(colorPicker.colorPickerContextKey);
    const rgbaColors = vue.ref(parseColors(props.colors, props.color));
    vue.watch(() => currentColor.value, (val) => {
      const color$1 = new color["default"]();
      color$1.fromString(val);
      rgbaColors.value.forEach((item) => {
        item.selected = color$1.compare(item);
      });
    });
    vue.watchEffect(() => {
      rgbaColors.value = parseColors(props.colors, props.color);
    });
    function handleSelect(index) {
      props.color.fromString(props.colors[index]);
    }
    function parseColors(colors, color$1) {
      return colors.map((value) => {
        const c = new color["default"]();
        c.enableAlpha = true;
        c.format = "rgba";
        c.fromString(value);
        c.selected = c.value === color$1.value;
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
  return vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass(_ctx.ns.b())
  }, [
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("colors"))
    }, [
      (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.rgbaColors, (item, index) => {
        return vue.openBlock(), vue.createElementBlock("div", {
          key: _ctx.colors[index],
          class: vue.normalizeClass([
            _ctx.ns.e("color-selector"),
            _ctx.ns.is("alpha", item._alpha < 100),
            { selected: item.selected }
          ]),
          onClick: ($event) => _ctx.handleSelect(index)
        }, [
          vue.createElementVNode("div", {
            style: vue.normalizeStyle({ backgroundColor: item.value })
          }, null, 4)
        ], 10, _hoisted_1);
      }), 128))
    ], 2)
  ], 2);
}
var Predefine = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/predefine.vue"]]);

exports["default"] = Predefine;
//# sourceMappingURL=predefine.js.map
