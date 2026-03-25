import { defineComponent, useAttrs, inject, ref, computed, watch, nextTick, unref, provide, openBlock, createBlock, mergeProps, withCtx, normalizeClass, normalizeStyle, withModifiers, resolveDynamicComponent, createCommentVNode, createElementBlock, createElementVNode, renderSlot, toDisplayString } from 'vue';
import { isEqual } from 'lodash-unified';
import { onClickOutside } from '@vueuse/core';
import '../../../../hooks/index.mjs';
import '../../../form/index.mjs';
import { ElInput } from '../../../input/index.mjs';
import { ElIcon } from '../../../icon/index.mjs';
import { ElTooltip } from '../../../tooltip/index.mjs';
import '../../../../utils/index.mjs';
import '../../../../constants/index.mjs';
import { Clock, Calendar } from '@element-plus/icons-vue';
import { valueEquals, formatter, parseDate } from '../utils.mjs';
import { timePickerDefaultProps } from './props.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { useFormItem } from '../../../form/src/hooks/use-form-item.mjs';
import { debugWarn } from '../../../../utils/error.mjs';
import { isArray } from '@vue/shared';
import { EVENT_CODE } from '../../../../constants/aria.mjs';
import { useFormSize } from '../../../form/src/hooks/use-form-common-props.mjs';

