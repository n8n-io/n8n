'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../popper/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var trigger = require('./trigger.js');
var utils = require('./utils.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var event = require('../../../utils/dom/event.js');
var trigger$1 = require('../../popper/src/trigger2.js');

const __default__ = vue.defineComponent({
  name: "ElTooltipTrigger"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: trigger.useTooltipTriggerProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("tooltip");
    const { controlled, id, open, onOpen, onClose, onToggle } = vue.inject(constants.TOOLTIP_INJECTION_KEY, void 0);
    const triggerRef = vue.ref(null);
    const stopWhenControlledOrDisabled = () => {
      if (vue.unref(controlled) || props.disabled) {
        return true;
      }
    };
    const trigger = vue.toRef(props, "trigger");
    const onMouseenter = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "hover", onOpen));
    const onMouseleave = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "hover", onClose));
    const onClick = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "click", (e) => {
      if (e.button === 0) {
        onToggle(e);
      }
    }));
    const onFocus = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "focus", onOpen));
    const onBlur = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "focus", onClose));
    const onContextMenu = event.composeEventHandlers(stopWhenControlledOrDisabled, utils.whenTrigger(trigger, "contextmenu", (e) => {
      e.preventDefault();
      onToggle(e);
    }));
    const onKeydown = event.composeEventHandlers(stopWhenControlledOrDisabled, (e) => {
      const { code } = e;
      if (props.triggerKeys.includes(code)) {
        e.preventDefault();
        onToggle(e);
      }
    });
    expose({
      triggerRef
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(trigger$1["default"]), {
        id: vue.unref(id),
        "virtual-ref": _ctx.virtualRef,
        open: vue.unref(open),
        "virtual-triggering": _ctx.virtualTriggering,
        class: vue.normalizeClass(vue.unref(ns).e("trigger")),
        onBlur: vue.unref(onBlur),
        onClick: vue.unref(onClick),
        onContextmenu: vue.unref(onContextMenu),
        onFocus: vue.unref(onFocus),
        onMouseenter: vue.unref(onMouseenter),
        onMouseleave: vue.unref(onMouseleave),
        onKeydown: vue.unref(onKeydown)
      }, {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["id", "virtual-ref", "open", "virtual-triggering", "class", "onBlur", "onClick", "onContextmenu", "onFocus", "onMouseenter", "onMouseleave", "onKeydown"]);
    };
  }
});
var ElTooltipTrigger = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip/src/trigger.vue"]]);

exports["default"] = ElTooltipTrigger;
//# sourceMappingURL=trigger2.js.map
