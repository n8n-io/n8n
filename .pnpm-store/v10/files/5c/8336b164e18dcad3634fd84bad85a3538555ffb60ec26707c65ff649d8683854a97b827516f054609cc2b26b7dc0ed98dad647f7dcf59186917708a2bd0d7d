import { defineComponent, toRefs, computed, unref, provide, reactive, onMounted, nextTick, resolveComponent, resolveDirective, withDirectives, openBlock, createElementBlock, normalizeClass, withModifiers, createVNode, withCtx, createElementVNode, normalizeStyle, createBlock, Transition, Fragment, renderList, toDisplayString, createCommentVNode, withKeys, vModelText, createSlots, resolveDynamicComponent, renderSlot, vShow } from 'vue';
import { useResizeObserver, isIOS } from '@vueuse/core';
import { placements } from '@popperjs/core';
import '../../../directives/index.mjs';
import '../../../hooks/index.mjs';
import { ElInput } from '../../input/index.mjs';
import { ElTooltip } from '../../tooltip/index.mjs';
import { ElScrollbar } from '../../scrollbar/index.mjs';
import { ElTag } from '../../tag/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../../constants/index.mjs';
import '../../../utils/index.mjs';
import { CircleClose, ArrowDown } from '@element-plus/icons-vue';
import Option from './option.mjs';
import ElSelectMenu from './select-dropdown.mjs';
import { useSelectStates, useSelect } from './useSelect.mjs';
import { selectKey } from './token.mjs';
import ElOptions from './options.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import ClickOutside from '../../../directives/click-outside/index.mjs';
import { isValidComponentSize } from '../../../utils/vue/validator.mjs';
import { useTooltipContentProps } from '../../tooltip/src/content.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { tagProps } from '../../tag/src/tag.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useId } from '../../../hooks/use-id/index.mjs';

