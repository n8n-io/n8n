'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core$1 = require('@vueuse/core');
var core = require('@popperjs/core');
require('../../../directives/index.js');
require('../../../hooks/index.js');
var index = require('../../input/index.js');
var index$3 = require('../../tooltip/index.js');
var index$2 = require('../../scrollbar/index.js');
var index$1 = require('../../tag/index.js');
var index$4 = require('../../icon/index.js');
require('../../../constants/index.js');
require('../../../utils/index.js');
var iconsVue = require('@element-plus/icons-vue');
var option = require('./option.js');
var selectDropdown = require('./select-dropdown.js');
var useSelect = require('./useSelect.js');
var token = require('./token.js');
var options = require('./options.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index$5 = require('../../../directives/click-outside/index.js');
var validator = require('../../../utils/vue/validator.js');
var content = require('../../tooltip/src/content.js');
var icon = require('../../../utils/vue/icon.js');
var tag = require('../../tag/src/tag.js');
var event = require('../../../constants/event.js');
var index$6 = require('../../../hooks/use-namespace/index.js');
var index$7 = require('../../../hooks/use-locale/index.js');
var index$8 = require('../../../hooks/use-id/index.js');

const COMPONENT_NAME = "ElSelect";
const _sfc_main = vue.defineComponent({
  name: COMPONENT_NAME,
  componentName: COMPONENT_NAME,
  components: {
    ElInput: index.ElInput,
    ElSelectMenu: selectDropdown["default"],
    ElOption: option["default"],
    ElOptions: options["default"],
    ElTag: index$1.ElTag,
    ElScrollbar: index$2.ElScrollbar,
    ElTooltip: index$3.ElTooltip,
    ElIcon: index$4.ElIcon
  },
  directives: { ClickOutside: index$5["default"] },
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
      validator: validator.isValidComponentSize
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
    teleported: content.useTooltipContentProps.teleported,
    persistent: {
      type: Boolean,
      default: true
    },
    clearIcon: {
      type: icon.iconPropType,
      default: iconsVue.CircleClose
    },
    fitInputWidth: Boolean,
    suffixIcon: {
      type: icon.iconPropType,
      default: iconsVue.ArrowDown
    },
    tagType: { ...tag.tagProps.type, default: "info" },
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
      values: core.placements,
      default: "bottom-start"
    },
    ariaLabel: {
      type: String,
      default: void 0
    }
  },
  emits: [
    event.UPDATE_MODEL_EVENT,
    event.CHANGE_EVENT,
    "remove-tag",
    "clear",
    "visible-change",
    "focus",
    "blur"
  ],
  setup(props, ctx) {
    const nsSelect = index$6.useNamespace("select");
    const nsInput = index$6.useNamespace("input");
    const { t } = index$7.useLocale();
    const contentId = index$8.useId();
    const states = useSelect.useSelectStates(props);
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
    } = useSelect.useSelect(props, states, ctx);
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
    } = vue.toRefs(states);
    const wrapperKls = vue.computed(() => {
      const classList = [nsSelect.b()];
      const _selectSize = vue.unref(selectSize);
      if (_selectSize) {
        classList.push(nsSelect.m(_selectSize));
      }
      if (props.disabled) {
        classList.push(nsSelect.m("disabled"));
      }
      return classList;
    });
    const tagsKls = vue.computed(() => [
      nsSelect.e("tags"),
      nsSelect.is("disabled", vue.unref(selectDisabled))
    ]);
    const tagWrapperKls = vue.computed(() => [
      nsSelect.b("tags-wrapper"),
      { "has-prefix": vue.unref(prefixWidth) && vue.unref(selected).length }
    ]);
    const inputKls = vue.computed(() => [
      nsSelect.e("input"),
      nsSelect.is(vue.unref(selectSize)),
      nsSelect.is("disabled", vue.unref(selectDisabled))
    ]);
    const iOSInputKls = vue.computed(() => [
      nsSelect.e("input"),
      nsSelect.is(vue.unref(selectSize)),
      nsSelect.em("input", "iOS")
    ]);
    const scrollbarKls = vue.computed(() => [
      nsSelect.is("empty", !props.allowCreate && Boolean(vue.unref(query)) && vue.unref(filteredOptionsCount) === 0)
    ]);
    const tagTextStyle = vue.computed(() => {
      const maxWidth = vue.unref(inputWidth) > 123 && vue.unref(selected).length > props.maxCollapseTags ? vue.unref(inputWidth) - 123 : vue.unref(inputWidth) - 75;
      return { maxWidth: `${maxWidth}px` };
    });
    const inputStyle = vue.computed(() => ({
      marginLeft: `${vue.unref(prefixWidth)}px`,
      flexGrow: 1,
      width: `${vue.unref(inputLength) / (vue.unref(inputWidth) - 32)}%`,
      maxWidth: `${vue.unref(inputWidth) - 42}px`
    }));
    vue.provide(token.selectKey, vue.reactive({
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
    vue.onMounted(() => {
      states.cachedPlaceHolder = currentPlaceholder.value = props.placeholder || (() => t("el.select.placeholder"));
      if (props.multiple && Array.isArray(props.modelValue) && props.modelValue.length > 0) {
        currentPlaceholder.value = "";
      }
      core$1.useResizeObserver(selectWrapper, handleResize);
      if (props.remote && props.multiple) {
        resetInputHeight();
      }
      vue.nextTick(() => {
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
      ctx.emit(event.UPDATE_MODEL_EVENT, []);
    }
    if (!props.multiple && Array.isArray(props.modelValue)) {
      ctx.emit(event.UPDATE_MODEL_EVENT, "");
    }
    const popperPaneRef = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = tooltipRef.value) == null ? void 0 : _a.popperRef) == null ? void 0 : _b.contentRef;
    });
    const onOptionsRendered = (v) => {
      optionList.value = v;
    };
    return {
      isIOS: core$1.isIOS,
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
  const _component_el_tag = vue.resolveComponent("el-tag");
  const _component_el_tooltip = vue.resolveComponent("el-tooltip");
  const _component_el_icon = vue.resolveComponent("el-icon");
  const _component_el_input = vue.resolveComponent("el-input");
  const _component_el_option = vue.resolveComponent("el-option");
  const _component_el_options = vue.resolveComponent("el-options");
  const _component_el_scrollbar = vue.resolveComponent("el-scrollbar");
  const _component_el_select_menu = vue.resolveComponent("el-select-menu");
  const _directive_click_outside = vue.resolveDirective("click-outside");
  return vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
    ref: "selectWrapper",
    class: vue.normalizeClass(_ctx.wrapperKls),
    onMouseenter: _cache[22] || (_cache[22] = (...args) => _ctx.handleMouseEnter && _ctx.handleMouseEnter(...args)),
    onMouseleave: _cache[23] || (_cache[23] = (...args) => _ctx.handleMouseLeave && _ctx.handleMouseLeave(...args)),
    onClick: _cache[24] || (_cache[24] = vue.withModifiers((...args) => _ctx.toggleMenu && _ctx.toggleMenu(...args), ["stop"]))
  }, [
    vue.createVNode(_component_el_tooltip, {
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
      default: vue.withCtx(() => {
        var _a, _b;
        return [
          vue.createElementVNode("div", {
            class: "select-trigger",
            onMouseenter: _cache[20] || (_cache[20] = ($event) => _ctx.inputHovering = true),
            onMouseleave: _cache[21] || (_cache[21] = ($event) => _ctx.inputHovering = false)
          }, [
            _ctx.multiple ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 0,
              ref: "tags",
              tabindex: "-1",
              class: vue.normalizeClass(_ctx.tagsKls),
              style: vue.normalizeStyle(_ctx.selectTagsStyle),
              onClick: _cache[15] || (_cache[15] = (...args) => _ctx.focus && _ctx.focus(...args))
            }, [
              _ctx.collapseTags && _ctx.selected.length ? (vue.openBlock(), vue.createBlock(vue.Transition, {
                key: 0,
                onAfterLeave: _ctx.resetInputHeight
              }, {
                default: vue.withCtx(() => [
                  vue.createElementVNode("span", {
                    class: vue.normalizeClass(_ctx.tagWrapperKls)
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.showTagList, (item) => {
                      return vue.openBlock(), vue.createBlock(_component_el_tag, {
                        key: _ctx.getValueKey(item),
                        closable: !_ctx.selectDisabled && !item.isDisabled,
                        size: _ctx.collapseTagSize,
                        hit: item.hitState,
                        type: _ctx.tagType,
                        "disable-transitions": "",
                        onClose: ($event) => _ctx.deleteTag($event, item)
                      }, {
                        default: vue.withCtx(() => [
                          vue.createElementVNode("span", {
                            class: vue.normalizeClass(_ctx.nsSelect.e("tags-text")),
                            style: vue.normalizeStyle(_ctx.tagTextStyle)
                          }, vue.toDisplayString(item.currentLabel), 7)
                        ]),
                        _: 2
                      }, 1032, ["closable", "size", "hit", "type", "onClose"]);
                    }), 128)),
                    _ctx.selected.length > _ctx.maxCollapseTags ? (vue.openBlock(), vue.createBlock(_component_el_tag, {
                      key: 0,
                      closable: false,
                      size: _ctx.collapseTagSize,
                      type: _ctx.tagType,
                      "disable-transitions": ""
                    }, {
                      default: vue.withCtx(() => [
                        _ctx.collapseTagsTooltip ? (vue.openBlock(), vue.createBlock(_component_el_tooltip, {
                          key: 0,
                          ref: "tagTooltipRef",
                          disabled: _ctx.dropMenuVisible,
                          "fallback-placements": ["bottom", "top", "right", "left"],
                          effect: _ctx.effect,
                          placement: "bottom",
                          teleported: _ctx.teleported
                        }, {
                          default: vue.withCtx(() => [
                            vue.createElementVNode("span", {
                              class: vue.normalizeClass(_ctx.nsSelect.e("tags-text"))
                            }, "+ " + vue.toDisplayString(_ctx.selected.length - _ctx.maxCollapseTags), 3)
                          ]),
                          content: vue.withCtx(() => [
                            vue.createElementVNode("div", {
                              class: vue.normalizeClass(_ctx.nsSelect.e("collapse-tags"))
                            }, [
                              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.collapseTagList, (item) => {
                                return vue.openBlock(), vue.createElementBlock("div", {
                                  key: _ctx.getValueKey(item),
                                  class: vue.normalizeClass(_ctx.nsSelect.e("collapse-tag"))
                                }, [
                                  vue.createVNode(_component_el_tag, {
                                    class: "in-tooltip",
                                    closable: !_ctx.selectDisabled && !item.isDisabled,
                                    size: _ctx.collapseTagSize,
                                    hit: item.hitState,
                                    type: _ctx.tagType,
                                    "disable-transitions": "",
                                    style: { margin: "2px" },
                                    onClose: ($event) => _ctx.handleDeleteTooltipTag($event, item)
                                  }, {
                                    default: vue.withCtx(() => [
                                      vue.createElementVNode("span", {
                                        class: vue.normalizeClass(_ctx.nsSelect.e("tags-text")),
                                        style: vue.normalizeStyle({
                                          maxWidth: _ctx.inputWidth - 75 + "px"
                                        })
                                      }, vue.toDisplayString(item.currentLabel), 7)
                                    ]),
                                    _: 2
                                  }, 1032, ["closable", "size", "hit", "type", "onClose"])
                                ], 2);
                              }), 128))
                            ], 2)
                          ]),
                          _: 1
                        }, 8, ["disabled", "effect", "teleported"])) : (vue.openBlock(), vue.createElementBlock("span", {
                          key: 1,
                          class: vue.normalizeClass(_ctx.nsSelect.e("tags-text"))
                        }, "+ " + vue.toDisplayString(_ctx.selected.length - _ctx.maxCollapseTags), 3))
                      ]),
                      _: 1
                    }, 8, ["size", "type"])) : vue.createCommentVNode("v-if", true)
                  ], 2)
                ]),
                _: 1
              }, 8, ["onAfterLeave"])) : vue.createCommentVNode("v-if", true),
              !_ctx.collapseTags ? (vue.openBlock(), vue.createBlock(vue.Transition, {
                key: 1,
                onAfterLeave: _ctx.resetInputHeight
              }, {
                default: vue.withCtx(() => [
                  vue.createElementVNode("span", {
                    class: vue.normalizeClass(_ctx.tagWrapperKls),
                    style: vue.normalizeStyle(_ctx.prefixWidth && _ctx.selected.length ? { marginLeft: `${_ctx.prefixWidth}px` } : "")
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.selected, (item) => {
                      return vue.openBlock(), vue.createBlock(_component_el_tag, {
                        key: _ctx.getValueKey(item),
                        closable: !_ctx.selectDisabled && !item.isDisabled,
                        size: _ctx.collapseTagSize,
                        hit: item.hitState,
                        type: _ctx.tagType,
                        "disable-transitions": "",
                        onClose: ($event) => _ctx.deleteTag($event, item)
                      }, {
                        default: vue.withCtx(() => [
                          vue.createElementVNode("span", {
                            class: vue.normalizeClass(_ctx.nsSelect.e("tags-text")),
                            style: vue.normalizeStyle({ maxWidth: _ctx.inputWidth - 75 + "px" })
                          }, vue.toDisplayString(item.currentLabel), 7)
                        ]),
                        _: 2
                      }, 1032, ["closable", "size", "hit", "type", "onClose"]);
                    }), 128))
                  ], 6)
                ]),
                _: 1
              }, 8, ["onAfterLeave"])) : vue.createCommentVNode("v-if", true),
              _ctx.filterable && !_ctx.selectDisabled ? vue.withDirectives((vue.openBlock(), vue.createElementBlock("input", {
                key: 2,
                ref: "input",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.query = $event),
                type: "text",
                class: vue.normalizeClass(_ctx.inputKls),
                disabled: _ctx.selectDisabled,
                autocomplete: _ctx.autocomplete,
                style: vue.normalizeStyle(_ctx.inputStyle),
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
                  _cache[5] || (_cache[5] = vue.withKeys(vue.withModifiers(($event) => _ctx.navigateOptions("next"), ["prevent"]), ["down"])),
                  _cache[6] || (_cache[6] = vue.withKeys(vue.withModifiers(($event) => _ctx.navigateOptions("prev"), ["prevent"]), ["up"])),
                  _cache[7] || (_cache[7] = vue.withKeys((...args) => _ctx.handleKeydownEscape && _ctx.handleKeydownEscape(...args), ["esc"])),
                  _cache[8] || (_cache[8] = vue.withKeys(vue.withModifiers((...args) => _ctx.selectOption && _ctx.selectOption(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[9] || (_cache[9] = vue.withKeys((...args) => _ctx.deletePrevTag && _ctx.deletePrevTag(...args), ["delete"])),
                  _cache[10] || (_cache[10] = vue.withKeys(($event) => _ctx.visible = false, ["tab"]))
                ],
                onCompositionstart: _cache[11] || (_cache[11] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onCompositionupdate: _cache[12] || (_cache[12] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onCompositionend: _cache[13] || (_cache[13] = (...args) => _ctx.handleComposition && _ctx.handleComposition(...args)),
                onInput: _cache[14] || (_cache[14] = (...args) => _ctx.debouncedQueryChange && _ctx.debouncedQueryChange(...args))
              }, null, 46, _hoisted_1)), [
                [vue.vModelText, _ctx.query]
              ]) : vue.createCommentVNode("v-if", true)
            ], 6)) : vue.createCommentVNode("v-if", true),
            _ctx.isIOS && !_ctx.multiple && _ctx.filterable && _ctx.readonly ? (vue.openBlock(), vue.createElementBlock("input", {
              key: 1,
              ref: "iOSInput",
              class: vue.normalizeClass(_ctx.iOSInputKls),
              disabled: _ctx.selectDisabled,
              type: "text"
            }, null, 10, _hoisted_2)) : vue.createCommentVNode("v-if", true),
            vue.createVNode(_component_el_input, {
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
              class: vue.normalizeClass([_ctx.nsSelect.is("focus", _ctx.visible)]),
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
                _cache[17] || (_cache[17] = vue.withKeys(vue.withModifiers(($event) => _ctx.navigateOptions("next"), ["stop", "prevent"]), ["down"])),
                _cache[18] || (_cache[18] = vue.withKeys(vue.withModifiers(($event) => _ctx.navigateOptions("prev"), ["stop", "prevent"]), ["up"])),
                vue.withKeys(vue.withModifiers(_ctx.selectOption, ["stop", "prevent"]), ["enter"]),
                vue.withKeys(_ctx.handleKeydownEscape, ["esc"]),
                _cache[19] || (_cache[19] = vue.withKeys(($event) => _ctx.visible = false, ["tab"]))
              ]
            }, vue.createSlots({
              suffix: vue.withCtx(() => [
                _ctx.iconComponent && !_ctx.showClose ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
                  key: 0,
                  class: vue.normalizeClass([_ctx.nsSelect.e("caret"), _ctx.nsSelect.e("icon"), _ctx.iconReverse])
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.iconComponent)))
                  ]),
                  _: 1
                }, 8, ["class"])) : vue.createCommentVNode("v-if", true),
                _ctx.showClose && _ctx.clearIcon ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
                  key: 1,
                  class: vue.normalizeClass([_ctx.nsSelect.e("caret"), _ctx.nsSelect.e("icon")]),
                  onClick: _ctx.handleClearClick
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.clearIcon)))
                  ]),
                  _: 1
                }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true)
              ]),
              _: 2
            }, [
              _ctx.$slots.prefix ? {
                name: "prefix",
                fn: vue.withCtx(() => [
                  vue.createElementVNode("div", _hoisted_3, [
                    vue.renderSlot(_ctx.$slots, "prefix")
                  ])
                ])
              } : void 0
            ]), 1032, ["id", "modelValue", "placeholder", "name", "autocomplete", "size", "disabled", "readonly", "class", "tabindex", "aria-activedescendant", "aria-controls", "aria-expanded", "label", "onFocus", "onBlur", "onInput", "onPaste", "onCompositionstart", "onCompositionupdate", "onCompositionend", "onKeydown"])
          ], 32)
        ];
      }),
      content: vue.withCtx(() => [
        vue.createVNode(_component_el_select_menu, null, vue.createSlots({
          default: vue.withCtx(() => [
            vue.withDirectives(vue.createVNode(_component_el_scrollbar, {
              id: _ctx.contentId,
              ref: "scrollbar",
              tag: "ul",
              "wrap-class": _ctx.nsSelect.be("dropdown", "wrap"),
              "view-class": _ctx.nsSelect.be("dropdown", "list"),
              class: vue.normalizeClass(_ctx.scrollbarKls),
              role: "listbox",
              "aria-label": _ctx.ariaLabel,
              "aria-orientation": "vertical"
            }, {
              default: vue.withCtx(() => [
                _ctx.showNewOption ? (vue.openBlock(), vue.createBlock(_component_el_option, {
                  key: 0,
                  value: _ctx.query,
                  created: true
                }, null, 8, ["value"])) : vue.createCommentVNode("v-if", true),
                vue.createVNode(_component_el_options, { onUpdateOptions: _ctx.onOptionsRendered }, {
                  default: vue.withCtx(() => [
                    vue.renderSlot(_ctx.$slots, "default")
                  ]),
                  _: 3
                }, 8, ["onUpdateOptions"])
              ]),
              _: 3
            }, 8, ["id", "wrap-class", "view-class", "class", "aria-label"]), [
              [vue.vShow, _ctx.options.size > 0 && !_ctx.loading]
            ]),
            _ctx.emptyText && (!_ctx.allowCreate || _ctx.loading || _ctx.allowCreate && _ctx.options.size === 0) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
              _ctx.$slots.empty ? vue.renderSlot(_ctx.$slots, "empty", { key: 0 }) : (vue.openBlock(), vue.createElementBlock("p", {
                key: 1,
                class: vue.normalizeClass(_ctx.nsSelect.be("dropdown", "empty"))
              }, vue.toDisplayString(_ctx.emptyText), 3))
            ], 64)) : vue.createCommentVNode("v-if", true)
          ]),
          _: 2
        }, [
          _ctx.$slots.header ? {
            name: "header",
            fn: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "header")
            ])
          } : void 0,
          _ctx.$slots.footer ? {
            name: "footer",
            fn: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "footer")
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
var Select = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select/src/select.vue"]]);

exports["default"] = Select;
//# sourceMappingURL=select.js.map
