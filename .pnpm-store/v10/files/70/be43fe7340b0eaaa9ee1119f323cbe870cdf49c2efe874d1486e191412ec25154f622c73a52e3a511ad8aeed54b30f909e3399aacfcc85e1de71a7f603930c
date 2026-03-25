'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var index$4 = require('../../input/index.js');
var index$2 = require('../../icon/index.js');
require('../../form/index.js');
require('../../../directives/index.js');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../constants/index.js');
var inputNumber = require('./input-number.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var types = require('../../../utils/types.js');
var error = require('../../../utils/error.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var event = require('../../../constants/event.js');
var shared = require('@vue/shared');
var index$3 = require('../../../directives/repeat-click/index.js');

const _hoisted_1 = ["aria-label", "onKeydown"];
const _hoisted_2 = ["aria-label", "onKeydown"];
const __default__ = vue.defineComponent({
  name: "ElInputNumber"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: inputNumber.inputNumberProps,
  emits: inputNumber.inputNumberEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("input-number");
    const input = vue.ref();
    const data = vue.reactive({
      currentValue: props.modelValue,
      userInput: null
    });
    const { formItem } = useFormItem.useFormItem();
    const minDisabled = vue.computed(() => types.isNumber(props.modelValue) && props.modelValue <= props.min);
    const maxDisabled = vue.computed(() => types.isNumber(props.modelValue) && props.modelValue >= props.max);
    const numPrecision = vue.computed(() => {
      const stepPrecision = getPrecision(props.step);
      if (!types.isUndefined(props.precision)) {
        if (stepPrecision > props.precision) {
          error.debugWarn("InputNumber", "precision should not be less than the decimal places of step");
        }
        return props.precision;
      } else {
        return Math.max(getPrecision(props.modelValue), stepPrecision);
      }
    });
    const controlsAtRight = vue.computed(() => {
      return props.controls && props.controlsPosition === "right";
    });
    const inputNumberSize = useFormCommonProps.useFormSize();
    const inputNumberDisabled = useFormCommonProps.useFormDisabled();
    const displayValue = vue.computed(() => {
      if (data.userInput !== null) {
        return data.userInput;
      }
      let currentValue = data.currentValue;
      if (lodashUnified.isNil(currentValue))
        return "";
      if (types.isNumber(currentValue)) {
        if (Number.isNaN(currentValue))
          return "";
        if (!types.isUndefined(props.precision)) {
          currentValue = currentValue.toFixed(props.precision);
        }
      }
      return currentValue;
    });
    const toPrecision = (num, pre) => {
      if (types.isUndefined(pre))
        pre = numPrecision.value;
      if (pre === 0)
        return Math.round(num);
      let snum = String(num);
      const pointPos = snum.indexOf(".");
      if (pointPos === -1)
        return num;
      const nums = snum.replace(".", "").split("");
      const datum = nums[pointPos + pre];
      if (!datum)
        return num;
      const length = snum.length;
      if (snum.charAt(length - 1) === "5") {
        snum = `${snum.slice(0, Math.max(0, length - 1))}6`;
      }
      return Number.parseFloat(Number(snum).toFixed(pre));
    };
    const getPrecision = (value) => {
      if (lodashUnified.isNil(value))
        return 0;
      const valueString = value.toString();
      const dotPosition = valueString.indexOf(".");
      let precision = 0;
      if (dotPosition !== -1) {
        precision = valueString.length - dotPosition - 1;
      }
      return precision;
    };
    const ensurePrecision = (val, coefficient = 1) => {
      if (!types.isNumber(val))
        return data.currentValue;
      return toPrecision(val + props.step * coefficient);
    };
    const increase = () => {
      if (props.readonly || inputNumberDisabled.value || maxDisabled.value)
        return;
      const value = Number(displayValue.value) || 0;
      const newVal = ensurePrecision(value);
      setCurrentValue(newVal);
      emit(event.INPUT_EVENT, data.currentValue);
    };
    const decrease = () => {
      if (props.readonly || inputNumberDisabled.value || minDisabled.value)
        return;
      const value = Number(displayValue.value) || 0;
      const newVal = ensurePrecision(value, -1);
      setCurrentValue(newVal);
      emit(event.INPUT_EVENT, data.currentValue);
    };
    const verifyValue = (value, update) => {
      const { max, min, step, precision, stepStrictly, valueOnClear } = props;
      if (max < min) {
        error.throwError("InputNumber", "min should not be greater than max.");
      }
      let newVal = Number(value);
      if (lodashUnified.isNil(value) || Number.isNaN(newVal)) {
        return null;
      }
      if (value === "") {
        if (valueOnClear === null) {
          return null;
        }
        newVal = shared.isString(valueOnClear) ? { min, max }[valueOnClear] : valueOnClear;
      }
      if (stepStrictly) {
        newVal = toPrecision(Math.round(newVal / step) * step, precision);
      }
      if (!types.isUndefined(precision)) {
        newVal = toPrecision(newVal, precision);
      }
      if (newVal > max || newVal < min) {
        newVal = newVal > max ? max : min;
        update && emit(event.UPDATE_MODEL_EVENT, newVal);
      }
      return newVal;
    };
    const setCurrentValue = (value, emitChange = true) => {
      var _a;
      const oldVal = data.currentValue;
      const newVal = verifyValue(value);
      if (!emitChange) {
        emit(event.UPDATE_MODEL_EVENT, newVal);
        return;
      }
      if (oldVal === newVal)
        return;
      data.userInput = null;
      emit(event.UPDATE_MODEL_EVENT, newVal);
      emit(event.CHANGE_EVENT, newVal, oldVal);
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "change").catch((err) => error.debugWarn(err));
      }
      data.currentValue = newVal;
    };
    const handleInput = (value) => {
      data.userInput = value;
      const newVal = value === "" ? null : Number(value);
      emit(event.INPUT_EVENT, newVal);
      setCurrentValue(newVal, false);
    };
    const handleInputChange = (value) => {
      const newVal = value !== "" ? Number(value) : "";
      if (types.isNumber(newVal) && !Number.isNaN(newVal) || value === "") {
        setCurrentValue(newVal);
      }
      data.userInput = null;
    };
    const focus = () => {
      var _a, _b;
      (_b = (_a = input.value) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a);
    };
    const blur = () => {
      var _a, _b;
      (_b = (_a = input.value) == null ? void 0 : _a.blur) == null ? void 0 : _b.call(_a);
    };
    const handleFocus = (event) => {
      emit("focus", event);
    };
    const handleBlur = (event) => {
      var _a;
      emit("blur", event);
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "blur").catch((err) => error.debugWarn(err));
      }
    };
    vue.watch(() => props.modelValue, (value) => {
      const userInput = verifyValue(data.userInput);
      const newValue = verifyValue(value, true);
      if (!types.isNumber(userInput) && (!userInput || userInput !== newValue)) {
        data.currentValue = newValue;
        data.userInput = null;
      }
    }, { immediate: true });
    vue.onMounted(() => {
      var _a;
      const { min, max, modelValue } = props;
      const innerInput = (_a = input.value) == null ? void 0 : _a.input;
      innerInput.setAttribute("role", "spinbutton");
      if (Number.isFinite(max)) {
        innerInput.setAttribute("aria-valuemax", String(max));
      } else {
        innerInput.removeAttribute("aria-valuemax");
      }
      if (Number.isFinite(min)) {
        innerInput.setAttribute("aria-valuemin", String(min));
      } else {
        innerInput.removeAttribute("aria-valuemin");
      }
      innerInput.setAttribute("aria-valuenow", data.currentValue || data.currentValue === 0 ? String(data.currentValue) : "");
      innerInput.setAttribute("aria-disabled", String(inputNumberDisabled.value));
      if (!types.isNumber(modelValue) && modelValue != null) {
        let val = Number(modelValue);
        if (Number.isNaN(val)) {
          val = null;
        }
        emit(event.UPDATE_MODEL_EVENT, val);
      }
    });
    vue.onUpdated(() => {
      var _a, _b;
      const innerInput = (_a = input.value) == null ? void 0 : _a.input;
      innerInput == null ? void 0 : innerInput.setAttribute("aria-valuenow", `${(_b = data.currentValue) != null ? _b : ""}`);
    });
    expose({
      focus,
      blur
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([
          vue.unref(ns).b(),
          vue.unref(ns).m(vue.unref(inputNumberSize)),
          vue.unref(ns).is("disabled", vue.unref(inputNumberDisabled)),
          vue.unref(ns).is("without-controls", !_ctx.controls),
          vue.unref(ns).is("controls-right", vue.unref(controlsAtRight))
        ]),
        onDragstart: _cache[1] || (_cache[1] = vue.withModifiers(() => {
        }, ["prevent"]))
      }, [
        _ctx.controls ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("span", {
          key: 0,
          role: "button",
          "aria-label": vue.unref(t)("el.inputNumber.decrease"),
          class: vue.normalizeClass([vue.unref(ns).e("decrease"), vue.unref(ns).is("disabled", vue.unref(minDisabled))]),
          onKeydown: vue.withKeys(decrease, ["enter"])
        }, [
          vue.createVNode(vue.unref(index$2.ElIcon), null, {
            default: vue.withCtx(() => [
              vue.unref(controlsAtRight) ? (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.ArrowDown), { key: 0 })) : (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.Minus), { key: 1 }))
            ]),
            _: 1
          })
        ], 42, _hoisted_1)), [
          [vue.unref(index$3.vRepeatClick), decrease]
        ]) : vue.createCommentVNode("v-if", true),
        _ctx.controls ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("span", {
          key: 1,
          role: "button",
          "aria-label": vue.unref(t)("el.inputNumber.increase"),
          class: vue.normalizeClass([vue.unref(ns).e("increase"), vue.unref(ns).is("disabled", vue.unref(maxDisabled))]),
          onKeydown: vue.withKeys(increase, ["enter"])
        }, [
          vue.createVNode(vue.unref(index$2.ElIcon), null, {
            default: vue.withCtx(() => [
              vue.unref(controlsAtRight) ? (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.ArrowUp), { key: 0 })) : (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.Plus), { key: 1 }))
            ]),
            _: 1
          })
        ], 42, _hoisted_2)), [
          [vue.unref(index$3.vRepeatClick), increase]
        ]) : vue.createCommentVNode("v-if", true),
        vue.createVNode(vue.unref(index$4.ElInput), {
          id: _ctx.id,
          ref_key: "input",
          ref: input,
          type: "number",
          step: _ctx.step,
          "model-value": vue.unref(displayValue),
          placeholder: _ctx.placeholder,
          readonly: _ctx.readonly,
          disabled: vue.unref(inputNumberDisabled),
          size: vue.unref(inputNumberSize),
          max: _ctx.max,
          min: _ctx.min,
          name: _ctx.name,
          label: _ctx.label,
          "validate-event": false,
          onWheel: _cache[0] || (_cache[0] = vue.withModifiers(() => {
          }, ["prevent"])),
          onKeydown: [
            vue.withKeys(vue.withModifiers(increase, ["prevent"]), ["up"]),
            vue.withKeys(vue.withModifiers(decrease, ["prevent"]), ["down"])
          ],
          onBlur: handleBlur,
          onFocus: handleFocus,
          onInput: handleInput,
          onChange: handleInputChange
        }, null, 8, ["id", "step", "model-value", "placeholder", "readonly", "disabled", "size", "max", "min", "name", "label", "onKeydown"])
      ], 34);
    };
  }
});
var InputNumber = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/input-number/src/input-number.vue"]]);

exports["default"] = InputNumber;
//# sourceMappingURL=input-number2.js.map
