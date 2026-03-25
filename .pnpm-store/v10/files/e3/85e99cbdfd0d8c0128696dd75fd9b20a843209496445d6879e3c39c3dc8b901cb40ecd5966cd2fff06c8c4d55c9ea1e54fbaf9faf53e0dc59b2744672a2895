import { defineComponent, reactive, computed, toRefs, provide, openBlock, createElementBlock, unref, normalizeClass, createElementVNode, normalizeStyle, createVNode, createBlock, createCommentVNode, Fragment, renderList } from 'vue';
import { ElInputNumber } from '../../input-number/index.mjs';
import '../../form/index.mjs';
import '../../../hooks/index.mjs';
import { sliderContextKey } from './constants.mjs';
import { sliderProps, sliderEmits } from './slider.mjs';
import SliderButton from './button2.mjs';
import SliderMarker from './marker.mjs';
import './composables/index.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useSlide } from './composables/use-slide.mjs';
import { useStops } from './composables/use-stops.mjs';
import { useFormItemInputId } from '../../form/src/hooks/use-form-item.mjs';
import { useFormSize } from '../../form/src/hooks/use-form-common-props.mjs';
import { useMarks } from './composables/use-marks.mjs';
import { useWatch } from './composables/use-watch.mjs';
import { useLifecycle } from './composables/use-lifecycle.mjs';

