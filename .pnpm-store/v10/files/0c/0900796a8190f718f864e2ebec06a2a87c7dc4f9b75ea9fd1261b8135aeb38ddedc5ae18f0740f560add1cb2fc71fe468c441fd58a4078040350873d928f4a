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
  name: "ElColorHueSlider",
  props: {
    color: {
      type: Object,
      required: true
    },
    vertical: Boolean
  },
  setup(props) {
    const ns = index.useNamespace("color-hue-slider");
    const instance = vue.getCurrentInstance();
    const thumb = vue.ref();
    const bar = vue.ref();
    const thumbLeft = vue.ref(0);
    const thumbTop = vue.ref(0);
    const hueValue = vue.computed(() => {
      return props.color.get("hue");
    });
    vue.watch(() => hueValue.value, () => {
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
      const { clientX, clientY } = position.getClientXY(event);
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
    vue.onMounted(() => {
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
      draggable.draggable(bar.value, dragConfig);
      draggable.draggable(thumb.value, dragConfig);
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
  return vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass([_ctx.ns.b(), _ctx.ns.is("vertical", _ctx.vertical)])
  }, [
    vue.createElementVNode("div", {
      ref: "bar",
      class: vue.normalizeClass(_ctx.ns.e("bar")),
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.handleClick && _ctx.handleClick(...args))
    }, null, 2),
    vue.createElementVNode("div", {
      ref: "thumb",
      class: vue.normalizeClass(_ctx.ns.e("thumb")),
      style: vue.normalizeStyle({
        left: _ctx.thumbLeft + "px",
        top: _ctx.thumbTop + "px"
      })
    }, null, 6)
  ], 2);
}
var HueSlider = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/components/hue-slider.vue"]]);

exports["default"] = HueSlider;
//# sourceMappingURL=hue-slider.js.map