const _hoisted_1 = ["id", "name", "placeholder", "value", "disabled", "readonly"];
const _hoisted_2 = ["id", "name", "placeholder", "value", "disabled", "readonly"];
const __default__ = defineComponent({
  name: "Picker"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: timePickerDefaultProps,
  emits: [
    "update:modelValue",
    "change",
    "focus",
    "blur",
    "calendar-change",
    "panel-change",
    "visible-change",
    "keydown"
  ],
  setup(__props, { expose, emit }) {
    const props = __props;
    const attrs = useAttrs();
    const { lang } = useLocale();
    const nsDate = useNamespace("date");
    const nsInput = useNamespace("input");
    const nsRange = useNamespace("range");
    const { form, formItem } = useFormItem();
    const elPopperOptions = inject("ElPopperOptions", {});
    const refPopper = ref();
    const inputRef = ref();
    const pickerVisible = ref(false);
    const pickerActualVisible = ref(false);
    const valueOnOpen = ref(null);
    let hasJustTabExitedInput = false;
    let ignoreFocusEvent = false;
    const rangeInputKls = computed(() => [
      nsDate.b("editor"),
      nsDate.bm("editor", props.type),
      nsInput.e("wrapper"),
      nsDate.is("disabled", pickerDisabled.value),
      nsDate.is("active", pickerVisible.value),
      nsRange.b("editor"),
      pickerSize ? nsRange.bm("editor", pickerSize.value) : "",
      attrs.class
    ]);
    const clearIconKls = computed(() => [
      nsInput.e("icon"),
      nsRange.e("close-icon"),
      !showClose.value ? nsRange.e("close-icon--hidden") : ""
    ]);
    watch(pickerVisible, (val) => {
      if (!val) {
        userInput.value = null;
        nextTick(() => {
          emitChange(props.modelValue);
        });
      } else {
        nextTick(() => {
          if (val) {
            valueOnOpen.value = props.modelValue;
          }
        });
      }
    });
    const emitChange = (val, isClear) => {
      if (isClear || !valueEquals(val, valueOnOpen.value)) {
        emit("change", val);
        props.validateEvent && (formItem == null ? void 0 : formItem.validate("change").catch((err) => debugWarn(err)));
      }
    };
    const emitInput = (input) => {
      if (!valueEquals(props.modelValue, input)) {
        let formatted;
        if (isArray(input)) {
          formatted = input.map((item) => formatter(item, props.valueFormat, lang.value));
        } else if (input) {
          formatted = formatter(input, props.valueFormat, lang.value);
        }
        emit("update:modelValue", input ? formatted : input, lang.value);
      }
    };
    const emitKeydown = (e) => {
      emit("keydown", e);
    };
    const refInput = computed(() => {
      if (inputRef.value) {
        const _r = isRangeInput.value ? inputRef.value : inputRef.value.$el;
        return Array.from(_r.querySelectorAll("input"));
      }
      return [];
    });
    const setSelectionRange = (start, end, pos) => {
      const _inputs = refInput.value;
      if (!_inputs.length)
        return;
      if (!pos || pos === "min") {
        _inputs[0].setSelectionRange(start, end);
        _inputs[0].focus();
      } else if (pos === "max") {
        _inputs[1].setSelectionRange(start, end);
        _inputs[1].focus();
      }
    };
    const focusOnInputBox = () => {
      focus(true, true);
      nextTick(() => {
        ignoreFocusEvent = false;
      });
    };
    const onPick = (date = "", visible = false) => {
      if (!visible) {
        ignoreFocusEvent = true;
      }
      pickerVisible.value = visible;
      let result;
      if (isArray(date)) {
        result = date.map((_) => _.toDate());
      } else {
        result = date ? date.toDate() : date;
      }
      userInput.value = null;
      emitInput(result);
    };
    const onBeforeShow = () => {
      pickerActualVisible.value = true;
    };
    const onShow = () => {
      emit("visible-change", true);
    };
    const onKeydownPopperContent = (event) => {
      if ((event == null ? void 0 : event.key) === EVENT_CODE.esc) {
        focus(true, true);
      }
    };
    const onHide = () => {
      pickerActualVisible.value = false;
      pickerVisible.value = false;
      ignoreFocusEvent = false;
      emit("visible-change", false);
    };
    const handleOpen = () => {
      pickerVisible.value = true;
    };
    const handleClose = () => {
      pickerVisible.value = false;
    };
    const focus = (focusStartInput = true, isIgnoreFocusEvent = false) => {
      ignoreFocusEvent = isIgnoreFocusEvent;
      const [leftInput, rightInput] = unref(refInput);
      let input = leftInput;
      if (!focusStartInput && isRangeInput.value) {
        input = rightInput;
      }
      if (input) {
        input.focus();
      }
    };
    const handleFocusInput = (e) => {
      if (props.readonly || pickerDisabled.value || pickerVisible.value || ignoreFocusEvent) {
        return;
      }
      pickerVisible.value = true;
      emit("focus", e);
    };
    let currentHandleBlurDeferCallback = void 0;
    const handleBlurInput = (e) => {
      const handleBlurDefer = async () => {
        setTimeout(() => {
          var _a;
          if (currentHandleBlurDeferCallback === handleBlurDefer) {
            if (!(((_a = refPopper.value) == null ? void 0 : _a.isFocusInsideContent()) && !hasJustTabExitedInput) && refInput.value.filter((input) => {
              return input.contains(document.activeElement);
            }).length === 0) {
              handleChange();
              pickerVisible.value = false;
              emit("blur", e);
              props.validateEvent && (formItem == null ? void 0 : formItem.validate("blur").catch((err) => debugWarn(err)));
            }
            hasJustTabExitedInput = false;
          }
        }, 0);
      };
      currentHandleBlurDeferCallback = handleBlurDefer;
      handleBlurDefer();
    };
    const pickerDisabled = computed(() => {
      return props.disabled || (form == null ? void 0 : form.disabled);
    });
    const parsedValue = computed(() => {
      let dayOrDays;
      if (valueIsEmpty.value) {
        if (pickerOptions.value.getDefaultValue) {
          dayOrDays = pickerOptions.value.getDefaultValue();
        }
      } else {
        if (isArray(props.modelValue)) {
          dayOrDays = props.modelValue.map((d) => parseDate(d, props.valueFormat, lang.value));
        } else {
          dayOrDays = parseDate(props.modelValue, props.valueFormat, lang.value);
        }
      }
      if (pickerOptions.value.getRangeAvailableTime) {
        const availableResult = pickerOptions.value.getRangeAvailableTime(dayOrDays);
        if (!isEqual(availableResult, dayOrDays)) {
          dayOrDays = availableResult;
          emitInput(isArray(dayOrDays) ? dayOrDays.map((_) => _.toDate()) : dayOrDays.toDate());
        }
      }
      if (isArray(dayOrDays) && dayOrDays.some((day) => !day)) {
        dayOrDays = [];
      }
      return dayOrDays;
    });
    const displayValue = computed(() => {
      if (!pickerOptions.value.panelReady)
        return "";
      const formattedValue = formatDayjsToString(parsedValue.value);
      if (isArray(userInput.value)) {
        return [
          userInput.value[0] || formattedValue && formattedValue[0] || "",
          userInput.value[1] || formattedValue && formattedValue[1] || ""
        ];
      } else if (userInput.value !== null) {
        return userInput.value;
      }
      if (!isTimePicker.value && valueIsEmpty.value)
        return "";
      if (!pickerVisible.value && valueIsEmpty.value)
        return "";
      if (formattedValue) {
        return isDatesPicker.value ? formattedValue.join(", ") : formattedValue;
      }
      return "";
    });
    const isTimeLikePicker = computed(() => props.type.includes("time"));
    const isTimePicker = computed(() => props.type.startsWith("time"));
    const isDatesPicker = computed(() => props.type === "dates");
    const triggerIcon = computed(() => props.prefixIcon || (isTimeLikePicker.value ? Clock : Calendar));
    const showClose = ref(false);
    const onClearIconClick = (event) => {
      if (props.readonly || pickerDisabled.value)
        return;
      if (showClose.value) {
        event.stopPropagation();
        focusOnInputBox();
        emitInput(null);
        emitChange(null, true);
        showClose.value = false;
        pickerVisible.value = false;
        pickerOptions.value.handleClear && pickerOptions.value.handleClear();
      }
    };
    const valueIsEmpty = computed(() => {
      const { modelValue } = props;
      return !modelValue || isArray(modelValue) && !modelValue.filter(Boolean).length;
    });
    const onMouseDownInput = async (event) => {
      var _a;
      if (props.readonly || pickerDisabled.value)
        return;
      if (((_a = event.target) == null ? void 0 : _a.tagName) !== "INPUT" || refInput.value.includes(document.activeElement)) {
        pickerVisible.value = true;
      }
    };
    const onMouseEnter = () => {
      if (props.readonly || pickerDisabled.value)
        return;
      if (!valueIsEmpty.value && props.clearable) {
        showClose.value = true;
      }
    };
    const onMouseLeave = () => {
      showClose.value = false;
    };
    const onTouchStartInput = (event) => {
      var _a;
      if (props.readonly || pickerDisabled.value)
        return;
      if (((_a = event.touches[0].target) == null ? void 0 : _a.tagName) !== "INPUT" || refInput.value.includes(document.activeElement)) {
        pickerVisible.value = true;
      }
    };
    const isRangeInput = computed(() => {
      return props.type.includes("range");
    });
    const pickerSize = useFormSize();
    const popperEl = computed(() => {
      var _a, _b;
      return (_b = (_a = unref(refPopper)) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef;
    });
    const actualInputRef = computed(() => {
      var _a;
      if (unref(isRangeInput)) {
        return unref(inputRef);
      }
      return (_a = unref(inputRef)) == null ? void 0 : _a.$el;
    });
    onClickOutside(actualInputRef, (e) => {
      const unrefedPopperEl = unref(popperEl);
      const inputEl = unref(actualInputRef);
      if (unrefedPopperEl && (e.target === unrefedPopperEl || e.composedPath().includes(unrefedPopperEl)) || e.target === inputEl || e.composedPath().includes(inputEl))
        return;
      pickerVisible.value = false;
    });
    const userInput = ref(null);
    const handleChange = () => {
      if (userInput.value) {
        const value = parseUserInputToDayjs(displayValue.value);
        if (value) {
          if (isValidValue(value)) {
            emitInput(isArray(value) ? value.map((_) => _.toDate()) : value.toDate());
            userInput.value = null;
          }
        }
      }
      if (userInput.value === "") {
        emitInput(null);
        emitChange(null);
        userInput.value = null;
      }
    };
    const parseUserInputToDayjs = (value) => {
      if (!value)
        return null;
      return pickerOptions.value.parseUserInput(value);
    };
    const formatDayjsToString = (value) => {
      if (!value)
        return null;
      return pickerOptions.value.formatToString(value);
    };
    const isValidValue = (value) => {
      return pickerOptions.value.isValidValue(value);
    };
    const handleKeydownInput = async (event) => {
      if (props.readonly || pickerDisabled.value)
        return;
      const { code } = event;
      emitKeydown(event);
      if (code === EVENT_CODE.esc) {
        if (pickerVisible.value === true) {
          pickerVisible.value = false;
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (code === EVENT_CODE.down) {
        if (pickerOptions.value.handleFocusPicker) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (pickerVisible.value === false) {
          pickerVisible.value = true;
          await nextTick();
        }
        if (pickerOptions.value.handleFocusPicker) {
          pickerOptions.value.handleFocusPicker();
          return;
        }
      }
      if (code === EVENT_CODE.tab) {
        hasJustTabExitedInput = true;
        return;
      }
      if (code === EVENT_CODE.enter || code === EVENT_CODE.numpadEnter) {
        if (userInput.value === null || userInput.value === "" || isValidValue(parseUserInputToDayjs(displayValue.value))) {
          handleChange();
          pickerVisible.value = false;
        }
        event.stopPropagation();
        return;
      }
      if (userInput.value) {
        event.stopPropagation();
        return;
      }
      if (pickerOptions.value.handleKeydownInput) {
        pickerOptions.value.handleKeydownInput(event);
      }
    };
    const onUserInput = (e) => {
      userInput.value = e;
      if (!pickerVisible.value) {
        pickerVisible.value = true;
      }
    };
    const handleStartInput = (event) => {
      const target = event.target;
      if (userInput.value) {
        userInput.value = [target.value, userInput.value[1]];
      } else {
        userInput.value = [target.value, null];
      }
    };
    const handleEndInput = (event) => {
      const target = event.target;
      if (userInput.value) {
        userInput.value = [userInput.value[0], target.value];
      } else {
        userInput.value = [null, target.value];
      }
    };
    const handleStartChange = () => {
      var _a;
      const values = userInput.value;
      const value = parseUserInputToDayjs(values && values[0]);
      const parsedVal = unref(parsedValue);
      if (value && value.isValid()) {
        userInput.value = [
          formatDayjsToString(value),
          ((_a = displayValue.value) == null ? void 0 : _a[1]) || null
        ];
        const newValue = [value, parsedVal && (parsedVal[1] || null)];
        if (isValidValue(newValue)) {
          emitInput(newValue);
          userInput.value = null;
        }
      }
    };
    const handleEndChange = () => {
      var _a;
      const values = unref(userInput);
      const value = parseUserInputToDayjs(values && values[1]);
      const parsedVal = unref(parsedValue);
      if (value && value.isValid()) {
        userInput.value = [
          ((_a = unref(displayValue)) == null ? void 0 : _a[0]) || null,
          formatDayjsToString(value)
        ];
        const newValue = [parsedVal && parsedVal[0], value];
        if (isValidValue(newValue)) {
          emitInput(newValue);
          userInput.value = null;
        }
      }
    };
    const pickerOptions = ref({});
    const onSetPickerOption = (e) => {
      pickerOptions.value[e[0]] = e[1];
      pickerOptions.value.panelReady = true;
    };
    const onCalendarChange = (e) => {
      emit("calendar-change", e);
    };
    const onPanelChange = (value, mode, view) => {
      emit("panel-change", value, mode, view);
    };
    provide("EP_PICKER_BASE", {
      props
    });
    expose({
      focus,
      handleFocusInput,
      handleBlurInput,
      handleOpen,
      handleClose,
      onPick
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(ElTooltip), mergeProps({
        ref_key: "refPopper",
        ref: refPopper,
        visible: pickerVisible.value,
        effect: "light",
        pure: "",
        trigger: "click"
      }, _ctx.$attrs, {
        role: "dialog",
        teleported: "",
        transition: `${unref(nsDate).namespace.value}-zoom-in-top`,
        "popper-class": [`${unref(nsDate).namespace.value}-picker__popper`, _ctx.popperClass],
        "popper-options": unref(elPopperOptions),
        "fallback-placements": ["bottom", "top", "right", "left"],
        "gpu-acceleration": false,
        "stop-popper-mouse-event": false,
        "hide-after": 0,
        persistent: "",
        onBeforeShow,
        onShow,
        onHide
      }), {
        default: withCtx(() => [
          !unref(isRangeInput) ? (openBlock(), createBlock(unref(ElInput), {
            key: 0,
            id: _ctx.id,
            ref_key: "inputRef",
            ref: inputRef,
            "container-role": "combobox",
            "model-value": unref(displayValue),
            name: _ctx.name,
            size: unref(pickerSize),
            disabled: unref(pickerDisabled),
            placeholder: _ctx.placeholder,
            class: normalizeClass([unref(nsDate).b("editor"), unref(nsDate).bm("editor", _ctx.type), _ctx.$attrs.class]),
            style: normalizeStyle(_ctx.$attrs.style),
            readonly: !_ctx.editable || _ctx.readonly || unref(isDatesPicker) || _ctx.type === "week",
            label: _ctx.label,
            tabindex: _ctx.tabindex,
            "validate-event": false,
            onInput: onUserInput,
            onFocus: handleFocusInput,
            onBlur: handleBlurInput,
            onKeydown: handleKeydownInput,
            onChange: handleChange,
            onMousedown: onMouseDownInput,
            onMouseenter: onMouseEnter,
            onMouseleave: onMouseLeave,
            onTouchstart: onTouchStartInput,
            onClick: _cache[0] || (_cache[0] = withModifiers(() => {
            }, ["stop"]))
          }, {
            prefix: withCtx(() => [
              unref(triggerIcon) ? (openBlock(), createBlock(unref(ElIcon), {
                key: 0,
                class: normalizeClass(unref(nsInput).e("icon")),
                onMousedown: withModifiers(onMouseDownInput, ["prevent"]),
                onTouchstart: onTouchStartInput
              }, {
                default: withCtx(() => [
                  (openBlock(), createBlock(resolveDynamicComponent(unref(triggerIcon))))
                ]),
                _: 1
              }, 8, ["class", "onMousedown"])) : createCommentVNode("v-if", true)
            ]),
            suffix: withCtx(() => [
              showClose.value && _ctx.clearIcon ? (openBlock(), createBlock(unref(ElIcon), {
                key: 0,
                class: normalizeClass(`${unref(nsInput).e("icon")} clear-icon`),
                onClick: withModifiers(onClearIconClick, ["stop"])
              }, {
                default: withCtx(() => [
                  (openBlock(), createBlock(resolveDynamicComponent(_ctx.clearIcon)))
                ]),
                _: 1
              }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true)
            ]),
            _: 1
          }, 8, ["id", "model-value", "name", "size", "disabled", "placeholder", "class", "style", "readonly", "label", "tabindex", "onKeydown"])) : (openBlock(), createElementBlock("div", {
            key: 1,
            ref_key: "inputRef",
            ref: inputRef,
            class: normalizeClass(unref(rangeInputKls)),
            style: normalizeStyle(_ctx.$attrs.style),
            onClick: handleFocusInput,
            onMouseenter: onMouseEnter,
            onMouseleave: onMouseLeave,
            onTouchstart: onTouchStartInput,
            onKeydown: handleKeydownInput
          }, [
            unref(triggerIcon) ? (openBlock(), createBlock(unref(ElIcon), {
              key: 0,
              class: normalizeClass([unref(nsInput).e("icon"), unref(nsRange).e("icon")]),
              onMousedown: withModifiers(onMouseDownInput, ["prevent"]),
              onTouchstart: onTouchStartInput
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(unref(triggerIcon))))
              ]),
              _: 1
            }, 8, ["class", "onMousedown"])) : createCommentVNode("v-if", true),
            createElementVNode("input", {
              id: _ctx.id && _ctx.id[0],
              autocomplete: "off",
              name: _ctx.name && _ctx.name[0],
              placeholder: _ctx.startPlaceholder,
              value: unref(displayValue) && unref(displayValue)[0],
              disabled: unref(pickerDisabled),
              readonly: !_ctx.editable || _ctx.readonly,
              class: normalizeClass(unref(nsRange).b("input")),
              onMousedown: onMouseDownInput,
              onInput: handleStartInput,
              onChange: handleStartChange,
              onFocus: handleFocusInput,
              onBlur: handleBlurInput
            }, null, 42, _hoisted_1),
            renderSlot(_ctx.$slots, "range-separator", {}, () => [
              createElementVNode("span", {
                class: normalizeClass(unref(nsRange).b("separator"))
              }, toDisplayString(_ctx.rangeSeparator), 3)
            ]),
            createElementVNode("input", {
              id: _ctx.id && _ctx.id[1],
              autocomplete: "off",
              name: _ctx.name && _ctx.name[1],
              placeholder: _ctx.endPlaceholder,
              value: unref(displayValue) && unref(displayValue)[1],
              disabled: unref(pickerDisabled),
              readonly: !_ctx.editable || _ctx.readonly,
              class: normalizeClass(unref(nsRange).b("input")),
              onMousedown: onMouseDownInput,
              onFocus: handleFocusInput,
              onBlur: handleBlurInput,
              onInput: handleEndInput,
              onChange: handleEndChange
            }, null, 42, _hoisted_2),
            _ctx.clearIcon ? (openBlock(), createBlock(unref(ElIcon), {
              key: 1,
              class: normalizeClass(unref(clearIconKls)),
              onClick: onClearIconClick
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.clearIcon)))
              ]),
              _: 1
            }, 8, ["class"])) : createCommentVNode("v-if", true)
          ], 38))
        ]),
        content: withCtx(() => [
          renderSlot(_ctx.$slots, "default", {
            visible: pickerVisible.value,
            actualVisible: pickerActualVisible.value,
            parsedValue: unref(parsedValue),
            format: _ctx.format,
            dateFormat: _ctx.dateFormat,
            timeFormat: _ctx.timeFormat,
            unlinkPanels: _ctx.unlinkPanels,
            type: _ctx.type,
            defaultValue: _ctx.defaultValue,
            onPick,
            onSelectRange: setSelectionRange,
            onSetPickerOption,
            onCalendarChange,
            onPanelChange,
            onKeydown: onKeydownPopperContent,
            onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {
            }, ["stop"]))
          })
        ]),
        _: 3
      }, 16, ["visible", "transition", "popper-class", "popper-options"]);
    };
  }
});
var CommonPicker = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/time-picker/src/common/picker.vue"]]);

export { CommonPicker as default };
//# sourceMappingURL=picker.mjs.map
