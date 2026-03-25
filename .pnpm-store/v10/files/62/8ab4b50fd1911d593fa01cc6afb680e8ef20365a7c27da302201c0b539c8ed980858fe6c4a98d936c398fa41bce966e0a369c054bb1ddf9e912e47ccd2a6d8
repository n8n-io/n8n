import { defineComponent, vModelText, computed, reactive, toRefs, provide, resolveComponent, resolveDirective, withDirectives, openBlock, createElementBlock, normalizeClass, withModifiers, createVNode, withCtx, createElementVNode, renderSlot, createCommentVNode, Fragment, renderList, normalizeStyle, toDisplayString, createBlock, withKeys, resolveDynamicComponent, vShow, normalizeProps, guardReactiveProps } from 'vue';
import '../../../utils/index.mjs';
import '../../../directives/index.mjs';
import { ElTooltip } from '../../tooltip/index.mjs';
import { ElTag } from '../../tag/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import '../../../constants/index.mjs';
import ElSelectMenu from './select-dropdown.mjs';
import useSelect from './useSelect.mjs';
import { selectV2InjectionKey } from './token.mjs';
import { SelectProps } from './defaults.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import ClickOutside from '../../../directives/click-outside/index.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { isArray } from '@vue/shared';

const _sfc_main = defineComponent({
  name: "ElSelectV2",
  components: {
    ElSelectMenu,
    ElTag,
    ElTooltip,
    ElIcon
  },
  directives: { ClickOutside, ModelText: vModelText },
  props: SelectProps,
  emits: [
    UPDATE_MODEL_EVENT,
    CHANGE_EVENT,
    "remove-tag",
    "clear",
    "visible-change",
    "focus",
    "blur"
  ],
  setup(props, { emit }) {
    const modelValue = computed(() => {
      const { modelValue: rawModelValue, multiple } = props;
      const fallback = multiple ? [] : void 0;
      if (isArray(rawModelValue)) {
        return multiple ? rawModelValue : fallback;
      }
      return multiple ? fallback : rawModelValue;
    });
    const API = useSelect(reactive({
      ...toRefs(props),
      modelValue
    }), emit);
    provide(selectV2InjectionKey, {
      props: reactive({
        ...toRefs(props),
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
  const _component_el_tag = resolveComponent("el-tag");
  const _component_el_tooltip = resolveComponent("el-tooltip");
  const _component_el_icon = resolveComponent("el-icon");
  const _component_el_select_menu = resolveComponent("el-select-menu");
  const _directive_model_text = resolveDirective("model-text");
  const _directive_click_outside = resolveDirective("click-outside");
  return withDirectives((openBlock(), createElementBlock("div", {
    ref: "selectRef",
    class: normalizeClass([_ctx.nsSelectV2.b(), _ctx.nsSelectV2.m(_ctx.selectSize)]),
    onClick: _cache[24] || (_cache[24] = withModifiers((...args) => _ctx.toggleMenu && _ctx.toggleMenu(...args), ["stop"])),
    onMouseenter: _cache[25] || (_cache[25] = ($event) => _ctx.states.comboBoxHovering = true),
    onMouseleave: _cache[26] || (_cache[26] = ($event) => _ctx.states.comboBoxHovering = false)
  }, [
    createVNode(_component_el_tooltip, {
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
      default: withCtx(() => [
        createElementVNode("div", {
          ref: "selectionRef",
          class: normalizeClass([
            _ctx.nsSelectV2.e("wrapper"),
            _ctx.nsSelectV2.is("focused", _ctx.states.isComposing || _ctx.expanded),
            _ctx.nsSelectV2.is("hovering", _ctx.states.comboBoxHovering),
            _ctx.nsSelectV2.is("filterable", _ctx.filterable),
            _ctx.nsSelectV2.is("disabled", _ctx.selectDisabled)
          ])
        }, [
          _ctx.$slots.prefix ? (openBlock(), createElementBlock("div", _hoisted_1, [
            renderSlot(_ctx.$slots, "prefix")
          ])) : createCommentVNode("v-if", true),
          _ctx.multiple ? (openBlock(), createElementBlock("div", {
            key: 1,
            class: normalizeClass(_ctx.nsSelectV2.e("selection"))
          }, [
            _ctx.collapseTags && _ctx.modelValue.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.showTagList, (item) => {
                return openBlock(), createElementBlock("div", {
                  key: _ctx.getValueKey(_ctx.getValue(item)),
                  class: normalizeClass(_ctx.nsSelectV2.e("selected-item"))
                }, [
                  createVNode(_component_el_tag, {
                    closable: !_ctx.selectDisabled && !_ctx.getDisabled(item),
                    size: _ctx.collapseTagSize,
                    type: "info",
                    "disable-transitions": "",
                    onClose: ($event) => _ctx.deleteTag($event, item)
                  }, {
                    default: withCtx(() => [
                      createElementVNode("span", {
                        class: normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                        style: normalizeStyle({
                          maxWidth: `${_ctx.tagMaxWidth}px`
                        })
                      }, toDisplayString(_ctx.getLabel(item)), 7)
                    ]),
                    _: 2
                  }, 1032, ["closable", "size", "onClose"])
                ], 2);
              }), 128)),
              createElementVNode("div", {
                class: normalizeClass(_ctx.nsSelectV2.e("selected-item"))
              }, [
                _ctx.modelValue.length > _ctx.maxCollapseTags ? (openBlock(), createBlock(_component_el_tag, {
                  key: 0,
                  closable: false,
                  size: _ctx.collapseTagSize,
                  type: "info",
                  "disable-transitions": ""
                }, {
                  default: withCtx(() => [
                    _ctx.collapseTagsTooltip ? (openBlock(), createBlock(_component_el_tooltip, {
                      key: 0,
                      disabled: _ctx.dropdownMenuVisible,
                      "fallback-placements": ["bottom", "top", "right", "left"],
                      effect: _ctx.effect,
                      placement: "bottom",
                      teleported: false
                    }, {
                      default: withCtx(() => [
                        createElementVNode("span", {
                          class: normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                          style: normalizeStyle({
                            maxWidth: `${_ctx.tagMaxWidth}px`
                          })
                        }, " + " + toDisplayString(_ctx.modelValue.length - _ctx.maxCollapseTags), 7)
                      ]),
                      content: withCtx(() => [
                        createElementVNode("div", {
                          class: normalizeClass(_ctx.nsSelectV2.e("selection"))
                        }, [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.collapseTagList, (selected) => {
                            return openBlock(), createElementBlock("div", {
                              key: _ctx.getValueKey(_ctx.getValue(selected)),
                              class: normalizeClass(_ctx.nsSelectV2.e("selected-item"))
                            }, [
                              createVNode(_component_el_tag, {
                                closable: !_ctx.selectDisabled && !_ctx.getDisabled(selected),
                                size: _ctx.collapseTagSize,
                                class: "in-tooltip",
                                type: "info",
                                "disable-transitions": "",
                                onClose: ($event) => _ctx.deleteTag($event, selected)
                              }, {
                                default: withCtx(() => [
                                  createElementVNode("span", {
                                    class: normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                                    style: normalizeStyle({
                                      maxWidth: `${_ctx.tagMaxWidth}px`
                                    })
                                  }, toDisplayString(_ctx.getLabel(selected)), 7)
                                ]),
                                _: 2
                              }, 1032, ["closable", "size", "onClose"])
                            ], 2);
                          }), 128))
                        ], 2)
                      ]),
                      _: 1
                    }, 8, ["disabled", "effect"])) : (openBlock(), createElementBlock("span", {
                      key: 1,
                      class: normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                      style: normalizeStyle({
                        maxWidth: `${_ctx.tagMaxWidth}px`
                      })
                    }, " + " + toDisplayString(_ctx.modelValue.length - _ctx.maxCollapseTags), 7))
                  ]),
                  _: 1
                }, 8, ["size"])) : createCommentVNode("v-if", true)
              ], 2)
            ], 64)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(_ctx.states.cachedOptions, (selected) => {
              return openBlock(), createElementBlock("div", {
                key: _ctx.getValueKey(_ctx.getValue(selected)),
                class: normalizeClass(_ctx.nsSelectV2.e("selected-item"))
              }, [
                createVNode(_component_el_tag, {
                  closable: !_ctx.selectDisabled && !_ctx.getDisabled(selected),
                  size: _ctx.collapseTagSize,
                  type: "info",
                  "disable-transitions": "",
                  onClose: ($event) => _ctx.deleteTag($event, selected)
                }, {
                  default: withCtx(() => [
                    createElementVNode("span", {
                      class: normalizeClass(_ctx.nsSelectV2.e("tags-text")),
                      style: normalizeStyle({
                        maxWidth: `${_ctx.tagMaxWidth}px`
                      })
                    }, toDisplayString(_ctx.getLabel(selected)), 7)
                  ]),
                  _: 2
                }, 1032, ["closable", "size", "onClose"])
              ], 2);
            }), 128)),
            createElementVNode("div", {
              class: normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-wrapper")
              ]),
              style: normalizeStyle(_ctx.inputWrapperStyle)
            }, [
              withDirectives(createElementVNode("input", {
                id: _ctx.id,
                ref: "inputRef",
                autocomplete: _ctx.autocomplete,
                "aria-autocomplete": "list",
                "aria-haspopup": "listbox",
                autocapitalize: "off",
                "aria-expanded": _ctx.expanded,
                "aria-labelledby": _ctx.label,
                class: normalizeClass([
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
                  _cache[7] || (_cache[7] = withKeys(withModifiers(($event) => _ctx.onKeyboardNavigate("backward"), ["stop", "prevent"]), ["up"])),
                  _cache[8] || (_cache[8] = withKeys(withModifiers(($event) => _ctx.onKeyboardNavigate("forward"), ["stop", "prevent"]), ["down"])),
                  _cache[9] || (_cache[9] = withKeys(withModifiers((...args) => _ctx.onKeyboardSelect && _ctx.onKeyboardSelect(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[10] || (_cache[10] = withKeys(withModifiers((...args) => _ctx.handleEsc && _ctx.handleEsc(...args), ["stop", "prevent"]), ["esc"])),
                  _cache[11] || (_cache[11] = withKeys(withModifiers((...args) => _ctx.handleDel && _ctx.handleDel(...args), ["stop"]), ["delete"]))
                ]
              }, null, 42, _hoisted_2), [
                [_directive_model_text, _ctx.states.displayInputValue]
              ]),
              _ctx.filterable ? (openBlock(), createElementBlock("span", {
                key: 0,
                ref: "calculatorRef",
                "aria-hidden": "true",
                class: normalizeClass(_ctx.nsSelectV2.e("input-calculator")),
                textContent: toDisplayString(_ctx.states.displayInputValue)
              }, null, 10, _hoisted_3)) : createCommentVNode("v-if", true)
            ], 6)
          ], 2)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            createElementVNode("div", {
              class: normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-wrapper")
              ])
            }, [
              withDirectives(createElementVNode("input", {
                id: _ctx.id,
                ref: "inputRef",
                "aria-autocomplete": "list",
                "aria-haspopup": "listbox",
                "aria-labelledby": _ctx.label,
                "aria-expanded": _ctx.expanded,
                autocapitalize: "off",
                autocomplete: _ctx.autocomplete,
                class: normalizeClass(_ctx.nsSelectV2.e("combobox-input")),
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
                  _cache[18] || (_cache[18] = withKeys(withModifiers(($event) => _ctx.onKeyboardNavigate("backward"), ["stop", "prevent"]), ["up"])),
                  _cache[19] || (_cache[19] = withKeys(withModifiers(($event) => _ctx.onKeyboardNavigate("forward"), ["stop", "prevent"]), ["down"])),
                  _cache[20] || (_cache[20] = withKeys(withModifiers((...args) => _ctx.onKeyboardSelect && _ctx.onKeyboardSelect(...args), ["stop", "prevent"]), ["enter"])),
                  _cache[21] || (_cache[21] = withKeys(withModifiers((...args) => _ctx.handleEsc && _ctx.handleEsc(...args), ["stop", "prevent"]), ["esc"]))
                ],
                "onUpdate:modelValue": _cache[22] || (_cache[22] = (...args) => _ctx.onUpdateInputValue && _ctx.onUpdateInputValue(...args))
              }, null, 42, _hoisted_4), [
                [_directive_model_text, _ctx.states.displayInputValue]
              ])
            ], 2),
            _ctx.filterable ? (openBlock(), createElementBlock("span", {
              key: 0,
              ref: "calculatorRef",
              "aria-hidden": "true",
              class: normalizeClass([
                _ctx.nsSelectV2.e("selected-item"),
                _ctx.nsSelectV2.e("input-calculator")
              ]),
              textContent: toDisplayString(_ctx.states.displayInputValue)
            }, null, 10, _hoisted_5)) : createCommentVNode("v-if", true)
          ], 64)),
          _ctx.shouldShowPlaceholder ? (openBlock(), createElementBlock("span", {
            key: 3,
            class: normalizeClass([
              _ctx.nsSelectV2.e("placeholder"),
              _ctx.nsSelectV2.is("transparent", _ctx.multiple ? _ctx.modelValue.length === 0 : !_ctx.hasModelValue)
            ])
          }, toDisplayString(_ctx.currentPlaceholder), 3)) : createCommentVNode("v-if", true),
          createElementVNode("span", {
            class: normalizeClass(_ctx.nsSelectV2.e("suffix"))
          }, [
            _ctx.iconComponent ? withDirectives((openBlock(), createBlock(_component_el_icon, {
              key: 0,
              class: normalizeClass([_ctx.nsSelectV2.e("caret"), _ctx.nsInput.e("icon"), _ctx.iconReverse])
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.iconComponent)))
              ]),
              _: 1
            }, 8, ["class"])), [
              [vShow, !_ctx.showClearBtn]
            ]) : createCommentVNode("v-if", true),
            _ctx.showClearBtn && _ctx.clearIcon ? (openBlock(), createBlock(_component_el_icon, {
              key: 1,
              class: normalizeClass([_ctx.nsSelectV2.e("caret"), _ctx.nsInput.e("icon")]),
              onClick: withModifiers(_ctx.handleClear, ["prevent", "stop"])
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.clearIcon)))
              ]),
              _: 1
            }, 8, ["class", "onClick"])) : createCommentVNode("v-if", true),
            _ctx.validateState && _ctx.validateIcon ? (openBlock(), createBlock(_component_el_icon, {
              key: 2,
              class: normalizeClass([_ctx.nsInput.e("icon"), _ctx.nsInput.e("validateIcon")])
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.validateIcon)))
              ]),
              _: 1
            }, 8, ["class"])) : createCommentVNode("v-if", true)
          ], 2)
        ], 2)
      ]),
      content: withCtx(() => [
        createVNode(_component_el_select_menu, {
          ref: "menuRef",
          data: _ctx.filteredOptions,
          width: _ctx.popperSize,
          "hovering-index": _ctx.states.hoveringIndex,
          "scrollbar-always-on": _ctx.scrollbarAlwaysOn
        }, {
          default: withCtx((scope) => [
            renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps(scope)))
          ]),
          empty: withCtx(() => [
            renderSlot(_ctx.$slots, "empty", {}, () => [
              createElementVNode("p", {
                class: normalizeClass(_ctx.nsSelectV2.e("empty"))
              }, toDisplayString(_ctx.emptyText ? _ctx.emptyText : ""), 3)
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
var Select = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/select-v2/src/select.vue"]]);

export { Select as default };
//# sourceMappingURL=select.mjs.map
