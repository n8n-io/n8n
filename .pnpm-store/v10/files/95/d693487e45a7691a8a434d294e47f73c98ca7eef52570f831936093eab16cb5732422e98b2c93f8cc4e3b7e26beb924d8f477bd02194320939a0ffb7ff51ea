import { defineComponent, useAttrs, useSlots, computed, shallowRef, ref, nextTick, watch, onMounted, toRef, withDirectives, openBlock, createElementBlock, mergeProps, unref, createCommentVNode, Fragment, normalizeClass, renderSlot, createElementVNode, createBlock, withCtx, resolveDynamicComponent, withModifiers, createVNode, toDisplayString, normalizeStyle, vShow } from 'vue';
import { useResizeObserver, isClient } from '@vueuse/core';
import { isNil } from 'lodash-unified';
import { ElIcon } from '../../icon/index.mjs';
import { View, Hide, CircleClose } from '@element-plus/icons-vue';
import '../../form/index.mjs';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import '../../../constants/index.mjs';
import { calcTextareaHeight } from './utils.mjs';
import { inputProps, inputEmits } from './input.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useAttrs as useAttrs$1 } from '../../../hooks/use-attrs/index.mjs';
import { useFormItem, useFormItemInputId } from '../../form/src/hooks/use-form-item.mjs';
import { useFormSize, useFormDisabled } from '../../form/src/hooks/use-form-common-props.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useFocusController } from '../../../hooks/use-focus-controller/index.mjs';
import { debugWarn } from '../../../utils/error.mjs';
import { ValidateComponentsMap } from '../../../utils/vue/icon.mjs';
import { useCursor } from '../../../hooks/use-cursor/index.mjs';
import { isObject, NOOP } from '@vue/shared';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { isKorean } from '../../../utils/i18n.mjs';

