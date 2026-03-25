'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var lodashUnified = require('lodash-unified');
var index$4 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../form/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../../constants/index.js');
var utils = require('./utils.js');
var input = require('./input.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-attrs/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var index$2 = require('../../../hooks/use-focus-controller/index.js');
var error = require('../../../utils/error.js');
var icon = require('../../../utils/vue/icon.js');
var index$3 = require('../../../hooks/use-cursor/index.js');
var shared = require('@vue/shared');
var event = require('../../../constants/event.js');
var i18n = require('../../../utils/i18n.js');

const _hoisted_1 = ["role"];
const _hoisted_2 = ["id", "type", "disabled", "formatter", "parser", "readonly", "autocomplete", "tabindex", "aria-label", "placeholder", "form", "autofocus"];
const _hoisted_3 = ["id", "tabindex", "disabled", "readonly", "autocomplete", "aria-label", "placeholder", "form", "autofocus"];
const __default__ = vue.defineComponent({
  name: "ElInput",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: input.inputProps,
  emits: input.inputEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const rawAttrs = vue.useAttrs();
    const slots = vue.useSlots();
    const containerAttrs = vue.computed(() => {
      const comboBoxAttrs = {};
      if (props.containerRole === "combobox") {
        comboBoxAttrs["aria-haspopup"] = rawAttrs["aria-haspopup"];
        comboBoxAttrs["aria-owns"] = rawAttrs["aria-owns"];
        comboBoxAttrs["aria-expanded"] = rawAttrs["aria-expanded"];
      }
      return comboBoxAttrs;
    });
    const containerKls = vue.computed(() => [
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
    const wrapperKls = vue.computed(() => [
      nsInput.e("wrapper"),
      nsInput.is("focus", isFocused.value)
    ]);
    const attrs = index.useAttrs({
      excludeKeys: vue.computed(() => {
        return Object.keys(containerAttrs.value);
      })
    });
    const { form, formItem } = useFormItem.useFormItem();
    const { inputId } = useFormItem.useFormItemInputId(props, {
      formItemContext: formItem
    });
    const inputSize = useFormCommonProps.useFormSize();
    const inputDisabled = useFormCommonProps.useFormDisabled();
    const nsInput = index$1.useNamespace("input");
    const nsTextarea = index$1.useNamespace("textarea");
    const input = vue.shallowRef();
    const textarea = vue.shallowRef();
    const hovering = vue.ref(false);
    const isComposing = vue.ref(false);
    const passwordVisible = vue.ref(false);
    const countStyle = vue.ref();
    const textareaCalcStyle = vue.shallowRef(props.inputStyle);
    const _ref = vue.computed(() => input.value || textarea.value);
    const { wrapperRef, isFocused, handleFocus, handleBlur } = index$2.useFocusController(_ref, {
      afterBlur() {
        var _a;
        if (props.validateEvent) {
          (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "blur").catch((err) => error.debugWarn(err));
        }
      }
    });
    const needStatusIcon = vue.computed(() => {
      var _a;
      return (_a = form == null ? void 0 : form.statusIcon) != null ? _a : false;
    });
    const validateState = vue.computed(() => (formItem == null ? void 0 : formItem.validateState) || "");
    const validateIcon = vue.computed(() => validateState.value && icon.ValidateComponentsMap[validateState.value]);
    const passwordIcon = vue.computed(() => passwordVisible.value ? iconsVue.View : iconsVue.Hide);
    const containerStyle = vue.computed(() => [
      rawAttrs.style,
      props.inputStyle
    ]);
    const textareaStyle = vue.computed(() => [
      props.inputStyle,
      textareaCalcStyle.value,
      { resize: props.resize }
    ]);
    const nativeInputValue = vue.computed(() => lodashUnified.isNil(props.modelValue) ? "" : String(props.modelValue));
    const showClear = vue.computed(() => props.clearable && !inputDisabled.value && !props.readonly && !!nativeInputValue.value && (isFocused.value || hovering.value));
    const showPwdVisible = vue.computed(() => props.showPassword && !inputDisabled.value && !props.readonly && !!nativeInputValue.value && (!!nativeInputValue.value || isFocused.value));
    const isWordLimitVisible = vue.computed(() => props.showWordLimit && !!attrs.value.maxlength && (props.type === "text" || props.type === "textarea") && !inputDisabled.value && !props.readonly && !props.showPassword);
    const textLength = vue.computed(() => nativeInputValue.value.length);
    const inputExceed = vue.computed(() => !!isWordLimitVisible.value && textLength.value > Number(attrs.value.maxlength));
    const suffixVisible = vue.computed(() => !!slots.suffix || !!props.suffixIcon || showClear.value || props.showPassword || isWordLimitVisible.value || !!validateState.value && needStatusIcon.value);
    const [recordCursor, setCursor] = index$3.useCursor(input);
    core.useResizeObserver(textarea, (entries) => {
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
      if (!core.isClient || type !== "textarea" || !textarea.value)
        return;
      if (autosize) {
        const minRows = shared.isObject(autosize) ? autosize.minRows : void 0;
        const maxRows = shared.isObject(autosize) ? autosize.maxRows : void 0;
        const textareaStyle2 = utils.calcTextareaHeight(textarea.value, minRows, maxRows);
        textareaCalcStyle.value = {
          overflowY: "hidden",
          ...textareaStyle2
        };
        vue.nextTick(() => {
          textarea.value.offsetHeight;
          textareaCalcStyle.value = textareaStyle2;
        });
      } else {
        textareaCalcStyle.value = {
          minHeight: utils.calcTextareaHeight(textarea.value).minHeight
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
    const handleInput = async (event$1) => {
      recordCursor();
      let { value } = event$1.target;
      if (props.formatter) {
        value = props.parser ? props.parser(value) : value;
      }
      if (isComposing.value)
        return;
      if (value === nativeInputValue.value) {
        setNativeInputValue();
        return;
      }
      emit(event.UPDATE_MODEL_EVENT, value);
      emit("input", value);
      await vue.nextTick();
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
      isComposing.value = !i18n.isKorean(lastCharacter);
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
      await vue.nextTick();
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
      emit(event.UPDATE_MODEL_EVENT, "");
      emit("change", "");
      emit("clear");
      emit("input", "");
    };
    vue.watch(() => props.modelValue, () => {
      var _a;
      vue.nextTick(() => resizeTextarea());
      if (props.validateEvent) {
        (_a = formItem == null ? void 0 : formItem.validate) == null ? void 0 : _a.call(formItem, "change").catch((err) => error.debugWarn(err));
      }
    });
    vue.watch(nativeInputValue, () => setNativeInputValue());
    vue.watch(() => props.type, async () => {
      await vue.nextTick();
      setNativeInputValue();
      resizeTextarea();
    });
    vue.onMounted(() => {
      if (!props.formatter && props.parser) {
        error.debugWarn("ElInput", "If you set the parser, you also need to set the formatter.");
      }
      setNativeInputValue();
      vue.nextTick(resizeTextarea);
    });
    expose({
      input,
      textarea,
      ref: _ref,
      textareaStyle,
      autosize: vue.toRef(props, "autosize"),
      focus,
      blur,
      select,
      clear,
      resizeTextarea
    });
    return (_ctx, _cache) => {
      return vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", vue.mergeProps(vue.unref(containerAttrs), {
        class: vue.unref(containerKls),
        style: vue.unref(containerStyle),
        role: _ctx.containerRole,
        onMouseenter: handleMouseEnter,
        onMouseleave: handleMouseLeave
      }), [
        vue.createCommentVNode(" input "),
        _ctx.type !== "textarea" ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
          vue.createCommentVNode(" prepend slot "),
          _ctx.$slots.prepend ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(nsInput).be("group", "prepend"))
          }, [
            vue.renderSlot(_ctx.$slots, "prepend")
          ], 2)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("div", {
            ref_key: "wrapperRef",
            ref: wrapperRef,
            class: vue.normalizeClass(vue.unref(wrapperKls))
          }, [
            vue.createCommentVNode(" prefix slot "),
            _ctx.$slots.prefix || _ctx.prefixIcon ? (vue.openBlock(), vue.createElementBlock("span", {
              key: 0,
              class: vue.normalizeClass(vue.unref(nsInput).e("prefix"))
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(nsInput).e("prefix-inner"))
              }, [
                vue.renderSlot(_ctx.$slots, "prefix"),
                _ctx.prefixIcon ? (vue.openBlock(), vue.createBlock(vue.unref(index$4.ElIcon), {
                  key: 0,
                  class: vue.normalizeClass(vue.unref(nsInput).e("icon"))
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.prefixIcon)))
                  ]),
                  _: 1
                }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
              ], 2)
            ], 2)) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("input", vue.mergeProps({
              id: vue.unref(inputId),
              ref_key: "input",
              ref: input,
              class: vue.unref(nsInput).e("inner")
            }, vue.unref(attrs), {
              type: _ctx.showPassword ? passwordVisible.value ? "text" : "password" : _ctx.type,
              disabled: vue.unref(inputDisabled),
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
              onFocus: _cache[0] || (_cache[0] = (...args) => vue.unref(handleFocus) && vue.unref(handleFocus)(...args)),
              onBlur: _cache[1] || (_cache[1] = (...args) => vue.unref(handleBlur) && vue.unref(handleBlur)(...args)),
              onChange: handleChange,
              onKeydown: handleKeydown
            }), null, 16, _hoisted_2),
            vue.createCommentVNode(" suffix slot "),
            vue.unref(suffixVisible) ? (vue.openBlock(), vue.createElementBlock("span", {
              key: 1,
              class: vue.normalizeClass(vue.unref(nsInput).e("suffix"))
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(nsInput).e("suffix-inner"))
              }, [
                !vue.unref(showClear) || !vue.unref(showPwdVisible) || !vue.unref(isWordLimitVisible) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                  vue.renderSlot(_ctx.$slots, "suffix"),
                  _ctx.suffixIcon ? (vue.openBlock(), vue.createBlock(vue.unref(index$4.ElIcon), {
                    key: 0,
                    class: vue.normalizeClass(vue.unref(nsInput).e("icon"))
                  }, {
                    default: vue.withCtx(() => [
                      (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.suffixIcon)))
                    ]),
                    _: 1
                  }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
                ], 64)) : vue.createCommentVNode("v-if", true),
                vue.unref(showClear) ? (vue.openBlock(), vue.createBlock(vue.unref(index$4.ElIcon), {
                  key: 1,
                  class: vue.normalizeClass([vue.unref(nsInput).e("icon"), vue.unref(nsInput).e("clear")]),
                  onMousedown: vue.withModifiers(vue.unref(shared.NOOP), ["prevent"]),
                  onClick: clear
                }, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(iconsVue.CircleClose))
                  ]),
                  _: 1
                }, 8, ["class", "onMousedown"])) : vue.createCommentVNode("v-if", true),
                vue.unref(showPwdVisible) ? (vue.openBlock(), vue.createBlock(vue.unref(index$4.ElIcon), {
                  key: 2,
                  class: vue.normalizeClass([vue.unref(nsInput).e("icon"), vue.unref(nsInput).e("password")]),
                  onClick: handlePasswordVisible
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(passwordIcon))))
                  ]),
                  _: 1
                }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
                vue.unref(isWordLimitVisible) ? (vue.openBlock(), vue.createElementBlock("span", {
                  key: 3,
                  class: vue.normalizeClass(vue.unref(nsInput).e("count"))
                }, [
                  vue.createElementVNode("span", {
                    class: vue.normalizeClass(vue.unref(nsInput).e("count-inner"))
                  }, vue.toDisplayString(vue.unref(textLength)) + " / " + vue.toDisplayString(vue.unref(attrs).maxlength), 3)
                ], 2)) : vue.createCommentVNode("v-if", true),
                vue.unref(validateState) && vue.unref(validateIcon) && vue.unref(needStatusIcon) ? (vue.openBlock(), vue.createBlock(vue.unref(index$4.ElIcon), {
                  key: 4,
                  class: vue.normalizeClass([
                    vue.unref(nsInput).e("icon"),
                    vue.unref(nsInput).e("validateIcon"),
                    vue.unref(nsInput).is("loading", vue.unref(validateState) === "validating")
                  ])
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(validateIcon))))
                  ]),
                  _: 1
                }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
              ], 2)
            ], 2)) : vue.createCommentVNode("v-if", true)
          ], 2),
          vue.createCommentVNode(" append slot "),
          _ctx.$slots.append ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass(vue.unref(nsInput).be("group", "append"))
          }, [
            vue.renderSlot(_ctx.$slots, "append")
          ], 2)) : vue.createCommentVNode("v-if", true)
        ], 64)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
          vue.createCommentVNode(" textarea "),
          vue.createElementVNode("textarea", vue.mergeProps({
            id: vue.unref(inputId),
            ref_key: "textarea",
            ref: textarea,
            class: vue.unref(nsTextarea).e("inner")
          }, vue.unref(attrs), {
            tabindex: _ctx.tabindex,
            disabled: vue.unref(inputDisabled),
            readonly: _ctx.readonly,
            autocomplete: _ctx.autocomplete,
            style: vue.unref(textareaStyle),
            "aria-label": _ctx.label,
            placeholder: _ctx.placeholder,
            form: props.form,
            autofocus: props.autofocus,
            onCompositionstart: handleCompositionStart,
            onCompositionupdate: handleCompositionUpdate,
            onCompositionend: handleCompositionEnd,
            onInput: handleInput,
            onFocus: _cache[2] || (_cache[2] = (...args) => vue.unref(handleFocus) && vue.unref(handleFocus)(...args)),
            onBlur: _cache[3] || (_cache[3] = (...args) => vue.unref(handleBlur) && vue.unref(handleBlur)(...args)),
            onChange: handleChange,
            onKeydown: handleKeydown
          }), null, 16, _hoisted_3),
          vue.unref(isWordLimitVisible) ? (vue.openBlock(), vue.createElementBlock("span", {
            key: 0,
            style: vue.normalizeStyle(countStyle.value),
            class: vue.normalizeClass(vue.unref(nsInput).e("count"))
          }, vue.toDisplayString(vue.unref(textLength)) + " / " + vue.toDisplayString(vue.unref(attrs).maxlength), 7)) : vue.createCommentVNode("v-if", true)
        ], 64))
      ], 16, _hoisted_1)), [
        [vue.vShow, _ctx.type !== "hidden"]
      ]);
    };
  }
});
var Input = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/input/src/input.vue"]]);

exports["default"] = Input;
//# sourceMappingURL=input2.js.map
