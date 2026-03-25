'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var core = require('@vueuse/core');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../../constants/index.js');
var index$5 = require('../../input/index.js');
var index$3 = require('../../scrollbar/index.js');
var index$2 = require('../../tooltip/index.js');
var index$4 = require('../../icon/index.js');
require('../../form/index.js');
var autocomplete = require('./autocomplete.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-attrs/index.js');
var useFormCommonProps = require('../../form/src/hooks/use-form-common-props.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var rand = require('../../../utils/rand.js');
var shared = require('@vue/shared');
var error = require('../../../utils/error.js');
var event = require('../../../constants/event.js');

const _hoisted_1 = ["aria-expanded", "aria-owns"];
const _hoisted_2 = { key: 0 };
const _hoisted_3 = ["id", "aria-selected", "onClick"];
const COMPONENT_NAME = "ElAutocomplete";
const __default__ = vue.defineComponent({
  name: COMPONENT_NAME,
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: autocomplete.autocompleteProps,
  emits: autocomplete.autocompleteEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const attrs = index.useAttrs();
    const rawAttrs = vue.useAttrs();
    const disabled = useFormCommonProps.useFormDisabled();
    const ns = index$1.useNamespace("autocomplete");
    const inputRef = vue.ref();
    const regionRef = vue.ref();
    const popperRef = vue.ref();
    const listboxRef = vue.ref();
    let readonly = false;
    let ignoreFocusEvent = false;
    const suggestions = vue.ref([]);
    const highlightedIndex = vue.ref(-1);
    const dropdownWidth = vue.ref("");
    const activated = vue.ref(false);
    const suggestionDisabled = vue.ref(false);
    const loading = vue.ref(false);
    const listboxId = vue.computed(() => ns.b(String(rand.generateId())));
    const styles = vue.computed(() => rawAttrs.style);
    const suggestionVisible = vue.computed(() => {
      const isValidData = suggestions.value.length > 0;
      return (isValidData || loading.value) && activated.value;
    });
    const suggestionLoading = vue.computed(() => !props.hideLoading && loading.value);
    const refInput = vue.computed(() => {
      if (inputRef.value) {
        return Array.from(inputRef.value.$el.querySelectorAll("input"));
      }
      return [];
    });
    const onSuggestionShow = () => {
      if (suggestionVisible.value) {
        dropdownWidth.value = `${inputRef.value.$el.offsetWidth}px`;
      }
    };
    const onHide = () => {
      highlightedIndex.value = -1;
    };
    const getData = async (queryString) => {
      if (suggestionDisabled.value)
        return;
      const cb = (suggestionList) => {
        loading.value = false;
        if (suggestionDisabled.value)
          return;
        if (shared.isArray(suggestionList)) {
          suggestions.value = suggestionList;
          highlightedIndex.value = props.highlightFirstItem ? 0 : -1;
        } else {
          error.throwError(COMPONENT_NAME, "autocomplete suggestions must be an array");
        }
      };
      loading.value = true;
      if (shared.isArray(props.fetchSuggestions)) {
        cb(props.fetchSuggestions);
      } else {
        const result = await props.fetchSuggestions(queryString, cb);
        if (shared.isArray(result))
          cb(result);
      }
    };
    const debouncedGetData = lodashUnified.debounce(getData, props.debounce);
    const handleInput = (value) => {
      const valuePresented = !!value;
      emit(event.INPUT_EVENT, value);
      emit(event.UPDATE_MODEL_EVENT, value);
      suggestionDisabled.value = false;
      activated.value || (activated.value = valuePresented);
      if (!props.triggerOnFocus && !value) {
        suggestionDisabled.value = true;
        suggestions.value = [];
        return;
      }
      debouncedGetData(value);
    };
    const handleMouseDown = (event) => {
      var _a;
      if (disabled.value)
        return;
      if (((_a = event.target) == null ? void 0 : _a.tagName) !== "INPUT" || refInput.value.includes(document.activeElement)) {
        activated.value = true;
      }
    };
    const handleChange = (value) => {
      emit(event.CHANGE_EVENT, value);
    };
    const handleFocus = (evt) => {
      if (!ignoreFocusEvent) {
        activated.value = true;
        emit("focus", evt);
        if (props.triggerOnFocus && !readonly) {
          debouncedGetData(String(props.modelValue));
        }
      } else {
        ignoreFocusEvent = false;
      }
    };
    const handleBlur = (evt) => {
      setTimeout(() => {
        var _a;
        if ((_a = popperRef.value) == null ? void 0 : _a.isFocusInsideContent()) {
          ignoreFocusEvent = true;
          return;
        }
        activated.value && close();
        emit("blur", evt);
      });
    };
    const handleClear = () => {
      activated.value = false;
      emit(event.UPDATE_MODEL_EVENT, "");
      emit("clear");
    };
    const handleKeyEnter = async () => {
      if (suggestionVisible.value && highlightedIndex.value >= 0 && highlightedIndex.value < suggestions.value.length) {
        handleSelect(suggestions.value[highlightedIndex.value]);
      } else if (props.selectWhenUnmatched) {
        emit("select", { value: props.modelValue });
        suggestions.value = [];
        highlightedIndex.value = -1;
      }
    };
    const handleKeyEscape = (evt) => {
      if (suggestionVisible.value) {
        evt.preventDefault();
        evt.stopPropagation();
        close();
      }
    };
    const close = () => {
      activated.value = false;
    };
    const focus = () => {
      var _a;
      (_a = inputRef.value) == null ? void 0 : _a.focus();
    };
    const blur = () => {
      var _a;
      (_a = inputRef.value) == null ? void 0 : _a.blur();
    };
    const handleSelect = async (item) => {
      emit(event.INPUT_EVENT, item[props.valueKey]);
      emit(event.UPDATE_MODEL_EVENT, item[props.valueKey]);
      emit("select", item);
      suggestions.value = [];
      highlightedIndex.value = -1;
    };
    const highlight = (index) => {
      if (!suggestionVisible.value || loading.value)
        return;
      if (index < 0) {
        highlightedIndex.value = -1;
        return;
      }
      if (index >= suggestions.value.length) {
        index = suggestions.value.length - 1;
      }
      const suggestion = regionRef.value.querySelector(`.${ns.be("suggestion", "wrap")}`);
      const suggestionList = suggestion.querySelectorAll(`.${ns.be("suggestion", "list")} li`);
      const highlightItem = suggestionList[index];
      const scrollTop = suggestion.scrollTop;
      const { offsetTop, scrollHeight } = highlightItem;
      if (offsetTop + scrollHeight > scrollTop + suggestion.clientHeight) {
        suggestion.scrollTop += scrollHeight;
      }
      if (offsetTop < scrollTop) {
        suggestion.scrollTop -= scrollHeight;
      }
      highlightedIndex.value = index;
      inputRef.value.ref.setAttribute("aria-activedescendant", `${listboxId.value}-item-${highlightedIndex.value}`);
    };
    core.onClickOutside(listboxRef, () => {
      suggestionVisible.value && close();
    });
    vue.onMounted(() => {
      ;
      inputRef.value.ref.setAttribute("role", "textbox");
      inputRef.value.ref.setAttribute("aria-autocomplete", "list");
      inputRef.value.ref.setAttribute("aria-controls", "id");
      inputRef.value.ref.setAttribute("aria-activedescendant", `${listboxId.value}-item-${highlightedIndex.value}`);
      readonly = inputRef.value.ref.hasAttribute("readonly");
    });
    expose({
      highlightedIndex,
      activated,
      loading,
      inputRef,
      popperRef,
      suggestions,
      handleSelect,
      handleKeyEnter,
      focus,
      blur,
      close,
      highlight
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index$2.ElTooltip), {
        ref_key: "popperRef",
        ref: popperRef,
        visible: vue.unref(suggestionVisible),
        placement: _ctx.placement,
        "fallback-placements": ["bottom-start", "top-start"],
        "popper-class": [vue.unref(ns).e("popper"), _ctx.popperClass],
        teleported: _ctx.teleported,
        "gpu-acceleration": false,
        pure: "",
        "manual-mode": "",
        effect: "light",
        trigger: "click",
        transition: `${vue.unref(ns).namespace.value}-zoom-in-top`,
        persistent: "",
        role: "listbox",
        onBeforeShow: onSuggestionShow,
        onHide
      }, {
        content: vue.withCtx(() => [
          vue.createElementVNode("div", {
            ref_key: "regionRef",
            ref: regionRef,
            class: vue.normalizeClass([vue.unref(ns).b("suggestion"), vue.unref(ns).is("loading", vue.unref(suggestionLoading))]),
            style: vue.normalizeStyle({
              [_ctx.fitInputWidth ? "width" : "minWidth"]: dropdownWidth.value,
              outline: "none"
            }),
            role: "region"
          }, [
            vue.createVNode(vue.unref(index$3.ElScrollbar), {
              id: vue.unref(listboxId),
              tag: "ul",
              "wrap-class": vue.unref(ns).be("suggestion", "wrap"),
              "view-class": vue.unref(ns).be("suggestion", "list"),
              role: "listbox"
            }, {
              default: vue.withCtx(() => [
                vue.unref(suggestionLoading) ? (vue.openBlock(), vue.createElementBlock("li", _hoisted_2, [
                  vue.createVNode(vue.unref(index$4.ElIcon), {
                    class: vue.normalizeClass(vue.unref(ns).is("loading"))
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.Loading))
                    ]),
                    _: 1
                  }, 8, ["class"])
                ])) : (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 1 }, vue.renderList(suggestions.value, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("li", {
                    id: `${vue.unref(listboxId)}-item-${index}`,
                    key: index,
                    class: vue.normalizeClass({ highlighted: highlightedIndex.value === index }),
                    role: "option",
                    "aria-selected": highlightedIndex.value === index,
                    onClick: ($event) => handleSelect(item)
                  }, [
                    vue.renderSlot(_ctx.$slots, "default", { item }, () => [
                      vue.createTextVNode(vue.toDisplayString(item[_ctx.valueKey]), 1)
                    ])
                  ], 10, _hoisted_3);
                }), 128))
              ]),
              _: 3
            }, 8, ["id", "wrap-class", "view-class"])
          ], 6)
        ]),
        default: vue.withCtx(() => [
          vue.createElementVNode("div", {
            ref_key: "listboxRef",
            ref: listboxRef,
            class: vue.normalizeClass([vue.unref(ns).b(), _ctx.$attrs.class]),
            style: vue.normalizeStyle(vue.unref(styles)),
            role: "combobox",
            "aria-haspopup": "listbox",
            "aria-expanded": vue.unref(suggestionVisible),
            "aria-owns": vue.unref(listboxId)
          }, [
            vue.createVNode(vue.unref(index$5.ElInput), vue.mergeProps({
              ref_key: "inputRef",
              ref: inputRef
            }, vue.unref(attrs), {
              clearable: _ctx.clearable,
              disabled: vue.unref(disabled),
              name: _ctx.name,
              "model-value": _ctx.modelValue,
              onInput: handleInput,
              onChange: handleChange,
              onFocus: handleFocus,
              onBlur: handleBlur,
              onClear: handleClear,
              onKeydown: [
                _cache[0] || (_cache[0] = vue.withKeys(vue.withModifiers(($event) => highlight(highlightedIndex.value - 1), ["prevent"]), ["up"])),
                _cache[1] || (_cache[1] = vue.withKeys(vue.withModifiers(($event) => highlight(highlightedIndex.value + 1), ["prevent"]), ["down"])),
                vue.withKeys(handleKeyEnter, ["enter"]),
                vue.withKeys(close, ["tab"]),
                vue.withKeys(handleKeyEscape, ["esc"])
              ],
              onMousedown: handleMouseDown
            }), vue.createSlots({ _: 2 }, [
              _ctx.$slots.prepend ? {
                name: "prepend",
                fn: vue.withCtx(() => [
                  vue.renderSlot(_ctx.$slots, "prepend")
                ])
              } : void 0,
              _ctx.$slots.append ? {
                name: "append",
                fn: vue.withCtx(() => [
                  vue.renderSlot(_ctx.$slots, "append")
                ])
              } : void 0,
              _ctx.$slots.prefix ? {
                name: "prefix",
                fn: vue.withCtx(() => [
                  vue.renderSlot(_ctx.$slots, "prefix")
                ])
              } : void 0,
              _ctx.$slots.suffix ? {
                name: "suffix",
                fn: vue.withCtx(() => [
                  vue.renderSlot(_ctx.$slots, "suffix")
                ])
              } : void 0
            ]), 1040, ["clearable", "disabled", "name", "model-value", "onKeydown"])
          ], 14, _hoisted_1)
        ]),
        _: 3
      }, 8, ["visible", "placement", "popper-class", "teleported", "transition"]);
    };
  }
});
var Autocomplete = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/autocomplete/src/autocomplete.vue"]]);

exports["default"] = Autocomplete;
//# sourceMappingURL=autocomplete2.js.map
