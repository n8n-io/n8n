'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var draggable = require('../utils/draggable.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');
var position = require('../../../../utils/dom/position.js');

const _sfc_main = vue.defineComponent({
  name: "ElSlPanel",
  props: {
    color: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const ns = index.useNamespace("color-svpanel");
    const instance = vue.getCurrentInstance();
    const cursorTop = vue.ref(0);
    const cursorLeft = vue.ref(0);
    const background = vue.ref("hsl(0, 100%, 50%)");
    const colorValue = vue.computed(() => {
      const hue = props.color.get("hue");
      const value = props.color.get("value");
      return { hue, value };
    });
    function update() {
      const saturation = props.color.get("saturation");
      const value = props.color.get("value");
      const el = instance.vnode.el;
      const { clientWidth: width, clientHeight: height } = el;
      cursorLeft.value = saturation * width / 100;
      cursorTop.value = (100 - value) * height / 100;
      background.value = `hsl(${props.color.get("hue")}, 100%, 50%)`;
    }
    function handleDrag(event) {
      const el = instance.vnode.el;
      const rect = el.getBoundingClientRect();
      const { clientX, clientY } = position.getClientXY(event);
      let left = clientX - rect.left;
      let top = clientY - rect.top;
      left = Math.max(0, left);
      left = Math.min(left, rect.width);
      top = Math.max(0, top);
      top = Math.min(top, rect.height);
      cursorLeft.value = left;
      cursorTop.value = top;
      props.color.set({
        saturation: left / rect.width * 100,
        value: 100 - top / rect.height * 100
      });
    }
    vue.watch(() => colorValue.value, () => {
      update();
    });
    vue.onMounted(() => {
      draggable.draggable(instance.vnode.el, {
        drag: (event) => {
          handleDrag(event);
        },
        end: (event) => {
          handleDrag(event);
        }
      });
      update();
    });
    return {
      cursorTop,
      cursorLeft,
      background,
      colorValue,
      handleDrag,
      update,
      ns
    };
  }
});
const _hoisted_1 = /* @__PURE__ */ vue.createElementVNode("div", null, null, -1);
const _hoisted_2 = [
  _hoisted_1
];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass(_ctx.ns.b()),
    style: vue.normalizeStyle({
      backgroundColor: _ctx.background
    })
  }, [
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("white"))
    }, null, 2),
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("black"))
    }, null, 2),
    vue.createElementVNode("div", {
      class: vue.normalizeClass(_ctx.ns.e("cursor")),
      style: vue.normalizeStyle({
        top: _ctx.cursorTop + "px",
        left: _ctx.cursorLeft + "px"
      })
    }, _hoisted_2, 6)
  ], 6);
}
var SvPanel = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/sv-panel.vue"]]);

exports["default"] = SvPanel;
//# sourceMappingURL=sv-panel.js.map
