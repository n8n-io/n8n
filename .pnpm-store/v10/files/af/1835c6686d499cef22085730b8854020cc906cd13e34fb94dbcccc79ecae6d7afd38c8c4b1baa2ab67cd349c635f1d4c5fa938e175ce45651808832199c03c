'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../constants/index.js');
require('../../../utils/index.js');
require('../../form/index.js');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
var rate = require('./rate.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var shared = require('@vue/shared');
var constants = require('../../form/src/constants.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index = require('../../../hooks/use-namespace/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var event = require('../../../constants/event.js');
var aria = require('../../../constants/aria.js');
var style = require('../../../utils/dom/style.js');

const _hoisted_1 = ["id", "aria-label", "aria-labelledby", "aria-valuenow", "aria-valuetext", "aria-valuemax"];
const _hoisted_2 = ["onMousemove", "onClick"];
const __default__ = vue.defineComponent({
  name: "ElRate"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: rate.rateProps,
  emits: rate.rateEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    function getValueFromMap(value, map) {
      const isExcludedObject = (val) => shared.isObject(val);
      const matchedKeys = Object.keys(map).map((key) => +key).filter((key) => {
        const val = map[key];
        const excluded = isExcludedObject(val) ? val.excluded : false;
        return excluded ? value < key : value <= key;
      }).sort((a, b) => a - b);
      const matchedValue = map[matchedKeys[0]];
      return isExcludedObject(matchedValue) && matchedValue.value || matchedValue;
    }
    const formContext = vue.inject(constants.formContextKey, void 0);
    const formItemContext = vue.inject(constants.formItemContextKey, void 0);
    const rateSize = useFormCommonProps.useFormSize();
    const ns = index.useNamespace("rate");
    const { inputId, isLabeledByFormItem } = useFormItem.useFormItemInputId(props, {
      formItemContext
    });
    const currentValue = vue.ref(props.modelValue);
    const hoverIndex = vue.ref(-1);
    const pointerAtLeftHalf = vue.ref(true);
    const rateClasses = vue.computed(() => [ns.b(), ns.m(rateSize.value)]);
    const rateDisabled = vue.computed(() => props.disabled || (formContext == null ? void 0 : formContext.disabled));
    const rateStyles = vue.computed(() => {
      return ns.cssVarBlock({
        "void-color": props.voidColor,
        "disabled-void-color": props.disabledVoidColor,
        "fill-color": activeColor.value
      });
    });
    const text = vue.computed(() => {
      let result = "";
      if (props.showScore) {
        result = props.scoreTemplate.replace(/\{\s*value\s*\}/, rateDisabled.value ? `${props.modelValue}` : `${currentValue.value}`);
      } else if (props.showText) {
        result = props.texts[Math.ceil(currentValue.value) - 1];
      }
      return result;
    });
    const valueDecimal = vue.computed(() => props.modelValue * 100 - Math.floor(props.modelValue) * 100);
    const colorMap = vue.computed(() => shared.isArray(props.colors) ? {
      [props.lowThreshold]: props.colors[0],
      [props.highThreshold]: { value: props.colors[1], excluded: true },
      [props.max]: props.colors[2]
    } : props.colors);
    const activeColor = vue.computed(() => {
      const color = getValueFromMap(currentValue.value, colorMap.value);
      return shared.isObject(color) ? "" : color;
    });
    const decimalStyle = vue.computed(() => {
      let width = "";
      if (rateDisabled.value) {
        width = `${valueDecimal.value}%`;
      } else if (props.allowHalf) {
        width = "50%";
      }
      return {
        color: activeColor.value,
        width
      };
    });
    const componentMap = vue.computed(() => {
      let icons = shared.isArray(props.icons) ? [...props.icons] : { ...props.icons };
      icons = vue.markRaw(icons);
      return shared.isArray(icons) ? {
        [props.lowThreshold]: icons[0],
        [props.highThreshold]: {
          value: icons[1],
          excluded: true
        },
        [props.max]: icons[2]
      } : icons;
    });
    const decimalIconComponent = vue.computed(() => getValueFromMap(props.modelValue, componentMap.value));
    const voidComponent = vue.computed(() => rateDisabled.value ? shared.isString(props.disabledVoidIcon) ? props.disabledVoidIcon : vue.markRaw(props.disabledVoidIcon) : shared.isString(props.voidIcon) ? props.voidIcon : vue.markRaw(props.voidIcon));
    const activeComponent = vue.computed(() => getValueFromMap(currentValue.value, componentMap.value));
    function showDecimalIcon(item) {
      const showWhenDisabled = rateDisabled.value && valueDecimal.value > 0 && item - 1 < props.modelValue && item > props.modelValue;
      const showWhenAllowHalf = props.allowHalf && pointerAtLeftHalf.value && item - 0.5 <= currentValue.value && item > currentValue.value;
      return showWhenDisabled || showWhenAllowHalf;
    }
    function emitValue(value) {
      if (props.clearable && value === props.modelValue) {
        value = 0;
      }
      emit(event.UPDATE_MODEL_EVENT, value);
      if (props.modelValue !== value) {
        emit("change", value);
      }
    }
    function selectValue(value) {
      if (rateDisabled.value) {
        return;
      }
      if (props.allowHalf && pointerAtLeftHalf.value) {
        emitValue(currentValue.value);
      } else {
        emitValue(value);
      }
    }
    function handleKey(e) {
      if (rateDisabled.value) {
        return;
      }
      let _currentValue = currentValue.value;
      const code = e.code;
      if (code === aria.EVENT_CODE.up || code === aria.EVENT_CODE.right) {
        if (props.allowHalf) {
          _currentValue += 0.5;
        } else {
          _currentValue += 1;
        }
        e.stopPropagation();
        e.preventDefault();
      } else if (code === aria.EVENT_CODE.left || code === aria.EVENT_CODE.down) {
        if (props.allowHalf) {
          _currentValue -= 0.5;
        } else {
          _currentValue -= 1;
        }
        e.stopPropagation();
        e.preventDefault();
      }
      _currentValue = _currentValue < 0 ? 0 : _currentValue;
      _currentValue = _currentValue > props.max ? props.max : _currentValue;
      emit(event.UPDATE_MODEL_EVENT, _currentValue);
      emit("change", _currentValue);
      return _currentValue;
    }
    function setCurrentValue(value, event) {
      if (rateDisabled.value) {
        return;
      }
      if (props.allowHalf && event) {
        let target = event.target;
        if (style.hasClass(target, ns.e("item"))) {
          target = target.querySelector(`.${ns.e("icon")}`);
        }
        if (target.clientWidth === 0 || style.hasClass(target, ns.e("decimal"))) {
          target = target.parentNode;
        }
        pointerAtLeftHalf.value = event.offsetX * 2 <= target.clientWidth;
        currentValue.value = pointerAtLeftHalf.value ? value - 0.5 : value;
      } else {
        currentValue.value = value;
      }
      hoverIndex.value = value;
    }
    function resetCurrentValue() {
      if (rateDisabled.value) {
        return;
      }
      if (props.allowHalf) {
        pointerAtLeftHalf.value = props.modelValue !== Math.floor(props.modelValue);
      }
      currentValue.value = props.modelValue;
      hoverIndex.value = -1;
    }
    vue.watch(() => props.modelValue, (val) => {
      currentValue.value = val;
      pointerAtLeftHalf.value = props.modelValue !== Math.floor(props.modelValue);
    });
    if (!props.modelValue) {
      emit(event.UPDATE_MODEL_EVENT, 0);
    }
    expose({
      setCurrentValue,
      resetCurrentValue
    });
    return (_ctx, _cache) => {
      var _a;
      return vue.openBlock(), vue.createElementBlock("div", {
        id: vue.unref(inputId),
        class: vue.normalizeClass([vue.unref(rateClasses), vue.unref(ns).is("disabled", vue.unref(rateDisabled))]),
        role: "slider",
        "aria-label": !vue.unref(isLabeledByFormItem) ? _ctx.label || "rating" : void 0,
        "aria-labelledby": vue.unref(isLabeledByFormItem) ? (_a = vue.unref(formItemContext)) == null ? void 0 : _a.labelId : void 0,
        "aria-valuenow": currentValue.value,
        "aria-valuetext": vue.unref(text) || void 0,
        "aria-valuemin": "0",
        "aria-valuemax": _ctx.max,
        tabindex: "0",
        style: vue.normalizeStyle(vue.unref(rateStyles)),
        onKeydown: handleKey
      }, [
        (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.max, (item, key) => {
          return vue.openBlock(), vue.createElementBlock("span", {
            key,
            class: vue.normalizeClass(vue.unref(ns).e("item")),
            onMousemove: ($event) => setCurrentValue(item, $event),
            onMouseleave: resetCurrentValue,
            onClick: ($event) => selectValue(item)
          }, [
            vue.createVNode(vue.unref(index$1.ElIcon), {
              class: vue.normalizeClass([
                vue.unref(ns).e("icon"),
                { hover: hoverIndex.value === item },
                vue.unref(ns).is("active", item <= currentValue.value)
              ])
            }, {
              default: vue.withCtx(() => [
                !showDecimalIcon(item) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                  vue.withDirectives((vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(activeComponent)), null, null, 512)), [
                    [vue.vShow, item <= currentValue.value]
                  ]),
                  vue.withDirectives((vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(voidComponent)), null, null, 512)), [
                    [vue.vShow, !(item <= currentValue.value)]
                  ])
                ], 64)) : vue.createCommentVNode("v-if", true),
                showDecimalIcon(item) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
                  (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(voidComponent)), {
                    class: vue.normalizeClass([vue.unref(ns).em("decimal", "box")])
                  }, null, 8, ["class"])),
                  vue.createVNode(vue.unref(index$1.ElIcon), {
                    style: vue.normalizeStyle(vue.unref(decimalStyle)),
                    class: vue.normalizeClass([vue.unref(ns).e("icon"), vue.unref(ns).e("decimal")])
                  }, {
                    default: vue.withCtx(() => [
                      (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(decimalIconComponent))))
                    ]),
                    _: 1
                  }, 8, ["style", "class"])
                ], 64)) : vue.createCommentVNode("v-if", true)
              ]),
              _: 2
            }, 1032, ["class"])
          ], 42, _hoisted_2);
        }), 128)),
        _ctx.showText || _ctx.showScore ? (vue.openBlock(), vue.createElementBlock("span", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("text")),
          style: vue.normalizeStyle({ color: _ctx.textColor })
        }, vue.toDisplayString(vue.unref(text)), 7)) : vue.createCommentVNode("v-if", true)
      ], 46, _hoisted_1);
    };
  }
});
var Rate = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/rate/src/rate.vue"]]);

exports["default"] = Rate;
//# sourceMappingURL=rate2.js.map