const _hoisted_1 = ["role"];
const _hoisted_2 = ["id", "type", "disabled", "formatter", "parser", "readonly", "autocomplete", "tabindex", "aria-label", "placeholder", "form", "autofocus"];
const _hoisted_3 = ["id", "tabindex", "disabled", "readonly", "autocomplete", "aria-label", "placeholder", "form", "autofocus"];
const __default__ = defineComponent({
  name: "ElInput",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: inputProps,
  emits: inputEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const rawAttrs = useAttrs();
    const slots = useSlots();
    const containerAttrs = computed(() => {
      const comboBoxAttrs = {};
      if (props.containerRole === "combobox") {
        comboBoxAttrs["aria-haspopup"] = rawAttrs["aria-haspopup"];
        comboBoxAttrs["aria-owns"] = rawAttrs["aria-owns"];
        comboBoxAttrs["aria-expanded"] = rawAttrs["aria-expanded"];
      }
      return comboBoxAttrs;
    });
    const containerKls = computed(() => [
      props.type === "textarea" ? nsTextarea.b() : nsInput.b(),
      nsInput.m(inputSize.value),
      nsInput.is("disabled", inputDisabled.value),
      nsInput.is("exceed", inputExceed.value),
      {
        [nsInput.b("group")]: slots.prepend || slots.append,
        [nsInput.bm("group", "append")]: slots.append,
        [nsInput.bm("group", "prepend")]: slots.prepend,
        [nsInput.m("prefix")]: slots.prefix || props.prefixIcon,
        [nsInput.m("suffix")]: slots.suffix || props.suffixIcon || props.clearable || props.showPassword,
        [nsInput.bm("suffix", "password-clear")]: showClear.value && showPwdVisible.value
      },
      rawAttrs.class
    ]);
    const wrapperKls = computed(() => [
      nsInput.e("wrapper"),
      nsInput.is("focus", isFocused.value)
    ]);
    const attrs = useAttrs$1({
      excludeKeys: computed(() => {
        return Object.keys(containerAttrs.value);
      })
    });
    const { form, formItem } = useFormItem();
    const { inputId } = useFormItemInputId(props, {
      formItemContext: formItem
    });
    const inputSize = useFormSize();
    const inputDisabled = useFormDisabled();
    const nsInput = useNamespace("input");
    const nsTextarea = useNamespace("textarea");
    const input = shallowRef();
    const textarea = shallowRef();
    const hovering = ref(false);
    const isComposing = ref(false);
    const passwordVisible = ref(false);
    const countStyle = ref();
    const textareaCalcStyle = shallowRef(props.inputStyle);
    const _ref = computed(() => input.value || textarea.value);
    const { wrapperRef, isFocused, handleFocus, handleBlur } = useFocusController(_ref, {
      afterBlur() {
        var _a;
        if (props.validateEvent) {
          (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "blur").catch((err) => debugWarn(err));
        }
      }
    });
    const needStatusIcon = computed(() => {
      var _a;
      return (_a = form == null ? void 0 : form.statusIcon) != null ? _a : false;
    });
    const validateState = computed(() => (formItem == null ? void 0 : formItem.validateState) || "");
    const validateIcon = computed(() => validateState.value && ValidateComponentsMap[validateState.value]);
    const passwordIcon = computed(() => passwordVisible.value ? View : Hide);
    const containerStyle = computed(() => [
      rawAttrs.style,
      props.inputStyle
    ]);
    const textareaStyle = computed(() => [
      props.inputStyle,
      textareaCalcStyle.value,
      { resize: props.resize }
    ]);
    const nativeInputValue = computed(() => isNil(props.modelValue) ? "" : String(props.modelValue));
    const showClear = computed(() => props.clearable && !inputDisabled.value && !props.readonly && !!nativeInputValue.value && (isFocused.value || hovering.value));
    const showPwdVisible = computed(() => props.showPassword && !inputDisabled.value && !props.readonly && !!nativeInputValue.value && (!!nativeInputValue.value || isFocused.value));
    const isWordLimitVisible = computed(() => props.showWordLimit && !!attrs.value.maxlength && (props.type === "text" || props.type === "textarea") && !inputDisabled.value && !props.readonly && !props.showPassword);
    const textLength = computed(() => nativeInputValue.value.length);
    const inputExceed = computed(() => !!isWordLimitVisible.value && textLength.value > Number(attrs.value.maxlength));
    const suffixVisible = computed(() => !!slots.suffix || !!props.suffixIcon || showClear.value || props.showPassword || isWordLimitVisible.value || !!validateState.value && needStatusIcon.value);
    const [recordCursor, setCursor] = useCursor(input);
    useResizeObserver(textarea, (entries) => {
      onceInitSizeTextarea();
      if (!isWordLimitVisible.value || props.resize !== "both")
        return;
      const entry = entries[0];
      const { width } = entry.contentRect;
      countStyle.value = {
        right: `calc(100% - ${width + 15 + 6}px)`
      };
    });
    const resizeTextarea = () => {
      const { type, autosize } = props;
      if (!isClient || type !== "textarea" || !textarea.value)
        return;
      if (autosize) {
        const minRows = isObject(autosize) ? autosize.minRows : void 0;
        const maxRows = isObject(autosize) ? autosize.maxRows : void 0;
        const textareaStyle2 = calcTextareaHeight(textarea.value, minRows, maxRows);
        textareaCalcStyle.value = {
          overflowY: "hidden",
          ...textareaStyle2
        };
        nextTick(() => {
          textarea.value.offsetHeight;
          textareaCalcStyle.value = textareaStyle2;
        });
      } else {
        textareaCalcStyle.value = {
          minHeight: calcTextareaHeight(textarea.value).minHeight
        };
      }
    };
    const createOnceInitResize = (resizeTextarea2) => {
      let isInit = false;
      return () => {
        var _a;
        if (isInit || !props.autosize)
          return;
        const isElHidden = ((_a = textarea.value) == null ? void 0 : _a.offsetParent) === null;
        if (!isElHidden) {
          resizeTextarea2();
          isInit = true;
        }
      };
    };
    const onceInitSizeTextarea = createOnceInitResize(resizeTextarea);
    const setNativeInputValue = () => {
      const input2 = _ref.value;
      const formatterValue = props.formatter ? props.formatter(nativeInputValue.value) : nativeInputValue.value;
      if (!input2 || input2.value === formatterValue)
        return;
      input2.value = formatterValue;
    };
    const handleInput = async (event) => {
      recordCursor();
      let { value } = event.target;
      if (props.formatter) {
        value = props.parser ? props.parser(value) : value;
      }
      if (isComposing.value)
        return;
      if (value === nativeInputValue.value) {
        setNativeInputValue();
        return;
      }
      emit(UPDATE_MODEL_EVENT, value);
      emit("input", value);
      await nextTick();
      setNativeInputValue();
      setCursor();
    };
    const handleChange = (event) => {
      emit("change", event.target.value);
    };
    const handleCompositionStart = (event) => {
      emit("compositionstart", event);
      isComposing.value = true;
    };
    const handleCompositionUpdate = (event) => {
      var _a;
      emit("compositionupdate", event);
      const text = (_a = event.target) == null ? void 0 : _a.value;
      const lastCharacter = text[text.length - 1] || "";
      isComposing.value = !isKorean(lastCharacter);
    };
    const handleCompositionEnd = (event) => {
      emit("compositionend", event);
      if (isComposing.value) {
        isComposing.value = false;
        handleInput(event);
      }
    };
    const handlePasswordVisible = () => {
      passwordVisible.value = !passwordVisible.value;
      focus();
    };
    const focus = async () => {
      var _a;
      await nextTick();
      (_a = _ref.value) == null ? void 0 : _a.focus();
    };
    const blur = () => {
      var _a;
      return (_a = _ref.value) == null ? void 0 : _a.blur();
    };
    const handleMouseLeave = (evt) => {
      hovering.value = false;
      emit("mouseleave", evt);
    };
    const handleMouseEnter = (evt) => {
      hovering.value = true;
      emit("mouseenter", evt);
    };
    const handleKeydown = (evt) => {
      emit("keydown", evt);
    };
    const select = () => {
      var _a;
      (_a = _ref.value) == null ? void 0 : _a.select();
    };
    const clear = () => {
      emit(UPDATE_MODEL_EVENT, "");
      emit("change", "");
      emit("clear");
      emit("input", "");
    };
    watch(() => props.modelValue, () => {
      var _a;
      nextTick(() => resizeTextarea());
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "change").catch((err) => debugWarn(err));
      }
    });
    watch(nativeInputValue, () => setNativeInputValue());
    watch(() => props.type, async () => {
      await nextTick();
      setNativeInputValue();
      resizeTextarea();
    });
    onMounted(() => {
      if (!props.formatter && props.parser) {
        debugWarn("ElInput", "If you set the parser, you also need to set the formatter.");
      }
      setNativeInputValue();
      nextTick(resizeTextarea);
    });
    expose({
      input,
      textarea,
      ref: _ref,
      textareaStyle,
      autosize: toRef(props, "autosize"),
      focus,
      blur,
      select,
      clear,
      resizeTextarea
    });
    return (_ctx, _cache) => {
      return withDirectives((openBlock(), createElementBlock("div", mergeProps(unref(containerAttrs), {
        class: unref(containerKls),
        style: unref(containerStyle),
        role: _ctx.containerRole,
        onMouseenter: handleMouseEnter,
        onMouseleave: handleMouseLeave
      }), [
        createCommentVNode(" input "),
        _ctx.type !== "textarea" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createCommentVNode(" prepend slot "),
          _ctx.$slots.prepend ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(unref(nsInput).be("group", "prepend"))
          }, [
            renderSlot(_ctx.$slots, "prepend")
          ], 2)) : createCommentVNode("v-if", true),
          createElementVNode("div", {
            ref_key: "wrapperRef",
            ref: wrapperRef,
            class: normalizeClass(unref(wrapperKls))
          }, [
            createCommentVNode(" prefix slot "),
            _ctx.$slots.prefix || _ctx.prefixIcon ? (openBlock(), createElementBlock("span", {
              key: 0,
              class: normalizeClass(unref(nsInput).e("prefix"))
            }, [
              createElementVNode("span", {
                class: normalizeClass(unref(nsInput).e("prefix-inner"))
              }, [
                renderSlot(_ctx.$slots, "prefix"),
                _ctx.prefixIcon ? (openBlock(), createBlock(unref(ElIcon), {
                  key: 0,
                  class: normalizeClass(unref(nsInput).e("icon"))
                }, {
                  default: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(_ctx.prefixIcon)))
                  ]),
                  _: 1
                }, 8, ["class"])) : createCommentVNode("v-if", true)
              ], 2)
            ], 2)) : createCommentVNode("v-if", true),
            createElementVNode("input", mergeProps({
              id: unref(inputId),
              ref_key: "input",
              ref: input,
              class: unref(nsInput).e("inner")
            }, unref(attrs), {
              type: _ctx.showPassword ? passwordVisible.value ? "text" : "password" : _ctx.type,
              disabled: unref(inputDisabled),
              formatter: _ctx.formatter,
              parser: _ctx.parser,
              readonly: _ctx.readonly,
              autocomplete: _ctx.autocomplete,
              tabindex: _ctx.tabindex,
              "aria-label": _ctx.label,
              placeholder: _ctx.placeholder,
              style: _ctx.inputStyle,
              form: props.form,
              autofocus: props.autofocus,
              onCompositionstart: handleCompositionStart,
              onCompositionupdate: handleCompositionUpdate,
              onCompositionend: handleCompositionEnd,
              onInput: handleInput,
              onFocus: _cache[0] || (_cache[0] = (...args) => unref(handleFocus) && unref(handleFocus)(...args)),
              onBlur: _cache[1] || (_cache[1] = (...args) => unref(handleBlur) && unref(handleBlur)(...args)),
              onChange: handleChange,
              onKeydown: handleKeydown
            }), null, 16, _hoisted_2),
            createCommentVNode(" suffix slot "),
            unref(suffixVisible) ? (openBlock(), createElementBlock("span", {
              key: 1,
              class: normalizeClass(unref(nsInput).e("suffix"))
            }, [
              createElementVNode("span", {
                class: normalizeClass(unref(nsInput).e("suffix-inner"))
              }, [
                !unref(showClear) || !unref(showPwdVisible) || !unref(isWordLimitVisible) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  renderSlot(_ctx.$slots, "suffix"),
                  _ctx.suffixIcon ? (openBlock(), createBlock(unref(ElIcon), {
                    key: 0,
                    class: normalizeClass(unref(nsInput).e("icon"))
                  }, {
                    default: withCtx(() => [
                      (openBlock(), createBlock(resolveDynamicComponent(_ctx.suffixIcon)))
                    ]),
                    _: 1
                  }, 8, ["class"])) : createCommentVNode("v-if", true)
                ], 64)) : createCommentVNode("v-if", true),
                unref(showClear) ? (openBlock(), createBlock(unref(ElIcon), {
                  key: 1,
                  class: normalizeClass([unref(nsInput).e("icon"), unref(nsInput).e("clear")]),
                  onMousedown: withModifiers(unref(NOOP), ["prevent"]),
                  onClick: clear
                }, {
                  default: withCtx(() => [
                    createVNode(unref(CircleClose))
                  ]),
                  _: 1
                }, 8, ["class", "onMousedown"])) : createCommentVNode("v-if", true),
                unref(showPwdVisible) ? (openBlock(), createBlock(unref(ElIcon), {
                  key: 2,
                  class: normalizeClass([unref(nsInput).e("icon"), unref(nsInput).e("password")]),
                  onClick: handlePasswordVisible
                }, {
                  default: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(unref(passwordIcon))))
                  ]),
                  _: 1
                }, 8, ["class"])) : createCommentVNode("v-if", true),
                unref(isWordLimitVisible) ? (openBlock(), createElementBlock("span", {
                  key: 3,
                  class: normalizeClass(unref(nsInput).e("count"))
                }, [
                  createElementVNode("span", {
                    class: normalizeClass(unref(nsInput).e("count-inner"))
                  }, toDisplayString(unref(textLength)) + " / " + toDisplayString(unref(attrs).maxlength), 3)
                ], 2)) : createCommentVNode("v-if", true),
                unref(validateState) && unref(validateIcon) && unref(needStatusIcon) ? (openBlock(), createBlock(unref(ElIcon), {
                  key: 4,
                  class: normalizeClass([
                    unref(nsInput).e("icon"),
                    unref(nsInput).e("validateIcon"),
                    unref(nsInput).is("loading", unref(validateState) === "validating")
                  ])
                }, {
                  default: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(unref(validateIcon))))
                  ]),
                  _: 1
                }, 8, ["class"])) : createCommentVNode("v-if", true)
              ], 2)
            ], 2)) : createCommentVNode("v-if", true)
          ], 2),
          createCommentVNode(" append slot "),
          _ctx.$slots.append ? (openBlock(), createElementBlock("div", {
            key: 1,
            class: normalizeClass(unref(nsInput).be("group", "append"))
          }, [
            renderSlot(_ctx.$slots, "append")
          ], 2)) : createCommentVNode("v-if", true)
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createCommentVNode(" textarea "),
          createElementVNode("textarea", mergeProps({
            id: unref(inputId),
            ref_key: "textarea",
            ref: textarea,
            class: unref(nsTextarea).e("inner")
          }, unref(attrs), {
            tabindex: _ctx.tabindex,
            disabled: unref(inputDisabled),
            readonly: _ctx.readonly,
            autocomplete: _ctx.autocomplete,
            style: unref(textareaStyle),
            "aria-label": _ctx.label,
            placeholder: _ctx.placeholder,
            form: props.form,
            autofocus: props.autofocus,
            onCompositionstart: handleCompositionStart,
            onCompositionupdate: handleCompositionUpdate,
            onCompositionend: handleCompositionEnd,
            onInput: handleInput,
            onFocus: _cache[2] || (_cache[2] = (...args) => unref(handleFocus) && unref(handleFocus)(...args)),
            onBlur: _cache[3] || (_cache[3] = (...args) => unref(handleBlur) && unref(handleBlur)(...args)),
            onChange: handleChange,
            onKeydown: handleKeydown
          }), null, 16, _hoisted_3),
          unref(isWordLimitVisible) ? (openBlock(), createElementBlock("span", {
            key: 0,
            style: normalizeStyle(countStyle.value),
            class: normalizeClass(unref(nsInput).e("count"))
          }, toDisplayString(unref(textLength)) + " / " + toDisplayString(unref(attrs).maxlength), 7)) : createCommentVNode("v-if", true)
        ], 64))
      ], 16, _hoisted_1)), [
        [vShow, _ctx.type !== "hidden"]
      ]);
    };
  }
});
var Input = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/input/src/input.vue"]]);

export { Input as default };
//# sourceMappingURL=input2.mjs.map
