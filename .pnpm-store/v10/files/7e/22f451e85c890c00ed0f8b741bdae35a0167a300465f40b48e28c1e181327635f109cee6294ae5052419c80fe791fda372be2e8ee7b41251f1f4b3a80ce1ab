'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../roving-focus-group/index.js');
require('../../collection/index.js');
var index = require('../../icon/index.js');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../../constants/index.js');
var dropdown = require('./dropdown.js');
var tokens = require('./tokens.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var rovingFocusGroup = require('../../roving-focus-group/src/roving-focus-group.js');
var tokens$1 = require('../../roving-focus-group/src/tokens.js');
var refs = require('../../../utils/vue/refs.js');
var event = require('../../../utils/dom/event.js');
var aria = require('../../../constants/aria.js');
var collection = require('../../collection/src/collection.js');

const _sfc_main = vue.defineComponent({
  name: "DropdownItemImpl",
  components: {
    ElIcon: index.ElIcon
  },
  props: dropdown.dropdownItemProps,
  emits: ["pointermove", "pointerleave", "click", "clickimpl"],
  setup(_, { emit }) {
    const ns = index$1.useNamespace("dropdown");
    const { role: menuRole } = vue.inject(tokens.DROPDOWN_INJECTION_KEY, void 0);
    const { collectionItemRef: dropdownCollectionItemRef } = vue.inject(dropdown.DROPDOWN_COLLECTION_ITEM_INJECTION_KEY, void 0);
    const { collectionItemRef: rovingFocusCollectionItemRef } = vue.inject(rovingFocusGroup.ROVING_FOCUS_ITEM_COLLECTION_INJECTION_KEY, void 0);
    const {
      rovingFocusGroupItemRef,
      tabIndex,
      handleFocus,
      handleKeydown: handleItemKeydown,
      handleMousedown
    } = vue.inject(tokens$1.ROVING_FOCUS_GROUP_ITEM_INJECTION_KEY, void 0);
    const itemRef = refs.composeRefs(dropdownCollectionItemRef, rovingFocusCollectionItemRef, rovingFocusGroupItemRef);
    const role = vue.computed(() => {
      if (menuRole.value === "menu") {
        return "menuitem";
      } else if (menuRole.value === "navigation") {
        return "link";
      }
      return "button";
    });
    const handleKeydown = event.composeEventHandlers((e) => {
      const { code } = e;
      if (code === aria.EVENT_CODE.enter || code === aria.EVENT_CODE.space) {
        e.preventDefault();
        e.stopImmediatePropagation();
        emit("clickimpl", e);
        return true;
      }
    }, handleItemKeydown);
    return {
      ns,
      itemRef,
      dataset: {
        [collection.COLLECTION_ITEM_SIGN]: ""
      },
      role,
      tabIndex,
      handleFocus,
      handleKeydown,
      handleMousedown
    };
  }
});
const _hoisted_1 = ["aria-disabled", "tabindex", "role"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_icon = vue.resolveComponent("el-icon");
  return vue.openBlock(), vue.createElementBlock(vue.Fragment, null, [
    _ctx.divided ? (vue.openBlock(), vue.createElementBlock("li", vue.mergeProps({
      key: 0,
      role: "separator",
      class: _ctx.ns.bem("menu", "item", "divided")
    }, _ctx.$attrs), null, 16)) : vue.createCommentVNode("v-if", true),
    vue.createElementVNode("li", vue.mergeProps({ ref: _ctx.itemRef }, { ..._ctx.dataset, ..._ctx.$attrs }, {
      "aria-disabled": _ctx.disabled,
      class: [_ctx.ns.be("menu", "item"), _ctx.ns.is("disabled", _ctx.disabled)],
      tabindex: _ctx.tabIndex,
      role: _ctx.role,
      onClick: _cache[0] || (_cache[0] = (e) => _ctx.$emit("clickimpl", e)),
      onFocus: _cache[1] || (_cache[1] = (...args) => _ctx.handleFocus && _ctx.handleFocus(...args)),
      onKeydown: _cache[2] || (_cache[2] = vue.withModifiers((...args) => _ctx.handleKeydown && _ctx.handleKeydown(...args), ["self"])),
      onMousedown: _cache[3] || (_cache[3] = (...args) => _ctx.handleMousedown && _ctx.handleMousedown(...args)),
      onPointermove: _cache[4] || (_cache[4] = (e) => _ctx.$emit("pointermove", e)),
      onPointerleave: _cache[5] || (_cache[5] = (e) => _ctx.$emit("pointerleave", e))
    }), [
      _ctx.icon ? (vue.openBlock(), vue.createBlock(_component_el_icon, { key: 0 }, {
        default: vue.withCtx(() => [
          (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
        ]),
        _: 1
      })) : vue.createCommentVNode("v-if", true),
      vue.renderSlot(_ctx.$slots, "default")
    ], 16, _hoisted_1)
  ], 64);
}
var ElDropdownItemImpl = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/dropdown/src/dropdown-item-impl.vue"]]);

exports["default"] = ElDropdownItemImpl;
//# sourceMappingURL=dropdown-item-impl.js.map
