'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$2 = require('../../input-number/index.js');
require('../../form/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var slider = require('./slider.js');
var button = require('./button2.js');
var marker = require('./marker.js');
require('./composables/index.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-locale/index.js');
var useSlide = require('./composables/use-slide.js');
var useStops = require('./composables/use-stops.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var useMarks = require('./composables/use-marks.js');
var useWatch = require('./composables/use-watch.js');
var useLifecycle = require('./composables/use-lifecycle.js');

const _hoisted_1 = ["id", "role", "aria-label", "aria-labelledby"];
const _hoisted_2 = { key: 1 };
const __default__ = vue.defineComponent({
  name: "ElSlider"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: slider.sliderProps,
  emits: slider.sliderEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = index.useNamespace("slider");
    const { t } = index$1.useLocale();
    const initData = vue.reactive({
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
    } = useSlide.useSlide(props, initData, emit);
    const { stops, getStopStyle } = useStops.useStops(props, initData, minValue, maxValue);
    const { inputId, isLabeledByFormItem } = useFormItem.useFormItemInputId(props, {
      formItemContext: elFormItem
    });
    const sliderWrapperSize = useFormCommonProps.useFormSize();
    const sliderInputSize = vue.computed(() => props.inputSize || sliderWrapperSize.value);
    const groupLabel = vue.computed(() => {
      return props.label || t("el.slider.defaultLabel", {
        min: props.min,
        max: props.max
      });
    });
    const firstButtonLabel = vue.computed(() => {
      if (props.range) {
        return props.rangeStartLabel || t("el.slider.defaultRangeStartLabel");
      } else {
        return groupLabel.value;
      }
    });
    const firstValueText = vue.computed(() => {
      return props.formatValueText ? props.formatValueText(firstValue.value) : `${firstValue.value}`;
    });
    const secondButtonLabel = vue.computed(() => {
      return props.rangeEndLabel || t("el.slider.defaultRangeEndLabel");
    });
    const secondValueText = vue.computed(() => {
      return props.formatValueText ? props.formatValueText(secondValue.value) : `${secondValue.value}`;
    });
    const sliderKls = vue.computed(() => [
      ns.b(),
      ns.m(sliderWrapperSize.value),
      ns.is("vertical", props.vertical),
      { [ns.m("with-input")]: props.showInput }
    ]);
    const markList = useMarks.useMarks(props);
    useWatch.useWatch(props, initData, minValue, maxValue, emit, elFormItem);
    const precision = vue.computed(() => {
      const precisions = [props.min, props.max, props.step].map((item) => {
        const decimal = `${item}`.split(".")[1];
        return decimal ? decimal.length : 0;
      });
      return Math.max.apply(null, precisions);
    });
    const { sliderWrapper } = useLifecycle.useLifecycle(props, initData, resetSize);
    const { firstValue, secondValue, sliderSize } = vue.toRefs(initData);
    const updateDragging = (val) => {
      initData.dragging = val;
    };
    vue.provide(constants.sliderContextKey, {
      ...vue.toRefs(props),
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
      return vue.openBlock(), vue.createElementBlock("div", {
        id: _ctx.range ? vue.unref(inputId) : void 0,
        ref_key: "sliderWrapper",
        ref: sliderWrapper,
        class: vue.normalizeClass(vue.unref(sliderKls)),
        role: _ctx.range ? "group" : void 0,
        "aria-label": _ctx.range && !vue.unref(isLabeledByFormItem) ? vue.unref(groupLabel) : void 0,
        "aria-labelledby": _ctx.range && vue.unref(isLabeledByFormItem) ? (_a = vue.unref(elFormItem)) == null ? void 0 : _a.labelId : void 0,
        onTouchstart: _cache[2] || (_cache[2] = (...args) => vue.unref(onSliderWrapperPrevent) && vue.unref(onSliderWrapperPrevent)(...args)),
        onTouchmove: _cache[3] || (_cache[3] = (...args) => vue.unref(onSliderWrapperPrevent) && vue.unref(onSliderWrapperPrevent)(...args))
      }, [
        vue.createElementVNode("div", {
          ref_key: "slider",
          ref: slider,
          class: vue.normalizeClass([
            vue.unref(ns).e("runway"),
            { "show-input": _ctx.showInput && !_ctx.range },
            vue.unref(ns).is("disabled", vue.unref(sliderDisabled))
          ]),
          style: vue.normalizeStyle(vue.unref(runwayStyle)),
          onMousedown: _cache[0] || (_cache[0] = (...args) => vue.unref(onSliderDown) && vue.unref(onSliderDown)(...args)),
          onTouchstart: _cache[1] || (_cache[1] = (...args) => vue.unref(onSliderDown) && vue.unref(onSliderDown)(...args))
        }, [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).e("bar")),
            style: vue.normalizeStyle(vue.unref(barStyle))
          }, null, 6),
          vue.createVNode(button["default"], {
            id: !_ctx.range ? vue.unref(inputId) : void 0,
            ref_key: "firstButton",
            ref: firstButton,
            "model-value": vue.unref(firstValue),
            vertical: _ctx.vertical,
            "tooltip-class": _ctx.tooltipClass,
            placement: _ctx.placement,
            role: "slider",
            "aria-label": _ctx.range || !vue.unref(isLabeledByFormItem) ? vue.unref(firstButtonLabel) : void 0,
            "aria-labelledby": !_ctx.range && vue.unref(isLabeledByFormItem) ? (_b = vue.unref(elFormItem)) == null ? void 0 : _b.labelId : void 0,
            "aria-valuemin": _ctx.min,
            "aria-valuemax": _ctx.range ? vue.unref(secondValue) : _ctx.max,
            "aria-valuenow": vue.unref(firstValue),
            "aria-valuetext": vue.unref(firstValueText),
            "aria-orientation": _ctx.vertical ? "vertical" : "horizontal",
            "aria-disabled": vue.unref(sliderDisabled),
            "onUpdate:modelValue": vue.unref(setFirstValue)
          }, null, 8, ["id", "model-value", "vertical", "tooltip-class", "placement", "aria-label", "aria-labelledby", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-orientation", "aria-disabled", "onUpdate:modelValue"]),
          _ctx.range ? (vue.openBlock(), vue.createBlock(button["default"], {
            key: 0,
            ref_key: "secondButton",
            ref: secondButton,
            "model-value": vue.unref(secondValue),
            vertical: _ctx.vertical,
            "tooltip-class": _ctx.tooltipClass,
            placement: _ctx.placement,
            role: "slider",
            "aria-label": vue.unref(secondButtonLabel),
            "aria-valuemin": vue.unref(firstValue),
            "aria-valuemax": _ctx.max,
            "aria-valuenow": vue.unref(secondValue),
            "aria-valuetext": vue.unref(secondValueText),
            "aria-orientation": _ctx.vertical ? "vertical" : "horizontal",
            "aria-disabled": vue.unref(sliderDisabled),
            "onUpdate:modelValue": vue.unref(setSecondValue)
          }, null, 8, ["model-value", "vertical", "tooltip-class", "placement", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-orientation", "aria-disabled", "onUpdate:modelValue"])) : vue.createCommentVNode("v-if", true),
          _ctx.showStops ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_2, [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(stops), (item, key) => {
              return vue.openBlock(), vue.createElementBlock("div", {
                key,
                class: vue.normalizeClass(vue.unref(ns).e("stop")),
                style: vue.normalizeStyle(vue.unref(getStopStyle)(item))
              }, null, 6);
            }), 128))
          ])) : vue.createCommentVNode("v-if", true),
          vue.unref(markList).length > 0 ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 2 }, [
            vue.createElementVNode("div", null, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(markList), (item, key) => {
                return vue.openBlock(), vue.createElementBlock("div", {
                  key,
                  style: vue.normalizeStyle(vue.unref(getStopStyle)(item.position)),
                  class: vue.normalizeClass([vue.unref(ns).e("stop"), vue.unref(ns).e("marks-stop")])
                }, null, 6);
              }), 128))
            ]),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("marks"))
            }, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(markList), (item, key) => {
                return vue.openBlock(), vue.createBlock(vue.unref(marker["default"]), {
                  key,
                  mark: item.mark,
                  style: vue.normalizeStyle(vue.unref(getStopStyle)(item.position))
                }, null, 8, ["mark", "style"]);
              }), 128))
            ], 2)
          ], 64)) : vue.createCommentVNode("v-if", true)
        ], 38),
        _ctx.showInput && !_ctx.range ? (vue.openBlock(), vue.createBlock(vue.unref(index$2.ElInputNumber), {
          key: 0,
          ref: "input",
          "model-value": vue.unref(firstValue),
          class: vue.normalizeClass(vue.unref(ns).e("input")),
          step: _ctx.step,
          disabled: vue.unref(sliderDisabled),
          controls: _ctx.showInputControls,
          min: _ctx.min,
          max: _ctx.max,
          debounce: _ctx.debounce,
          size: vue.unref(sliderInputSize),
          "onUpdate:modelValue": vue.unref(setFirstValue),
          onChange: vue.unref(emitChange)
        }, null, 8, ["model-value", "class", "step", "disabled", "controls", "min", "max", "debounce", "size", "onUpdate:modelValue", "onChange"])) : vue.createCommentVNode("v-if", true)
      ], 42, _hoisted_1);
    };
  }
});
var Slider = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/slider/src/slider.vue"]]);

exports["default"] = Slider;
//# sourceMappingURL=slider2.js.map