const COMPONENT_NAME = "ElSelect";
const _sfc_main = defineComponent({
  name: COMPONENT_NAME,
  componentName: COMPONENT_NAME,
  components: {
    ElInput,
    ElSelectMenu,
    ElOption: Option,
    ElOptions,
    ElTag,
    ElScrollbar,
    ElTooltip,
    ElIcon
  },
  directives: { ClickOutside },
  props: {
    name: String,
    id: String,
    modelValue: {
      type: [Array, String, Number, Boolean, Object],
      default: void 0
    },
    autocomplete: {
      type: String,
      default: "off"
    },
    automaticDropdown: Boolean,
    size: {
      type: String,
      validator: isValidComponentSize
    },
    effect: {
      type: String,
      default: "light"
    },
    disabled: Boolean,
    clearable: Boolean,
    filterable: Boolean,
    allowCreate: Boolean,
    loading: Boolean,
    popperClass: {
      type: String,
      default: ""
    },
    popperOptions: {
      type: Object,
      default: () => ({})
    },
    remote: Boolean,
    loadingText: String,
    noMatchText: String,
    noDataText: String,
    remoteMethod: Function,
    filterMethod: Function,
    multiple: Boolean,
    multipleLimit: {
      type: Number,
      default: 0
    },
    placeholder: {
      type: String
    },
    defaultFirstOption: Boolean,
    reserveKeyword: {
      type: Boolean,
      default: true
    },
    valueKey: {
      type: String,
      default: "value"
    },
    collapseTags: Boolean,
    collapseTagsTooltip: Boolean,
    maxCollapseTags: {
      type: Number,
      default: 1
    },
    teleported: useTooltipContentProps.teleported,
    persistent: {
      type: Boolean,
      default: true
    },
    clearIcon: {
      type: iconPropType,
      default: CircleClose
    },
    fitInputWidth: Boolean,
    suffixIcon: {
      type: iconPropType,
      default: ArrowDown
    },
    tagType: { ...tagProps.type, default: "info" },
    validateEvent: {
      type: Boolean,
      default: true
    },
    remoteShowSuffix: Boolean,
    suffixTransition: {
      type: Boolean,
      default: true
    },
    placement: {
      type: String,
      values: placements,
      default: "bottom-start"
    },
    ariaLabel: {
      type: String,
      default: void 0
    }
  },
  emits: [
    UPDATE_MODEL_EVENT,
    CHANGE_EVENT,
    "remove-tag",
    "clear",
    "visible-change",
    "focus",
    "blur"
  ],
  setup(props, ctx) {
    const nsSelect = useNamespace("select");
    const nsInput = useNamespace("input");
    const { t } = useLocale();
    const contentId = useId();
    const states = useSelectStates(props);
    const {
      optionList,
      optionsArray,
      hoverOption,
      selectSize,
      readonly,
      handleResize,
      collapseTagSize,
      debouncedOnInputChange,
      debouncedQueryChange,
      deletePrevTag,
      deleteTag,
      deleteSelected,
      handleOptionSelect,
      scrollToOption,
      setSelected,
      resetInputHeight,
      managePlaceholder,
      showClose,
      selectDisabled,
      iconComponent,
      iconReverse,
      showNewOption,
      emptyText,
      toggleLastOptionHitState,
      resetInputState,
      handleComposition,
      onOptionCreate,
      onOptionDestroy,
      handleMenuEnter,
      handleFocus,
      focus,
      blur,
      handleBlur,
      handleClearClick,
      handleClose,
      handleKeydownEscape,
      toggleMenu,
      selectOption,
      getValueKey,
      navigateOptions,
      handleDeleteTooltipTag,
      dropMenuVisible,
      reference,
      input,
      iOSInput,
      tooltipRef,
      tagTooltipRef,
      tags,
      selectWrapper,
      scrollbar,
      queryChange,
      groupQueryChange,
      handleMouseEnter,
      handleMouseLeave,
      showTagList,
      collapseTagList,
      selectTagsStyle
    } = useSelect(props, states, ctx);
    const {
      inputWidth,
      selected,
      inputLength,
      filteredOptionsCount,
      visible,
      selectedLabel,
      hoverIndex,
      query,
      inputHovering,
      currentPlaceholder,
      menuVisibleOnFocus,
      isOnComposition,
      options,
      cachedOptions,
      optionsCount,
      prefixWidth
    } = toRefs(states);
    const wrapperKls = computed(() => {
      const classList = [nsSelect.b()];
      const _selectSize = unref(selectSize);
      if (_selectSize) {
        classList.push(nsSelect.m(_selectSize));
      }
      if (props.disabled) {
        classList.push(nsSelect.m("disabled"));
      }
      return classList;
    });
    const tagsKls = computed(() => [
      nsSelect.e("tags"),
      nsSelect.is("disabled", unref(selectDisabled))
    ]);
    const tagWrapperKls = computed(() => [
      nsSelect.b("tags-wrapper"),
      { "has-prefix": unref(prefixWidth) && unref(selected).length }
    ]);
    const inputKls = computed(() => [
      nsSelect.e("input"),
      nsSelect.is(unref(selectSize)),
      nsSelect.is("disabled", unref(selectDisabled))
    ]);
    const iOSInputKls = computed(() => [
      nsSelect.e("input"),
      nsSelect.is(unref(selectSize)),
      nsSelect.em("input", "iOS")
    ]);
    const scrollbarKls = computed(() => [
      nsSelect.is("empty", !props.allowCreate && Boolean(unref(query)) && unref(filteredOptionsCount) === 0)
    ]);
    const tagTextStyle = computed(() => {
      const maxWidth = unref(inputWidth) > 123 && unref(selected).length > props.maxCollapseTags ? unref(inputWidth) - 123 : unref(inputWidth) - 75;
      return { maxWidth: `${maxWidth}px` };
    });
    const inputStyle = computed(() => ({
      marginLeft: `${unref(prefixWidth)}px`,
      flexGrow: 1,
      width: `${unref(inputLength) / (unref(inputWidth) - 32)}%`,
      maxWidth: `${unref(inputWidth) - 42}px`
    }));
    provide(selectKey, reactive({
      props,
      options,
      optionsArray,
      cachedOptions,
      optionsCount,
      filteredOptionsCount,
      hoverIndex,
      handleOptionSelect,
      onOptionCreate,
      onOptionDestroy,
      selectWrapper,
      selected,
      setSelected,
      queryChange,
      groupQueryChange
    }));
    onMounted(() => {
      states.cachedPlaceHolder = currentPlaceholder.value = props.placeholder || (() => t("el.select.placeholder"));
      if (props.multiple && Array.isArray(props.modelValue) && props.modelValue.length > 0) {
        currentPlaceholder.value = "";
      }
      useResizeObserver(selectWrapper, handleResize);
      if (props.remote && props.multiple) {
        resetInputHeight();
      }
      nextTick(() => {
        const refEl = reference.value && reference.value.$el;
        if (!refEl)
          return;
        inputWidth.value = refEl.getBoundingClientRect().width;
        if (ctx.slots.prefix) {
          const prefix = refEl.querySelector(`.${nsInput.e("prefix")}`);
          prefixWidth.value = Math.max(prefix.getBoundingClientRect().width + 11, 30);
        }
      });
      setSelected();
    });
    if (props.multiple && !Array.isArray(props.modelValue)) {
      ctx.emit(UPDATE_MODEL_EVENT, []);
    }
    if (!props.multiple && Array.isArray(props.modelValue)) {
      ctx.emit(UPDATE_MODEL_EVENT, "");
    }
    const popperPaneRef = computed(() => {
      var _a, _b;
      return (_b = (_a = tooltipRef.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef;
    });
    const onOptionsRendered = (v) => {
      optionList.value = v;
    };
    return {
      isIOS,
      onOptionsRendered,
      prefixWidth,
      selectSize,
      readonly,
      handleResize,
      collapseTagSize,
      debouncedOnInputChange,
      debouncedQueryChange,
      deletePrevTag,
      deleteTag,
      handleDeleteTooltipTag,
      deleteSelected,
      handleOptionSelect,
      scrollToOption,
      inputWidth,
      selected,
      inputLength,
      filteredOptionsCount,
      visible,
      selectedLabel,
      hoverIndex,
      query,
      inputHovering,
      currentPlaceholder,
      menuVisibleOnFocus,
      isOnComposition,
      options,
      resetInputHeight,
      managePlaceholder,
      showClose,
      selectDisabled,
      iconComponent,
      iconReverse,
      showNewOption,
      emptyText,
      toggleLastOptionHitState,
      resetInputState,
      handleComposition,
      handleMenuEnter,
      handleFocus,
      focus,
      blur,
      handleBlur,
      handleClearClick,
      handleClose,
      handleKeydownEscape,
      toggleMenu,
      selectOption,
      getValueKey,
      navigateOptions,
      dropMenuVisible,
      reference,
      input,
      iOSInput,
      tooltipRef,
      popperPaneRef,
      tags,
      selectWrapper,
      scrollbar,
      wrapperKls,
      tagsKls,
      tagWrapperKls,
      inputKls,
      iOSInputKls,
      scrollbarKls,
      selectTagsStyle,
      nsSelect,
      tagTextStyle,
      inputStyle,
      handleMouseEnter,
      handleMouseLeave,
      showTagList,
      collapseTagList,
      tagTooltipRef,
      contentId,
      hoverOption
    };
  }
});
const _hoisted_1 = ["disabled", "autocomplete", "aria-activedescendant", "aria-controls", "aria-expanded", "aria-label"];
const _hoisted_2 = ["disabled"];
const _hoisted_3 = { style: { "height": "100%", "display": "flex", "justify-content": "center", "align-items": "center" } };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tag = resolveComponent("el-tag");
  const _component_el_tooltip = resolveComponent("el-tooltip");
  const _component_el_icon = resolveComponent("el-icon");
  const _component_el_input = resolveComponent("el-input");
  const _component_el_option = resolveComponent("el-option");
  const _component_el_options = resolveComponent("el-options");
  const _component_el_scrollbar = resolveComponent("el-scrollbar");
  const _component_el_select_menu = resolveComponent("el-select-menu");
  const _directive_click_outside = resolveDirective("click-outside");
  return withDirectives((openBlock(), createElementBlock("div", {
    ref: "selectWrapper",
    class: normalizeClass(_ctx.wrapperKls),
    onMouseenter: _cache[22] || (_cache[22] = (...args) => _ctx.handleMouseEnter && _ctx.handleMouseEnter(...args)),
    onMouseleave: _cache[23] || (_cache[23] = (...args) => _ctx.handleMouseLeave && _ctx.handleMouseLeave(...args)),
    onClick: _cache[24] || (_cache[24] = withModifiers((...args) => _ctx.toggleMenu && _ctx.toggleMenu(...args), ["stop"]))
  }, [
    createVNode(_component_el_tooltip, {
      ref: "tooltipRef",
      visible: _ctx.dropMenuVisible,
      placement: _ctx.placement,
      teleported: _ctx.teleported,
      "popper-class": [_ctx.nsSelect.e("popper"), _ctx.popperClass],
      "popper-options": _ctx.popperOptions,
      "fallback-placements": ["bottom-start", "top-start", "right", "left"],
      effect: _ctx.effect,
      pure: "",
      trigger: "click",
      transition: `${_ctx.nsSelect.namespace.value}-zoom-in-top`,
      "stop-popper-mouse-event": false,
      "gpu-acceleration": false,
      persistent: _ctx.persistent,
      onShow: _ctx.handleMenuEnter
    }, {
      default: withCtx(() => {
        var _a, _b;
        return [
          createElementVNode("div", {
            class: "select-trigger",
            onMouseenter: _cache[20] || (_cache[20] = ($event) => _ctx.inputHovering = true),
            onMouseleave: _cache[21] || (_cache[21] = ($event) => _ctx.inputHovering = false)
          }, [
            _ctx.multiple ? (openBlock(), createElementBlock("div", {
              key: 0,
              ref: "tags",
              tabindex: "-1",
              class: normalizeClass(_ctx.tagsKls),
              style: normalizeStyle(_ctx.selectTagsStyle),
              onClick: _cache[15] || (_cache[15] = (...args) => _ctx.focus && _ctx.focus(...args))
            }, [
              _ctx.collapseTags && _ctx.selected.length ? (openBlock(), createBlock(Transition, {
                key: 0,
                onAfterLeave: _ctx.resetInputHeight
              }, {
                default: withCtx(() => [
                  createElementVNode("span", {
                    class: normalizeClass(_ctx.tagWrapperKls)
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.showTagList, (item) => {
                      return openBlock(), createBlock(_component_el_tag, {
                        key: _ctx.getValueKey(item),
                        closable: !_ctx.selectDisabled && !item.isDisabled,
                        size: _ctx.collapseTagSize,
                        hit: item.hitState,
                        type: _ctx.tagType,
                        "disable-transitions": "",
                        onClose: ($event) => _ctx.deleteTag($event, item)
                      }, {
                        default: withCtx(() => [
                          createElementVNode("span", {
                            class: normalizeClass(_ctx.nsSelect.e("tags-text")),
                            style: normalizeStyle(_ctx.tagTextStyle)
                          }, toDisplayString(item.currentLabel), 7)
                        ]),
                        _: 2
                      }, 1032, ["closable", "size", "hit", "type", "onClose"]);
                    }), 128)),
                    _ctx.selected.length > _ctx.maxCollapseTags ? (openBlock(), createBlock(_component_el_tag, {
                      key: 0,
                      closable: false,
                      size: _ctx.collapseTagSize,
                      type: _ctx.tagType,
                      "disable-transitions": ""
                    }, {
                      default: withCtx(() => [
                        _ctx.collapseTagsTooltip ? (openBlock(), createBlock(_component_el_tooltip, {
                          key: 0,
                          ref: "tagTooltipRef",
                          disabled: _ctx.dropMenuVisible,
                          "fallback-placements": ["bottom", "top", "right", "left"],
                          effect: _ctx.effect,
                          placement: "bottom",
                          teleported: _ctx.teleported
                        }, {
                          default: withCtx(() => [
                            createElementVNode("span", {
                              class: normalizeClass(_ctx.nsSelect.e("tags-text"))
                            }, "+ " + toDisplayString(_ctx.selected.length - _ctx.maxCollapseTags), 3)
                          ]),
                          content: withCtx(() => [
                            createElementVNode("div", {
                              class: normalizeClass(_ctx.nsSelect.e("collapse-tags"))
                            }, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.collapseTagList, (item) => {
                                return openBlock(), createElementBlock("div", {
                                  key: _ctx.getValueKey(item),
                                  class: normalizeClass(_ctx.nsSelect.e("collapse-tag"))
                                }, [
                                  createVNode(_component_el_tag, {
                                    class: "in-tooltip",
                                    closable: !_ctx.selectDisabled && !item.isDisabled,
                                    size: _ctx.collapseTagSize,
                                    hit: item.hitState,
                                    type: _ctx.tagType,
                                    "disable-transitions": "",
                                    style: { margin: "2px" },
                                    onClose: ($event) => _ctx.handleDeleteTooltipTag($event, item)
                                  }, {
                                    default: withCtx(() => [
                                      createElementVNode("span", {
                                        class: normalizeClass(_ctx.nsSelect.e("tags-text")),
                                        style: normalizeStyle({
                                          maxWidth: _ctx.inputWidth - 75 + "px"
                                        })
                                      }, toDisplayString(item.currentLabel), 7)
                                    ]),
                                    _: 2
                                  }, 1032, ["closable", "size", "hit", "type", "onClose"])
                                ], 2);
                              }), 128))
                            ], 2)
                          ]),
                          _: 1
                        }, 8, ["disabled", "effect", "teleported"])) : (openBlock(), createElementBlock("span", {
                          key: 1,
                          class: normalizeClass(_ctx.nsSelect.e("tags-text"))
                        }, "+ " + toDisplayString(_ctx.selected.length - _ctx.maxCollapseTags), 3))
                      ]),
                      _: 1
                    }, 8, ["size", "type"])) : createCommentVNode("v-if", true)
                  ], 2)
                ]),
                _: 1
              }, 8, ["onAfterLeave"])) : createCommentVNode("v-if", true),
              !_ctx.collapseTags ? (openBlock(), createBlock(Transition, {
                key: 1,
                onAfterLeave: _ctx.resetInputHeight
              }, {
                default: withCtx(() => [
                  createElementVNode("span", {
                    class: normalizeClass(_ctx.tagWrapperKls),
                    style: normalizeStyle(_ctx.prefixWidth && _ctx.selected.length ? { marginLeft: `${_ctx.prefixWidth}px` } : "")
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.selected, (item) => {
                      return openBlock(), createBlock(_component_el_tag, {
                        key: _ctx.getValueKey(item),
                        closable: !_ctx.selectDisabled && !item.isDisabled,
                        size: _ctx.collapseTagSize,
                        hit: item.hitState,
                        type: _ctx.tagType,
                        "disable-transitions": "",
                        onClose: ($event) => _ctx.deleteTag($event, item)
                      }, {
                        default: withCtx(() => [
                          createElementVNode("span", {
                            class: normalizeClass(_ctx.nsSelect.e("tags-text")),
                            style: normalizeStyle({ maxWidth: _ctx.inputWidth - 75 + "px" })
                          }, toDisplayString(item.currentLabel), 7)
                        ]),
                        _: 2
                      }, 1032, ["closable", "size", "hit", "type", "onClose"]);
                    }), 128))
                  ], 6)
                ]),
                _: 1
              }, 8, ["onAfterLeave"])) : createCommentVNode("v-if", true),
              _ctx.filterable && !_ctx.selectDisabled ? withDirectives((openBlock(), createElementBlock("input", {
                key: 2,
                ref: "input",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.query = $event),
                type: "text",
                class: normalizeClass(_ctx.inputKls),
                disabled: _ctx.selectDisabled,
                autocomplete: _ctx.autocomplete,
                style: normalizeStyle(_ctx.inputStyle),
                role: "combobox",
                "aria-activedescendant": ((_a = _ctx.hoverOption) == null ? void 0 : _a.id) || "",
                "aria-controls": _ctx.contentId,
                "aria-expanded": _ctx.dropMenuVisible,
                "aria-label": _ctx.ariaLabel,
                "aria-autocomplete": "none",
                "aria-haspopup": "listbox",
                onFocus: _cache[1] || (_cache[1] = (...args) => _ctx.handleFocus && _ctx.handleFocus(...args)),
                onBlur: _cache[2] || (_cache[2] = (...args) => _ctx.handleBlur && _ctx.handleBlur(...args)),
                onKeyup: _cache[3] || (_cache[3] = (...args) => _ctx.managePlaceholder && _ctx.managePlaceholder(...args)),
                onKeydown: [
                  _cache[4] || (_cache[4] = (...args) => _ctx.resetInputState && _ctx.resetInputState(...args)),
                  _cache[5] || (_cache[5] = withKeys(withModifiers(($event) => _ctx.navigateOptions("next"), ["prevent"]), ["down"])),
                  _cache[6] || (_cache[6] = withKeys(withModifiers(($event) => _ctx.navigateOptions("prev"), ["prevent"]), ["up"])),
                  _cache[7] || (_cache[7] = withKeys((...args) => _ctx.handleKeydownEscape && _ctx.handleKeydownEscape(...args), ["esc"])),
                  _cache[8] || (_cache[8] = withKeys(withModifiers((...args) => _ctx.selectOption && _ctx.selectOption(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[9] || (_cache[9] = withKeys((...args) => _ctx.deletePrevTag && _ctx.deletePrevTag(...args), ["delete"])),
                  _cache[10] || (_cache[10] = withKeys(($event) => _ctx.visible = false, ["tab"]))
                ],
                onCompositionstart: _cache[11] || (_cache[11] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onCompositionupdate: _cache[12] || (_cache[12] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onCompositionend: _cache[13] || (_cache[13] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onInput: _cache[14] || (_cache[14] = (...args) => _ctx.debouncedQueryChange && _ctx.debouncedQueryChange(...args))
              }, null, 46, _hoisted_1)), [
                [vModelText, _ctx.query]
              ]) : createCommentVNode("v-if", true)
            ], 6)) : createCommentVNode("v-if", true),
            _ctx.isIOS && !_ctx.multiple && _ctx.filterable && _ctx.readonly ? (openBlock(), createElementBlock("input", {
              key: 1,
              ref: "iOSInput",
              class: normalizeClass(_ctx.iOSInputKls),
              disabled: _ctx.selectDisabled,
              type: "text"
            }, null, 10, _hoisted_2)) : createCommentVNode("v-if", true),
            createVNode(_component_el_input, {
              id: _ctx.id,
              ref: "reference",
              modelValue: _ctx.selectedLabel,
              "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => _ctx.selectedLabel = $event),
              type: "text",
              placeholder: typeof _ctx.currentPlaceholder === "function" ? _ctx.currentPlaceholder() : _ctx.currentPlaceholder,
              name: _ctx.name,
              autocomplete: _ctx.autocomplete,
              size: _ctx.selectSize,
              disabled: _ctx.selectDisabled,
              readonly: _ctx.readonly,
              "validate-event": false,
              class: normalizeClass([_ctx.nsSelect.is("focus", _ctx.visible)]),
              tabindex: _ctx.multiple && _ctx.filterable ? -1 : void 0,
              role: "combobox",
              "aria-activedescendant": ((_b = _ctx.hoverOption) == null ? void 0 : _b.id) || "",
              "aria-controls": _ctx.contentId,
              "aria-expanded": _ctx.dropMenuVisible,
              label: _ctx.ariaLabel,
              "aria-autocomplete": "none",
              "aria-haspopup": "listbox",
              onFocus: _ctx.handleFocus,
              onBlur: _ctx.handleBlur,
              onInput: _ctx.debouncedOnInputChange,
              onPaste: _ctx.debouncedOnInputChange,
              onCompositionstart: _ctx.handleComposition,
              onCompositionupdate: _ctx.handleComposition,
              onCompositionend: _ctx.handleComposition,
              onKeydown: [
                _cache[17] || (_cache[17] = withKeys(withModifiers(($event) => _ctx.navigateOptions("next"), ["stop", "prevent"]), ["down"])),
                _cache[18] || (_cache[18] = withKeys(withModifiers(($event) => _ctx.navigateOptions("prev"), ["stop", "prevent"]), ["up"])),
                withKeys(withModifiers(_ctx.selectOption, ["stop", "prevent"]), ["enter"]),
                withKeys(_ctx.handleKeydownEscape, ["esc"]),
                _cache[19] || (_cache[19] = withKeys(($event) => _ctx.visible = false, ["tab"]))
              ]
            }, createSlots({
              suffix: withCtx(() => [
                _ctx.iconComponent && !_ctx.showClose ? (openBlock(), createBlock(_component_el_icon, {
                  key: 0,
                  class: normalizeClass([_ctx.nsSelect.e("caret"), _ctx.nsSelect.e("icon"), _ctx.iconReverse])
                }, {
                  default: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(_ctx.iconComponent)))
                  ]),
                  _: 1
                }, 8, ["class"])) : createCommentVNode("v-if", true),
                _ctx.showClose && _ctx.clearIcon ? (openBlock(), createBlock(_component_el_icon, {
                  key: 1,
                  class: normalizeClass([_ctx.nsSelect.e("caret"), _ctx.nsSelect.e("icon")]),
                  onClick: _ctx.handleClearClick
                }, {
                  default: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(_ctx.clearIcon)))
                  ]),
                  _: 1
                }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true)
              ]),
              _: 2
            }, [
              _ctx.$slots.prefix ? {
                name: "prefix",
                fn: withCtx(() => [
                  createElementVNode("div", _hoisted_3, [
                    renderSlot(_ctx.$slots, "prefix")
                  ])
                ])
              } : void 0
            ]), 1032, ["id", "modelValue", "placeholder", "name", "autocomplete", "size", "disabled", "readonly", "class", "tabindex", "aria-activedescendant", "aria-controls", "aria-expanded", "label", "onFocus", "onBlur", "onInput", "onPaste", "onCompositionstart", "onCompositionupdate", "onCompositionend", "onKeydown"])
          ], 32)
        ];
      }),
      content: withCtx(() => [
        createVNode(_component_el_select_menu, null, createSlots({
          default: withCtx(() => [
            withDirectives(createVNode(_component_el_scrollbar, {
              id: _ctx.contentId,
              ref: "scrollbar",
              tag: "ul",
              "wrap-class": _ctx.nsSelect.be("dropdown", "wrap"),
              "view-class": _ctx.nsSelect.be("dropdown", "list"),
              class: normalizeClass(_ctx.scrollbarKls),
              role: "listbox",
              "aria-label": _ctx.ariaLabel,
              "aria-orientation": "vertical"
            }, {
              default: withCtx(() => [
                _ctx.showNewOption ? (openBlock(), createBlock(_component_el_option, {
                  key: 0,
                  value: _ctx.query,
                  created: true
                }, null, 8, ["value"])) : createCommentVNode("v-if", true),
                createVNode(_component_el_options, { onUpdateOptions: _ctx.onOptionsRendered }, {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "default")
                  ]),
                  _: 3
                }, 8, ["onUpdateOptions"])
              ]),
              _: 3
            }, 8, ["id", "wrap-class", "view-class", "class", "aria-label"]), [
              [vShow, _ctx.options.size > 0 && !_ctx.loading]
            ]),
            _ctx.emptyText && (!_ctx.allowCreate || _ctx.loading || _ctx.allowCreate && _ctx.options.size === 0) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              _ctx.$slots.empty ? renderSlot(_ctx.$slots, "empty", { key: 0 }) : (openBlock(), createElementBlock("p", {
                key: 1,
                class: normalizeClass(_ctx.nsSelect.be("dropdown", "empty"))
              }, toDisplayString(_ctx.emptyText), 3))
            ], 64)) : createCommentVNode("v-if", true)
          ]),
          _: 2
        }, [
          _ctx.$slots.header ? {
            name: "header",
            fn: withCtx(() => [
              renderSlot(_ctx.$slots, "header")
            ])
          } : void 0,
          _ctx.$slots.footer ? {
            name: "footer",
            fn: withCtx(() => [
              renderSlot(_ctx.$slots, "footer")
            ])
          } : void 0
        ]), 1024)
      ]),
      _: 3
    }, 8, ["visible", "placement", "teleported", "popper-class", "popper-options", "effect", "transition", "persistent", "onShow"])
  ], 34)), [
    [_directive_click_outside, _ctx.handleClose, _ctx.popperPaneRef]
  ]);
}
var Select = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select/src/select.vue"]]);

export { Select as default };
//# sourceMappingURL=select.mjs.map
