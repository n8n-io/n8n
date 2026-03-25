import { defineComponent, getCurrentInstance, ref, computed, watch, onMounted, createElementVNode, openBlock, createElementBlock, normalizeClass, normalizeStyle } from 'vue';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import { draggable } from '../utils/draggable.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { getClientXY } from '../../../../utils/dom/position.mjs';

const _sfc_main = defineComponent({
  name: "ElSlPanel",
  props: {
    color: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const ns = useNamespace("color-svpanel");
    const instance = getCurrentInstance();
    const cursorTop = ref(0);
    const cursorLeft = ref(0);
    const background = ref("hsl(0, 100%, 50%)");
    const colorValue = computed(() => {
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
      const { clientX, clientY } = getClientXY(event);
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
    watch(() => colorValue.value, () => {
      update();
    });
    onMounted(() => {
      draggable(instance.vnode.el, {
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
const _hoisted_1 = /* @__PURE__ */ createElementVNode("div", null, null, -1);
const _hoisted_2 = [
  _hoisted_1
];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", {
    class: normalizeClass(_ctx.ns.b()),
    style: normalizeStyle({
      backgroundColor: _ctx.background
    })
  }, [
    createElementVNode("div", {
      class: normalizeClass(_ctx.ns.e("white"))
    }, null, 2),
    createElementVNode("div", {
      class: normalizeClass(_ctx.ns.e("black"))
    }, null, 2),
    createElementVNode("div", {
      class: normalizeClass(_ctx.ns.e("cursor")),
      style: normalizeStyle({
        top: _ctx.cursorTop + "px",
        left: _ctx.cursorLeft + "px"
      })
    }, _hoisted_2, 6)
  ], 6);
}
var SvPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/sv-panel.vue"]]);

export { SvPanel as default };
//# sourceMappingURL=sv-panel.mjs.map
