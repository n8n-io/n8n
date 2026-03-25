'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../roving-focus-group/index.js');
require('../../../utils/index.js');
var dropdownItemImpl = require('./dropdown-item-impl.js');
var useDropdown = require('./useDropdown.js');
var dropdown = require('./dropdown.js');
var tokens = require('./tokens.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var rovingFocusItem = require('../../roving-focus-group/src/roving-focus-item.js');
var event = require('../../../utils/dom/event.js');

const _sfc_main = vue.defineComponent({
  name: "ElDropdownItem",
  components: {
    ElDropdownCollectionItem: dropdown.ElCollectionItem,
    ElRovingFocusItem: rovingFocusItem["default"],
    ElDropdownItemImpl: dropdownItemImpl["default"]
  },
  inheritAttrs: false,
  props: dropdown.dropdownItemProps,
  emits: ["pointermove", "pointerleave", "click"],
  setup(props, { emit, attrs }) {
    const { elDropdown } = useDropdown.useDropdown();
    const _instance = vue.getCurrentInstance();
    const itemRef = vue.ref(null);
    const textContent = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = vue.unref(itemRef)) == null ? void 0 : _a.textContent) != null ? _b : "";
    });
    const { onItemEnter, onItemLeave } = vue.inject(tokens.DROPDOWN_INJECTION_KEY, void 0);
    const handlePointerMove = event.composeEventHandlers((e) => {
      emit("pointermove", e);
      return e.defaultPrevented;
    }, event.whenMouse((e) => {
      if (props.disabled) {
        onItemLeave(e);
        return;
      }
      const target = e.currentTarget;
      if (target === document.activeElement || target.contains(document.activeElement)) {
        return;
      }
      onItemEnter(e);
      if (!e.defaultPrevented) {
        target == null ? void 0 : target.focus();
      }
    }));
    const handlePointerLeave = event.composeEventHandlers((e) => {
      emit("pointerleave", e);
      return e.defaultPrevented;
    }, event.whenMouse((e) => {
      onItemLeave(e);
    }));
    const handleClick = event.composeEventHandlers((e) => {
      if (props.disabled) {
        return;
      }
      emit("click", e);
      return e.type !== "keydown" && e.defaultPrevented;
    }, (e) => {
      var _a, _b, _c;
      if (props.disabled) {
        e.stopImmediatePropagation();
        return;
      }
      if ((_a = elDropdown == null ? void 0 : elDropdown.hideOnClick) == null ? void 0 : _a.value) {
        (_b = elDropdown.handleClick) == null ? void 0 : _b.call(elDropdown);
      }
      (_c = elDropdown.commandHandler) == null ? void 0 : _c.call(elDropdown, props.command, _instance, e);
    });
    const propsAndAttrs = vue.computed(() => {
      return { ...props, ...attrs };
    });
    return {
      handleClick,
      handlePointerMove,
      handlePointerLeave,
      textContent,
      propsAndAttrs
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  const _component_el_dropdown_item_impl = vue.resolveComponent("el-dropdown-item-impl");
  const _component_el_roving_focus_item = vue.resolveComponent("el-roving-focus-item");
  const _component_el_dropdown_collection_item = vue.resolveComponent("el-dropdown-collection-item");
  return vue.openBlock(), vue.createBlock(_component_el_dropdown_collection_item, {
    disabled: _ctx.disabled,
    "text-value": (_a = _ctx.textValue) != null ? _a : _ctx.textContent
  }, {
    default: vue.withCtx(() => [
      vue.createVNode(_component_el_roving_focus_item, {
        focusable: !_ctx.disabled
      }, {
        default: vue.withCtx(() => [
          vue.createVNode(_component_el_dropdown_item_impl, vue.mergeProps(_ctx.propsAndAttrs, {
            onPointerleave: _ctx.handlePointerLeave,
            onPointermove: _ctx.handlePointerMove,
            onClickimpl: _ctx.handleClick
          }), {
            default: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "default")
            ]),
            _: 3
          }, 16, ["onPointerleave", "onPointermove", "onClickimpl"])
        ]),
        _: 3
      }, 8, ["focusable"])
    ]),
    _: 3
  }, 8, ["disabled", "text-value"]);
}
var DropdownItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/dropdown/src/dropdown-item.vue"]]);

exports["default"] = DropdownItem;
//# sourceMappingURL=dropdown-item.js.map
