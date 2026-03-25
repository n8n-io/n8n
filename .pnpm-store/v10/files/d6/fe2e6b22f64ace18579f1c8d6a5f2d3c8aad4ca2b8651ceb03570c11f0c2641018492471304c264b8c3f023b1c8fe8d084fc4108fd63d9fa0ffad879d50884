import { defineComponent, getCurrentInstance, ref, computed, watch, onMounted, openBlock, createElementBlock, normalizeClass, createElementVNode, normalizeStyle } from 'vue';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import { draggable } from '../utils/draggable.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { getClientXY } from '../../../../utils/dom/position.mjs';

const _sfc_main = defineComponent({
  name: "ElColorHueSlider",
  props: {
    color: {
      type: Object,
      required: true
    },
    vertical: Boolean
  },
  setup(props) {
    const ns = useNamespace("color-hue-slider");
    const instance = getCurrentInstance();
    const thumb = ref();
    const bar = ref();
    const thumbLeft = ref(0);
    const thumbTop = ref(0);
    const hueValue = computed(() => {
      return props.color.get("hue");
    });
    watch(() => hueValue.value, () => {
      update();
    });
    function handleClick(event) {
      const target = event.target;
      if (target !== thumb.value) {
        handleDrag(event);
      }
    }
    function handleDrag(event) {
      if (!bar.value || !thumb.value)
        return;
      const el = instance.vnode.el;
      const rect = el.getBoundingClientRect();
      const { clientX, clientY } = getClientXY(event);
      let hue;
      if (!props.vertical) {
        let left = clientX - rect.left;
        left = Math.min(left, rect.width - thumb.value.offsetWidth / 2);
        left = Math.max(thumb.value.offsetWidth / 2, left);
        hue = Math.round((left - thumb.value.offsetWidth / 2) / (rect.width - thumb.value.offsetWidth) * 360);
      } else {
        let top = clientY - rect.top;
        top = Math.min(top, rect.height - thumb.value.offsetHeight / 2);
        top = Math.max(thumb.value.offsetHeight / 2, top);
        hue = Math.round((top - thumb.value.offsetHeight / 2) / (rect.height - thumb.value.offsetHeight) * 360);
      }
      props.color.set("hue", hue);
    }
    function getThumbLeft() {
      if (!thumb.value)
        return 0;
      const el = instance.vnode.el;
      if (props.vertical)
        return 0;
      const hue = props.color.get("hue");
      if (!el)
        return 0;
      return Math.round(hue * (el.offsetWidth - thumb.value.offsetWidth / 2) / 360);
    }
    function getThumbTop() {
      if (!thumb.value)
        return 0;
      const el = instance.vnode.el;
      if (!props.vertical)
        return 0;
      const hue = props.color.get("hue");
      if (!el)
        return 0;
      return Math.round(hue * (el.offsetHeight - thumb.value.offsetHeight / 2) / 360);
    }
    function update() {
      thumbLeft.value = getThumbLeft();
      thumbTop.value = getThumbTop();
    }
    onMounted(() => {
      if (!bar.value || !thumb.value)
        return;
      const dragConfig = {
        drag: (event) => {
          handleDrag(event);
        },
        end: (event) => {
          handleDrag(event);
        }
      };
      draggable(bar.value, dragConfig);
      draggable(thumb.value, dragConfig);
      update();
    });
    return {
      bar,
      thumb,
      thumbLeft,
      thumbTop,
      hueValue,
      handleClick,
      update,
      ns
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", {
    class: normalizeClass([_ctx.ns.b(), _ctx.ns.is("vertical", _ctx.vertical)])
  }, [
    createElementVNode("div", {
      ref: "bar",
      class: normalizeClass(_ctx.ns.e("bar")),
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.handleClick && _ctx.handleClick(...args))
    }, null, 2),
    createElementVNode("div", {
      ref: "thumb",
      class: normalizeClass(_ctx.ns.e("thumb")),
      style: normalizeStyle({
        left: _ctx.thumbLeft + "px",
        top: _ctx.thumbTop + "px"
      })
    }, null, 6)
  ], 2);
}
var HueSlider = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/hue-slider.vue"]]);

export { HueSlider as default };
//# sourceMappingURL=hue-slider.mjs.map
