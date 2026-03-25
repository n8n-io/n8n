import { defineComponent, useAttrs, ref, computed, nextTick, watch, onMounted, openBlock, createBlock, unref, withCtx, withDirectives, createElementBlock, normalizeClass, normalizeStyle, createVNode, withModifiers, Fragment, renderList, toDisplayString, createElementVNode, withKeys, vModelText, createCommentVNode, isRef, vShow, renderSlot } from 'vue';
import { isPromise } from '@vue/shared';
import { cloneDeep, debounce } from 'lodash-unified';
import { isClient, useCssVar, useResizeObserver } from '@vueuse/core';
import _CascaderPanel from '../../cascader-panel/index.mjs';
import { ElInput } from '../../input/index.mjs';
import { ElTooltip } from '../../tooltip/index.mjs';
import { ElScrollbar } from '../../scrollbar/index.mjs';
import { ElTag } from '../../tag/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../form/index.mjs';
import '../../../directives/index.mjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { CircleClose, ArrowDown, Check } from '@element-plus/icons-vue';
import { cascaderProps, cascaderEmits } from './cascader.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useFormItem } from '../../form/src/hooks/use-form-item.mjs';
import { useFormSize } from '../../form/src/hooks/use-form-common-props.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { debugWarn } from '../../../utils/error.mjs';
import { isKorean } from '../../../utils/i18n.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';
import { focusNode, getSibling } from '../../../utils/dom/aria.mjs';
import ClickOutside from '../../../directives/click-outside/index.mjs';

