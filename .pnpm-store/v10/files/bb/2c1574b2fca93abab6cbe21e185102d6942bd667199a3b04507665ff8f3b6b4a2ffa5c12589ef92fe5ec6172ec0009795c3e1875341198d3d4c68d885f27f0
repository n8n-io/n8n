'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../directives/index.js');
var index$1 = require('../../tooltip/index.js');
var index = require('../../tag/index.js');
var index$2 = require('../../icon/index.js');
require('../../../constants/index.js');
var selectDropdown = require('./select-dropdown.js');
var useSelect = require('./useSelect.js');
var token = require('./token.js');
var defaults = require('./defaults.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index$3 = require('../../../directives/click-outside/index.js');
var event = require('../../../constants/event.js');
var shared = require('@vue/shared');

const _sfc_main = vue.defineComponent({
  name: "ElSelectV2",
  components: {
    ElSelectMenu: selectDropdown["default"],
    ElTag: index.ElTag,
    ElTooltip: index$1.ElTooltip,
    ElIcon: index$2.ElIcon
  },
  directives: { ClickOutside: index$3["default"], ModelText: vue.vModelText },
  props: defaults.SelectProps,
  emits: [
    event.UPDATE_MODEL_EVENT,
    event.CHANGE_EVENT,
    "remove-tag",
    "clear",
    "visible-change",
    "focus",
    "blur"
  ],
  setup(props, { emit }) {
    const modelValue = vue.computed(() => {
      const { modelValue: rawModelValue, multiple } = props;
      const fallback = multiple ? [] : void 0;
      if (shared.isArray(rawModelValue)) {
        return multiple ? rawModelValue : fallback;
      }
      return multiple ? fallback : rawModelValue;
    });
    const API = useSelect["default"](vue.reactive({
      ...vue.toRefs(props),
      modelValue
    }), emit);
    vue.provide(token.selectV2InjectionKey, {
      props: vue.reactive({
        ...vue.toRefs(props),
        height: API.popupHeight,
        modelValue
      }),
      popper: API.popper,
      onSelect: API.onSelect,
      onHover: API.onHover,
      onKeyboardNavigate: API.onKeyboardNavigate,
      onKeyboardSelect: API.onKeyboardSelect
    });
    return {
      ...API,
      modelValue
    };
  }
});
const _hoisted_1 = { key: 0 };
const _hoisted_2 = ["id", "autocomplete", "aria-expanded", "aria-labelledby", "disabled", "readonly", "name", "unselectable"];
const _hoisted_3 = ["textContent"];
const _hoisted_4 = ["id", "aria-labelledby", "aria-expanded", "autocomplete", "disabled", "name", "readonly", "unselectable"];
const _hoisted_5 = ["textContent"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_tag = vue.resolveComponent("el-tag");
  const _component_el_tooltip = vue.resolveComponent("el-tooltip");
  const _component_el_icon = vue.resolveComponent("el-icon");
  const _component_el_select_menu = vue.resolveComponent("el-select-menu");
  const _directive_model_text = vue.resolveDirective("model-text");
  const _directive_click_outside = vue.resolveDirective("click-outside");
  return vue.withDirectives((vue.openBlock(), vue.createElementBlock("div", {
    ref: "selectRef",
    class: vue.normalizeClass([_ctx.nsSelectV2.b(), _ctx.nsSelectV2.m(_ctx.selectSize)]),
    onClick: _cache[24] || (_cache[24] = vue.withModifiers((...args) => _ctx.toggleMenu && _ctx.toggleMenu(...args), ["stop"])),
    onMouseenter: _cache[25] || (_cache[25] = ($event) => _ctx.states.comboBoxHovering = true),
    onMouseleave: _cache[26] || (_cache[26] = ($event) => _ctx.states.comboBoxHovering = false)
  }, [
    vue.createVNode(_component_el_tooltip, {
      ref: "popper",
      visible: _ctx.dropdownMenuVisible,
      teleported: _ctx.teleported,
      "popper-class": [_ctx.nsSelectV2.e("popper"), _ctx.popperClass],
      "gpu-acceleration": false,
      "stop-popper-mouse-event": false,
      "popper-options": _ctx.popperOptions,
      "fallback-placements": ["bottom-start", "top-start", "right", "left"],
      effect: _ctx.effect,
      placement: _ctx.placement,
      pure: "",
      transition: `${_ctx.nsSelectV2.namespace.value}-zoom-in-top`,
      trigger: "click",
      persistent: _ctx.persistent,
      onBeforeShow: _ctx.handleMenuEnter,
      onHide: _cache[23] || (_cache[23] = ($event) => _ctx.states.inputValue = _ctx.states.displayInputValue)
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("div", {
          ref: "selectionRef",
          class: vue.normalizeClass([
            _ctx.nsSelectV2.e("wrapper"),
            _ctx.nsSelectV2.is("focused", _ctx.states.isComposing || _ctx.expanded),
            _ctx.nsSelectV2.is("hovering", _ctx.states.comboBoxHovering),
            _ctx.nsSelectV2.is("filterable", _ctx.filterable),
            _ctx.nsSelectV2.is("disabled", _ctx.selectDisabled)
          ])
        }, [
          _ctx.$slots.prefix ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_1, [
            vue.renderSlot(_ctx.$slots, "prefix")
          ])) : vue.createCommentVNode("v-if", true),
          _ctx.multiple ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass(_ctx.nsSelectV2.e("selection"))
          }, [
            _ctx.collapseTags && _ctx.modelValue.length > 0 ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.showTagList, (item) => {
                return vue.openBlock(), vue.createElementBlock("div", {
                  key: _ctx.getValueKey(_ctx.getValue(item)),
                  class: vue.normalizeClass(_ctx.nsSelectV2.e("selected-item"))
                }, [
                  vue.createVNode(_component_el_tag, {
                    closable: !_ctx.selectDisabled && !_ctx.getDisabled(item),
                    size: _ctx.collapseTagSize,
                    type: "info",
                    "disable-transitions": "",
                    onClose: ($event) => _ctx.deleteTag($event, item)
                  }, {
                    default: vue.withCtx(() => [
                      vue.createElementVNode("span", {
                        class: vue.normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                        style: vue.normalizeStyle({
                          maxWidth: `${_ctx.tagMaxWidth}px`
                        })
                      }, vue.toDisplayString(_ctx.getLabel(item)), 7)
                    ]),
                    _: 2
                  }, 1032, ["closable", "size", "onClose"])
                ], 2);
              }), 128)),
              vue.createElementVNode("div", {
                class: vue.normalizeClass(_ctx.nsSelectV2.e("selected-item"))
              }, [
                _ctx.modelValue.length > _ctx.maxCollapseTags ? (vue.openBlock(), vue.createBlock(_component_el_tag, {
                  key: 0,
                  closable: false,
                  size: _ctx.collapseTagSize,
                  type: "info",
                  "disable-transitions": ""
                }, {
                  default: vue.withCtx(() => [
                    _ctx.collapseTagsTooltip ? (vue.openBlock(), vue.createBlock(_component_el_tooltip, {
                      key: 0,
                      disabled: _ctx.dropdownMenuVisible,
                      "fallback-placements": ["bottom", "top", "right", "left"],
                      effect: _ctx.effect,
                      placement: "bottom",
                      teleported: false
                    }, {
                      default: vue.withCtx(() => [
                        vue.createElementVNode("span", {
                          class: vue.normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                          style: vue.normalizeStyle({
                            maxWidth: `${_ctx.tagMaxWidth}px`
                          })
                        }, " + " + vue.toDisplayString(_ctx.modelValue.length - _ctx.maxCollapseTags), 7)
                      ]),
                      content: vue.withCtx(() => [
                        vue.createElementVNode("div", {
                          class: vue.normalizeClass(_ctx.nsSelectV2.e("selection"))
                        }, [
                          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.collapseTagList, (selected) => {
                            return vue.openBlock(), vue.createElementBlock("div", {
                              key: _ctx.getValueKey(_ctx.getValue(selected)),
                              class: vue.normalizeClass(_ctx.nsSelectV2.e("selected-item"))
                            }, [
                              vue.createVNode(_component_el_tag, {
                                closable: !_ctx.selectDisabled && !_ctx.getDisabled(selected),
                                size: _ctx.collapseTagSize,
                                class: "in-tooltip",
                                type: "info",
                                "disable-transitions": "",
                                onClose: ($event) => _ctx.deleteTag($event, selected)
                              }, {
                                default: vue.withCtx(() => [
                                  vue.createElementVNode("span", {
                                    class: vue.normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                                    style: vue.normalizeStyle({
                                      maxWidth: `${_ctx.tagMaxWidth}px`
                                    })
                                  }, vue.toDisplayString(_ctx.getLabel(selected)), 7)
                                ]),
                                _: 2
                              }, 1032, ["closable", "size", "onClose"])
                            ], 2);
                          }), 128))
                        ], 2)
                      ]),
                      _: 1
                    }, 8, ["disabled", "effect"])) : (vue.openBlock(), vue.createElementBlock("span", {
                      key: 1,
                      class: vue.normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                      style: vue.normalizeStyle({
                        maxWidth: `${_ctx.tagMaxWidth}px`
                      })
                    }, " + " + vue.toDisplayString(_ctx.modelValue.length - _ctx.maxCollapseTags), 7))
                  ]),
                  _: 1
                }, 8, ["size"])) : vue.createCommentVNode("v-if", true)
              ], 2)
            ], 64)) : (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 1 }, vue.renderList(_ctx.states.cachedOptions, (selected) => {
              return vue.openBlock(), vue.createElementBlock("div", {
                key: _ctx.getValueKey(_ctx.getValue(selected)),
                class: vue.normalizeClass(_ctx.nsSelectV2.e("selected-item"))
              }, [
                vue.createVNode(_component_el_tag, {
                  closable: !_ctx.selectDisabled && !_ctx.getDisabled(selected),
                  size: _ctx.collapseTagSize,
                  type: "info",
                  "disable-transitions": "",
                  onClose: ($event) => _ctx.deleteTag($event, selected)
                }, {
                  default: vue.withCtx(() => [
                    vue.createElementVNode("span", {
                      class: vue.normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                      style: vue.normalizeStyle({
                        maxWidth: `${_ctx.tagMaxWidth}px`
                      })
                    }, vue.toDisplayString(_ctx.getLabel(selected)), 7)
                  ]),
                  _: 2
                }, 1032, ["closable", "size", "onClose"])
              ], 2);
            }), 128)),
            vue.createElementVNode("div", {
              class: vue.normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-wrapper")
              ]),
              style: vue.normalizeStyle(_ctx.inputWrapperStyle)
            }, [
              vue.withDirectives(vue.createElementVNode("input", {
                id: _ctx.id,
                ref: "inputRef",
                autocomplete: _ctx.autocomplete,
                "aria-autocomplete": "list",
                "aria-haspopup": "listbox",
                autocapitalize: "off",
                "aria-expanded": _ctx.expanded,
                "aria-labelledby": _ctx.label,
                class: vue.normalizeClass([
                  _ctx.nsSelectV2.is(_ctx.selectSize),
                  _ctx.nsSelectV2.e("combobox-input")
                ]),
                disabled: _ctx.disabled,
                role: "combobox",
                readonly: !_ctx.filterable,
                spellcheck: "false",
                type: "text",
                name: _ctx.name,
                unselectable: _ctx.expanded ? "on" : void 0,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = (...args) => _ctx.onUpdateInputValue && _ctx.onUpdateInputValue(...args)),
                onFocus: _cache[1] || (_cache[1] = (...args) => _ctx.handleFocus && _ctx.handleFocus(...args)),
                onBlur: _cache[2] || (_cache[2] = (...args) => _ctx.handleBlur && _ctx.handleBlur(...args)),
                onInput: _cache[3] || (_cache[3] = (...args) => _ctx.onInput && _ctx.onInput(...args)),
                onCompositionstart: _cache[4] || (_cache[4] = (...args) => _ctx.handleCompositionStart && _ctx.handleCompositionStart(...args)),
                onCompositionupdate: _cache[5] || (_cache[5] = (...args) => _ctx.handleCompositionUpdate && _ctx.handleCompositionUpdate(...args)),
                onCompositionend: _cache[6] || (_cache[6] = (...args) => _ctx.handleCompositionEnd && _ctx.handleCompositionEnd(...args)),
                onKeydown: [
                  _cache[7] || (_cache[7] = vue.withKeys(vue.withModifiers(($event) => _ctx.onKeyboardNavigate("backward"), ["stop", "prevent"]), ["up"])),
                  _cache[8] || (_cache[8] = vue.withKeys(vue.withModifiers(($event) => _ctx.onKeyboardNavigate("forward"), ["stop", "prevent"]), ["down"])),
                  _cache[9] || (_cache[9] = vue.withKeys(vue.withModifiers((...args) => _ctx.onKeyboardSelect && _ctx.onKeyboardSelect(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[10] || (_cache[10] = vue.withKeys(vue.withModifiers((...args) => _ctx.handleEsc && _ctx.handleEsc(...args), ["stop", "prevent"]), ["esc"])),
                  _cache[11] || (_cache[11] = vue.withKeys(vue.withModifiers((...args) => _ctx.handleDel && _ctx.handleDel(...args), ["stop"]), ["delete"]))
                ]
              }, null, 42, _hoisted_2), [
                [_directive_model_text, _ctx.states.displayInputValue]
              ]),
              _ctx.filterable ? (vue.openBlock(), vue.createElementBlock("span", {
                key: 0,
                ref: "calculatorRef",
                "aria-hidden": "true",
                class: vue.normalizeClass(_ctx.nsSelectV2.e("input-calculator")),
                textContent: vue.toDisplayString(_ctx.states.displayInputValue)
              }, null, 10, _hoisted_3)) : vue.createCommentVNode("v-if", true)
            ], 6)
          ], 2)) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 2 }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-wrapper")
              ])
            }, [
              vue.withDirectives(vue.createElementVNode("input", {
                id: _ctx.id,
                ref: "inputRef",
                "aria-autocomplete": "list",
                "aria-haspopup": "listbox",
                "aria-labelledby": _ctx.label,
                "aria-expanded": _ctx.expanded,
                autocapitalize: "off",
                autocomplete: _ctx.autocomplete,
                class: vue.normalizeClass(_ctx.nsSelectV2.e("combobox-input")),
                disabled: _ctx.disabled,
                name: _ctx.name,
                role: "combobox",
                readonly: !_ctx.filterable,
                spellcheck: "false",
                type: "text",
                unselectable: _ctx.expanded ? "on" : void 0,
                onCompositionstart: _cache[12] || (_cache[12] = (...args) => _ctx.handleCompositionStart && _ctx.handleCompositionStart(...args)),
                onCompositionupdate: _cache[13] || (_cache[13] = (...args) => _ctx.handleCompositionUpdate && _ctx.handleCompositionUpdate(...args)),
                onCompositionend: _cache[14] || (_cache[14] = (...args) => _ctx.handleCompositionEnd && _ctx.handleCompositionEnd(...args)),
                onFocus: _cache[15] || (_cache[15] = (...args) => _ctx.handleFocus && _ctx.handleFocus(...args)),
                onBlur: _cache[16] || (_cache[16] = (...args) => _ctx.handleBlur && _ctx.handleBlur(...args)),
                onInput: _cache[17] || (_cache[17] = (...args) => _ctx.onInput && _ctx.onInput(...args)),
                onKeydown: [
                  _cache[18] || (_cache[18] = vue.withKeys(vue.withModifiers(($event) => _ctx.onKeyboardNavigate("backward"), ["stop", "prevent"]), ["up"])),
                  _cache[19] || (_cache[19] = vue.withKeys(vue.withModifiers(($event) => _ctx.onKeyboardNavigate("forward"), ["stop", "prevent"]), ["down"])),
                  _cache[20] || (_cache[20] = vue.withKeys(vue.withModifiers((...args) => _ctx.onKeyboardSelect && _ctx.onKeyboardSelect(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[21] || (_cache[21] = vue.withKeys(vue.withModifiers((...args) => _ctx.handleEsc && _ctx.handleEsc(...args), ["stop", "prevent"]), ["esc"]))
                ],
                "onUpdate:modelValue": _cache[22] || (_cache[22] = (...args) => _ctx.onUpdateInputValue && _ctx.onUpdateInputValue(...args))
              }, null, 42, _hoisted_4), [
                [_directive_model_text, _ctx.states.displayInputValue]
              ])
            ], 2),
            _ctx.filterable ? (vue.openBlock(), vue.createElementBlock("span", {
              key: 0,
              ref: "calculatorRef",
              "aria-hidden": "true",
              class: vue.normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-calculator")
              ]),
              textContent: vue.toDisplayString(_ctx.states.displayInputValue)
            }, null, 10, _hoisted_5)) : vue.createCommentVNode("v-if", true)
          ], 64)),
          _ctx.shouldShowPlaceholder ? (vue.openBlock(), vue.createElementBlock("span", {
            key: 3,
            class: vue.normalizeClass([
              _ctx.nsSelectV2.e("placeholder"),
              _ctx.nsSelectV2.is("transparent", _ctx.multiple ? _ctx.modelValue.length === 0 : !_ctx.hasModelValue)
            ])
          }, vue.toDisplayString(_ctx.currentPlaceholder), 3)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("span", {
            class: vue.normalizeClass(_ctx.nsSelectV2.e("suffix"))
          }, [
            _ctx.iconComponent ? vue.withDirectives((vue.openBlock(), vue.createBlock(_component_el_icon, {
              key: 0,
              class: vue.normalizeClass([_ctx.nsSelectV2.e("caret"), _ctx.nsInput.e("icon"), _ctx.iconReverse])
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.iconComponent)))
              ]),
              _: 1
            }, 8, ["class"])), [
              [vue.vShow, !_ctx.showClearBtn]
            ]) : vue.createCommentVNode("v-if", true),
            _ctx.showClearBtn && _ctx.clearIcon ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
              key: 1,
              class: vue.normalizeClass([_ctx.nsSelectV2.e("caret"), _ctx.nsInput.e("icon")]),
              onClick: vue.withModifiers(_ctx.handleClear, ["prevent", "stop"])
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.clearIcon)))
              ]),
              _: 1
            }, 8, ["class", "onClick"])) : vue.createCommentVNode("v-if", true),
            _ctx.validateState && _ctx.validateIcon ? (vue.openBlock(), vue.createBlock(_component_el_icon, {
              key: 2,
              class: vue.normalizeClass([_ctx.nsInput.e("icon"), _ctx.nsInput.e("validateIcon")])
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.validateIcon)))
              ]),
              _: 1
            }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
          ], 2)
        ], 2)
      ]),
      content: vue.withCtx(() => [
        vue.createVNode(_component_el_select_menu, {
          ref: "menuRef",
          data: _ctx.filteredOptions,
          width: _ctx.popperSize,
          "hovering-index": _ctx.states.hoveringIndex,
          "scrollbar-always-on": _ctx.scrollbarAlwaysOn
        }, {
          default: vue.withCtx((scope) => [
            vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.guardReactiveProps(scope)))
          ]),
          empty: vue.withCtx(() => [
            vue.renderSlot(_ctx.$slots, "empty", {}, () => [
              vue.createElementVNode("p", {
                class: vue.normalizeClass(_ctx.nsSelectV2.e("empty"))
              }, vue.toDisplayString(_ctx.emptyText ? _ctx.emptyText : ""), 3)
            ])
          ]),
          _: 3
        }, 8, ["data", "width", "hovering-index", "scrollbar-always-on"])
      ]),
      _: 3
    }, 8, ["visible", "teleported", "popper-class", "popper-options", "effect", "placement", "transition", "persistent", "onBeforeShow"])
  ], 34)), [
    [_directive_click_outside, _ctx.handleClickOutside, _ctx.popperRef]
  ]);
}
var Select = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select-v2/src/select.vue"]]);

exports["default"] = Select;
//# sourceMappingURL=select.js.map
