import { defineComponent, inject, ref, computed, markRaw, watch, openBlock, createElementBlock, unref, normalizeClass, normalizeStyle, Fragment, renderList, createVNode, withCtx, withDirectives, createBlock, resolveDynamicComponent, vShow, createCommentVNode, toDisplayString } from 'vue';
import '../../../constants/index.mjs';
import '../../../utils/index.mjs';
import '../../form/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../../hooks/index.mjs';
import { rateProps, rateEmits } from './rate.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { isObject, isArray, isString } from '@vue/shared';
import { formContextKey, formItemContextKey } from '../../form/src/constants.mjs';
import { useFormSize } from '../../form/src/hooks/use-form-common-props.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useFormItemInputId } from '../../form/src/hooks/use-form-item.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';
import { hasClass } from '../../../utils/dom/style.mjs';

const _hoisted_1 = ["id", "aria-label", "aria-labelledby", "aria-valuenow", "aria-valuetext", "aria-valuemax"];
const _hoisted_2 = ["onMousemove", "onClick"];
const __default__ = defineComponent({
  name: "ElRate"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: rateProps,
  emits: rateEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    function getValueFromMap(value, map) {
      const isExcludedObject = (val) => isObject(val);
      const matchedKeys = Object.keys(map).map((key) => +key).filter((key) => {
        const val = map[key];
        const excluded = isExcludedObject(val) ? val.excluded : false;
        return excluded ? value < key : value <= key;
      }).sort((a, b) => a - b);
      const matchedValue = map[matchedKeys[0]];
      return isExcludedObject(matchedValue) && matchedValue.value || matchedValue;
    }
    const formContext = inject(formContextKey, void 0);
    const formItemContext = inject(formItemContextKey, void 0);
    const rateSize = useFormSize();
    const ns = useNamespace("rate");
    const { inputId, isLabeledByFormItem } = useFormItemInputId(props, {
      formItemContext
    });
    const currentValue = ref(props.modelValue);
    const hoverIndex = ref(-1);
    const pointerAtLeftHalf = ref(true);
    const rateClasses = computed(() => [ns.b(), ns.m(rateSize.value)]);
    const rateDisabled = computed(() => props.disabled || (formContext == null ? void 0 : formContext.disabled));
    const rateStyles = computed(() => {
      return ns.cssVarBlock({
        "void-color": props.voidColor,
        "disabled-void-color": props.disabledVoidColor,
        "fill-color": activeColor.value
      });
    });
    const text = computed(() => {
      let result = "";
      if (props.showScore) {
        result = props.scoreTemplate.replace(/\{\s*value\s*\}/, rateDisabled.value ? `${props.modelValue}` : `${currentValue.value}`);
      } else if (props.showText) {
        result = props.texts[Math.ceil(currentValue.value) - 1];
      }
      return result;
    });
    const valueDecimal = computed(() => props.modelValue * 100 - Math.floor(props.modelValue) * 100);
    const colorMap = computed(() => isArray(props.colors) ? {
      [props.lowThreshold]: props.colors[0],
      [props.highThreshold]: { value: props.colors[1], excluded: true },
      [props.max]: props.colors[2]
    } : props.colors);
    const activeColor = computed(() => {
      const color = getValueFromMap(currentValue.value, colorMap.value);
      return isObject(color) ? "" : color;
    });
    const decimalStyle = computed(() => {
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
    const componentMap = computed(() => {
      let icons = isArray(props.icons) ? [...props.icons] : { ...props.icons };
      icons = markRaw(icons);
      return isArray(icons) ? {
        [props.lowThreshold]: icons[0],
        [props.highThreshold]: {
          value: icons[1],
          excluded: true
        },
        [props.max]: icons[2]
      } : icons;
    });
    const decimalIconComponent = computed(() => getValueFromMap(props.modelValue, componentMap.value));
    const voidComponent = computed(() => rateDisabled.value ? isString(props.disabledVoidIcon) ? props.disabledVoidIcon : markRaw(props.disabledVoidIcon) : isString(props.voidIcon) ? props.voidIcon : markRaw(props.voidIcon));
    const activeComponent = computed(() => getValueFromMap(currentValue.value, componentMap.value));
    function showDecimalIcon(item) {
      const showWhenDisabled = rateDisabled.value && valueDecimal.value > 0 && item - 1 < props.modelValue && item > props.modelValue;
      const showWhenAllowHalf = props.allowHalf && pointerAtLeftHalf.value && item - 0.5 <= currentValue.value && item > currentValue.value;
      return showWhenDisabled || showWhenAllowHalf;
    }
    function emitValue(value) {
      if (props.clearable && value === props.modelValue) {
        value = 0;
      }
      emit(UPDATE_MODEL_EVENT, value);
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
      if (code === EVENT_CODE.up || code === EVENT_CODE.right) {
        if (props.allowHalf) {
          _currentValue += 0.5;
        } else {
          _currentValue += 1;
        }
        e.stopPropagation();
        e.preventDefault();
      } else if (code === EVENT_CODE.left || code === EVENT_CODE.down) {
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
      emit(UPDATE_MODEL_EVENT, _currentValue);
      emit("change", _currentValue);
      return _currentValue;
    }
    function setCurrentValue(value, event) {
      if (rateDisabled.value) {
        return;
      }
      if (props.allowHalf && event) {
        let target = event.target;
        if (hasClass(target, ns.e("item"))) {
          target = target.querySelector(`.${ns.e("icon")}`);
        }
        if (target.clientWidth === 0 || hasClass(target, ns.e("decimal"))) {
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
    watch(() => props.modelValue, (val) => {
      currentValue.value = val;
      pointerAtLeftHalf.value = props.modelValue !== Math.floor(props.modelValue);
    });
    if (!props.modelValue) {
      emit(UPDATE_MODEL_EVENT, 0);
    }
    expose({
      setCurrentValue,
      resetCurrentValue
    });
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("div", {
        id: unref(inputId),
        class: normalizeClass([unref(rateClasses), unref(ns).is("disabled", unref(rateDisabled))]),
        role: "slider",
        "aria-label": !unref(isLabeledByFormItem) ? _ctx.label || "rating" : void 0,
        "aria-labelledby": unref(isLabeledByFormItem) ? (_a = unref(formItemContext)) == null ? void 0 : _a.labelId : void 0,
        "aria-valuenow": currentValue.value,
        "aria-valuetext": unref(text) || void 0,
        "aria-valuemin": "0",
        "aria-valuemax": _ctx.max,
        tabindex: "0",
        style: normalizeStyle(unref(rateStyles)),
        onKeydown: handleKey
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.max, (item, key) => {
          return openBlock(), createElementBlock("span", {
            key,
            class: normalizeClass(unref(ns).e("item")),
            onMousemove: ($event) => setCurrentValue(item, $event),
            onMouseleave: resetCurrentValue,
            onClick: ($event) => selectValue(item)
          }, [
            createVNode(unref(ElIcon), {
              class: normalizeClass([
                unref(ns).e("icon"),
                { hover: hoverIndex.value === item },
                unref(ns).is("active", item <= currentValue.value)
              ])
            }, {
              default: withCtx(() => [
                !showDecimalIcon(item) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  withDirectives((openBlock(), createBlock(resolveDynamicComponent(unref(activeComponent)), null, null, 512)), [
                    [vShow, item <= currentValue.value]
                  ]),
                  withDirectives((openBlock(), createBlock(resolveDynamicComponent(unref(voidComponent)), null, null, 512)), [
                    [vShow, !(item <= currentValue.value)]
                  ])
                ], 64)) : createCommentVNode("v-if", true),
                showDecimalIcon(item) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  (openBlock(), createBlock(resolveDynamicComponent(unref(voidComponent)), {
                    class: normalizeClass([unref(ns).em("decimal", "box")])
                  }, null, 8, ["class"])),
                  createVNode(unref(ElIcon), {
                    style: normalizeStyle(unref(decimalStyle)),
                    class: normalizeClass([unref(ns).e("icon"), unref(ns).e("decimal")])
                  }, {
                    default: withCtx(() => [
                      (openBlock(), createBlock(resolveDynamicComponent(unref(decimalIconComponent))))
                    ]),
                    _: 1
                  }, 8, ["style", "class"])
                ], 64)) : createCommentVNode("v-if", true)
              ]),
              _: 2
            }, 1032, ["class"])
          ], 42, _hoisted_2);
        }), 128)),
        _ctx.showText || _ctx.showScore ? (openBlock(), createElementBlock("span", {
          key: 0,
          class: normalizeClass(unref(ns).e("text")),
          style: normalizeStyle({ color: _ctx.textColor })
        }, toDisplayString(unref(text)), 7)) : createCommentVNode("v-if", true)
      ], 46, _hoisted_1);
    };
  }
});
var Rate = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/rate/src/rate.vue"]]);

export { Rate as default };
//# sourceMappingURL=rate2.mjs.map
