'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../../constants/index.js');
var rovingFocusGroup = require('./roving-focus-group.js');
var tokens = require('./tokens.js');
var utils = require('./utils.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-id/index.js');
var event = require('../../../utils/dom/event.js');
var aria = require('../../../constants/aria.js');

const _sfc_main = vue.defineComponent({
  components: {
    ElRovingFocusCollectionItem: rovingFocusGroup.ElCollectionItem
  },
  props: {
    focusable: {
      type: Boolean,
      default: true
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  emits: ["mousedown", "focus", "keydown"],
  setup(props, { emit }) {
    const { currentTabbedId, loop, onItemFocus, onItemShiftTab } = vue.inject(tokens.ROVING_FOCUS_GROUP_INJECTION_KEY, void 0);
    const { getItems } = vue.inject(rovingFocusGroup.ROVING_FOCUS_COLLECTION_INJECTION_KEY, void 0);
    const id = index.useId();
    const rovingFocusGroupItemRef = vue.ref(null);
    const handleMousedown = event.composeEventHandlers((e) => {
      emit("mousedown", e);
    }, (e) => {
      if (!props.focusable) {
        e.preventDefault();
      } else {
        onItemFocus(vue.unref(id));
      }
    });
    const handleFocus = event.composeEventHandlers((e) => {
      emit("focus", e);
    }, () => {
      onItemFocus(vue.unref(id));
    });
    const handleKeydown = event.composeEventHandlers((e) => {
      emit("keydown", e);
    }, (e) => {
      const { key, shiftKey, target, currentTarget } = e;
      if (key === aria.EVENT_CODE.tab && shiftKey) {
        onItemShiftTab();
        return;
      }
      if (target !== currentTarget)
        return;
      const focusIntent = utils.getFocusIntent(e);
      if (focusIntent) {
        e.preventDefault();
        const items = getItems().filter((item) => item.focusable);
        let elements = items.map((item) => item.ref);
        switch (focusIntent) {
          case "last": {
            elements.reverse();
            break;
          }
          case "prev":
          case "next": {
            if (focusIntent === "prev") {
              elements.reverse();
            }
            const currentIdx = elements.indexOf(currentTarget);
            elements = loop.value ? utils.reorderArray(elements, currentIdx + 1) : elements.slice(currentIdx + 1);
            break;
          }
          default: {
            break;
          }
        }
        vue.nextTick(() => {
          utils.focusFirst(elements);
        });
      }
    });
    const isCurrentTab = vue.computed(() => currentTabbedId.value === vue.unref(id));
    vue.provide(tokens.ROVING_FOCUS_GROUP_ITEM_INJECTION_KEY, {
      rovingFocusGroupItemRef,
      tabIndex: vue.computed(() => vue.unref(isCurrentTab) ? 0 : -1),
      handleMousedown,
      handleFocus,
      handleKeydown
    });
    return {
      id,
      handleKeydown,
      handleFocus,
      handleMousedown
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_roving_focus_collection_item = vue.resolveComponent("el-roving-focus-collection-item");
  return vue.openBlock(), vue.createBlock(_component_el_roving_focus_collection_item, {
    id: _ctx.id,
    focusable: _ctx.focusable,
    active: _ctx.active
  }, {
    default: vue.withCtx(() => [
      vue.renderSlot(_ctx.$slots, "default")
    ]),
    _: 3
  }, 8, ["id", "focusable", "active"]);
}
var ElRovingFocusItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/roving-focus-group/src/roving-focus-item.vue"]]);

exports["default"] = ElRovingFocusItem;
//# sourceMappingURL=roving-focus-item.js.map
