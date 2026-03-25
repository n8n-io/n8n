import { defineComponent, useAttrs as useAttrs$1, ref, computed, onMounted, openBlock, createBlock, unref, withCtx, createElementVNode, normalizeClass, normalizeStyle, createVNode, createElementBlock, Fragment, renderList, renderSlot, createTextVNode, toDisplayString, mergeProps, withKeys, withModifiers, createSlots } from 'vue';
import { debounce } from 'lodash-unified';
import { onClickOutside } from '@vueuse/core';
import { Loading } from '@element-plus/icons-vue';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { ElInput } from '../../input/index.mjs';
import { ElScrollbar } from '../../scrollbar/index.mjs';
import { ElTooltip } from '../../tooltip/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../form/index.mjs';
import { autocompleteProps, autocompleteEmits } from './autocomplete.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useAttrs } from '../../../hooks/use-attrs/index.mjs';
import { useFormDisabled } from '../../form/src/hooks/use-form-common-props.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { generateId } from '../../../utils/rand.mjs';
import { isArray } from '@vue/shared';
import { throwError } from '../../../utils/error.mjs';
import { INPUT_EVENT, UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';

const _hoisted_1 = ["aria-expanded", "aria-owns"];
const _hoisted_2 = { key: 0 };
const _hoisted_3 = ["id", "aria-selected", "onClick"];
const COMPONENT_NAME = "ElAutocomplete";
const __default__ = defineComponent({
  name: COMPONENT_NAME,
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: autocompleteProps,
  emits: autocompleteEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const attrs = useAttrs();
    const rawAttrs = useAttrs$1();
    const disabled = useFormDisabled();
    const ns = useNamespace("autocomplete");
    const inputRef = ref();
    const regionRef = ref();
    const popperRef = ref();
    const listboxRef = ref();
    let readonly = false;
    let ignoreFocusEvent = false;
    const suggestions = ref([]);
    const highlightedIndex = ref(-1);
    const dropdownWidth = ref("");
    const activated = ref(false);
    const suggestionDisabled = ref(false);
    const loading = ref(false);
    const listboxId = computed(() => ns.b(String(generateId())));
    const styles = computed(() => rawAttrs.style);
    const suggestionVisible = computed(() => {
      const isValidData = suggestions.value.length > 0;
      return (isValidData || loading.value) && activated.value;
    });
    const suggestionLoading = computed(() => !props.hideLoading && loading.value);
    const refInput = computed(() => {
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
        if (isArray(suggestionList)) {
          suggestions.value = suggestionList;
          highlightedIndex.value = props.highlightFirstItem ? 0 : -1;
        } else {
          throwError(COMPONENT_NAME, "autocomplete suggestions must be an array");
        }
      };
      loading.value = true;
      if (isArray(props.fetchSuggestions)) {
        cb(props.fetchSuggestions);
      } else {
        const result = await props.fetchSuggestions(queryString, cb);
        if (isArray(result))
          cb(result);
      }
    };
    const debouncedGetData = debounce(getData, props.debounce);
    const handleInput = (value) => {
      const valuePresented = !!value;
      emit(INPUT_EVENT, value);
      emit(UPDATE_MODEL_EVENT, value);
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
      emit(CHANGE_EVENT, value);
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
      emit(UPDATE_MODEL_EVENT, "");
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
      emit(INPUT_EVENT, item[props.valueKey]);
      emit(UPDATE_MODEL_EVENT, item[props.valueKey]);
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
    onClickOutside(listboxRef, () => {
      suggestionVisible.value && close();
    });
    onMounted(() => {
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
      return openBlock(), createBlock(unref(ElTooltip), {
        ref_key: "popperRef",
        ref: popperRef,
        visible: unref(suggestionVisible),
        placement: _ctx.placement,
        "fallback-placements": ["bottom-start", "top-start"],
        "popper-class": [unref(ns).e("popper"), _ctx.popperClass],
        teleported: _ctx.teleported,
        "gpu-acceleration": false,
        pure: "",
        "manual-mode": "",
        effect: "light",
        trigger: "click",
        transition: `${unref(ns).namespace.value}-zoom-in-top`,
        persistent: "",
        role: "listbox",
        onBeforeShow: onSuggestionShow,
        onHide
      }, {
        content: withCtx(() => [
          createElementVNode("div", {
            ref_key: "regionRef",
            ref: regionRef,
            class: normalizeClass([unref(ns).b("suggestion"), unref(ns).is("loading", unref(suggestionLoading))]),
            style: normalizeStyle({
              [_ctx.fitInputWidth ? "width" : "minWidth"]: dropdownWidth.value,
              outline: "none"
            }),
            role: "region"
          }, [
            createVNode(unref(ElScrollbar), {
              id: unref(listboxId),
              tag: "ul",
              "wrap-class": unref(ns).be("suggestion", "wrap"),
              "view-class": unref(ns).be("suggestion", "list"),
              role: "listbox"
            }, {
              default: withCtx(() => [
                unref(suggestionLoading) ? (openBlock(), createElementBlock("li", _hoisted_2, [
                  createVNode(unref(ElIcon), {
                    class: normalizeClass(unref(ns).is("loading"))
                  }, {
                    default: withCtx(() => [
                      createVNode(unref(Loading))
                    ]),
                    _: 1
                  }, 8, ["class"])
                ])) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(suggestions.value, (item, index) => {
                  return openBlock(), createElementBlock("li", {
                    id: `${unref(listboxId)}-item-${index}`,
                    key: index,
                    class: normalizeClass({ highlighted: highlightedIndex.value === index }),
                    role: "option",
                    "aria-selected": highlightedIndex.value === index,
                    onClick: ($event) => handleSelect(item)
                  }, [
                    renderSlot(_ctx.$slots, "default", { item }, () => [
                      createTextVNode(toDisplayString(item[_ctx.valueKey]), 1)
                    ])
                  ], 10, _hoisted_3);
                }), 128))
              ]),
              _: 3
            }, 8, ["id", "wrap-class", "view-class"])
          ], 6)
        ]),
        default: withCtx(() => [
          createElementVNode("div", {
            ref_key: "listboxRef",
            ref: listboxRef,
            class: normalizeClass([unref(ns).b(), _ctx.$attrs.class]),
            style: normalizeStyle(unref(styles)),
            role: "combobox",
            "aria-haspopup": "listbox",
            "aria-expanded": unref(suggestionVisible),
            "aria-owns": unref(listboxId)
          }, [
            createVNode(unref(ElInput), mergeProps({
              ref_key: "inputRef",
              ref: inputRef
            }, unref(attrs), {
              clearable: _ctx.clearable,
              disabled: unref(disabled),
              name: _ctx.name,
              "model-value": _ctx.modelValue,
              onInput: handleInput,
              onChange: handleChange,
              onFocus: handleFocus,
              onBlur: handleBlur,
              onClear: handleClear,
              onKeydown: [
                _cache[0] || (_cache[0] = withKeys(withModifiers(($event) => highlight(highlightedIndex.value - 1), ["prevent"]), ["up"])),
                _cache[1] || (_cache[1] = withKeys(withModifiers(($event) => highlight(highlightedIndex.value + 1), ["prevent"]), ["down"])),
                withKeys(handleKeyEnter, ["enter"]),
                withKeys(close, ["tab"]),
                withKeys(handleKeyEscape, ["esc"])
              ],
              onMousedown: handleMouseDown
            }), createSlots({ _: 2 }, [
              _ctx.$slots.prepend ? {
                name: "prepend",
                fn: withCtx(() => [
                  renderSlot(_ctx.$slots, "prepend")
                ])
              } : void 0,
              _ctx.$slots.append ? {
                name: "append",
                fn: withCtx(() => [
                  renderSlot(_ctx.$slots, "append")
                ])
              } : void 0,
              _ctx.$slots.prefix ? {
                name: "prefix",
                fn: withCtx(() => [
                  renderSlot(_ctx.$slots, "prefix")
                ])
              } : void 0,
              _ctx.$slots.suffix ? {
                name: "suffix",
                fn: withCtx(() => [
                  renderSlot(_ctx.$slots, "suffix")
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
var Autocomplete = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/autocomplete/src/autocomplete.vue"]]);

export { Autocomplete as default };
//# sourceMappingURL=autocomplete2.mjs.map