const _hoisted_1 = ["id", "role", "aria-label", "aria-labelledby"];
const _hoisted_2 = { key: 1 };
const __default__ = defineComponent({
  name: "ElSlider"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: sliderProps,
  emits: sliderEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = useNamespace("slider");
    const { t } = useLocale();
    const initData = reactive({
      firstValue: 0,
      secondValue: 0,
      oldValue: 0,
      dragging: false,
      sliderSize: 1
    });
    const {
      elFormItem,
      slider,
      firstButton,
      secondButton,
      sliderDisabled,
      minValue,
      maxValue,
      runwayStyle,
      barStyle,
      resetSize,
      emitChange,
      onSliderWrapperPrevent,
      onSliderClick,
      onSliderDown,
      setFirstValue,
      setSecondValue
    } = useSlide(props, initData, emit);
    const { stops, getStopStyle } = useStops(props, initData, minValue, maxValue);
    const { inputId, isLabeledByFormItem } = useFormItemInputId(props, {
      formItemContext: elFormItem
    });
    const sliderWrapperSize = useFormSize();
    const sliderInputSize = computed(() => props.inputSize || sliderWrapperSize.value);
    const groupLabel = computed(() => {
      return props.label || t("el.slider.defaultLabel", {
        min: props.min,
        max: props.max
      });
    });
    const firstButtonLabel = computed(() => {
      if (props.range) {
        return props.rangeStartLabel || t("el.slider.defaultRangeStartLabel");
      } else {
        return groupLabel.value;
      }
    });
    const firstValueText = computed(() => {
      return props.formatValueText ? props.formatValueText(firstValue.value) : `${firstValue.value}`;
    });
    const secondButtonLabel = computed(() => {
      return props.rangeEndLabel || t("el.slider.defaultRangeEndLabel");
    });
    const secondValueText = computed(() => {
      return props.formatValueText ? props.formatValueText(secondValue.value) : `${secondValue.value}`;
    });
    const sliderKls = computed(() => [
      ns.b(),
      ns.m(sliderWrapperSize.value),
      ns.is("vertical", props.vertical),
      { [ns.m("with-input")]: props.showInput }
    ]);
    const markList = useMarks(props);
    useWatch(props, initData, minValue, maxValue, emit, elFormItem);
    const precision = computed(() => {
      const precisions = [props.min, props.max, props.step].map((item) => {
        const decimal = `${item}`.split(".")[1];
        return decimal ? decimal.length : 0;
      });
      return Math.max.apply(null, precisions);
    });
    const { sliderWrapper } = useLifecycle(props, initData, resetSize);
    const { firstValue, secondValue, sliderSize } = toRefs(initData);
    const updateDragging = (val) => {
      initData.dragging = val;
    };
    provide(sliderContextKey, {
      ...toRefs(props),
      sliderSize,
      disabled: sliderDisabled,
      precision,
      emitChange,
      resetSize,
      updateDragging
    });
    expose({
      onSliderClick
    });
    return (_ctx, _cache) => {
      var _a, _b;
      return openBlock(), createElementBlock("div", {
        id: _ctx.range ? unref(inputId) : void 0,
        ref_key: "sliderWrapper",
        ref: sliderWrapper,
        class: normalizeClass(unref(sliderKls)),
        role: _ctx.range ? "group" : void 0,
        "aria-label": _ctx.range && !unref(isLabeledByFormItem) ? unref(groupLabel) : void 0,
        "aria-labelledby": _ctx.range && unref(isLabeledByFormItem) ? (_a = unref(elFormItem)) == null ? void 0 : _a.labelId : void 0,
        onTouchstart: _cache[2] || (_cache[2] = (...args) => unref(onSliderWrapperPrevent) && unref(onSliderWrapperPrevent)(...args)),
        onTouchmove: _cache[3] || (_cache[3] = (...args) => unref(onSliderWrapperPrevent) && unref(onSliderWrapperPrevent)(...args))
      }, [
        createElementVNode("div", {
          ref_key: "slider",
          ref: slider,
          class: normalizeClass([
            unref(ns).e("runway"),
            { "show-input": _ctx.showInput && !_ctx.range },
            unref(ns).is("disabled", unref(sliderDisabled))
          ]),
          style: normalizeStyle(unref(runwayStyle)),
          onMousedown: _cache[0] || (_cache[0] = (...args) => unref(onSliderDown) && unref(onSliderDown)(...args)),
          onTouchstart: _cache[1] || (_cache[1] = (...args) => unref(onSliderDown) && unref(onSliderDown)(...args))
        }, [
          createElementVNode("div", {
            class: normalizeClass(unref(ns).e("bar")),
            style: normalizeStyle(unref(barStyle))
          }, null, 6),
          createVNode(SliderButton, {
            id: !_ctx.range ? unref(inputId) : void 0,
            ref_key: "firstButton",
            ref: firstButton,
            "model-value": unref(firstValue),
            vertical: _ctx.vertical,
            "tooltip-class": _ctx.tooltipClass,
            placement: _ctx.placement,
            role: "slider",
            "aria-label": _ctx.range || !unref(isLabeledByFormItem) ? unref(firstButtonLabel) : void 0,
            "aria-labelledby": !_ctx.range && unref(isLabeledByFormItem) ? (_b = unref(elFormItem)) == null ? void 0 : _b.labelId : void 0,
            "aria-valuemin": _ctx.min,
            "aria-valuemax": _ctx.range ? unref(secondValue) : _ctx.max,
            "aria-valuenow": unref(firstValue),
            "aria-valuetext": unref(firstValueText),
            "aria-orientation": _ctx.vertical ? "vertical" : "horizontal",
            "aria-disabled": unref(sliderDisabled),
            "onUpdate:modelValue": unref(setFirstValue)
          }, null, 8, ["id", "model-value", "vertical", "tooltip-class", "placement", "aria-label", "aria-labelledby", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-orientation", "aria-disabled", "onUpdate:modelValue"]),
          _ctx.range ? (openBlock(), createBlock(SliderButton, {
            key: 0,
            ref_key: "secondButton",
            ref: secondButton,
            "model-value": unref(secondValue),
            vertical: _ctx.vertical,
            "tooltip-class": _ctx.tooltipClass,
            placement: _ctx.placement,
            role: "slider",
            "aria-label": unref(secondButtonLabel),
            "aria-valuemin": unref(firstValue),
            "aria-valuemax": _ctx.max,
            "aria-valuenow": unref(secondValue),
            "aria-valuetext": unref(secondValueText),
            "aria-orientation": _ctx.vertical ? "vertical" : "horizontal",
            "aria-disabled": unref(sliderDisabled),
            "onUpdate:modelValue": unref(setSecondValue)
          }, null, 8, ["model-value", "vertical", "tooltip-class", "placement", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-orientation", "aria-disabled", "onUpdate:modelValue"])) : createCommentVNode("v-if", true),
          _ctx.showStops ? (openBlock(), createElementBlock("div", _hoisted_2, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(stops), (item, key) => {
              return openBlock(), createElementBlock("div", {
                key,
                class: normalizeClass(unref(ns).e("stop")),
                style: normalizeStyle(unref(getStopStyle)(item))
              }, null, 6);
            }), 128))
          ])) : createCommentVNode("v-if", true),
          unref(markList).length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            createElementVNode("div", null, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(markList), (item, key) => {
                return openBlock(), createElementBlock("div", {
                  key,
                  style: normalizeStyle(unref(getStopStyle)(item.position)),
                  class: normalizeClass([unref(ns).e("stop"), unref(ns).e("marks-stop")])
                }, null, 6);
              }), 128))
            ]),
            createElementVNode("div", {
              class: normalizeClass(unref(ns).e("marks"))
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(markList), (item, key) => {
                return openBlock(), createBlock(unref(SliderMarker), {
                  key,
                  mark: item.mark,
                  style: normalizeStyle(unref(getStopStyle)(item.position))
                }, null, 8, ["mark", "style"]);
              }), 128))
            ], 2)
          ], 64)) : createCommentVNode("v-if", true)
        ], 38),
        _ctx.showInput && !_ctx.range ? (openBlock(), createBlock(unref(ElInputNumber), {
          key: 0,
          ref: "input",
          "model-value": unref(firstValue),
          class: normalizeClass(unref(ns).e("input")),
          step: _ctx.step,
          disabled: unref(sliderDisabled),
          controls: _ctx.showInputControls,
          min: _ctx.min,
          max: _ctx.max,
          debounce: _ctx.debounce,
          size: unref(sliderInputSize),
          "onUpdate:modelValue": unref(setFirstValue),
          onChange: unref(emitChange)
        }, null, 8, ["model-value", "class", "step", "disabled", "controls", "min", "max", "debounce", "size", "onUpdate:modelValue", "onChange"])) : createCommentVNode("v-if", true)
      ], 42, _hoisted_1);
    };
  }
});
var Slider = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/slider/src/slider.vue"]]);

export { Slider as default };
//# sourceMappingURL=slider2.mjs.map
