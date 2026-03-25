'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var index$5 = require('../../button/index.js');
var index$7 = require('../../icon/index.js');
require('../../../directives/index.js');
var index$3 = require('../../tooltip/index.js');
var index$4 = require('../../input/index.js');
require('../../form/index.js');
require('../../../hooks/index.js');
require('../../../constants/index.js');
require('../../../utils/index.js');
var iconsVue = require('@element-plus/icons-vue');
var alphaSlider = require('./components/alpha-slider.js');
var hueSlider = require('./components/hue-slider.js');
var predefine = require('./components/predefine.js');
var svPanel = require('./components/sv-panel.js');
var color = require('./utils/color.js');
var colorPicker = require('./color-picker.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var useFormItem = require('../../form/src/hooks/use-form-item.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index$2 = require('../../../hooks/use-focus-controller/index.js');
var event = require('../../../constants/event.js');
var error = require('../../../utils/error.js');
var aria = require('../../../constants/aria.js');
var index$6 = require('../../../directives/click-outside/index.js');

const _hoisted_1 = ["onKeydown"];
const _hoisted_2 = ["id", "aria-label", "aria-labelledby", "aria-description", "aria-disabled", "tabindex"];
const __default__ = vue.defineComponent({
  name: "ElColorPicker"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: colorPicker.colorPickerProps,
  emits: colorPicker.colorPickerEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("color");
    const { formItem } = useFormItem.useFormItem();
    const colorSize = useFormCommonProps.useFormSize();
    const colorDisabled = useFormCommonProps.useFormDisabled();
    const { inputId: buttonId, isLabeledByFormItem } = useFormItem.useFormItemInputId(props, {
      formItemContext: formItem
    });
    const hue = vue.ref();
    const sv = vue.ref();
    const alpha = vue.ref();
    const popper = vue.ref();
    const triggerRef = vue.ref();
    const inputRef = vue.ref();
    const {
      isFocused,
      handleFocus: _handleFocus,
      handleBlur
    } = index$2.useFocusController(triggerRef, {
      beforeBlur(event) {
        var _a;
        return (_a = popper.value) == null ? void 0 : _a.isFocusInsideContent(event);
      },
      afterBlur() {
        setShowPicker(false);
        resetColor();
      }
    });
    const handleFocus = (event) => {
      if (colorDisabled.value)
        return blur();
      _handleFocus(event);
    };
    let shouldActiveChange = true;
    const color$1 = vue.reactive(new color["default"]({
      enableAlpha: props.showAlpha,
      format: props.colorFormat || "",
      value: props.modelValue
    }));
    const showPicker = vue.ref(false);
    const showPanelColor = vue.ref(false);
    const customInput = vue.ref("");
    const displayedColor = vue.computed(() => {
      if (!props.modelValue && !showPanelColor.value) {
        return "transparent";
      }
      return displayedRgb(color$1, props.showAlpha);
    });
    const currentColor = vue.computed(() => {
      return !props.modelValue && !showPanelColor.value ? "" : color$1.value;
    });
    const buttonAriaLabel = vue.computed(() => {
      return !isLabeledByFormItem.value ? props.label || t("el.colorpicker.defaultLabel") : void 0;
    });
    const buttonAriaLabelledby = vue.computed(() => {
      return isLabeledByFormItem.value ? formItem == null ? void 0 : formItem.labelId : void 0;
    });
    const btnKls = vue.computed(() => {
      return [
        ns.b("picker"),
        ns.is("disabled", colorDisabled.value),
        ns.bm("picker", colorSize.value),
        ns.is("focused", isFocused.value)
      ];
    });
    function displayedRgb(color2, showAlpha) {
      if (!(color2 instanceof color["default"])) {
        throw new TypeError("color should be instance of _color Class");
      }
      const { r, g, b } = color2.toRgb();
      return showAlpha ? `rgba(${r}, ${g}, ${b}, ${color2.get("alpha") / 100})` : `rgb(${r}, ${g}, ${b})`;
    }
    function setShowPicker(value) {
      showPicker.value = value;
    }
    const debounceSetShowPicker = lodashUnified.debounce(setShowPicker, 100, { leading: true });
    function show() {
      if (colorDisabled.value)
        return;
      setShowPicker(true);
    }
    function hide() {
      debounceSetShowPicker(false);
      resetColor();
    }
    function resetColor() {
      vue.nextTick(() => {
        if (props.modelValue) {
          color$1.fromString(props.modelValue);
        } else {
          color$1.value = "";
          vue.nextTick(() => {
            showPanelColor.value = false;
          });
        }
      });
    }
    function handleTrigger() {
      if (colorDisabled.value)
        return;
      debounceSetShowPicker(!showPicker.value);
    }
    function handleConfirm() {
      color$1.fromString(customInput.value);
    }
    function confirmValue() {
      const value = color$1.value;
      emit(event.UPDATE_MODEL_EVENT, value);
      emit("change", value);
      if (props.validateEvent) {
        formItem == null ? void 0 : formItem.validate("change").catch((err) => error.debugWarn(err));
      }
      debounceSetShowPicker(false);
      vue.nextTick(() => {
        const newColor = new color["default"]({
          enableAlpha: props.showAlpha,
          format: props.colorFormat || "",
          value: props.modelValue
        });
        if (!color$1.compare(newColor)) {
          resetColor();
        }
      });
    }
    function clear() {
      debounceSetShowPicker(false);
      emit(event.UPDATE_MODEL_EVENT, null);
      emit("change", null);
      if (props.modelValue !== null && props.validateEvent) {
        formItem == null ? void 0 : formItem.validate("change").catch((err) => error.debugWarn(err));
      }
      resetColor();
    }
    function handleClickOutside(event) {
      if (!showPicker.value)
        return;
      hide();
      if (isFocused.value) {
        const _event = new FocusEvent("focus", event);
        handleBlur(_event);
      }
    }
    function handleEsc(event) {
      event.preventDefault();
      event.stopPropagation();
      setShowPicker(false);
      resetColor();
    }
    function handleKeyDown(event) {
      switch (event.code) {
        case aria.EVENT_CODE.enter:
        case aria.EVENT_CODE.space:
          event.preventDefault();
          event.stopPropagation();
          show();
          inputRef.value.focus();
          break;
        case aria.EVENT_CODE.esc:
          handleEsc(event);
          break;
      }
    }
    function focus() {
      triggerRef.value.focus();
    }
    function blur() {
      triggerRef.value.blur();
    }
    vue.onMounted(() => {
      if (props.modelValue) {
        customInput.value = currentColor.value;
      }
    });
    vue.watch(() => props.modelValue, (newVal) => {
      if (!newVal) {
        showPanelColor.value = false;
      } else if (newVal && newVal !== color$1.value) {
        shouldActiveChange = false;
        color$1.fromString(newVal);
      }
    });
    vue.watch(() => currentColor.value, (val) => {
      customInput.value = val;
      shouldActiveChange && emit("activeChange", val);
      shouldActiveChange = true;
    });
    vue.watch(() => color$1.value, () => {
      if (!props.modelValue && !showPanelColor.value) {
        showPanelColor.value = true;
      }
    });
    vue.watch(() => showPicker.value, () => {
      vue.nextTick(() => {
        var _a, _b, _c;
        (_a = hue.value) == null ? void 0 : _a.update();
        (_b = sv.value) == null ? void 0 : _b.update();
        (_c = alpha.value) == null ? void 0 : _c.update();
      });
    });
    vue.provide(colorPicker.colorPickerContextKey, {
      currentColor
    });
    expose({
      color: color$1,
      show,
      hide,
      focus,
      blur
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index$3.ElTooltip), {
        ref_key: "popper",
        ref: popper,
        visible: showPicker.value,
        "show-arrow": false,
        "fallback-placements": ["bottom", "top", "right", "left"],
        offset: 0,
        "gpu-acceleration": false,
        "popper-class": [vue.unref(ns).be("picker", "panel"), vue.unref(ns).b("dropdown"), _ctx.popperClass],
        "stop-popper-mouse-event": false,
        effect: "light",
        trigger: "click",
        transition: `${vue.unref(ns).namespace.value}-zoom-in-top`,
        persistent: "",
        onHide: _cache[2] || (_cache[2] = ($event) => setShowPicker(false))
      }, {
        content: vue.withCtx(() => [
          vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
            onKeydown: vue.withKeys(handleEsc, ["esc"])
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).be("dropdown", "main-wrapper"))
            }, [
              vue.createVNode(hueSlider["default"], {
                ref_key: "hue",
                ref: hue,
                class: "hue-slider",
                color: vue.unref(color$1),
                vertical: ""
              }, null, 8, ["color"]),
              vue.createVNode(svPanel["default"], {
                ref_key: "sv",
                ref: sv,
                color: vue.unref(color$1)
              }, null, 8, ["color"])
            ], 2),
            _ctx.showAlpha ? (vue.openBlock(), vue.createBlock(alphaSlider["default"], {
              key: 0,
              ref_key: "alpha",
              ref: alpha,
              color: vue.unref(color$1)
            }, null, 8, ["color"])) : vue.createCommentVNode("v-if", true),
            _ctx.predefine ? (vue.openBlock(), vue.createBlock(predefine["default"], {
              key: 1,
              ref: "predefine",
              color: vue.unref(color$1),
              colors: _ctx.predefine
            }, null, 8, ["color", "colors"])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).be("dropdown", "btns"))
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass(vue.unref(ns).be("dropdown", "value"))
              }, [
                vue.createVNode(vue.unref(index$4.ElInput), {
                  ref_key: "inputRef",
                  ref: inputRef,
                  modelValue: customInput.value,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => customInput.value = $event),
                  "validate-event": false,
                  size: "small",
                  onKeyup: vue.withKeys(handleConfirm, ["enter"]),
                  onBlur: handleConfirm
                }, null, 8, ["modelValue", "onKeyup"])
              ], 2),
              vue.createVNode(vue.unref(index$5.ElButton), {
                class: vue.normalizeClass(vue.unref(ns).be("dropdown", "link-btn")),
                text: "",
                size: "small",
                onClick: clear
              }, {
                default: vue.withCtx(() => [
                  vue.createTextVNode(vue.toDisplayString(vue.unref(t)("el.colorpicker.clear")), 1)
                ]),
                _: 1
              }, 8, ["class"]),
              vue.createVNode(vue.unref(index$5.ElButton), {
                plain: "",
                size: "small",
                class: vue.normalizeClass(vue.unref(ns).be("dropdown", "btn")),
                onClick: confirmValue
              }, {
                default: vue.withCtx(() => [
                  vue.createTextVNode(vue.toDisplayString(vue.unref(t)("el.colorpicker.confirm")), 1)
                ]),
                _: 1
              }, 8, ["class"])
            ], 2)
          ], 40, _hoisted_1)), [
            [vue.unref(index$6["default"]), handleClickOutside]
          ])
        ]),
        default: vue.withCtx(() => [
          vue.createElementVNode("div", {
            id: vue.unref(buttonId),
            ref_key: "triggerRef",
            ref: triggerRef,
            class: vue.normalizeClass(vue.unref(btnKls)),
            role: "button",
            "aria-label": vue.unref(buttonAriaLabel),
            "aria-labelledby": vue.unref(buttonAriaLabelledby),
            "aria-description": vue.unref(t)("el.colorpicker.description", { color: _ctx.modelValue || "" }),
            "aria-disabled": vue.unref(colorDisabled),
            tabindex: vue.unref(colorDisabled) ? -1 : _ctx.tabindex,
            onKeydown: handleKeyDown,
            onFocus: handleFocus,
            onBlur: _cache[1] || (_cache[1] = (...args) => vue.unref(handleBlur) && vue.unref(handleBlur)(...args))
          }, [
            vue.unref(colorDisabled) ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 0,
              class: vue.normalizeClass(vue.unref(ns).be("picker", "mask"))
            }, null, 2)) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).be("picker", "trigger")),
              onClick: handleTrigger
            }, [
              vue.createElementVNode("span", {
                class: vue.normalizeClass([vue.unref(ns).be("picker", "color"), vue.unref(ns).is("alpha", _ctx.showAlpha)])
              }, [
                vue.createElementVNode("span", {
                  class: vue.normalizeClass(vue.unref(ns).be("picker", "color-inner")),
                  style: vue.normalizeStyle({
                    backgroundColor: vue.unref(displayedColor)
                  })
                }, [
                  vue.withDirectives(vue.createVNode(vue.unref(index$7.ElIcon), {
                    class: vue.normalizeClass([vue.unref(ns).be("picker", "icon"), vue.unref(ns).is("icon-arrow-down")])
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ArrowDown))
                    ]),
                    _: 1
                  }, 8, ["class"]), [
                    [vue.vShow, _ctx.modelValue || showPanelColor.value]
                  ]),
                  vue.withDirectives(vue.createVNode(vue.unref(index$7.ElIcon), {
                    class: vue.normalizeClass([vue.unref(ns).be("picker", "empty"), vue.unref(ns).is("icon-close")])
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.Close))
                    ]),
                    _: 1
                  }, 8, ["class"]), [
                    [vue.vShow, !_ctx.modelValue && !showPanelColor.value]
                  ])
                ], 6)
              ], 2)
            ], 2)
          ], 42, _hoisted_2)
        ]),
        _: 1
      }, 8, ["visible", "popper-class", "transition"]);
    };
  }
});
var ColorPicker = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/color-picker/src/color-picker.vue"]]);

exports["default"] = ColorPicker;
//# sourceMappingURL=color-picker2.js.map
