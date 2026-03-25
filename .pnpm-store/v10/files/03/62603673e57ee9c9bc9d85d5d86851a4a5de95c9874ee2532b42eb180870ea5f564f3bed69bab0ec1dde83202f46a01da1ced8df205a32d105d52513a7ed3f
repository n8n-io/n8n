'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../tooltip/index.js');
require('../../../hooks/index.js');
require('./composables/index.js');
var button = require('./button.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var useSliderButton = require('./composables/use-slider-button.js');

const _hoisted_1 = ["tabindex"];
const __default__ = vue.defineComponent({
  name: "ElSliderButton"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: button.sliderButtonProps,
  emits: button.sliderButtonEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = index.useNamespace("slider");
    const initData = vue.reactive({
      hovering: false,
      dragging: false,
      isClick: false,
      startX: 0,
      currentX: 0,
      startY: 0,
      currentY: 0,
      startPosition: 0,
      newPosition: 0,
      oldValue: props.modelValue
    });
    const {
      disabled,
      button,
      tooltip,
      showTooltip,
      tooltipVisible,
      wrapperStyle,
      formatValue,
      handleMouseEnter,
      handleMouseLeave,
      onButtonDown,
      onKeyDown,
      setPosition
    } = useSliderButton.useSliderButton(props, initData, emit);
    const { hovering, dragging } = vue.toRefs(initData);
    expose({
      onButtonDown,
      onKeyDown,
      setPosition,
      hovering,
      dragging
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "button",
        ref: button,
        class: vue.normalizeClass([vue.unref(ns).e("button-wrapper"), { hover: vue.unref(hovering), dragging: vue.unref(dragging) }]),
        style: vue.normalizeStyle(vue.unref(wrapperStyle)),
        tabindex: vue.unref(disabled) ? -1 : 0,
        onMouseenter: _cache[0] || (_cache[0] = (...args) => vue.unref(handleMouseEnter) && vue.unref(handleMouseEnter)(...args)),
        onMouseleave: _cache[1] || (_cache[1] = (...args) => vue.unref(handleMouseLeave) && vue.unref(handleMouseLeave)(...args)),
        onMousedown: _cache[2] || (_cache[2] = (...args) => vue.unref(onButtonDown) && vue.unref(onButtonDown)(...args)),
        onTouchstart: _cache[3] || (_cache[3] = (...args) => vue.unref(onButtonDown) && vue.unref(onButtonDown)(...args)),
        onFocus: _cache[4] || (_cache[4] = (...args) => vue.unref(handleMouseEnter) && vue.unref(handleMouseEnter)(...args)),
        onBlur: _cache[5] || (_cache[5] = (...args) => vue.unref(handleMouseLeave) && vue.unref(handleMouseLeave)(...args)),
        onKeydown: _cache[6] || (_cache[6] = (...args) => vue.unref(onKeyDown) && vue.unref(onKeyDown)(...args))
      }, [
        vue.createVNode(vue.unref(index$1.ElTooltip), {
          ref_key: "tooltip",
          ref: tooltip,
          visible: vue.unref(tooltipVisible),
          placement: _ctx.placement,
          "fallback-placements": ["top", "bottom", "right", "left"],
          "stop-popper-mouse-event": false,
          "popper-class": _ctx.tooltipClass,
          disabled: !vue.unref(showTooltip),
          persistent: ""
        }, {
          content: vue.withCtx(() => [
            vue.createElementVNode("span", null, vue.toDisplayString(vue.unref(formatValue)), 1)
          ]),
          default: vue.withCtx(() => [
            vue.createElementVNode("div", {
              class: vue.normalizeClass([vue.unref(ns).e("button"), { hover: vue.unref(hovering), dragging: vue.unref(dragging) }])
            }, null, 2)
          ]),
          _: 1
        }, 8, ["visible", "placement", "popper-class", "disabled"])
      ], 46, _hoisted_1);
    };
  }
});
var SliderButton = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/slider/src/button.vue"]]);

exports["default"] = SliderButton;
//# sourceMappingURL=button2.js.map
