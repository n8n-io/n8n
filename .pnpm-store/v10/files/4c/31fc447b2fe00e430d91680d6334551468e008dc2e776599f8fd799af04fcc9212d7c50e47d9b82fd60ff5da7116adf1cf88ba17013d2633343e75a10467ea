import { defineComponent, reactive, toRefs, openBlock, createElementBlock, normalizeClass, unref, normalizeStyle, createVNode, withCtx, createElementVNode, toDisplayString } from 'vue';
import { ElTooltip } from '../../tooltip/index.mjs';
import '../../../hooks/index.mjs';
import './composables/index.mjs';
import { sliderButtonProps, sliderButtonEmits } from './button.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useSliderButton } from './composables/use-slider-button.mjs';

const _hoisted_1 = ["tabindex"];
const __default__ = defineComponent({
  name: "ElSliderButton"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: sliderButtonProps,
  emits: sliderButtonEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = useNamespace("slider");
    const initData = reactive({
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
    } = useSliderButton(props, initData, emit);
    const { hovering, dragging } = toRefs(initData);
    expose({
      onButtonDown,
      onKeyDown,
      setPosition,
      hovering,
      dragging
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "button",
        ref: button,
        class: normalizeClass([unref(ns).e("button-wrapper"), { hover: unref(hovering), dragging: unref(dragging) }]),
        style: normalizeStyle(unref(wrapperStyle)),
        tabindex: unref(disabled) ? -1 : 0,
        onMouseenter: _cache[0] || (_cache[0] = (...args) => unref(handleMouseEnter) && unref(handleMouseEnter)(...args)),
        onMouseleave: _cache[1] || (_cache[1] = (...args) => unref(handleMouseLeave) && unref(handleMouseLeave)(...args)),
        onMousedown: _cache[2] || (_cache[2] = (...args) => unref(onButtonDown) && unref(onButtonDown)(...args)),
        onTouchstart: _cache[3] || (_cache[3] = (...args) => unref(onButtonDown) && unref(onButtonDown)(...args)),
        onFocus: _cache[4] || (_cache[4] = (...args) => unref(handleMouseEnter) && unref(handleMouseEnter)(...args)),
        onBlur: _cache[5] || (_cache[5] = (...args) => unref(handleMouseLeave) && unref(handleMouseLeave)(...args)),
        onKeydown: _cache[6] || (_cache[6] = (...args) => unref(onKeyDown) && unref(onKeyDown)(...args))
      }, [
        createVNode(unref(ElTooltip), {
          ref_key: "tooltip",
          ref: tooltip,
          visible: unref(tooltipVisible),
          placement: _ctx.placement,
          "fallback-placements": ["top", "bottom", "right", "left"],
          "stop-popper-mouse-event": false,
          "popper-class": _ctx.tooltipClass,
          disabled: !unref(showTooltip),
          persistent: ""
        }, {
          content: withCtx(() => [
            createElementVNode("span", null, toDisplayString(unref(formatValue)), 1)
          ]),
          default: withCtx(() => [
            createElementVNode("div", {
              class: normalizeClass([unref(ns).e("button"), { hover: unref(hovering), dragging: unref(dragging) }])
            }, null, 2)
          ]),
          _: 1
        }, 8, ["visible", "placement", "popper-class", "disabled"])
      ], 46, _hoisted_1);
    };
  }
});
var SliderButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/slider/src/button.vue"]]);

export { SliderButton as default };
//# sourceMappingURL=button2.mjs.map