const _hoisted_1 = { key: 0 };
const _hoisted_2 = ["placeholder", "onKeydown"];
const _hoisted_3 = ["onClick"];
const COMPONENT_NAME = "ElCascader";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: cascaderProps,
  emits: cascaderEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const popperOptions = {
      modifiers: [
        {
          name: "arrowPosition",
          enabled: true,
          phase: "main",
          fn: ({ state }) => {
            const { modifiersData, placement } = state;
            if (["right", "left", "bottom", "top"].includes(placement))
              return;
            modifiersData.arrow.x = 35;
          },
          requires: ["arrow"]
        }
      ]
    };
    const attrs = useAttrs();
    let inputInitialHeight = 0;
    let pressDeleteCount = 0;
    const nsCascader = useNamespace("cascader");
    const nsInput = useNamespace("input");
    const { t } = useLocale();
    const { form, formItem } = useFormItem();
    const tooltipRef = ref(null);
    const input = ref(null);
    const tagWrapper = ref(null);
    const cascaderPanelRef = ref(null);
    const suggestionPanel = ref(null);
    const popperVisible = ref(false);
    const inputHover = ref(false);
    const filtering = ref(false);
    const filterFocus = ref(false);
    const inputValue = ref("");
    const searchInputValue = ref("");
    const presentTags = ref([]);
    const allPresentTags = ref([]);
    const suggestions = ref([]);
    const isOnComposition = ref(false);
    const cascaderStyle = computed(() => {
      return attrs.style;
    });
    const isDisabled = computed(() => props.disabled || (form == null ? void 0 : form.disabled));
    const inputPlaceholder = computed(() => props.placeholder || t("el.cascader.placeholder"));
    const currentPlaceholder = computed(() => searchInputValue.value || presentTags.value.length > 0 || isOnComposition.value ? "" : inputPlaceholder.value);
    const realSize = useFormSize();
    const tagSize = computed(() => ["small"].includes(realSize.value) ? "small" : "default");
    const multiple = computed(() => !!props.props.multiple);
    const readonly = computed(() => !props.filterable || multiple.value);
    const searchKeyword = computed(() => multiple.value ? searchInputValue.value : inputValue.value);
    const checkedNodes = computed(() => {
      var _a;
      return ((_a = cascaderPanelRef.value) == null ? void 0 : _a.checkedNodes) || [];
    });
    const clearBtnVisible = computed(() => {
      if (!props.clearable || isDisabled.value || filtering.value || !inputHover.value)
        return false;
      return !!checkedNodes.value.length;
    });
    const presentText = computed(() => {
      const { showAllLevels, separator } = props;
      const nodes = checkedNodes.value;
      return nodes.length ? multiple.value ? "" : nodes[0].calcText(showAllLevels, separator) : "";
    });
    const checkedValue = computed({
      get() {
        return cloneDeep(props.modelValue);
      },
      set(val) {
        emit(UPDATE_MODEL_EVENT, val);
        emit(CHANGE_EVENT, val);
        if (props.validateEvent) {
          formItem == null ? void 0 : formItem.validate("change").catch((err) => debugWarn(err));
        }
      }
    });
    const cascaderKls = computed(() => {
      return [
        nsCascader.b(),
        nsCascader.m(realSize.value),
        nsCascader.is("disabled", isDisabled.value),
        attrs.class
      ];
    });
    const cascaderIconKls = computed(() => {
      return [
        nsInput.e("icon"),
        "icon-arrow-down",
        nsCascader.is("reverse", popperVisible.value)
      ];
    });
    const inputClass = computed(() => {
      return nsCascader.is("focus", popperVisible.value || filterFocus.value);
    });
    const contentRef = computed(() => {
      var _a, _b;
      return (_b = (_a = tooltipRef.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef;
    });
    const togglePopperVisible = (visible) => {
      var _a, _b, _c;
      if (isDisabled.value)
        return;
      visible = visible != null ? visible : !popperVisible.value;
      if (visible !== popperVisible.value) {
        popperVisible.value = visible;
        (_b = (_a = input.value) == null ? void 0 : _a.input) == null ? void 0 : _b.setAttribute("aria-expanded", `${visible}`);
        if (visible) {
          updatePopperPosition();
          nextTick((_c = cascaderPanelRef.value) == null ? void 0 : _c.scrollToExpandingNode);
        } else if (props.filterable) {
          syncPresentTextValue();
        }
        emit("visibleChange", visible);
      }
    };
    const updatePopperPosition = () => {
      nextTick(() => {
        var _a;
        (_a = tooltipRef.value) == null ? void 0 : _a.updatePopper();
      });
    };
    const hideSuggestionPanel = () => {
      filtering.value = false;
    };
    const genTag = (node) => {
      const { showAllLevels, separator } = props;
      return {
        node,
        key: node.uid,
        text: node.calcText(showAllLevels, separator),
        hitState: false,
        closable: !isDisabled.value && !node.isDisabled,
        isCollapseTag: false
      };
    };
    const deleteTag = (tag) => {
      var _a;
      const node = tag.node;
      node.doCheck(false);
      (_a = cascaderPanelRef.value) == null ? void 0 : _a.calculateCheckedValue();
      emit("removeTag", node.valueByOption);
    };
    const calculatePresentTags = () => {
      if (!multiple.value)
        return;
      const nodes = checkedNodes.value;
      const tags = [];
      const allTags = [];
      nodes.forEach((node) => allTags.push(genTag(node)));
      allPresentTags.value = allTags;
      if (nodes.length) {
        nodes.slice(0, props.maxCollapseTags).forEach((node) => tags.push(genTag(node)));
        const rest = nodes.slice(props.maxCollapseTags);
        const restCount = rest.length;
        if (restCount) {
          if (props.collapseTags) {
            tags.push({
              key: -1,
              text: `+ ${restCount}`,
              closable: false,
              isCollapseTag: true
            });
          } else {
            rest.forEach((node) => tags.push(genTag(node)));
          }
        }
      }
      presentTags.value = tags;
    };
    const calculateSuggestions = () => {
      var _a, _b;
      const { filterMethod, showAllLevels, separator } = props;
      const res = (_b = (_a = cascaderPanelRef.value) == null ? void 0 : _a.getFlattedNodes(!props.props.checkStrictly)) == null ? void 0 : _b.filter((node) => {
        if (node.isDisabled)
          return false;
        node.calcText(showAllLevels, separator);
        return filterMethod(node, searchKeyword.value);
      });
      if (multiple.value) {
        presentTags.value.forEach((tag) => {
          tag.hitState = false;
        });
        allPresentTags.value.forEach((tag) => {
          tag.hitState = false;
        });
      }
      filtering.value = true;
      suggestions.value = res;
      updatePopperPosition();
    };
    const focusFirstNode = () => {
      var _a;
      let firstNode;
      if (filtering.value && suggestionPanel.value) {
        firstNode = suggestionPanel.value.$el.querySelector(`.${nsCascader.e("suggestion-item")}`);
      } else {
        firstNode = (_a = cascaderPanelRef.value) == null ? void 0 : _a.$el.querySelector(`.${nsCascader.b("node")}[tabindex="-1"]`);
      }
      if (firstNode) {
        firstNode.focus();
        !filtering.value && firstNode.click();
      }
    };
    const updateStyle = () => {
      var _a, _b;
      const inputInner = (_a = input.value) == null ? void 0 : _a.input;
      const tagWrapperEl = tagWrapper.value;
      const suggestionPanelEl = (_b = suggestionPanel.value) == null ? void 0 : _b.$el;
      if (!isClient || !inputInner)
        return;
      if (suggestionPanelEl) {
        const suggestionList = suggestionPanelEl.querySelector(`.${nsCascader.e("suggestion-list")}`);
        suggestionList.style.minWidth = `${inputInner.offsetWidth}px`;
      }
      if (tagWrapperEl) {
        const { offsetHeight } = tagWrapperEl;
        const height = presentTags.value.length > 0 ? `${Math.max(offsetHeight + 6, inputInitialHeight)}px` : `${inputInitialHeight}px`;
        inputInner.style.height = height;
        updatePopperPosition();
      }
    };
    const getCheckedNodes = (leafOnly) => {
      var _a;
      return (_a = cascaderPanelRef.value) == null ? void 0 : _a.getCheckedNodes(leafOnly);
    };
    const handleExpandChange = (value) => {
      updatePopperPosition();
      emit("expandChange", value);
    };
    const handleComposition = (event) => {
      var _a;
      const text = (_a = event.target) == null ? void 0 : _a.value;
      if (event.type === "compositionend") {
        isOnComposition.value = false;
        nextTick(() => handleInput(text));
      } else {
        const lastCharacter = text[text.length - 1] || "";
        isOnComposition.value = !isKorean(lastCharacter);
      }
    };
    const handleKeyDown = (e) => {
      if (isOnComposition.value)
        return;
      switch (e.code) {
        case EVENT_CODE.enter:
          togglePopperVisible();
          break;
        case EVENT_CODE.down:
          togglePopperVisible(true);
          nextTick(focusFirstNode);
          e.preventDefault();
          break;
        case EVENT_CODE.esc:
          if (popperVisible.value === true) {
            e.preventDefault();
            e.stopPropagation();
            togglePopperVisible(false);
          }
          break;
        case EVENT_CODE.tab:
          togglePopperVisible(false);
          break;
      }
    };
    const handleClear = () => {
      var _a;
      (_a = cascaderPanelRef.value) == null ? void 0 : _a.clearCheckedNodes();
      if (!popperVisible.value && props.filterable) {
        syncPresentTextValue();
      }
      togglePopperVisible(false);
    };
    const syncPresentTextValue = () => {
      const { value } = presentText;
      inputValue.value = value;
      searchInputValue.value = value;
    };
    const handleSuggestionClick = (node) => {
      var _a, _b;
      const { checked } = node;
      if (multiple.value) {
        (_a = cascaderPanelRef.value) == null ? void 0 : _a.handleCheckChange(node, !checked, false);
      } else {
        !checked && ((_b = cascaderPanelRef.value) == null ? void 0 : _b.handleCheckChange(node, true, false));
        togglePopperVisible(false);
      }
    };
    const handleSuggestionKeyDown = (e) => {
      const target = e.target;
      const { code } = e;
      switch (code) {
        case EVENT_CODE.up:
        case EVENT_CODE.down: {
          const distance = code === EVENT_CODE.up ? -1 : 1;
          focusNode(getSibling(target, distance, `.${nsCascader.e("suggestion-item")}[tabindex="-1"]`));
          break;
        }
        case EVENT_CODE.enter:
          target.click();
          break;
      }
    };
    const handleDelete = () => {
      const tags = presentTags.value;
      const lastTag = tags[tags.length - 1];
      pressDeleteCount = searchInputValue.value ? 0 : pressDeleteCount + 1;
      if (!lastTag || !pressDeleteCount || props.collapseTags && tags.length > 1)
        return;
      if (lastTag.hitState) {
        deleteTag(lastTag);
      } else {
        lastTag.hitState = true;
      }
    };
    const handleFocus = (e) => {
      const el = e.target;
      const name = nsCascader.e("search-input");
      if (el.className === name) {
        filterFocus.value = true;
      }
      emit("focus", e);
    };
    const handleBlur = (e) => {
      filterFocus.value = false;
      emit("blur", e);
    };
    const handleFilter = debounce(() => {
      const { value } = searchKeyword;
      if (!value)
        return;
      const passed = props.beforeFilter(value);
      if (isPromise(passed)) {
        passed.then(calculateSuggestions).catch(() => {
        });
      } else if (passed !== false) {
        calculateSuggestions();
      } else {
        hideSuggestionPanel();
      }
    }, props.debounce);
    const handleInput = (val, e) => {
      !popperVisible.value && togglePopperVisible(true);
      if (e == null ? void 0 : e.isComposing)
        return;
      val ? handleFilter() : hideSuggestionPanel();
    };
    const getInputInnerHeight = (inputInner) => Number.parseFloat(useCssVar(nsInput.cssVarName("input-height"), inputInner).value) - 2;
    watch(filtering, updatePopperPosition);
    watch([checkedNodes, isDisabled], calculatePresentTags);
    watch(presentTags, () => {
      nextTick(() => updateStyle());
    });
    watch(realSize, async () => {
      await nextTick();
      const inputInner = input.value.input;
      inputInitialHeight = getInputInnerHeight(inputInner) || inputInitialHeight;
      updateStyle();
    });
    watch(presentText, syncPresentTextValue, { immediate: true });
    onMounted(() => {
      const inputInner = input.value.input;
      const inputInnerHeight = getInputInnerHeight(inputInner);
      inputInitialHeight = inputInner.offsetHeight || inputInnerHeight;
      useResizeObserver(inputInner, updateStyle);
    });
    expose({
      getCheckedNodes,
      cascaderPanelRef,
      togglePopperVisible,
      contentRef
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(ElTooltip), {
        ref_key: "tooltipRef",
        ref: tooltipRef,
        visible: popperVisible.value,
        teleported: _ctx.teleported,
        "popper-class": [unref(nsCascader).e("dropdown"), _ctx.popperClass],
        "popper-options": popperOptions,
        "fallback-placements": [
          "bottom-start",
          "bottom",
          "top-start",
          "top",
          "right",
          "left"
        ],
        "stop-popper-mouse-event": false,
        "gpu-acceleration": false,
        placement: "bottom-start",
        transition: `${unref(nsCascader).namespace.value}-zoom-in-top`,
        effect: "light",
        pure: "",
        persistent: "",
        onHide: hideSuggestionPanel
      }, {
        default: withCtx(() => [
          withDirectives((openBlock(), createElementBlock("div", {
            class: normalizeClass(unref(cascaderKls)),
            style: normalizeStyle(unref(cascaderStyle)),
            onClick: _cache[5] || (_cache[5] = () => togglePopperVisible(unref(readonly) ? void 0 : true)),
            onKeydown: handleKeyDown,
            onMouseenter: _cache[6] || (_cache[6] = ($event) => inputHover.value = true),
            onMouseleave: _cache[7] || (_cache[7] = ($event) => inputHover.value = false)
          }, [
            createVNode(unref(ElInput), {
              ref_key: "input",
              ref: input,
              modelValue: inputValue.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => inputValue.value = $event),
              placeholder: unref(currentPlaceholder),
              readonly: unref(readonly),
              disabled: unref(isDisabled),
              "validate-event": false,
              size: unref(realSize),
              class: normalizeClass(unref(inputClass)),
              tabindex: unref(multiple) && _ctx.filterable && !unref(isDisabled) ? -1 : void 0,
              onCompositionstart: handleComposition,
              onCompositionupdate: handleComposition,
              onCompositionend: handleComposition,
              onFocus: handleFocus,
              onBlur: handleBlur,
              onInput: handleInput
            }, {
              suffix: withCtx(() => [
                unref(clearBtnVisible) ? (openBlock(), createBlock(unref(ElIcon), {
                  key: "clear",
                  class: normalizeClass([unref(nsInput).e("icon"), "icon-circle-close"]),
                  onClick: withModifiers(handleClear, ["stop"])
                }, {
                  default: withCtx(() => [
                    createVNode(unref(CircleClose))
                  ]),
                  _: 1
                }, 8, ["class", "onClick"])) : (openBlock(), createBlock(unref(ElIcon), {
                  key: "arrow-down",
                  class: normalizeClass(unref(cascaderIconKls)),
                  onClick: _cache[0] || (_cache[0] = withModifiers(($event) => togglePopperVisible(), ["stop"]))
                }, {
                  default: withCtx(() => [
                    createVNode(unref(ArrowDown))
                  ]),
                  _: 1
                }, 8, ["class"]))
              ]),
              _: 1
            }, 8, ["modelValue", "placeholder", "readonly", "disabled", "size", "class", "tabindex"]),
            unref(multiple) ? (openBlock(), createElementBlock("div", {
              key: 0,
              ref_key: "tagWrapper",
              ref: tagWrapper,
              class: normalizeClass(unref(nsCascader).e("tags"))
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(presentTags.value, (tag) => {
                return openBlock(), createBlock(unref(ElTag), {
                  key: tag.key,
                  type: _ctx.tagType,
                  size: unref(tagSize),
                  hit: tag.hitState,
                  closable: tag.closable,
                  "disable-transitions": "",
                  onClose: ($event) => deleteTag(tag)
                }, {
                  default: withCtx(() => [
                    tag.isCollapseTag === false ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(tag.text), 1)) : (openBlock(), createBlock(unref(ElTooltip), {
                      key: 1,
                      disabled: popperVisible.value || !_ctx.collapseTagsTooltip,
                      "fallback-placements": ["bottom", "top", "right", "left"],
                      placement: "bottom",
                      effect: "light"
                    }, {
                      default: withCtx(() => [
                        createElementVNode("span", null, toDisplayString(tag.text), 1)
                      ]),
                      content: withCtx(() => [
                        createElementVNode("div", {
                          class: normalizeClass(unref(nsCascader).e("collapse-tags"))
                        }, [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(allPresentTags.value.slice(_ctx.maxCollapseTags), (tag2, idx) => {
                            return openBlock(), createElementBlock("div", {
                              key: idx,
                              class: normalizeClass(unref(nsCascader).e("collapse-tag"))
                            }, [
                              (openBlock(), createBlock(unref(ElTag), {
                                key: tag2.key,
                                class: "in-tooltip",
                                type: _ctx.tagType,
                                size: unref(tagSize),
                                hit: tag2.hitState,
                                closable: tag2.closable,
                                "disable-transitions": "",
                                onClose: ($event) => deleteTag(tag2)
                              }, {
                                default: withCtx(() => [
                                  createElementVNode("span", null, toDisplayString(tag2.text), 1)
                                ]),
                                _: 2
                              }, 1032, ["type", "size", "hit", "closable", "onClose"]))
                            ], 2);
                          }), 128))
                        ], 2)
                      ]),
                      _: 2
                    }, 1032, ["disabled"]))
                  ]),
                  _: 2
                }, 1032, ["type", "size", "hit", "closable", "onClose"]);
              }), 128)),
              _ctx.filterable && !unref(isDisabled) ? withDirectives((openBlock(), createElementBlock("input", {
                key: 0,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => searchInputValue.value = $event),
                type: "text",
                class: normalizeClass(unref(nsCascader).e("search-input")),
                placeholder: unref(presentText) ? "" : unref(inputPlaceholder),
                onInput: _cache[3] || (_cache[3] = (e) => handleInput(searchInputValue.value, e)),
                onClick: _cache[4] || (_cache[4] = withModifiers(($event) => togglePopperVisible(true), ["stop"])),
                onKeydown: withKeys(handleDelete, ["delete"]),
                onCompositionstart: handleComposition,
                onCompositionupdate: handleComposition,
                onCompositionend: handleComposition,
                onFocus: handleFocus,
                onBlur: handleBlur
              }, null, 42, _hoisted_2)), [
                [vModelText, searchInputValue.value]
              ]) : createCommentVNode("v-if", true)
            ], 2)) : createCommentVNode("v-if", true)
          ], 38)), [
            [unref(ClickOutside), () => togglePopperVisible(false), unref(contentRef)]
          ])
        ]),
        content: withCtx(() => [
          withDirectives(createVNode(unref(_CascaderPanel), {
            ref_key: "cascaderPanelRef",
            ref: cascaderPanelRef,
            modelValue: unref(checkedValue),
            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => isRef(checkedValue) ? checkedValue.value = $event : null),
            options: _ctx.options,
            props: props.props,
            border: false,
            "render-label": _ctx.$slots.default,
            onExpandChange: handleExpandChange,
            onClose: _cache[9] || (_cache[9] = ($event) => _ctx.$nextTick(() => togglePopperVisible(false)))
          }, null, 8, ["modelValue", "options", "props", "render-label"]), [
            [vShow, !filtering.value]
          ]),
          _ctx.filterable ? withDirectives((openBlock(), createBlock(unref(ElScrollbar), {
            key: 0,
            ref_key: "suggestionPanel",
            ref: suggestionPanel,
            tag: "ul",
            class: normalizeClass(unref(nsCascader).e("suggestion-panel")),
            "view-class": unref(nsCascader).e("suggestion-list"),
            onKeydown: handleSuggestionKeyDown
          }, {
            default: withCtx(() => [
              suggestions.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(suggestions.value, (item) => {
                return openBlock(), createElementBlock("li", {
                  key: item.uid,
                  class: normalizeClass([
                    unref(nsCascader).e("suggestion-item"),
                    unref(nsCascader).is("checked", item.checked)
                  ]),
                  tabindex: -1,
                  onClick: ($event) => handleSuggestionClick(item)
                }, [
                  createElementVNode("span", null, toDisplayString(item.text), 1),
                  item.checked ? (openBlock(), createBlock(unref(ElIcon), { key: 0 }, {
                    default: withCtx(() => [
                      createVNode(unref(Check))
                    ]),
                    _: 1
                  })) : createCommentVNode("v-if", true)
                ], 10, _hoisted_3);
              }), 128)) : renderSlot(_ctx.$slots, "empty", { key: 1 }, () => [
                createElementVNode("li", {
                  class: normalizeClass(unref(nsCascader).e("empty-text"))
                }, toDisplayString(unref(t)("el.cascader.noMatch")), 3)
              ])
            ]),
            _: 3
          }, 8, ["class", "view-class"])), [
            [vShow, filtering.value]
          ]) : createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["visible", "teleported", "popper-class", "transition"]);
    };
  }
});
var Cascader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/cascader/src/cascader.vue"]]);

export { Cascader as default };
//# sourceMappingURL=cascader2.mjs.map
